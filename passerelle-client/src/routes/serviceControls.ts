import { spawn } from 'node:child_process';
import type { Hono } from 'hono';
import { services } from '../services/storage.js';
import { appendLogLine } from '../services/logs.js';
import { assertSafeNetworkTarget } from '../utils/ssrf.js';
import { buildChildEnv, isCommandAllowed } from '../utils/env.js';
import { daemonConfig } from '../utils/config.js';

export function setupServiceControlRoutes(app: Hono, onAction: (msg: string) => void, onRender: () => void) {
  app.post('/api/start', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const serviceId = body.id || body.cli || body.name;
    if (!serviceId) return c.json({ error: 'Service ID is required' }, 400);

    let target = services.get(serviceId);
    if (!target) {
      target = Array.from(services.values()).find((s) => s.id === serviceId || s.name.toLowerCase() === serviceId.toLowerCase());
    }
    if (!target) return c.json({ error: 'Service not found' }, 404);

    if (target.type === 'network') {
      // M2: re-validate the target at start time. A service created/edited
      // directly in services.json (bypassing the HTTP API) or whose DNS has
      // since been re-pointed to a private range must not slip through.
      if (target.target) {
        try {
          await assertSafeNetworkTarget(target.target);
        } catch (e: any) {
          return c.json({ error: e.message || 'Unsafe network target' }, 400);
        }
      }
      target.status = 'running';
      onAction(`[NET] Network service ${target.name} active`);
      const { process: _p, ...resData } = target;
      return c.json({ success: true, message: `${target.name} (network) is active`, service: resData });
    }

    if (target.status === 'running') {
      const { process: _p, ...resData } = target;
      return c.json({ success: true, message: `${target.name} is already running`, service: resData });
    }

    try {
      const spawnCmd = target.command || target.name.toLowerCase();
      // H1: optional command allowlist. When configured, block anything not on it.
      if (!isCommandAllowed(spawnCmd, daemonConfig.commandAllowlist)) {
        return c.json({ error: `Command not allowed by allowlist: ${spawnCmd}` }, 403);
      }
      const child = spawn(spawnCmd, target.args || [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        // H1: scrub host credentials out of the environment before handing it to
        // the child service. Keeps PATH/HOME etc. but drops SECRET/TOKEN/KEY vars.
        env: buildChildEnv(process.env, { BROWSER: 'none' }),
      });

      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          for (const line of data.toString().split('\n')) { if (line.trim()) appendLogLine(target!.id, line); }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          for (const line of data.toString().split('\n')) { if (line.trim()) appendLogLine(target!.id, line); }
        });
      }

      child.on('error', (err) => {
        appendLogLine(target!.id, `Process error: ${err.message}`);
        target!.status = 'stopped';
        delete target!.process;
        onRender();
      });

      child.on('exit', (code) => {
        appendLogLine(target!.id, `Process exited with code ${code}`);
        target!.status = 'stopped';
        delete target!.process;
        onRender();
      });

      target.status = 'running';
      target.process = child;
      appendLogLine(target.id, `Process started on port ${target.port}`);
      onAction(`[START] Started ${target.name} on port ${target.port}`);

      const { process: _p, ...resData } = target;
      return c.json({ success: true, message: `${target.name} started successfully`, service: resData });
    } catch (err: any) {
      return c.json({ error: err.message || 'Failed to start service' }, 500);
    }
  });

  app.post('/api/stop', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const serviceId = body.id || body.cli || body.name;
    if (!serviceId) return c.json({ error: 'Service ID is required' }, 400);

    let target = services.get(serviceId);
    if (!target) {
      target = Array.from(services.values()).find((s) => s.id === serviceId || s.name.toLowerCase() === serviceId.toLowerCase());
    }
    if (!target) return c.json({ error: 'Service not found' }, 404);

    if (target.process) { target.process.kill(); delete target.process; }
    target.status = 'stopped';
    appendLogLine(target.id, 'Process stopped by user request.');
    onAction(`[STOP] Stopped ${target.name}`);

    const { process: _p, ...resData } = target;
    return c.json({ success: true, message: `${target.name} stopped successfully`, service: resData });
  });
}
