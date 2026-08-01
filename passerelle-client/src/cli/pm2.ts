import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import pm2 from 'pm2';
import { STATUS_FILE, PM2_NAME, isJson, jsonOut } from './status.js';
import { printBanner } from '../utils/banner.js';

export function handlePm2Commands(cmd: string): boolean {
  if (cmd === 'setup' || cmd === 'start' || cmd === 'install') {
    if (!isJson()) {
      printBanner();
      console.log('[INFO] Setting up Passerelle daemon background service (PM2)...');
    }
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    let scriptPath = path.join(currentDir, 'index.js');
    if (!fs.existsSync(scriptPath) && fs.existsSync(path.join(path.dirname(currentDir), 'index.ts'))) {
      scriptPath = path.join(path.dirname(currentDir), 'index.ts');
    }

    pm2.connect((err) => {
      if (err) {
        if (isJson()) jsonOut({ error: 'pm2_connect', message: err.message || String(err) });
        else console.error('[ERROR] Failed to connect to PM2:', err);
        process.exit(2);
      }
      pm2.stop(PM2_NAME, () => {
        pm2.delete(PM2_NAME, () => {
          const startOptions: any = {
            name: PM2_NAME,
            script: scriptPath,
            autorestart: true,
            max_restarts: 10,
            restart_delay: 2000,
            env: { NODE_ENV: 'production' }
          };
          if (scriptPath.endsWith('.ts')) {
            startOptions.interpreter = 'npx';
            startOptions.interpreterArgs = 'tsx';
          }
          pm2.start(startOptions, (startErr) => {
            if (startErr) {
              if (isJson()) jsonOut({ error: 'pm2_start', message: startErr.message || String(startErr) });
              else console.error('[ERROR] Failed to start daemon via PM2:', startErr);
              pm2.disconnect();
              process.exit(2);
            }
            pm2.dump(() => {
              pm2.disconnect();
              if (!isJson()) process.stdout.write('[INFO] Waiting for daemon to initialize... ');
              let attempts = 0;
              const checkInterval = setInterval(() => {
                attempts++;
                if (fs.existsSync(STATUS_FILE)) {
                  clearInterval(checkInterval);
                  if (isJson()) {
                    let st: any = {};
                    try { st = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')); } catch (_e) {}
                    jsonOut({ status: 'installed', pid: st.pid || null, machineId: st.machineId || null, tunnelUrl: st.tunnelUrl || null, pin: st.pin || null });
                    process.exit(0);
                  }
                  console.log('Done!\n');
                  console.log('[OK] Passerelle Daemon installed and started successfully!');
                  console.log('     The service is now running silently in the background.\n');
                  console.log('=== QUICK COMMANDS ===');
                  console.log('  * passerelle qr      : View QR Code to log in');
                  console.log('  * passerelle link    : Copy direct login URL');
                  console.log('  * passerelle status  : Check service diagnostics');
                  console.log('  * passerelle credits : View project author, github & donations');
                  console.log('  * passerelle ui      : Attach to live interactive management UI');
                  console.log('  * passerelle register: Re-declare daemon presence to Gateway');
                  process.exit(0);
                } else if (attempts > 30) {
                  clearInterval(checkInterval);
                  if (isJson()) {
                    jsonOut({ error: 'timeout', message: 'Daemon took too long to initialize.' });
                  } else {
                    console.log('Timeout!');
                    console.error('\n[ERROR] Daemon took too long to initialize. Check "passerelle logs" for details.');
                  }
                  process.exit(1);
                }
              }, 500);
            });
          });
        });
      });
    });
    return true;
  }

  if (cmd === 'stop') {
    if (!isJson()) printBanner();
    pm2.connect((err) => {
      if (err) {
        if (isJson()) jsonOut({ error: 'pm2_connect', message: err.message || String(err) });
        else console.error(err);
        process.exit(1);
      }
      pm2.stop(PM2_NAME, () => {
        pm2.delete(PM2_NAME, () => {
          try { if (fs.existsSync(STATUS_FILE)) fs.unlinkSync(STATUS_FILE); } catch (_e) {}
          pm2.disconnect();
          if (isJson()) jsonOut({ status: 'stopped' });
          else console.log('[OK] Passerelle Daemon stopped and unregistered.');
          process.exit(0);
        });
      });
    });
    return true;
  }

  if (cmd === 'restart') {
    if (!isJson()) printBanner();
    pm2.connect((err) => {
      if (err) {
        if (isJson()) jsonOut({ error: 'pm2_connect', message: err.message || String(err) });
        else console.error(err);
        process.exit(1);
      }
      pm2.restart(PM2_NAME, (err2) => {
        pm2.disconnect();
        if (err2) {
          if (isJson()) jsonOut({ error: 'pm2_restart', message: err2.message || String(err2) });
          else console.error('[ERROR] Failed to restart:', err2.message || err2);
          process.exit(1);
        }
        if (isJson()) jsonOut({ status: 'restarted' });
        else console.log('[OK] Passerelle Daemon restarted successfully.');
        process.exit(0);
      });
    });
    return true;
  }

  if (cmd === 'logs') {
    printBanner();
    const logProc = spawn('npx', ['pm2', 'logs', PM2_NAME, '--lines', '50'], { stdio: 'inherit' });
    logProc.on('exit', (code) => process.exit(code || 0));
    return true;
  }

  return false;
}
