import fs from 'node:fs';
import { spawn } from 'node:child_process';
import type net from 'node:net';
import WebSocket from 'ws';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { DaemonRuntime } from './daemon/runtime.js';
import { connectToGateway } from './daemon/gatewayWs.js';
import { setupIpcServer } from './daemon/ipc.js';
import { setupAuthMiddleware } from './routes/auth.js';
import { setupVersionRoute } from './routes/version.js';
import { checkAndReportVersion } from './utils/versionCheck.js';
import { setupServiceCrudRoutes } from './routes/serviceCrud.js';
import { setupStatsRoutes } from './services/stats.js';
import { setupServiceControlRoutes } from './routes/serviceControls.js';
import { createServiceProxy, setupWsProxy } from './proxy/handler.js';
import { renderUI } from './ui/render.js';
import { handleInputKey, setupInteractiveUI, type KeyActionCallbacks } from './ui/keys.js';
import { findAvailablePort, tryAttachToBackgroundDaemon } from './utils/net.js';
import { logInline } from './utils/term.js';
import { daemonConfig, saveDaemonConfig } from './utils/config.js';
import { services } from './services/storage.js';
export * from './types.js';

async function startDaemon() {
  logInline('(1/4)', 'Finding available local port...');
  const preferredPort = Number.parseInt(process.env.PORT || process.env.BOUNCER_PORT || '3000', 10);
  const port = await findAvailablePort(preferredPort);
  logInline('(1/4)', `Finding available local port... Done (port ${port})`);

  const runtime = new DaemonRuntime();
  runtime.setPort(port);
  if (await tryAttachToBackgroundDaemon(runtime.SOCKET_FILE)) return;

  // R2: single-instance lock. A leftover PID file with a live owner means
  // another daemon is already running (or attaching) for this port; refuse to
  // start a second one to avoid a split-brain where both register the same
  // machineId on the gateway. A stale PID file (process gone) is reclaimed.
  if (fs.existsSync(runtime.PID_FILE)) {
    const existingPid = Number.parseInt(fs.readFileSync(runtime.PID_FILE, 'utf-8').trim(), 10);
    if (Number.isInteger(existingPid)) {
      let alive = false;
      try { process.kill(existingPid, 0); alive = true; } catch (_e) { /* process gone */ }
      if (alive) {
        console.error(`[ERROR] Passerelle daemon already running (PID ${existingPid}) on port ${port}.`);
        console.error('        Stop it first with "passerelle stop", or remove the lock if it is stale.');
        process.exit(1);
      }
    }
    // Stale lock file (process gone) — safe to reclaim.
    try { fs.unlinkSync(runtime.PID_FILE); } catch (_e) {}
  }

  logInline('(2/4)', 'Initializing Hono Bouncer server...');
  runtime.onRender = () => renderUI(runtime);

  const app = new Hono();
  setupAuthMiddleware(app, runtime, (msg) => runtime.setActionMessage(msg));
  setupVersionRoute(app);
  setupStatsRoutes(app);
  const sendRegistration = async () => {
    if (!runtime.tunnelUrlStored) return;
    if (!runtime.ws || runtime.ws.readyState !== WebSocket.OPEN) {
      connectToGateway(runtime, runtime.tunnelUrlStored, app, sendRegistration, () => setupInteractiveUI(runtime, (k) => onKey(k), () => runtime.onRender()));
      for (let i = 0; i < 50; i++) { if (runtime.ws?.readyState === WebSocket.OPEN) break; await new Promise((r) => setTimeout(r, 100)); }
    }
    if (runtime.ws?.readyState === WebSocket.OPEN) {
      const machineId = daemonConfig.machineId || runtime.machineIdStored;
      console.log(`[Daemon] Sending Gateway registration: machineId=${machineId}, tunnelUrl=${runtime.tunnelUrlStored}`);
      runtime.ws.send(JSON.stringify({ action: 'register', machineId, tunnelUrl: runtime.tunnelUrlStored, secret: daemonConfig.gatewaySecret }));
      
      const servicesList = Array.from(services.values()).map((s) => ({
        id: s.id,
        status: s.status,
        tunnelUrl: (s as any).tunnelUrl
      }));
      runtime.ws.send(JSON.stringify({ action: 'sync_services', services: servicesList }));

      if (!runtime.versionChecked) {
        runtime.versionChecked = true;
        void checkAndReportVersion();
      }
    }
  };

  setupServiceCrudRoutes(app, runtime, sendRegistration);
  setupServiceControlRoutes(app, runtime, sendRegistration);
  const proxy = createServiceProxy(app);

  const cb: KeyActionCallbacks = {
    onKillAllSessions: () => {
      daemonConfig.revokedBefore = Math.floor(Date.now() / 1000);
      saveDaemonConfig(daemonConfig);
      runtime.activeConnectionsCount = 0;
      runtime.regeneratePinInternal();
      runtime.setActionMessage('[LOCKED] All sessions terminated: every client has been disconnected.');
    },
    onCleanup: () => cleanup(),
    onDetach: (socket?: net.Socket) => {
      if (socket) { runtime.attachedSockets.delete(socket); try { socket.destroy(); } catch (_e) {} return; }
      console.clear();
      console.log('[OK] Passerelle Daemon detached successfully.\n     The daemon is running in the background.\n     Re-attach anytime by running: passerelle ui\n');
      if (process.stdin.isTTY) { try { process.stdin.setRawMode(false); process.stdin.pause(); } catch (_e) {} }
      if (!process.env.PASSERELLE_DAEMON_CHILD) {
        const child = spawn(process.argv[0], process.argv.slice(1), { detached: true, stdio: 'ignore', env: { ...process.env, PASSERELLE_DAEMON_CHILD: '1' } });
        child.unref();
      }
      process.exit(0);
    },
    onSendRegistration: () => sendRegistration()
  };

  const onKey = (key: string, fromSocket?: net.Socket) => handleInputKey(key, runtime, cb, fromSocket);
  const ipcServer = setupIpcServer(runtime, onKey);
  const bouncerServer = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, async (info) => {
    logInline('(2/4)', `Initializing Hono Bouncer server... Done (listening on 127.0.0.1:${info.port})`);
    await runtime.tunnelManager.init();
    
    // Start main gateway tunnel
    void runtime.tunnelManager.startTunnel('gateway', info.port, (url) => {
      runtime.tunnelUrlStored = url;
      connectToGateway(runtime, url, app, sendRegistration, () => setupInteractiveUI(runtime, (k) => onKey(k), () => runtime.onRender()));
    });

    // Restore network tunnels (Staggered to avoid Cloudflare 429 Rate Limit)
    let delay = 3000;
    for (const service of services.values()) {
      if (service.type === 'network' && service.status === 'running') {
        setTimeout(() => {
          void runtime.tunnelManager.startTunnel(service.id, info.port, (url) => {
            (service as any).tunnelUrl = url;
            if (runtime.tunnelUrlStored) sendRegistration();
          });
        }, delay);
        delay += 3000;
      }
    }
  });

  setupWsProxy(bouncerServer, proxy);
  function cleanup() {
    console.log('\nShutting down Passerelle Daemon...');
    try { if (fs.existsSync(runtime.SOCKET_FILE)) fs.unlinkSync(runtime.SOCKET_FILE); if (fs.existsSync(runtime.PID_FILE)) fs.unlinkSync(runtime.PID_FILE); if (fs.existsSync(runtime.STATUS_FILE)) fs.unlinkSync(runtime.STATUS_FILE); } catch (_e) {}
    if (runtime.actionMessageTimer) clearTimeout(runtime.actionMessageTimer);
    if (runtime.countdownTimer) clearInterval(runtime.countdownTimer);
    if (runtime.heartBeatTimer) clearInterval(runtime.heartBeatTimer);
    if (runtime.reconnectTimer) clearTimeout(runtime.reconnectTimer);
    for (const socket of runtime.attachedSockets) socket.destroy();
    for (const s of services.values()) if (s.process) s.process.kill();
    if (runtime.ws) runtime.ws.close();
    runtime.tunnelManager.stopAll();
    ipcServer.close();
    bouncerServer.close(() => process.exit(0));
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startDaemon().catch((err) => console.error('Failed to start daemon:', err));
