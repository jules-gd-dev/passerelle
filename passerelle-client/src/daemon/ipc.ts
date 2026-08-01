import fs from 'node:fs';
import net from 'node:net';
import type { DaemonRuntime } from './runtime.js';

export function setupIpcServer(runtime: DaemonRuntime, onInputKey: (key: string, fromSocket: net.Socket) => void) {
  try {
    if (fs.existsSync(runtime.SOCKET_FILE)) fs.unlinkSync(runtime.SOCKET_FILE);
  } catch (_e) {}

  const ipcServer = net.createServer((clientSocket) => {
    runtime.attachedSockets.add(clientSocket);
    runtime.onRender();

    clientSocket.on('data', (data) => {
      onInputKey(data.toString(), clientSocket);
    });

    clientSocket.on('close', () => {
      runtime.attachedSockets.delete(clientSocket);
    });

    clientSocket.on('error', () => {
      runtime.attachedSockets.delete(clientSocket);
    });
  });

  ipcServer.listen(runtime.SOCKET_FILE, () => {
    try {
      fs.chmodSync(runtime.SOCKET_FILE, 0o600);
      fs.writeFileSync(runtime.PID_FILE, process.pid.toString(), { encoding: 'utf-8', mode: 0o600 });
      try { fs.chmodSync(runtime.PID_FILE, 0o600); } catch (_e3) {}
    } catch (_e) {}
    // Persist status.json immediately so that `passerelle ui`/`passerelle qr`
    // can find the daemon (socketFile) right after `passerelle setup`, without
    // waiting for the first gateway registration to write it.
    runtime.saveDaemonStatus();
  });

  return ipcServer;
}
