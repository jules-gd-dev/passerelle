import { spawn } from 'node:child_process';
import os from 'node:os';
import type { Hono } from 'hono';

interface GpuInfo {
  name: string;
  utilization: number;
  memUsed: number;
  memTotal: number;
  memPercent: number;
}

export function setupStatsRoutes(app: Hono) {
  let prevCpuSample: { idle: number; total: number } | null = null;
  function sampleCpuTimes(): { idle: number; total: number } {
    let idle = 0;
    let total = 0;
    for (const core of os.cpus()) {
      const t = core.times;
      idle += t.idle;
      total += t.user + t.nice + t.sys + t.irq + t.idle;
    }
    return { idle, total };
  }

  const gpuCache: { data: GpuInfo[] | null; at: number } = {
    data: null,
    at: 0,
  };
  const GPU_CACHE_MS = 2500;

  async function queryGpus(): Promise<GpuInfo[] | null> {
    const now = Date.now();
    if (now - gpuCache.at < GPU_CACHE_MS) return gpuCache.data;
    gpuCache.at = now;

    return new Promise((resolve) => {
      let stdout = '';
      try {
        const child = spawn('nvidia-smi', ['--query-gpu=name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], { stdio: ['ignore', 'pipe', 'ignore'] });
        const timer = setTimeout(() => { try { child.kill(); } catch (_e) {} }, 2000);

        child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
        child.on('error', () => { gpuCache.data = null; resolve(null); });
        child.on('close', () => {
          clearTimeout(timer);
          const trimmed = stdout.trim();
          if (!trimmed) { gpuCache.data = null; resolve(null); return; }
          const gpus: GpuInfo[] = trimmed.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
            const parts = line.split(',').map((p) => p.trim());
            const name = parts[0] || 'GPU';
            const utilization = Number(parts[1]) || 0;
            const memUsed = Math.round((Number(parts[2]) || 0) * 1024 * 1024);
            const memTotal = Math.round((Number(parts[3]) || 0) * 1024 * 1024);
            const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : 0;
            return { name, utilization, memUsed, memTotal, memPercent };
          });
          gpuCache.data = gpus.length > 0 ? gpus : null;
          resolve(gpuCache.data);
        });
      } catch (_e) { gpuCache.data = null; resolve(null); }
    });
  }

  app.get('/api/stats', async (c) => {
    const now = sampleCpuTimes();
    let cpuPercent = 0;
    if (prevCpuSample) {
      const idleDiff = now.idle - prevCpuSample.idle;
      const totalDiff = now.total - prevCpuSample.total;
      cpuPercent = totalDiff > 0 ? Math.max(0, Math.min(100, (1 - idleDiff / totalDiff) * 100)) : 0;
    }
    prevCpuSample = now;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const load = os.loadavg();
    const gpus = await queryGpus();

    return c.json({
      cpuPercent: Math.round(cpuPercent * 10) / 10,
      cores: os.cpus().length,
      memTotal: totalMem,
      memUsed: totalMem - freeMem,
      memPercent: totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10 : 0,
      gpus,
      load1: load[0],
      load5: load[1],
      load15: load[2],
      uptime: os.uptime(),
    });
  });
}
