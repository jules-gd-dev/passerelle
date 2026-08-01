import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// C2 handshake registry: persistently binds each machineId to the SHA-256 hash
// of the secret its daemon presented on first registration. This survives
// gateway restarts so an attacker cannot reclaim a known machineId with a
// different secret during the daemon reconnect window.
//
// Only the hash is stored — the secret itself never touches disk. Lookups and
// comparisons use constant-time comparison.

export type RegisterResult = 'bound' | 'ok' | 'mismatch';

const DB_PATH = process.env.MACHINES_DB_PATH || path.join(process.cwd(), 'data', 'machines.json');

interface RegistryRecord {
  secretHash: string;
  boundAt: number;
}

let registry: Map<string, RegistryRecord> = new Map();

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function load() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const next = new Map<string, RegistryRecord>();
      for (const [id, rec] of Object.entries(parsed as Record<string, unknown>)) {
        if (rec && typeof rec === 'object' && typeof (rec as RegistryRecord).secretHash === 'string') {
          next.set(id, rec as RegistryRecord);
        }
      }
      registry = next;
    }
  } catch (err) {
    console.error('[machineRegistry] Failed to load DB:', err);
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const obj: Record<string, RegistryRecord> = {};
    for (const [id, rec] of registry) obj[id] = rec;
    // Atomic write: tmp file then rename.
    const tmp = `${DB_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tmp, DB_PATH);
    try { fs.chmodSync(DB_PATH, 0o600); } catch (_e) {}
  } catch (err) {
    console.error('[machineRegistry] Failed to save DB:', err);
  }
}

// Constant-time comparison of two hex hash strings.
function safeEqualHash(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

load();

// Verify or establish the binding for a (machineId, secret) pair.
// - 'bound': first time we see this machineId; the hash is recorded.
// - 'ok': the machineId is known and the secret hash matches.
// - 'mismatch': the machineId is known but the secret differs -> reject.
export function registerMachine(machineId: string, secret: string): RegisterResult {
  if (!machineId || !secret) return 'mismatch';
  const incoming = hashSecret(secret);
  const existing = registry.get(machineId);
  if (!existing) {
    registry.set(machineId, { secretHash: incoming, boundAt: Date.now() });
    save();
    return 'bound';
  }
  return safeEqualHash(incoming, existing.secretHash) ? 'ok' : 'mismatch';
}

// Test helper: drop the in-memory registry and reload from disk. Pass an
// explicit dbPath to point at a fresh file (e.g. a tmp dir) and simulate a
// gateway restart from a previously persisted state.
export function _reloadForTest(dbPath: string) {
  registry = new Map();
  const fullPath = dbPath;
  try {
    if (!fs.existsSync(fullPath)) return;
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [id, rec] of Object.entries(parsed as Record<string, unknown>)) {
        if (rec && typeof rec === 'object' && typeof (rec as RegistryRecord).secretHash === 'string') {
          registry.set(id, rec as RegistryRecord);
        }
      }
    }
  } catch {
    /* empty DB for test */
  }
}

