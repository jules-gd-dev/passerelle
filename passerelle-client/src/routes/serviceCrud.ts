import crypto from 'node:crypto';
import type { Hono } from 'hono';
import type { ServiceItem } from '../types.js';
import { services, saveServicesToFile } from '../services/storage.js';
import { logBuffers } from '../services/logs.js';
import { assertSafeNetworkTarget } from '../utils/ssrf.js';

// M6: a port must be a valid TCP port (1..65535). Anything else would flow into
// `http://127.0.0.1:${port}` and produce a malformed or misleading target URL.
function normalizePort(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error('Invalid port (must be 1..65535)');
  return n;
}

function normalizePorts(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((p) => {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error('Invalid port (must be 1..65535)');
    return n;
  });
}

import type { DaemonRuntime } from '../daemon/runtime.js';

export function setupServiceCrudRoutes(app: Hono, runtime: DaemonRuntime, sendRegistration: () => void) {
  const onAction = (msg: string) => runtime.setActionMessage(msg);
  app.get('/api/services', (c) => {
    const list = Array.from(services.values()).map(({ process: _p, ...rest }) => rest);
    return c.json(list);
  });

  app.get('/api/clis', (c) => {
    const list = Array.from(services.values()).map(({ process: _p, ...rest }) => rest);
    return c.json(list);
  });

  app.get('/api/services/:id/logs', (c) => {
    const id = c.req.param('id');
    const logs = logBuffers.get(id) || [];
    return c.json(logs);
  });

  app.post('/api/services', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { name, type, icon, command, args, port: reqPort, ports: reqPorts, target } = body;
    if (!name) return c.json({ error: 'Service name is required' }, 400);

    const serviceType: 'cli' | 'docker' | 'network' = type || 'cli';
    if ((serviceType === 'cli' || serviceType === 'docker') && !reqPort && (!reqPorts || reqPorts.length === 0)) {
      return c.json({ error: 'Port(s) required for cli/docker services' }, 400);
    }
    if (serviceType === 'network' && !target) return c.json({ error: 'Target URL is required for network services' }, 400);
    if (serviceType === 'network' && target) {
      try { await assertSafeNetworkTarget(target); }
      catch (e: any) { return c.json({ error: e.message || 'Invalid target' }, 400); }
    }

    const newId = crypto.randomUUID();
    let normalizedPort: number | undefined;
    let normalizedPorts: number[] | undefined;
    try {
      normalizedPort = normalizePort(reqPort);
      normalizedPorts = normalizePorts(reqPorts);
    } catch (e: any) {
      return c.json({ error: e.message || 'Invalid port' }, 400);
    }
    const service: ServiceItem = {
      id: newId,
      name,
      type: serviceType,
      icon: icon || '',
      command: command || '',
      args: Array.isArray(args) ? args : typeof args === 'string' ? args.split(' ').filter(Boolean) : [],
      port: normalizedPort,
      ports: normalizedPorts,
      target: target || '',
      status: serviceType === 'network' ? 'running' : 'stopped',
    };

    services.set(newId, service);
    saveServicesToFile(services);
    
    if (serviceType === 'network') {
      void runtime.tunnelManager.startTunnel(newId, runtime.port, (url) => {
        (service as any).tunnelUrl = url;
        sendRegistration();
      });
    }

    onAction(`[ADD] Added service ${name}`);
    const { process: _p, ...resData } = service;
    return c.json(resData, 201);
  });

  app.put('/api/services/:id', async (c) => {
    const id = c.req.param('id');
    const targetService = services.get(id);
    if (!targetService) return c.json({ error: 'Service not found' }, 404);
    const body = await c.req.json().catch(() => ({}));
    if (targetService.process) { try { targetService.process.kill(); } catch (_e) {} delete targetService.process; }
    targetService.status = 'stopped';

    if (body.name !== undefined) targetService.name = body.name;
    if (body.type !== undefined) targetService.type = body.type;
    if (body.icon !== undefined) targetService.icon = body.icon;
    if (body.command !== undefined) targetService.command = body.command;
    if (body.args !== undefined) targetService.args = Array.isArray(body.args) ? body.args : typeof body.args === 'string' ? body.args.split(' ').filter(Boolean) : [];
    try {
      if (body.port !== undefined) targetService.port = normalizePort(body.port);
      if (body.ports !== undefined) targetService.ports = normalizePorts(body.ports);
    } catch (e: any) {
      return c.json({ error: e.message || 'Invalid port' }, 400);
    }
    if (body.target !== undefined) targetService.target = body.target;
    if (targetService.type === 'network' && targetService.target) {
      try { await assertSafeNetworkTarget(targetService.target); }
      catch (e: any) { return c.json({ error: e.message || 'Invalid target' }, 400); }
    }
    if (targetService.type === 'network') {
      targetService.status = 'running';
      void runtime.tunnelManager.startTunnel(id, runtime.port, (url) => {
        (targetService as any).tunnelUrl = url;
        sendRegistration();
      });
    }

    saveServicesToFile(services);
    onAction(`[EDIT] Updated service ${targetService.name}`);
    const { process: _p, ...resData } = targetService;
    return c.json(resData);
  });

  app.delete('/api/services/:id', async (c) => {
    const id = c.req.param('id');
    const targetService = services.get(id);
    if (!targetService) return c.json({ error: 'Service not found' }, 404);
    if (targetService.process) { try { targetService.process.kill(); } catch (_e) {} }
    runtime.tunnelManager.stopTunnel(id);
    services.delete(id);
    logBuffers.delete(id);
    saveServicesToFile(services);
    sendRegistration();
    onAction(`[DEL] Removed service ${targetService.name}`);
    return c.json({ success: true, message: 'Service removed' });
  });
}
