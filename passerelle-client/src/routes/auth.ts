import type { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { cors } from 'hono/cors';
import { daemonConfig, saveDaemonConfig } from '../utils/config.js';
import { createJWT, verifyJWT } from '../utils/jwt.js';
import type { DaemonRuntime } from '../daemon/runtime.js';
import { getUnauthorizedHtml } from '../proxy/pages.js';

// C3: token lifetimes kept short — no more multi-year credentials.
const SESSION_MAX_AGE_SEC = 7 * 24 * 3600; // 7 days
const API_TOKEN_TTL_SEC = 30 * 24 * 3600; // 30 days

export function setupAuthMiddleware(app: Hono, runtime: DaemonRuntime, onAction: (msg: string) => void) {
  // H4: the daemon is reached via a Cloudflare quick-tunnel whose hostname is
  // dynamic, so we cannot pin a single origin. We still avoid reflecting
  // credentials: the session cookie is httpOnly (not readable from JS).
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  );

  app.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') return next();

    // C2: one-time handoff code. The gateway stages a short-lived code (mapped
    // to a real session token) over the trusted daemon<->gateway WS, then
    // redirects the browser here with ?code=<code>. We redeem it exactly once
    // for an httpOnly cookie, so the long-lived token never enters a URL and
    // therefore never reaches history / access logs / Referer headers.
    const code = c.req.query('code');
    if (code) {
      const entry = runtime.handoffs.get(code);
      // Single-use regardless of outcome, plus a cheap sweep of expired codes.
      runtime.handoffs.delete(code);
      const now = Date.now();
      for (const [k, v] of runtime.handoffs) if (now > v.expiresAt) runtime.handoffs.delete(k);

      if (entry && now < entry.expiresAt) {
        const payload = verifyJWT(entry.token, daemonConfig.jwtSecret, daemonConfig.revokedBefore, daemonConfig.apiRevokedBefore);
        if (payload) {
          setCookie(c, 'passerelle_token', entry.token, {
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: true,
            maxAge: SESSION_MAX_AGE_SEC,
          });
          const url = new URL(c.req.url);
          url.searchParams.delete('code');
          return c.redirect(url.toString(), 302);
        }
      }
      if (c.req.path.startsWith('/api/')) {
        return c.json({ error: 'Invalid or expired access code' }, 401);
      }
      return c.html(getUnauthorizedHtml(), 401);
    }

    const token =
      c.req.query('__ps_token') ||
      c.req.query('token') ||
      c.req.header('Authorization')?.replace('Bearer ', '') ||
      getCookie(c, 'passerelle_token');

    if (token) {
      const payload = verifyJWT(token, daemonConfig.jwtSecret, daemonConfig.revokedBefore, daemonConfig.apiRevokedBefore);
      if (payload) {
        // H4: httpOnly so client-side scripts (XSS) cannot steal the session.
        setCookie(c, 'passerelle_token', token, {
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
          secure: true,
          maxAge: SESSION_MAX_AGE_SEC,
        });

        // H2: once the token is stored in the httpOnly cookie, strip every form
        // of token from the URL so it does not linger in browser history, server
        // access logs, or a leaked Referer header.
        if (c.req.query('__ps_token') || c.req.query('token')) {
          const url = new URL(c.req.url);
          url.searchParams.delete('__ps_token');
          url.searchParams.delete('token');
          return c.redirect(url.toString(), 302);
        }
        return next();
      }
    }

    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.html(getUnauthorizedHtml(), 401);
  });

  app.post('/api/token', async (c) => {
    const now = Math.floor(Date.now() / 1000);
    const apiToken = createJWT(daemonConfig.jwtSecret, {
      machineId: daemonConfig.machineId || '',
      purpose: 'api', // M1: revocable independently of web sessions
      iat: now,
      exp: now + API_TOKEN_TTL_SEC,
    });
    onAction('[TOKEN] API Token generated');
    return c.json({ success: true, token: apiToken });
  });

  // M1: revoke every previously issued API token (purpose: 'api'). Web session
  // tokens are untouched. The cutoff is persisted so it survives a restart.
  app.post('/api/revoke-token', async (c) => {
    daemonConfig.apiRevokedBefore = Math.floor(Date.now() / 1000);
    saveDaemonConfig(daemonConfig);
    onAction('[TOKEN] All API tokens revoked');
    return c.json({ success: true });
  });
}
