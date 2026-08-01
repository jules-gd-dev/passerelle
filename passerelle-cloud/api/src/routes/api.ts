import type { Hono } from 'hono';
import WebSocket from 'ws';
import { stageHandoff } from '../handoff.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import {
  addSession,
  clearSessions,
  getSessionToken,
  readSessions,
  removeSession,
} from '../sessions.js';
import {
  machines,
  pendingProxyRequests,
  pendingValidations,
} from '../state.js';
import { getVersionInfo } from '../versionInfo.js';

export function setupApiRoutes(app: Hono) {
  const pinRateLimiter = createRateLimiter(10, 60000); // 10 PIN attempts per minute
  const proxyRateLimiter = createRateLimiter(300, 60000); // 300 proxy requests per minute
  // H6: general limiter covering every other public endpoint (machines,
  // sessions, open, health, credits) so none can be hammered unthrottled.
  const generalRateLimiter = createRateLimiter(600, 60000); // 600/min per IP+path
  app.use('/api/*', generalRateLimiter);

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  // Version policy + optional admin announcement, consumed by daemons and the
  // PWA to surface outdated-version warnings. Public on purpose.
  app.get('/api/version-info', (c) => c.json(getVersionInfo()));

  app.get('/api/credits', (c) => {
    return c.json({
      success: true,
      credits: {
        project_name: 'Passerelle',
        author: 'Jules GD (julesgd.dev)',
        github: 'https://github.com/jules-gd-dev/passerelle',
        donations: 'https://github.com/sponsors/jules-gd-dev',
        message:
          'Thank you for supporting Passerelle! Note: The backend Gateway server will soon be open-sourced as well!',
      },
    });
  });

  // H1: public list must NOT leak tunnelUrl (internal address). Only expose
  // the machine id + freshness so the PWA can target a machine; the tunnel URL
  // is returned exclusively after a successful PIN validation.
  app.get('/api/machines', (c) => {
    const list = Array.from(machines.values()).map((m) => ({
      id: m.id,
      online: m.ws.readyState === WebSocket.OPEN,
      lastSeen: m.lastSeen,
    }));
    return c.json(list);
  });

  app.post('/api/validate-pin', pinRateLimiter, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { machineId, pin } = body;

    if (!machineId || !pin) {
      return c.json(
        {
          success: false,
          code: 'machine_pin_required',
          message: 'Machine ID and PIN required',
        },
        400,
      );
    }

    const machine = machines.get(machineId);
    if (!machine || machine.ws.readyState !== WebSocket.OPEN) {
      return c.json(
        {
          success: false,
          code: 'machine_not_found',
          message: 'Machine not found or offline',
        },
        404,
      );
    }

    const requestId = crypto.randomUUID();

    return new Promise<Response>((resolve) => {
      const timer = setTimeout(() => {
        pendingValidations.delete(requestId);
        resolve(
          c.json(
            {
              success: false,
              code: 'timeout',
              message: 'Timeout waiting for validation',
            },
            408,
          ),
        );
      }, 15000);

      pendingValidations.set(requestId, {
        requestId,
        machineId,
        pin,
        timer,
        resolve: (result) => {
          clearTimeout(timer);
          pendingValidations.delete(requestId);
          if (result.success && result.sessionToken && result.tunnelUrl) {
            // H4: store the session token in an httpOnly cookie instead of
            // returning it in the JSON body, so XSS cannot steal it. The PWA
            // only needs the tunnelUrl for the "open service" button.
            addSession(c, machineId, {
              tunnelUrl: result.tunnelUrl,
              sessionToken: result.sessionToken,
            });
            resolve(c.json({ success: true, tunnelUrl: result.tunnelUrl }));
          } else if (result.success) {
            resolve(c.json(result));
          } else {
            resolve(c.json(result, 401));
          }
        },
      });

      machine.ws.send(
        JSON.stringify({ action: 'validate_pin', requestId, pin }),
      );
    });
  });

  // H4 + C2: open a service in a new tab. The gateway reads the session token
  // from its httpOnly cookie, pushes a one-time handoff code to the daemon over
  // the trusted WS, then redirects the browser to the daemon's tunnel with ONLY
  // ?code=<code> (&service=). The daemon redeems the code once for an httpOnly
  // cookie. The long-lived token therefore never appears in any URL.
  app.get('/api/open/:machineId/:serviceId', (c) => {
    const machineId = c.req.param('machineId');
    const serviceId = c.req.param('serviceId');
    const token = getSessionToken(c, machineId);
    if (!token)
      return c.json({ error: 'No active session for this machine' }, 401);
    const machine = machines.get(machineId);
    if (!machine || !machine.tunnelUrl)
      return c.json({ error: 'Machine offline' }, 503);
    const code = stageHandoff(machine.ws, token);
    if (!code) return c.json({ error: 'Machine offline' }, 503);
    const url = new URL(machine.tunnelUrl);
    url.searchParams.set('code', code);
    url.searchParams.set('service', serviceId);
    return c.redirect(url.toString());
  });

  // H4: disconnect a single machine — clears its entry from the httpOnly cookie.
  app.delete('/api/session/:machineId', (c) => {
    const machineId = c.req.param('machineId');
    removeSession(c, machineId);
    return c.json({ success: true });
  });

  // H4: list machines the browser has an active session for. Returns only
  // { machineId, tunnelUrl } — never the session token (which lives only in the
  // httpOnly cookie). Lets the PWA rebuild its UI on reload without localStorage.
  app.get('/api/sessions', (c) => {
    const map = readSessions(c);
    const list = Object.entries(map).map(([machineId, s]) => ({
      machineId,
      tunnelUrl: s.tunnelUrl,
    }));
    return c.json(list);
  });

  // H4: disconnect all machines — clears the whole httpOnly cookie.
  app.delete('/api/sessions', (c) => {
    clearSessions(c);
    return c.json({ success: true });
  });

  app.all('/api/proxy', proxyRateLimiter, async (c) => {
    const machineId = c.req.query('machineId');
    const path = c.req.query('path') || '/';

    if (!machineId) return c.json({ error: 'Machine ID required' }, 400);

    const machine = machines.get(machineId);
    if (!machine || machine.ws.readyState !== WebSocket.OPEN) {
      return c.json({ error: 'Machine not found or offline' }, 503);
    }

    const requestId = crypto.randomUUID();
    const reqMethod = c.req.method;
    const reqUrl = new URL(c.req.url);
    const targetParams = new URLSearchParams();
    reqUrl.searchParams.forEach((val, key) => {
      if (key !== 'machineId' && key !== 'path') targetParams.set(key, val);
    });

    const fullPath = targetParams.toString()
      ? `${path}${path.includes('?') ? '&' : '?'}${targetParams.toString()}`
      : path;
    // H4: prefer the session token from the httpOnly cookie. Fall back to an
    // explicit Authorization header for API clients that authenticate out of
    // band (e.g. scripts using an API token via /link).
    const tokenFromCookie = getSessionToken(c, machineId);
    const authHeader = tokenFromCookie
      ? `Bearer ${tokenFromCookie}`
      : c.req.header('Authorization');
    const contentType = c.req.header('Content-Type');
    const reqBodyText = ['GET', 'HEAD'].includes(reqMethod)
      ? undefined
      : await c.req.text().catch(() => undefined);

    return new Promise<Response>((resolve) => {
      const timer = setTimeout(() => {
        pendingProxyRequests.delete(requestId);
        resolve(
          c.json({ error: 'Timeout during WebSocket relay to daemon' }, 504),
        );
      }, 10000);

      pendingProxyRequests.set(requestId, { requestId, timer, resolve });
      machine.ws.send(
        JSON.stringify({
          action: 'proxy_request',
          requestId,
          path: fullPath,
          method: reqMethod,
          headers: {
            ...(authHeader ? { authorization: authHeader } : {}),
            ...(contentType ? { 'content-type': contentType } : {}),
          },
          body: reqBodyText,
        }),
      );
    });
  });
}
