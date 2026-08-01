import type { Hono } from 'hono';
import { DAEMON_VERSION, DAEMON_COMMIT_HASH } from '../version.js';

// Authenticated version endpoint: reachable only through the gateway proxy
// (session/API token required), so unauthenticated callers learn nothing.
export function setupVersionRoute(app: Hono) {
  app.get('/version', (c) =>
    c.json({ version: DAEMON_VERSION, commit_hash: DAEMON_COMMIT_HASH }),
  );
}
