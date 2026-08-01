import type { Context, Hono } from 'hono';
import { stageHandoff } from '../handoff.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { machines } from '../state.js';

export function setupLinkRoutes(app: Hono) {
  // H6: /link redirects to the daemon tunnel — rate-limit it so it cannot be
  // abused as an open-redirect / SSRF probe vector.
  const linkRateLimiter = createRateLimiter(120, 60000); // 120/min per IP+path
  app.use('/link/*', linkRateLimiter);

  const handleLinkRedirect = async (c: Context) => {
    const machineId = c.req.param('machineId');
    const serviceId = c.req.param('serviceId');
    if (!machineId || !serviceId) {
      return c.json({ error: 'Bad link path' }, 400);
    }

    const basePath = `/link/${machineId}/${serviceId}`;
    let path = c.req.path;
    if (path.startsWith(basePath)) path = path.slice(basePath.length);
    if (!path.startsWith('/')) path = `/${path}`;

    const machine = machines.get(machineId);
    if (!machine || !machine.tunnelUrl) {
      return c.json({ error: 'Machine offline or tunnel not established' }, 503);
    }

    // C2: accept the token via header (preferred) or query (legacy). Either way
    // it is exchanged for a one-time handoff code so the token itself never
    // reaches the daemon through a redirect URL.
    const token =
      c.req.header('X-Passerelle-Token') || c.req.query('passerelle_token');
    if (!token) {
      return c.json(
        {
          error:
            'Token missing (X-Passerelle-Token header or ?passerelle_token query param)',
        },
        401,
      );
    }

    const code = stageHandoff(machine.ws, token);
    if (!code) {
      return c.json({ error: 'Machine offline or tunnel not established' }, 503);
    }

    const reqUrl = new URL(c.req.url);
    const targetParams = new URLSearchParams();
    reqUrl.searchParams.forEach((val, key) => {
      if (key !== 'passerelle_token') targetParams.set(key, val);
    });

    targetParams.set('__ps_service', serviceId);
    targetParams.set('code', code);

    const requestedPort = c.req.query('__ps_port');
    if (requestedPort) targetParams.set('__ps_port', requestedPort);

    const finalUrl = `${machine.tunnelUrl}${path}?${targetParams.toString()}`;
    return c.redirect(finalUrl, 307);
  };

  app.all('/link/:machineId/:serviceId', handleLinkRedirect);
  app.all('/link/:machineId/:serviceId/*', handleLinkRedirect);
}
