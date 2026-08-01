import WebSocket from 'ws';
import type { Hono } from 'hono';
import type { DaemonRuntime } from './runtime.js';
import { isDebug, GATEWAY_WS_URL, PIN_TTL_SECONDS, daemonConfig, saveDaemonConfig } from '../utils/config.js';
import { createJWT, timingSafeStringEqual } from '../utils/jwt.js';
import { logInline } from '../utils/term.js';

export function connectToGateway(
  runtime: DaemonRuntime,
  url: string,
  app: Hono,
  sendRegistration: () => void,
  onRegistered: () => void
) {
  if (runtime.ws && (runtime.ws.readyState === WebSocket.CONNECTING || runtime.ws.readyState === WebSocket.OPEN)) return;

  logInline('(4/4)', 'Connecting to Gateway WebSocket...');
  runtime.ws = new WebSocket(GATEWAY_WS_URL);

  const scheduleReconnect = () => {
    if (runtime.isReconnecting) return;
    // Do not auto-reconnect after a secret mismatch: the daemon would just be
    // rejected again. Wait for the user to regenerate the secret.
    if (runtime.secretMismatched) return;
    runtime.isReconnecting = true;
    if (runtime.heartBeatTimer) { clearInterval(runtime.heartBeatTimer); runtime.heartBeatTimer = null; }
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    runtime.reconnectTimer = setTimeout(() => {
      runtime.isReconnecting = false;
      connectToGateway(runtime, runtime.tunnelUrlStored, app, sendRegistration, onRegistered);
    }, 4000);
  };

  runtime.ws.on('open', () => {
    runtime.isReconnecting = false;
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    logInline('(4/4)', 'Connecting to Gateway WebSocket... Done');
    sendRegistration();
    if (runtime.heartBeatTimer) clearInterval(runtime.heartBeatTimer);
    runtime.heartBeatTimer = setInterval(() => sendRegistration(), 30 * 1000);
  });

  runtime.ws.on('message', (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      // C2 handshake: the gateway already has this machineId bound to a
      // different secret. Stop retrying and ask the user to regenerate the
      // secret (the config may be corrupted, restored from backup, or the
      // machineId may have been reused on another host).
      if (data.status === 'rejected' && data.code === 'machine_secret_mismatch') {
        runtime.secretMismatched = true;
        if (runtime.heartBeatTimer) { clearInterval(runtime.heartBeatTimer); runtime.heartBeatTimer = null; }
        console.error('[ERROR] Gateway rejected this daemon: secret mismatch for machineId ' +
          `${daemonConfig.machineId}. Another daemon may already be registered with this id, ` +
          'or the config was restored from a backup. To fix: regenerate the identity with ' +
          '`passerelle config gateway_secret <new>` (and machine_id if needed), then restart.');
        try { runtime.ws?.close(); } catch (_e) {}
        return;
      }
      if (data.action === 'validate_pin' && data.requestId) {
        const isExpired = Date.now() - runtime.pinCreatedAt > PIN_TTL_SECONDS * 1000;
        const pinOk = typeof data.pin === 'string' && !isExpired && timingSafeStringEqual(data.pin, runtime.pin);
        if (pinOk) {
          runtime.recentPinFailures = [];
          runtime.activeConnectionsCount += 1;
          runtime.setActionMessage('[OK] Client session authenticated via PIN!');
          const nowUtcSec = Math.floor(Date.now() / 1000);
          const sessionToken = createJWT(daemonConfig.jwtSecret, { machineId: runtime.machineIdStored, iat: nowUtcSec, exp: nowUtcSec + 7 * 24 * 3600 });
          runtime.ws?.send(JSON.stringify({ status: 'validated', requestId: data.requestId, sessionToken }));
          // Rotate the PIN immediately after a successful login so a used
          // connect URL can never be replayed. The browser already holds the
          // httpOnly session cookie, so it needs no PIN after this point.
          runtime.regeneratePinInternal();
          runtime.setActionMessage('[OK] Client connected! New PIN generated for future logins.');
        } else {
          // M4: sliding 60s window — regenerate only on a burst of failures,
          // and never more than once per PIN TTL to avoid a lockout loop.
          const now = Date.now();
          runtime.recentPinFailures = runtime.recentPinFailures.filter((t) => now - t < 60000);
          runtime.recentPinFailures.push(now);
          if (runtime.recentPinFailures.length >= 5 && now - runtime.lastPinRegenAt > PIN_TTL_SECONDS * 1000) {
            runtime.regeneratePinInternal();
            runtime.setActionMessage('[WARN] Brute-force protection: PIN regenerated after repeated failed attempts!', 6000);
            console.warn('[WARN] Brute-force protection: too many invalid PIN attempts. PIN regenerated.');
          }
          runtime.ws?.send(JSON.stringify({ status: 'rejected', requestId: data.requestId }));
        }
      } else if (data.action === 'proxy_request' && data.requestId) {
        const reqPath = typeof data.path === 'string' && data.path.startsWith('/') ? data.path : '/';
        const reqMethod = typeof data.method === 'string' ? data.method : 'GET';
        const reqHeaders = data.headers || {};
        const reqBody = data.body;
        (async () => {
          try {
            // H2: reqPath is validated to start with '/' so a compromised/MITM
            // gateway cannot craft a path like "@evil.com/x" that would parse
            // as http://localhost@evil.com/x (userinfo host confusion).
            const res = await app.fetch(new Request(`http://localhost${reqPath}`, { method: reqMethod, headers: reqHeaders, body: reqBody }));
            const resStatus = res.status;
            const resBodyText = await res.text();
            const resHeaders: Record<string, string> = {};
            res.headers.forEach((val, key) => { resHeaders[key] = val; });
            runtime.ws?.send(JSON.stringify({ action: 'proxy_response', requestId: data.requestId, status: resStatus, headers: resHeaders, body: resBodyText }));
          } catch (_err) {
            // Do not leak internal error details back over the relay channel.
            runtime.ws?.send(JSON.stringify({ action: 'proxy_response', requestId: data.requestId, status: 502, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Bad gateway' }) }));
          }
        })();
      } else if (data.action === 'handoff' && typeof data.code === 'string' && typeof data.token === 'string') {
        // C2: the gateway stages a one-time code mapped to a session token over
        // this trusted WS, then redirects a browser with ?code=<code>. We hold
        // the binding so the first request presenting the code can be issued an
        // httpOnly cookie without the token ever appearing in a URL.
        const ttlSec = Math.min(Math.max(Number(data.expiresIn) || 30, 5), 60);
        runtime.handoffs.set(data.code, { token: data.token, expiresAt: Date.now() + ttlSec * 1000 });
      } else if (data.status === 'registered' && data.id) {
        // Only persist when the id actually changed: rewriting the config on every
        // heartbeat would clobber a machine_id manually edited via `passerelle config`.
        if (data.id !== runtime.machineIdStored) {
          runtime.machineIdStored = data.id;
          daemonConfig.machineId = data.id;
          saveDaemonConfig(daemonConfig);
        }
        runtime.saveDaemonStatus();
        onRegistered();
      }
    } catch (err) { console.error('[Gateway] Error handling WS message:', err); }
  });

  runtime.ws.on('close', scheduleReconnect);
  runtime.ws.on('error', (err: any) => { if (isDebug) console.error('[Gateway] WS error:', err?.message || err); scheduleReconnect(); });
}
