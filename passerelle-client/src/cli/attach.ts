import fs from 'node:fs';
import net from 'node:net';
import { getStatus, isJson, jsonOut } from './status.js';
import { printHelp } from './help.js';
import { printBanner } from '../utils/banner.js';

export function handleAttachCommands(cmd: string): boolean {
  if (cmd === 'register' || cmd === 'sync' || cmd === 'redeclare') {
    const status = getStatus();
    if (!isJson()) printBanner();
    if (!status || !status.socketFile || !fs.existsSync(status.socketFile)) {
      if (isJson()) jsonOut({ error: 'offline', message: 'Passerelle daemon is offline. Start it first with "passerelle setup".' });
      else console.error('[ERROR] Passerelle Daemon is offline. Start it first with "passerelle setup".');
      process.exit(1);
    }
    if (!isJson()) console.log('[INFO] Sending re-declaration and synchronization signal to Gateway...');
    const socket = net.connect(status.socketFile);
    socket.on('connect', () => {
      socket.write('p');
      setTimeout(() => {
        if (isJson()) jsonOut({ ok: true, command: cmd });
        else console.log('[OK] Daemon presence re-declared successfully!');
        socket.destroy();
        process.exit(0);
      }, 500);
    });
    socket.on('error', (err) => {
      if (isJson()) jsonOut({ error: 'socket', message: err.message });
      else console.error('[ERROR] Failed to connect to running daemon:', err.message);
      process.exit(1);
    });
    return true;
  }
  if (cmd === 'ui' || cmd === 'attach' || cmd === '') {
    const status = getStatus();
    if (!status || !status.socketFile || !fs.existsSync(status.socketFile)) {
      if (cmd === 'ui' || cmd === 'attach') {
        printBanner();
        console.error('[ERROR] Passerelle Daemon is offline. Start it first with "passerelle setup".');
        process.exit(1);
      } else {
        printHelp();
        return true;
      }
    }

    console.clear();
    printBanner();
    console.log('[INFO] Attaching to live Passerelle Daemon console...');
    const socket = net.connect(status.socketFile);

    socket.on('connect', () => {
      const detach = () => {
        // Restore the terminal before printing, then leave the daemon running.
        if (process.stdin.isTTY) { try { process.stdin.setRawMode(false); process.stdin.pause(); } catch (_e) {} }
        console.clear();
        console.log('[OK] Daemon detached: run "passerelle stop" to stop the daemon.\n');
        socket.destroy();
        process.exit(0);
      };

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (key: string) => {
          // Ctrl+C / Ctrl+D / d / q detach locally instead of killing the daemon.
          if (key === '\u0003' || key === '\u0004' || key.trim() === 'd' || key.trim() === 'q') {
            detach();
          } else {
            socket.write(key);
          }
        });
      }

      socket.on('data', (data) => {
        process.stdout.write(data.toString());
      });

      socket.on('close', () => {
        console.log('\n[INFO] Daemon closed connection or stopped.');
        process.exit(0);
      });
    });

    socket.on('error', (err) => {
      console.error('[ERROR] Failed to attach to daemon console:', err.message);
      process.exit(1);
    });
    return true;
  }
  return false;
}
