import { GATEWAY_WEB_URL } from './config.js';
import { DAEMON_VERSION } from '../version.js';

export interface VersionInfo {
  min_recommended?: string;
  min_required?: string;
  custom_startup_announcement?: string;
}

// Versions are X.X.X-tag; the tag is informational and ignored by comparisons.
function parseVersionParts(v: string): [number, number, number] {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  return m
    ? [Number.parseInt(m[1], 10), Number.parseInt(m[2], 10), Number.parseInt(m[3], 10)]
    : [0, 0, 0];
}

export function compareVersions(a: string, b: string): number {
  const av = parseVersionParts(a);
  const bv = parseVersionParts(b);
  for (let i = 0; i < 3; i++) {
    if (av[i] !== bv[i]) return av[i] - bv[i];
  }
  return 0;
}

export function isOutdated(installed: string, min: string | undefined): boolean {
  if (!min) return false;
  return compareVersions(installed, min) < 0;
}

export async function fetchVersionInfo(timeoutMs = 3000): Promise<VersionInfo | null> {
  try {
    const res = await fetch(`${GATEWAY_WEB_URL}/api/version-info`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return data && typeof data === 'object' ? (data as VersionInfo) : null;
  } catch (_e) {
    return null;
  }
}

export interface VersionReportOptions {
  // When true, writes to stderr so stdout stays clean for piped output
  // (e.g. `passerelle link`, `--json` consumers).
  toStderr?: boolean;
}

export async function checkAndReportVersion(opts: VersionReportOptions = {}): Promise<void> {
  const info = await fetchVersionInfo(1500);
  if (!info) return;
  const out = opts.toStderr ? process.stderr : process.stdout;
  const write = (line: string) => out.write(line + '\n');

  if (info.custom_startup_announcement) {
    write(`\n\u001b[36m[ANNONCE]\u001b[0m ${info.custom_startup_announcement}\n`);
  }

  const requiredOutdated = isOutdated(DAEMON_VERSION, info.min_required);
  const recommendedOutdated = isOutdated(DAEMON_VERSION, info.min_recommended);

  if (requiredOutdated) {
    write('');
    write('\u001b[31m====================================================\u001b[0m');
    write('\u001b[31m  VERSION DU DAEMON PASSERELLE TROP ANCIENNE            \u001b[0m');
    write('\u001b[31m====================================================\u001b[0m');
    write(`  Installee   : ${DAEMON_VERSION}`);
    write(`  Recommandee : ${info.min_recommended || 'N/A'}`);
    write(`  Requise min : ${info.min_required || 'N/A'}`);
    write('');
    write('  Mettez a jour : npx passerelle@latest setup');
    write('\u001b[31m====================================================\u001b[0m\n');
  } else if (recommendedOutdated && info.min_recommended) {
    write('');
    write(`\u001b[33m[INFO] Une mise a jour de Passerelle est disponible : ${DAEMON_VERSION} -> ${info.min_recommended}\u001b[0m`);
    write('       npx passerelle@latest setup\n');
  }
}
