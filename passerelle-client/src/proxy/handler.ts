import httpProxy from 'http-proxy';
import type { Hono } from 'hono';
import type { ServiceItem } from '../types.js';
import { services } from '../services/storage.js';
import { GATEWAY_WEB_URL, daemonConfig } from '../utils/config.js';
import { verifyJWT } from '../utils/jwt.js';
import { assertSafeNetworkTarget } from '../utils/ssrf.js';
import { getNoServiceHtml, getErrorPageHtml } from './pages.js';

import { getCookie, setCookie } from 'hono/cookie';

export function createServiceProxy(app: Hono) {
  const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: true });

  proxy.on('error', (err, _req, res) => {
    console.error('[http-proxy error]', err);
    if (res && 'writeHead' in res && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Service unavailable');
    }
  });

  app.all('*', async (c) => {
    if (c.req.path.startsWith('/api/')) return c.text(`API route not found: ${c.req.path}`, 404);

    let targetService: ServiceItem | undefined;

    const host = c.req.header('host');
    if (host) {
      targetService = Array.from(services.values()).find((s) => {
        if (!(s as any).tunnelUrl) return false;
        try {
          return new URL((s as any).tunnelUrl).host === host;
        } catch { return false; }
      });
    }

    if (!targetService) {
      let requestedId = c.req.query('__ps_service') || c.req.query('service') || c.req.query('cli') || c.req.query('id');
      const requestedPort = c.req.query('__ps_port');
      
      if (requestedId) {
        setCookie(c, 'passerelle_active_service', requestedId, { path: '/', sameSite: 'Lax', secure: true });
      } else {
        requestedId = getCookie(c, 'passerelle_active_service') || '';
      }

      if (requestedId) targetService = services.get(requestedId) || Array.from(services.values()).find((s) => s.name === requestedId);
      if (!targetService) targetService = Array.from(services.values()).find((s) => s.status === 'running');
    }

    if (!targetService) return c.html(getNoServiceHtml(GATEWAY_WEB_URL));

    let localPort = targetService.port;
    const reqPortQuery = c.req.query('__ps_port');
    if (reqPortQuery && targetService.ports && targetService.ports.includes(Number(reqPortQuery))) {
      localPort = Number(reqPortQuery);
    }

    const targetUrl = targetService.type === 'network' && targetService.target ? targetService.target : `http://127.0.0.1:${localPort}`;

    // M2: re-check network targets at proxy time so a service edited directly
    // in services.json (bypassing the HTTP API) cannot reach a private range.
    if (targetService.type === 'network' && targetService.target) {
      try {
        await assertSafeNetworkTarget(targetService.target);
      } catch {
        return c.text('Blocked: unsafe network target', 400);
      }
    }

    const req = (c.env as any)?.incoming;
    const res = (c.env as any)?.outgoing;

    if (req && res) {
      return new Promise<Response>((_resolve) => {
        let finished = false;
        const sendError = (errMessage: string) => {
          if (!finished && !res.headersSent) {
            finished = true;
            console.error(`[Proxy Error] Failed to reach ${targetService!.name}: ${errMessage}`);
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(getErrorPageHtml(targetService!.name, targetUrl));
          }
        };

        const timer = setTimeout(() => { sendError('Connection timed out within 4.5s'); }, 4500);
        res.on('finish', () => { finished = true; clearTimeout(timer); });
        res.on('close', () => { finished = true; clearTimeout(timer); });

        proxy.web(req, res, { target: targetUrl }, (err) => {
          clearTimeout(timer);
          sendError(err.message || 'Connection failed');
        });
      });
    }

    return c.text('Service proxy unavailable', 502);
  });

  return proxy;
}

export function setupWsProxy(server: any, proxy: httpProxy) {
  server.on('upgrade', async (req: any, socket: any, head: any) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const queryToken = url.searchParams.get('token');
    const cookieMatch = (req.headers.cookie || '').match(/passerelle_token=([^;]+)/);
    const cookieToken = cookieMatch ? cookieMatch[1] : null;

    // H3: the token may come from the URL query or the httpOnly cookie only.
    // Reading it from the Referer header is removed: a Referer leak on any
    // proxied subrequest would otherwise expose the session token.
    const token = queryToken || cookieToken;
    if (!token || !verifyJWT(token, daemonConfig.jwtSecret, daemonConfig.revokedBefore, daemonConfig.apiRevokedBefore)) {
      socket.destroy(); return;
    }

    let requestedId = url.searchParams.get('service') || url.searchParams.get('cli') || url.searchParams.get('id');
    if (!requestedId) {
      const activeMatch = (req.headers.cookie || '').match(/passerelle_active_service=([^;]+)/);
      if (activeMatch) requestedId = activeMatch[1];
    }
    let target: ServiceItem | undefined;
    if (requestedId) target = services.get(requestedId) || Array.from(services.values()).find((s) => s.name === requestedId);
    if (!target) target = Array.from(services.values()).find((s) => s.status === 'running');

    if (target) {
      const targetUrl = target.type === 'network' && target.target ? target.target : `http://127.0.0.1:${target.port}`;
      if (target.type === 'network' && target.target) {
        try {
          await assertSafeNetworkTarget(target.target);
        } catch {
          socket.destroy();
          return;
        }
      }
      proxy.ws(req, socket, head, { target: targetUrl });
    } else {
      socket.destroy();
    }
  });
}
