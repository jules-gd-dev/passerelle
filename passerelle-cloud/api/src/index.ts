import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import fs from 'node:fs';
import { setupApiRoutes } from './routes/api.js';
import { setupLinkRoutes } from './routes/link.js';
import { setupWebSocketServer } from './ws.js';

export * from './state.js';

const app = new Hono();

// M6: defense-in-depth security headers on every response.
// H4: no wildcard CORS — the PWA is same-origin (served by this server in prod).
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (c.req.path.startsWith('/api') || c.req.path === '/' || c.req.path.endsWith('.html')) {
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' wss: https:; frame-ancestors 'none'",
    );
  }
});

setupApiRoutes(app);
setupLinkRoutes(app);

const staticRoot = fs.existsSync('./public') ? './public' : fs.existsSync('../web/dist') ? '../web/dist' : null;
if (staticRoot) {
  app.use('*', serveStatic({ root: staticRoot }));
  app.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));
}

const port = Number.parseInt(process.env.PORT || '8787', 10);

const server = serve({ fetch: app.fetch, port });

setupWebSocketServer(server);

// Gateways non officielles : avertissement
const TUNNEL_HOSTNAME = process.env.TUNNEL_HOSTNAME || process.env.TUNNEL_URL || '';
const OFFICIAL_GATEWAY = 'passerelle-cloud.julesgd.dev';

if (TUNNEL_HOSTNAME && TUNNEL_HOSTNAME !== OFFICIAL_GATEWAY) {
  console.log();
  console.log(`\x1b[33m[Attention]\x1b[0m You are using an unofficial gateway. We strongly recommend switching to "${OFFICIAL_GATEWAY}".`);
  console.log(`Current gateway hostname: ${TUNNEL_HOSTNAME}`);
  console.log();
}

export { app };
