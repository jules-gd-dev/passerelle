import type { Server } from 'node:http';
import type { ServerType } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import { machines, pendingProxyRequests, pendingValidations } from './state.js';
import { registerMachine } from './machineRegistry.js';

export interface WsServerOptions {
  // Hard cap on a single WS frame size, to avoid unbounded memory buffering.
  maxPayload?: number;
  // Additional hostnames (besides *.trycloudflare.com) accepted as tunnel URLs.
  allowedTunnelHosts?: string[];
}

function makeTunnelValidator(extraHosts: string[]) {
  const normalized = extraHosts
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return function isValidTunnelUrl(raw: unknown): raw is string {
    if (typeof raw !== 'string' || raw.length > 512) return false;
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return false;
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    // localhost is allowed so unit tests and local dev can register.
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.trycloudflare.com')) return true;
    return normalized.includes(host);
  };
}

export function setupWebSocketServer(
  httpServer: ServerType,
  options: WsServerOptions = {},
) {
  const maxPayload =
    options.maxPayload ?? Number(process.env.MAX_WS_PAYLOAD || 1_048_576); // 1 MiB
  const isValidTunnelUrl = makeTunnelValidator(
    options.allowedTunnelHosts ??
      (process.env.ALLOWED_TUNNEL_HOSTS || '').split(','),
  );

  const wss = new WebSocketServer({
    server: httpServer as unknown as Server,
    path: '/ws',
    maxPayload,
  });

  wss.on('connection', (ws) => {
    let registeredId: string | null = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.action === 'register') {
          // C2 handshake: the daemon presents its own (machineId, secret)
          // generated at install. The gateway binds the pair on first sight
          // and rejects any later register with a different secret for that
          // machineId. machineId and secret are both required.
          const machineId =
            typeof data.machineId === 'string' ? data.machineId : '';
          const secret = typeof data.secret === 'string' ? data.secret : '';
          if (!machineId || !secret) {
            ws.send(
              JSON.stringify({
                status: 'rejected',
                code: 'unauthorized',
                message: 'machineId and secret are required',
              }),
            );
            ws.close(4001);
            return;
          }
          const result = registerMachine(machineId, secret);
          if (result === 'mismatch') {
            ws.send(
              JSON.stringify({
                status: 'rejected',
                code: 'machine_secret_mismatch',
              }),
            );
            ws.close(4001);
            return;
          }

          // C2: reject arbitrary tunnelUrl (open-redirect / phishing vector).
          if (!isValidTunnelUrl(data.tunnelUrl)) {
            ws.send(
              JSON.stringify({
                status: 'rejected',
                code: 'invalid_tunnel_url',
              }),
            );
            ws.close(4002);
            return;
          }

          let currentId = registeredId || machineId;

          // The daemon's machineId changed mid-connection: re-key this connection.
          if (machineId && registeredId && machineId !== registeredId) {
            if (machines.get(registeredId)?.ws === ws)
              machines.delete(registeredId);
            currentId = machineId;
          }

          registeredId = currentId;
          console.log(
            `[Gateway API] Machine registered: ID=${currentId}, tunnelUrl=${data.tunnelUrl}`,
          );
          machines.set(currentId, {
            id: currentId,
            ws,
            tunnelUrl: data.tunnelUrl,
            lastSeen: Date.now(),
          });
          ws.send(JSON.stringify({ status: 'registered', id: currentId }));
        } else if (data.status === 'validated' && data.requestId) {
          const pending = pendingValidations.get(data.requestId);
          if (pending) {
            const machine = machines.get(pending.machineId);
            pending.resolve({
              success: true,
              tunnelUrl: machine?.tunnelUrl,
              sessionToken: data.sessionToken,
            });
          }
        } else if (data.status === 'rejected' && data.requestId) {
          const pending = pendingValidations.get(data.requestId);
          if (pending) {
            pending.resolve({
              success: false,
              code: 'invalid_pin',
              message: 'Invalid or expired PIN',
            });
          }
        } else if (data.action === 'proxy_response' && data.requestId) {
          const pending = pendingProxyRequests.get(data.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingProxyRequests.delete(data.requestId);
            pending.resolve(
              new Response(data.body, {
                status: data.status || 200,
                headers: new Headers(data.headers || {}),
              }),
            );
          }
        }
      } catch (_err) {}
    });

    ws.on('close', () => {
      // R1: only delete if the entry still belongs to THIS connection.
      if (registeredId && machines.get(registeredId)?.ws === ws)
        machines.delete(registeredId);
    });
  });

  return wss;
}
