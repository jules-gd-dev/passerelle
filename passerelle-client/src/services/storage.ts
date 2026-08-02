import crypto from 'node:crypto';
import fs from 'node:fs';
import type { ServiceItem } from '../types.js';
import { SERVICES_FILE } from '../utils/config.js';

export function loadServicesFromFile(): Map<string, ServiceItem> {
  const map = new Map<string, ServiceItem>();

  let fileContent: any[] = [];
  if (fs.existsSync(SERVICES_FILE)) {
    try {
      const raw = fs.readFileSync(SERVICES_FILE, 'utf-8');
      fileContent = JSON.parse(raw);
    } catch (_e) {
      fileContent = [];
    }
  }

  if (!Array.isArray(fileContent)) {
    fileContent = [];
  }

  let modified = false;
  for (const item of fileContent) {
    const id = item.id || crypto.randomUUID();
    if (!item.id) modified = true;

    const type: 'cli' | 'docker' | 'network' = item.type || 'cli';
    const status: 'running' | 'stopped' = type === 'network' ? 'running' : 'stopped';

    const service: ServiceItem = {
      id,
      name: item.name || 'Service',
      type,
      icon: item.icon || '',
      command: item.command || '',
      args: Array.isArray(item.args) ? item.args : [],
      port: item.port ? Number(item.port) : undefined,
      target: item.target || '',
      status,
    };

    map.set(id, service);
  }

  if (modified || !fs.existsSync(SERVICES_FILE)) {
    saveServicesToFile(map);
  }

  return map;
}

export function saveServicesToFile(servicesMap: Map<string, ServiceItem>) {
  const list = Array.from(servicesMap.values()).map(({ process: _p, ...rest }) => rest);
  try {
    fs.writeFileSync(SERVICES_FILE, JSON.stringify(list, null, 2), { encoding: 'utf-8', mode: 0o600 });
    try { fs.chmodSync(SERVICES_FILE, 0o600); } catch (_e2) {}
  } catch (err) {
    console.error('Failed to write services.json:', err);
  }
}

export const services = loadServicesFromFile();
