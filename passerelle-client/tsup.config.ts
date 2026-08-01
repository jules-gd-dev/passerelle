import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

let commitHash = '';
try {
  commitHash = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch (_e) {
  /* not a git checkout */
}

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  clean: true,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    COMMIT_HASH: JSON.stringify(commitHash),
  },
});
