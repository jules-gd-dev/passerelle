import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { decryptString, encryptString } from './cookieSign.js';

// H4: session tokens are stored exclusively in an httpOnly cookie set by the
// gateway, so a client-side XSS in the PWA cannot exfiltrate them. The PWA only
// keeps { machineId, tunnelUrl } (no token) in memory + a non-sensitive cookie
// for UI persistence.
//
// The cookie value is additionally AES-256-GCM encrypted (see cookieSign.ts) so
// that a stolen cookie does not directly reveal the underlying tokens, and the
// __Host- prefix guarantees it is only ever sent to this exact host over HTTPS.

export interface GatewaySession {
  tunnelUrl: string;
  sessionToken: string;
}

// __Host- prefix requires: Secure, Path=/, no Domain. Enforced by browsers
// behind HTTPS — which is always the case here (Cloudflare Tunnel in front).
const COOKIE_NAME = '__Host-passerelle_sessions';
// Matches the daemon session TTL (7 days). Refreshed on every validate-pin.
const COOKIE_MAX_AGE = 7 * 24 * 3600;

type SessionsMap = Record<string, GatewaySession>;

export function readSessions(c: Context): SessionsMap {
  const raw = getCookie(c, COOKIE_NAME);
  if (!raw) return {};
  const plain = decryptString(raw);
  if (!plain) return {};
  try {
    const parsed = JSON.parse(plain);
    if (parsed && typeof parsed === 'object') return parsed as SessionsMap;
  } catch {
    /* malformed cookie — ignore */
  }
  return {};
}

function writeSessions(c: Context, map: SessionsMap) {
  const val = encryptString(JSON.stringify(map));
  setCookie(c, COOKIE_NAME, val, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function addSession(
  c: Context,
  machineId: string,
  session: GatewaySession,
) {
  const map = readSessions(c);
  map[machineId] = session;
  writeSessions(c, map);
}

export function removeSession(c: Context, machineId: string) {
  const map = readSessions(c);
  if (!(machineId in map)) return;
  delete map[machineId];
  if (Object.keys(map).length === 0) {
    // __Host- requires the Secure attribute even when expiring the cookie,
    // otherwise Hono's cookie serializer rejects the prefix.
    deleteCookie(c, COOKIE_NAME, { path: '/', secure: true });
  } else {
    writeSessions(c, map);
  }
}

export function clearSessions(c: Context) {
  deleteCookie(c, COOKIE_NAME, { path: '/', secure: true });
}

// Resolve the session token for a given machine from the httpOnly cookie.
// Returns null when no session exists for that machine.
export function getSessionToken(c: Context, machineId: string): string | null {
  const map = readSessions(c);
  const session = map[machineId];
  return session?.sessionToken ?? null;
}
