import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type WebSocket from 'ws';
import { setupApiRoutes } from '../src/routes/api.js';
import { machines, pendingValidations } from '../src/state.js';

function buildApp() {
  const app = new Hono();
  setupApiRoutes(app);
  return app;
}

function mockMachine(
  machineId: string,
  tunnelUrl: string,
  handoffSent: string[],
) {
  const ws = {
    readyState: 1, // OPEN
    send: (msgStr: string) => {
      const data = JSON.parse(msgStr);
      if (data.action === 'validate_pin') {
        // Resolve the PIN validation as if the daemon validated it.
        const pending = pendingValidations.get(data.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          pendingValidations.delete(data.requestId);
          pending.resolve({
            success: true,
            sessionToken: 'daemon-session-token-xyz',
            tunnelUrl,
          });
        }
      } else {
        // Capture handoff pushes for assertions.
        handoffSent.push(msgStr);
      }
    },
  } as unknown as WebSocket;
  machines.set(machineId, {
    id: machineId,
    tunnelUrl,
    ws,
    lastSeen: Date.now(),
  });
  return ws;
}

describe('POST /api/validate-pin (Zero-Knowledge Relay)', () => {
  beforeEach(() => {
    machines.clear();
    pendingValidations.clear();
  });

  it('should return 400 when machineId is missing', async () => {
    const app = buildApp();
    const response = await app.request('/api/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '123456' }),
    });
    expect(response.status).toBe(400);
  });

  it('should return 404 if the Daemon is not connected', async () => {
    const app = buildApp();
    const response = await app.request('/api/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId: 'unknown-id', pin: '123456' }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('should return 401 if the Daemon rejects the PIN', async () => {
    const app = buildApp();
    const mockWs = {
      readyState: 1, // OPEN
      send: (msgStr: string) => {
        const data = JSON.parse(msgStr);
        if (data.action === 'validate_pin') {
          const pending = pendingValidations.get(data.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingValidations.delete(data.requestId);
            pending.resolve({
              success: false,
              code: 'invalid_pin',
              message: 'PIN invalide',
            });
          }
        }
      },
    } as unknown as WebSocket;

    machines.set('machine-123', {
      id: 'machine-123',
      tunnelUrl: 'https://test.trycloudflare.com',
      ws: mockWs,
      lastSeen: Date.now(),
    });

    const response = await app.request('/api/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId: 'machine-123', pin: '000000' }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('should return 200 with tunnelUrl and store the token in an httpOnly cookie when the Daemon validates the PIN', async () => {
    const app = buildApp();
    const mockWs = {
      readyState: 1, // OPEN
      send: (msgStr: string) => {
        const data = JSON.parse(msgStr);
        if (data.action === 'validate_pin') {
          const pending = pendingValidations.get(data.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingValidations.delete(data.requestId);
            pending.resolve({
              success: true,
              sessionToken: 'daemon-session-token-xyz',
              tunnelUrl: 'https://test.trycloudflare.com',
            });
          }
        }
      },
    } as unknown as WebSocket;

    machines.set('machine-123', {
      id: 'machine-123',
      tunnelUrl: 'https://test.trycloudflare.com',
      ws: mockWs,
      lastSeen: Date.now(),
    });

    const response = await app.request('/api/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId: 'machine-123', pin: '123456' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // H4: the session token is stored in an httpOnly cookie, NOT in the body.
    expect(body.sessionToken).toBeUndefined();
    expect(body.tunnelUrl).toBe('https://test.trycloudflare.com');
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain('__Host-passerelle_sessions=');
    expect(setCookie).toContain('HttpOnly');
    // H4: the cookie is encrypted — the raw token must NOT appear in plaintext.
    expect(setCookie).not.toContain('daemon-session-token-xyz');
  });
});

describe('GET /api/open (C2 one-time handoff code)', () => {
  beforeEach(() => {
    machines.clear();
    pendingValidations.clear();
  });

  it('redirects to the daemon tunnel with ?code= and NEVER with the token in the URL', async () => {
    const app = buildApp();
    const handoffSent: string[] = [];
    mockMachine('machine-123', 'https://test.trycloudflare.com', handoffSent);

    // Seed an encrypted session cookie holding the real session token.
    const seed = await app.request('/api/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId: 'machine-123', pin: '123456' }),
    });
    // resolve the daemon validation synchronously (mocked in the WS send below)
    // — but here the mock WS resolves immediately, so the cookie is set:
    const cookie = (seed.headers.get('set-cookie') || '').split(';')[0];

    const response = await app.request('/api/open/machine-123/svc-1', {
      headers: { cookie },
    });

    expect(response.status).toBe(302);
    const location = response.headers.get('location') || '';
    // C2: only the one-time code reaches the daemon URL — the token must NOT.
    expect(location).toContain('code=');
    expect(location).not.toContain('token=');
    expect(location).not.toContain('daemon-session-token');
    expect(location).toContain('service=svc-1');
    // A handoff message was pushed over the trusted WS.
    expect(handoffSent.length).toBeGreaterThanOrEqual(1);
    const handoff = JSON.parse(handoffSent[handoffSent.length - 1]);
    expect(handoff.action).toBe('handoff');
    expect(handoff.token).toBe('daemon-session-token-xyz');
  });

  it('returns 401 when no session exists for the machine', async () => {
    const app = buildApp();
    const handoffSent: string[] = [];
    mockMachine('machine-123', 'https://test.trycloudflare.com', handoffSent);
    const response = await app.request('/api/open/machine-123/svc-1');
    expect(response.status).toBe(401);
    expect(handoffSent).toHaveLength(0);
  });
});

describe('DELETE /api/session/:machineId', () => {
  beforeEach(() => {
    machines.clear();
    pendingValidations.clear();
  });

  async function login(app: ReturnType<typeof buildApp>) {
    const mockWs = {
      readyState: 1, // OPEN
      send: (msgStr: string) => {
        const data = JSON.parse(msgStr);
        if (data.action === 'validate_pin') {
          const pending = pendingValidations.get(data.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingValidations.delete(data.requestId);
            pending.resolve({
              success: true,
              sessionToken: 'daemon-session-token-xyz',
              tunnelUrl: 'https://test.trycloudflare.com',
            });
          }
        }
      },
    } as unknown as WebSocket;
    machines.set('machine-123', {
      id: 'machine-123',
      tunnelUrl: 'https://test.trycloudflare.com',
      ws: mockWs,
      lastSeen: Date.now(),
    });
    const res = await app.request('/api/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId: 'machine-123', pin: '123456' }),
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    return setCookie as string;
  }

  it('disconnects a machine and clears the __Host- session cookie without throwing', async () => {
    const app = buildApp();
    const cookie = await login(app);

    // Regression: __Host- prefix requires Secure even when expiring the cookie;
    // Hono's serializer rejects deleteCookie without it.
    const response = await app.request('/api/session/machine-123', {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    const cleared = response.headers.get('set-cookie');
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain('Secure');
  });

  it('clears all sessions on logout (empty map)', async () => {
    const app = buildApp();
    const cookie = await login(app);
    const response = await app.request('/api/session/machine-123', {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});

describe('GET /api/version-info', () => {
  it('exposes the gateway version policy with defaults', async () => {
    delete process.env.VERSION_MIN_REQUIRED;
    delete process.env.VERSION_MIN_RECOMMENDED;
    delete process.env.VERSION_STARTUP_ANNOUNCEMENT;
    const app = buildApp();
    const response = await app.request('/api/version-info');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.min_required).toBe('0.0.0');
    expect(body.min_recommended).toBe('0.0.0');
    expect(body.custom_startup_announcement).toBe('');
  });

  it('exposes configured thresholds', async () => {
    process.env.VERSION_MIN_REQUIRED = '1.2.3';
    process.env.VERSION_MIN_RECOMMENDED = '1.5.0';
    process.env.VERSION_STARTUP_ANNOUNCEMENT = 'Maintenance vendredi';
    try {
      const app = buildApp();
      const response = await app.request('/api/version-info');
      const body = await response.json();
      expect(body.min_required).toBe('1.2.3');
      expect(body.min_recommended).toBe('1.5.0');
      expect(body.custom_startup_announcement).toBe('Maintenance vendredi');
    } finally {
      delete process.env.VERSION_MIN_REQUIRED;
      delete process.env.VERSION_MIN_RECOMMENDED;
      delete process.env.VERSION_STARTUP_ANNOUNCEMENT;
    }
  });
});
