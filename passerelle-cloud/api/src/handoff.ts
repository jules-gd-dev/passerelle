import crypto from 'node:crypto';
import WebSocket from 'ws';

// C2: one-time handoff codes. To open a service on a daemon tunnel WITHOUT
// leaking the long-lived session token into a redirect URL (history, access
// logs, Referer), the gateway pushes a short-lived code -> token binding to the
// daemon over the already-authenticated WS channel, then redirects the browser
// with only ?code=<code>. The daemon redeems the code once for an httpOnly
// cookie. The gateway itself stays stateless: single-use enforcement lives on
// the daemon side.

export const HANDOFF_TTL_MS = 30_000;

// Push a one-time code to the daemon and return the code the browser should
// present. Returns null if the daemon WS is not currently open (caller should
// surface a 503 rather than redirect to a code that can never be redeemed).
export function stageHandoff(ws: WebSocket, token: string): string | null {
  if (ws.readyState !== WebSocket.OPEN) return null;
  const code = crypto.randomBytes(18).toString('base64url');
  try {
    ws.send(
      JSON.stringify({
        action: 'handoff',
        code,
        token,
        expiresIn: Math.round(HANDOFF_TTL_MS / 1000),
      }),
    );
  } catch {
    return null;
  }
  return code;
}
