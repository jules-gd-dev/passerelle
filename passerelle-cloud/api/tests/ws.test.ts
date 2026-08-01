// IMPORTANT: the C2 registry (machineRegistry.ts) captures MACHINES_DB_PATH at
// module load time (DB_PATH constant). We must point it at a unique tmp file
// BEFORE the registry module is imported — which happens transitively through
// ws.ts. Static `import` statements are hoisted above any imperative code, so
// we set the env var first and then import the src/ modules dynamically.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP_DB = path.join(
  os.tmpdir(),
  `passerelle-ws-test-${process.pid}-${crypto.randomUUID()}.json`,
);
process.env.MACHINES_DB_PATH = TMP_DB;

import type { AddressInfo } from 'node:net';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import WebSocket from 'ws';

// Dynamically import AFTER env is set so machineRegistry picks up TMP_DB.
const { setupWebSocketServer } = await import('../src/ws.js');
const { machines } = await import('../src/state.js');
const { _reloadForTest } = await import('../src/machineRegistry.js');

let port: number;
let server: ReturnType<typeof serve>;

function connect(targetPort = port): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${targetPort}/ws`);
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMessage<T>(ws: WebSocket): Promise<T> {
  return new Promise((resolve, reject) => {
    ws.once('message', (raw) => {
      try {
        resolve(JSON.parse(raw.toString()) as T);
      } catch (err) {
        reject(err);
      }
    });
    ws.once('error', reject);
  });
}

async function register(
  ws: WebSocket,
  machineId: string,
  secret: string,
): Promise<{ status: string; id?: string; code?: string }> {
  const reply = nextMessage<{ status: string; id?: string; code?: string }>(ws);
  ws.send(
    JSON.stringify({
      action: 'register',
      machineId,
      secret,
      tunnelUrl: 'https://test.trycloudflare.com',
    }),
  );
  return reply;
}

function closeAndWait(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === ws.CLOSED) return resolve();
    ws.once('close', () => resolve());
    ws.close();
  });
}

async function waitFor(cond: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}

beforeAll(async () => {
  const app = new Hono();
  server = serve({ fetch: app.fetch, port: 0 });
  // C2: setupWebSocketServer now binds registrations through machineRegistry
  // implicitly (no more allowOpenRegistration / registerSecret options).
  setupWebSocketServer(server);
  await new Promise<void>((resolve) => {
    if (server.listening) return resolve();
    server.once('listening', () => resolve());
  });
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    fs.unlinkSync(TMP_DB);
  } catch {
    /* already gone */
  }
});

beforeEach(() => {
  machines.clear();
  // Start each test with a clean registry so prior binds don't leak across
  // tests. Drop the persisted file then reload the in-memory map from scratch.
  try {
    fs.unlinkSync(TMP_DB);
  } catch {
    /* ok */
  }
  _reloadForTest(TMP_DB);
});

afterEach(() => {
  machines.clear();
});

describe('Gateway WebSocket machine registry', () => {
  it('keeps the machine registered when a stale connection closes after re-registration (race condition)', async () => {
    // Same machineId + same secret for both registers: the second register
    // must succeed ('ok') because the secret matches the binding.
    const a = await connect();
    await register(a, 'race-machine', 'secret-race-machine');

    // The daemon reconnects: same machineId + same secret on a NEW connection.
    const b = await connect();
    await register(b, 'race-machine', 'secret-race-machine');
    expect(machines.has('race-machine')).toBe(true);

    // The OLD connection's close event fires AFTER B registered:
    // it must not delete the entry now owned by B.
    await closeAndWait(a);
    await new Promise((r) => setTimeout(r, 100)); // let the server process the close
    expect(machines.has('race-machine')).toBe(true);

    // The entry must be tied to B's lifecycle: closing B removes it.
    await closeAndWait(b);
    await waitFor(() => !machines.has('race-machine'));
  });

  it('removes the machine when its owning connection closes', async () => {
    const a = await connect();
    await register(a, 'solo-machine', 'secret-solo');
    expect(machines.has('solo-machine')).toBe(true);

    await closeAndWait(a);
    await waitFor(() => !machines.has('solo-machine'));
  });

  it('re-keys the connection when the daemon registers with a new machineId', async () => {
    // Each machineId has its own secret; two distinct machineIds = two binds,
    // both must succeed.
    const a = await connect();
    await register(a, 'old-id', 'secret-old');
    expect(machines.has('old-id')).toBe(true);

    const reply = await register(a, 'new-id', 'secret-new');
    expect(reply.status).toBe('registered');
    expect(reply.id).toBe('new-id');
    expect(machines.has('old-id')).toBe(false);
    expect(machines.has('new-id')).toBe(true);

    // The re-keyed entry must be tied to this connection's lifecycle.
    await closeAndWait(a);
    await waitFor(() => !machines.has('new-id'));
  });
});

describe('Gateway WebSocket C2 machine/secret handshake', () => {
  it('binds a new machineId on first register and registers successfully', async () => {
    const ws = await connect();
    const reply = await register(ws, 'bind-machine', 'secret-bind');
    expect(reply.status).toBe('registered');
    expect(reply.id).toBe('bind-machine');
    expect(machines.has('bind-machine')).toBe(true);
    await closeAndWait(ws);
    await waitFor(() => !machines.has('bind-machine'));
  });

  it('accepts a re-register with the SAME machineId and SAME secret', async () => {
    const first = await connect();
    const r1 = await register(first, 'rebind-machine', 'secret-rebind');
    expect(r1.status).toBe('registered');
    await closeAndWait(first);
    await waitFor(() => !machines.has('rebind-machine'));

    // A second daemon instance (new connection) presents the same pair.
    const second = await connect();
    const r2 = await register(second, 'rebind-machine', 'secret-rebind');
    expect(r2.status).toBe('registered');
    expect(r2.id).toBe('rebind-machine');
    expect(machines.has('rebind-machine')).toBe(true);
    await closeAndWait(second);
    await waitFor(() => !machines.has('rebind-machine'));
  });

  it('rejects a register with the same machineId but a DIFFERENT secret', async () => {
    // First the daemon binds with secret-A.
    const owner = await connect();
    await register(owner, 'hijack-machine', 'secret-A');
    await closeAndWait(owner);
    await waitFor(() => !machines.has('hijack-machine'));

    // An attacker (or a tampered daemon) tries to reclaim the machineId with
    // a different secret -> must be rejected and the connection closed.
    const attacker = await connect();
    const reply = await register(attacker, 'hijack-machine', 'secret-B');
    expect(reply.status).toBe('rejected');
    expect(reply.code).toBe('machine_secret_mismatch');
    expect(machines.has('hijack-machine')).toBe(false);
    // The gateway closes the connection after the mismatch.
    await new Promise<void>((resolve) => {
      if (attacker.readyState === attacker.CLOSED) return resolve();
      attacker.once('close', () => resolve());
    });
    expect(attacker.readyState).toBe(attacker.CLOSED);
  });

  it('rejects a register with a missing machineId or secret', async () => {
    // Missing machineId.
    const wsNoId = await connect();
    const replyNoId = nextMessage<{ status: string; code?: string }>(wsNoId);
    wsNoId.send(
      JSON.stringify({
        action: 'register',
        secret: 'whatever',
        tunnelUrl: 'https://test.trycloudflare.com',
      }),
    );
    const noId = await replyNoId;
    expect(noId.status).toBe('rejected');
    expect(noId.code).toBe('unauthorized');
    expect(machines.size).toBe(0);
    await new Promise<void>((resolve) => {
      if (wsNoId.readyState === wsNoId.CLOSED) return resolve();
      wsNoId.once('close', () => resolve());
    });
    expect(wsNoId.readyState).toBe(wsNoId.CLOSED);

    // Missing secret.
    const wsNoSecret = await connect();
    const replyNoSecret = nextMessage<{
      status: string;
      code?: string;
    }>(wsNoSecret);
    wsNoSecret.send(
      JSON.stringify({
        action: 'register',
        machineId: 'no-secret',
        tunnelUrl: 'https://test.trycloudflare.com',
      }),
    );
    const noSecret = await replyNoSecret;
    expect(noSecret.status).toBe('rejected');
    expect(noSecret.code).toBe('unauthorized');
    expect(machines.size).toBe(0);
    await new Promise<void>((resolve) => {
      if (wsNoSecret.readyState === wsNoSecret.CLOSED) return resolve();
      wsNoSecret.once('close', () => resolve());
    });
    expect(wsNoSecret.readyState).toBe(wsNoSecret.CLOSED);
  });
});
