import { DAEMON_VERSION, DAEMON_COMMIT_HASH } from '../version.js';

// Local daemon version/commit, always available (no network). `--json`/`-j`
// emits machine-readable output for scripts.
export function handleVersionCommands(cmd: string): boolean {
  if (cmd !== 'version' && cmd !== '-v' && cmd !== '--version') return false;

  const isJson = process.argv.includes('--json') || process.argv.includes('-j');

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          name: 'passerelle',
          version: DAEMON_VERSION,
          commit_hash: DAEMON_COMMIT_HASH,
        },
        null,
        2,
      ),
    );
    return true;
  }

  console.log(`Passerelle v${DAEMON_VERSION}${DAEMON_COMMIT_HASH ? ` (${DAEMON_COMMIT_HASH.slice(0, 7)})` : ''}`);
  return true;
}
