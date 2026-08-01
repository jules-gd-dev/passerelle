import crypto from 'node:crypto';
import fs from 'node:fs';
import type net from 'node:net';
import type WebSocket from 'ws';
import type { ChildProcess } from 'node:child_process';
import { services } from '../services/storage.js';
import { GATEWAY_WEB_URL, daemonConfig } from '../utils/config.js';

export function generatePin(): string {
  // H5: CSPRNG PIN instead of Math.random().
  return crypto.randomInt(100000, 1000000).toString();
}

export class DaemonRuntime {
  port = 3000;
  SOCKET_FILE = '/tmp/passerelle-daemon-3000.sock';
  PID_FILE = '/tmp/passerelle-daemon-3000.pid';
  STATUS_FILE = '/tmp/passerelle-daemon-status.json';

  pin = generatePin();
  pinCreatedAt = Date.now();
  // M4: sliding window of recent failure timestamps instead of a global counter,
  // so a sustained attacker can't force a PIN regeneration loop on the legit user.
  recentPinFailures: number[] = [];
  lastPinRegenAt = 0;

  activeConnectionsCount = 0;
  actionMessage = '';
  actionMessageTimer: NodeJS.Timeout | null = null;

  isLoading = false;
  loadingText = 'Loading...';
  privacyMode = false;
  isInteractiveUISetup = false;
  lastKeyHandledAt = 0;

  ws: WebSocket | null = null;
  cloudflaredProcess: ChildProcess | null = null;
  heartBeatTimer: NodeJS.Timeout | null = null;
  countdownTimer: NodeJS.Timeout | null = null;
  reconnectTimer: NodeJS.Timeout | null = null;
  isReconnecting = false;
  // Set when the gateway rejected our secret (machine_secret_mismatch): stops
  // the auto-reconnect loop so the daemon does not hammer the gateway. Cleared
  // when the user regenerates the secret via `passerelle config gateway_secret`.
  secretMismatched = false;

  // Version policy from the gateway reported at most once per daemon lifetime.
  versionChecked = false;

  machineIdStored = daemonConfig.machineId || '';
  tunnelUrlStored = '';
  attachedSockets = new Set<net.Socket>();
  onRender: () => void = () => {};

  // C2: one-time codes staged by the gateway over the trusted WS so a session
  // token can be handed to a browser WITHOUT ever placing the long-lived token
  // in a redirect URL. Each code is single-use and short-lived (verified and
  // deleted on first presentation).
  handoffs = new Map<string, { token: string; expiresAt: number }>();

  setPort(port: number) {
    this.port = port;
    this.SOCKET_FILE = `/tmp/passerelle-daemon-${port}.sock`;
    this.PID_FILE = `/tmp/passerelle-daemon-${port}.pid`;
  }

  saveDaemonStatus() {
    try {
      const connectUrl = this.machineIdStored && this.pin ? `${GATEWAY_WEB_URL}?machine=${this.machineIdStored}&pin=${this.pin}` : null;
      const servicesList = Array.from(services.values());
      const statusData = {
        status: 'online',
        port: this.port,
        machineId: this.machineIdStored || null,
        pin: this.pin || null,
        tunnelUrl: this.tunnelUrlStored || null,
        connectUrl,
        servicesCount: servicesList.length,
        upCount: servicesList.filter((s) => s.status === 'running').length,
        updatedAt: Date.now(),
        socketFile: this.SOCKET_FILE,
        pidFile: this.PID_FILE,
        pid: process.pid,
      };
      fs.writeFileSync(this.STATUS_FILE, JSON.stringify(statusData, null, 2), { encoding: 'utf-8', mode: 0o600 });
      try { fs.chmodSync(this.STATUS_FILE, 0o600); } catch (_e2) {}
    } catch (_e) {}
  }

  broadcastUIRender(uiContent: string) {
    for (const socket of this.attachedSockets) {
      try { socket.write(uiContent); } catch (_e) {}
    }
    if (process.stdout.isTTY) { process.stdout.write(uiContent); }
  }

  setActionMessage(msg: string, durationMs = 3500) {
    this.actionMessage = msg;
    this.onRender();
    if (this.actionMessageTimer) clearTimeout(this.actionMessageTimer);
    this.actionMessageTimer = setTimeout(() => {
      this.actionMessage = '';
      this.onRender();
    }, durationMs);
  }

  async triggerAsyncAction(msg: string, actionFn: () => Promise<void> | void, successMsg: string) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loadingText = msg;
    this.onRender();

    const start = Date.now();
    try { await actionFn(); } catch (_e) {}
    const elapsed = Date.now() - start;
    const remainingTime = Math.max(0, 3000 - elapsed);
    setTimeout(() => {
      this.isLoading = false;
      this.setActionMessage(successMsg);
    }, remainingTime);
  }

  regeneratePinInternal() {
    this.pin = generatePin();
    this.pinCreatedAt = Date.now();
    this.recentPinFailures = [];
    this.lastPinRegenAt = Date.now();
    this.saveDaemonStatus();
  }
}
