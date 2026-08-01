import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DaemonConfig } from '../types.js';

export const isDebug =
  process.argv.includes('--debug') ||
  process.env.DEBUG === 'true' ||
  process.env.DEBUG === '1';

export const PIN_TTL_SECONDS = 30;
export const MIN_LOADING_TIME_MS = 3000;

// User-level config directory (~/.config/passerelle on Linux/Mac,
// %APPDATA%/passerelle on Windows), honoring XDG_CONFIG_HOME. This persists
// across `npx @passerelle/daemon setup` runs from any working directory, so the
// machineId and secrets survive regardless of where the user invokes the CLI.
function getConfigDir(): string {
  const home = os.homedir();
  let base: string;
  if (process.platform === 'win32') {
    base = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  } else {
    base = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  }
  return path.join(base, 'passerelle');
}

const CONFIG_DIR = getConfigDir();
export const CONFIG_FILE = path.join(CONFIG_DIR, 'passerelle-config.json');
export const SERVICES_FILE = path.join(CONFIG_DIR, 'services.json');

// One-shot migration: if a config/services file exists in the legacy cwd
// location but not yet in the user config dir, copy it over so existing
// installs keep their machineId and jwtSecret after upgrading.
function migrateLegacyFile(legacyName: string) {
  const legacy = path.join(process.cwd(), legacyName);
  const dest = path.join(CONFIG_DIR, legacyName);
  if (!fs.existsSync(dest) && fs.existsSync(legacy)) {
    try {
      fs.copyFileSync(legacy, dest);
      try { fs.chmodSync(dest, 0o600); } catch (_e) {}
      console.log(`[INFO] Config migrated to ${dest}`);
    } catch (err) {
      console.error(`[WARN] Could not migrate ${legacyName}:`, err);
    }
  }
}

try {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
} catch (err) {
  console.error(`[FATAL] Could not create config dir ${CONFIG_DIR}:`, err);
  process.exit(1);
}
migrateLegacyFile('passerelle-config.json');
migrateLegacyFile('services.json');

export function loadDaemonConfig(): DaemonConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.jwtSecret === 'string') {
        return {
          jwtSecret: parsed.jwtSecret,
          revokedBefore: typeof parsed.revokedBefore === 'number' ? parsed.revokedBefore : 0,
          apiRevokedBefore: typeof parsed.apiRevokedBefore === 'number' ? parsed.apiRevokedBefore : 0,
          machineId: parsed.machineId,
          gatewayUrl: parsed.gatewayUrl,
          gatewaySecret: parsed.gatewaySecret,
          commandAllowlist: Array.isArray(parsed.commandAllowlist)
            ? parsed.commandAllowlist.filter((c: unknown) => typeof c === 'string')
            : undefined,
        };
      }
    } catch (_e) {}
  }
  // First run: generate a stable identity (machineId + gatewaySecret) alongside
  // the JWT secret. The gateway binds this (machineId, gatewaySecret) pair on
  // first registration and rejects any future register with a different secret.
  const newConfig: DaemonConfig = {
    jwtSecret: crypto.randomBytes(32).toString('hex'),
    revokedBefore: 0,
    apiRevokedBefore: 0,
    machineId: crypto.randomUUID(),
    gatewaySecret: crypto.randomBytes(32).toString('hex'),
  };
  saveDaemonConfig(newConfig);
  return newConfig;
}

export function saveDaemonConfig(cfg: DaemonConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { encoding: 'utf-8', mode: 0o600 });
    try { fs.chmodSync(CONFIG_FILE, 0o600); } catch (_e2) {}
  } catch (err) {
    console.error('Failed to write passerelle-config.json:', err);
  }
}

export const daemonConfig = loadDaemonConfig();

export const GATEWAY_WEB_URL =
  process.env.GATEWAY_WEB_URL ||
  daemonConfig.gatewayUrl ||
  'https://passerelle-cloud.julesgd.dev';

export const GATEWAY_WS_URL =
  process.env.GATEWAY_WS_URL ||
  (GATEWAY_WEB_URL.startsWith('http://')
    ? `${GATEWAY_WEB_URL.replace('http://', 'ws://')}/ws`
    : `${GATEWAY_WEB_URL.replace('https://', 'wss://')}/ws`);
