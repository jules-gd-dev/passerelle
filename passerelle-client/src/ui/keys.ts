import type net from 'node:net';
import clipboardy from 'clipboardy';
import type { DaemonRuntime } from '../daemon/runtime.js';
import { services } from '../services/storage.js';
import { GATEWAY_WEB_URL, PIN_TTL_SECONDS } from '../utils/config.js';

export interface KeyActionCallbacks {
  onKillAllSessions: () => void;
  onCleanup: () => void;
  onDetach: (socket?: net.Socket) => void;
  onSendRegistration: () => Promise<void> | void;
}

export function handleInputKey(key: string, runtime: DaemonRuntime, cb: KeyActionCallbacks, fromSocket?: net.Socket) {
  if (runtime.isLoading) return;

  const now = Date.now();
  if (now - runtime.lastKeyHandledAt < 200) return;
  runtime.lastKeyHandledAt = now;

  const cleanKey = key.trim().toLowerCase();
  if (!cleanKey) return;

  if (cleanKey === 'k') { cb.onKillAllSessions(); return; }
  // Ctrl+C / q / d detach the attached UI but leave the daemon running in the
  // background. The daemon itself is only stopped via `passerelle stop`.
  if (cleanKey === '\u0003' || cleanKey === 'q' || cleanKey === 'd') { cb.onDetach(fromSocket); return; }
  if (cleanKey === 'r') {
    runtime.regeneratePinInternal();
    runtime.setActionMessage('[OK] PIN renewed!');
  } else if (cleanKey === 'p') {
    runtime.triggerAsyncAction('Re-registering presence to Gateway...', cb.onSendRegistration, '[OK] Re-registered presence to Gateway successfully!');
  } else if (cleanKey === 'h') {
    runtime.privacyMode = !runtime.privacyMode;
    runtime.setActionMessage(runtime.privacyMode ? '[LOCKED] Privacy Mode: ON (QR & PIN Hidden)' : '[UNLOCKED] Privacy Mode: OFF (Visible)');
  } else if (cleanKey === 's') {
    const connectUrl = `${GATEWAY_WEB_URL}?machine=${runtime.machineIdStored}&pin=${runtime.pin}`;
    try {
      clipboardy.writeSync(connectUrl);
      runtime.setActionMessage('[OK] Link copied to clipboard!');
    } catch (_err) {
      runtime.setActionMessage('[ERROR] Failed to copy to clipboard.');
    }
  } else if (cleanKey === 'c') {
    runtime.setActionMessage(`[INFO] Active Connections: ${runtime.activeConnectionsCount} session(s) active.`);
  } else if (cleanKey === 'l') {
    const listStr = Array.from(services.values()).map((s) => `${s.name} [${s.type}]: ${s.status.toUpperCase()}`).join(' | ');
    runtime.setActionMessage(`[INFO] Services: ${listStr}`, 5000);
  }
}

export function setupInteractiveUI(runtime: DaemonRuntime, onKey: (key: string) => void, onRender: () => void) {
  onRender();
  if (runtime.isInteractiveUISetup) return;
  runtime.isInteractiveUISetup = true;

  if (runtime.countdownTimer) clearInterval(runtime.countdownTimer);
  runtime.countdownTimer = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - runtime.pinCreatedAt) / 1000);
    const remainingSec = Math.max(0, PIN_TTL_SECONDS - elapsedSec);
    if (remainingSec <= 0) {
      runtime.regeneratePinInternal();
      runtime.setActionMessage('[AUTO] PIN auto-renewed!');
    } else {
      onRender();
      runtime.saveDaemonStatus();
    }
  }, 1000);

  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (key: string) => onKey(key));
    } catch (_e) {}
  }
}
