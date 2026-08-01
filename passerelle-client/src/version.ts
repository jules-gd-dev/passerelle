// Build-time version constants. Injected by tsup's `define` (see tsup.config.ts)
// from package.json + `git rev-parse HEAD`. In dev (tsx) they fall back to a
// placeholder so `typeof` guards keep working.
declare const __VERSION__: string;
declare const COMMIT_HASH: string;

export const DAEMON_VERSION: string =
  typeof __VERSION__ === 'string' && __VERSION__ ? __VERSION__ : '0.0.0-dev';

export const DAEMON_COMMIT_HASH: string | null =
  typeof COMMIT_HASH === 'string' && COMMIT_HASH ? COMMIT_HASH : null;
