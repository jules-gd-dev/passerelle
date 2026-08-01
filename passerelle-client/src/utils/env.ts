// H1: spawned dev services inherit the daemon's process environment by default.
// That is convenient (PATH, HOME, etc.) but it can leak host credentials (CI
// tokens, cloud creds, etc.) into untrusted child processes. We strip variables
// whose names look sensitive before passing the environment down.

const SENSITIVE_ENV_RE = /(SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY|SECRET_?KEY|CLIENT_?SECRET|AUTH|SESSION|JWT)$/i;

// Known passerelle-owned secrets that must never reach a child service even if
// they ever end up in the environment.
const ALWAYS_STRIP = new Set(['GATEWAY_SECRET', 'JWT_SECRET', 'PASSERELLE_GATEWAY_SECRET']);

export function buildChildEnv(base: NodeJS.ProcessEnv, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(base)) {
    if (value === undefined) continue;
    if (ALWAYS_STRIP.has(key.toUpperCase())) continue;
    if (SENSITIVE_ENV_RE.test(key)) continue;
    env[key] = value;
  }
  return { ...env, ...extra };
}

// Returns true if `command` is permitted by the given allowlist. An empty/
// undefined allowlist means "everything allowed" (the documented default for
// this dev tool). When set, a command is allowed if it exactly matches an entry
// OR equals the basename of an entry (so `/usr/bin/node` permits `node`).
export function isCommandAllowed(command: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  const cmd = command.trim();
  const base = cmd.split('/').pop();
  for (const entry of allowlist) {
    const e = entry.trim();
    if (!e) continue;
    if (cmd === e) return true;
    if (base && base === e) return true;
    const entryBase = e.split('/').pop();
    if (base && entryBase && base === entryBase) return true;
  }
  return false;
}
