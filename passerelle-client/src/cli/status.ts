import fs from 'node:fs';
import qrcode from 'qrcode-terminal';
import { printBanner, PASSERELLE_ASCII, ANSI, drawBox } from '../utils/banner.js';
import { printHelp, HELP_COMMANDS } from './help.js';

export const STATUS_FILE = '/tmp/passerelle-daemon-status.json';
export const PM2_NAME = 'passerelle-daemon';

export function isJson(): boolean {
  return process.argv.includes('--json') || process.argv.includes('-j');
}

export function jsonOut(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

export function getStatus(): any | null {
  try {
    if (!fs.existsSync(STATUS_FILE)) return null;
    const content = fs.readFileSync(STATUS_FILE, 'utf-8');
    const data = JSON.parse(content);
    if (!data.pid) return null;
    try {
      process.kill(data.pid, 0);
      return data;
    } catch (_e) {
      try { fs.unlinkSync(STATUS_FILE); } catch (_e2) {}
      return null;
    }
  } catch (_e) {
    return null;
  }
}

function offlineError(): void {
  if (isJson()) {
    jsonOut({ error: 'offline', message: 'Passerelle daemon is offline or not yet connected. Run "passerelle setup" to start.' });
  } else {
    printBanner();
    console.error('[ERROR] Passerelle daemon is offline or not yet connected.\n-> Run "passerelle setup" to start.');
  }
  process.exit(1);
}

export function handleStatusCommands(cmd: string): boolean {
  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    if (isJson()) {
      jsonOut({ commands: HELP_COMMANDS });
      return true;
    }
    printHelp();
    return true;
  }
  if (cmd === 'link') {
    const status = getStatus();
    if (!status || !status.connectUrl) {
      offlineError();
    }
    if (isJson()) {
      jsonOut({ url: status.connectUrl });
      return true;
    }
    console.log(`\n${PASSERELLE_ASCII}\n`);
    console.log(
      drawBox([
        `${ANSI.bold}Connect this machine to Passerelle${ANSI.reset}`,
        '',
        `${ANSI.cyan}${status.connectUrl}${ANSI.reset}`,
        '',
        `PIN : ${ANSI.bold}${status.pin || 'N/A'}${ANSI.reset}`,
      ]),
    );
    console.log(`\n${ANSI.dim}  Open this link in your browser (PC or phone)`);
    console.log(`  to connect this machine to Passerelle.${ANSI.reset}\n`);
    return true;
  }
  if (cmd === 'pin') {
    const status = getStatus();
    if (!status || !status.pin) {
      offlineError();
    }
    if (isJson()) {
      jsonOut({ pin: status.pin });
      return true;
    }
    printBanner();
    console.log(`Current PIN: ${status.pin}`);
    return true;
  }
  if (cmd === 'qr') {
    const status = getStatus();
    if (!status || !status.connectUrl) {
      offlineError();
    }
    if (isJson()) {
      jsonOut({ url: status.connectUrl, pin: status.pin || null });
      return true;
    }
    printBanner();
    console.log('=== CONNECTION QR CODE ===\n');
    qrcode.generate(status.connectUrl, { small: true });
    console.log(`\n* Direct Link (connect_url) : ${status.connectUrl}`);
    console.log(`* Current PIN (pin_code)    : ${status.pin || 'N/A'}`);
    console.log(`* Service Status (status)   : ONLINE (${status.upCount || 0} services up)\n`);
    return true;
  }
  if (cmd === 'json') {
    const status = getStatus();
    if (!status) console.log(JSON.stringify({ status: 'offline' }, null, 2));
    else console.log(JSON.stringify(status, null, 2));
    return true;
  }
  if (cmd === 'status') {
    const status = getStatus();
    if (isJson()) {
      if (!status) {
        jsonOut({ status: 'offline' });
        return true;
      }
      jsonOut({
        status: 'online',
        tunnelUrl: status.tunnelUrl || null,
        pin: status.pin || null,
        upCount: status.upCount || 0,
        servicesCount: status.servicesCount || 0,
        machineId: status.machineId || null,
        pid: status.pid,
      });
      return true;
    }
    printBanner();
    if (!status) {
      console.log('=== PASSERELLE DAEMON STATUS ===\n');
      console.log('* Service Status (status) : OFFLINE\n\n-> Run "passerelle setup" to start.');
      return true;
    }
    console.log('=== PASSERELLE DAEMON STATUS ===\n');
    console.log(`* Service Status (status)   : ONLINE`);
    console.log(`* Tunnel URL (tunnel_url)   : ${status.tunnelUrl || 'Connecting...'}`);
    console.log(`* PIN Code (pin_code)       : ${status.pin || 'N/A'}`);
    console.log(`* Services Up (services_up) : ${status.upCount || 0} / ${status.servicesCount || 0}`);
    console.log(`* Machine ID (machine_id)   : ${status.machineId || 'N/A'}`);
    console.log(`* Process ID (pid)          : ${status.pid}`);
    console.log('\n-> Run "passerelle link" or "passerelle qr" to connect!');
    return true;
  }
  return false;
}
