import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { bin, install } from 'cloudflared';
import type { DaemonRuntime } from './runtime.js';
import { isDebug } from '../utils/config.js';
import { logInline } from '../utils/term.js';

// The cloudflared binary ships as an npm dependency (`cloudflared` package): it
// is downloaded on first use, so users do NOT need to install cloudflared on
// their system. The binary lives in the package's own bin/ dir.
export async function startCloudflared(runtime: DaemonRuntime, activePort: number, onUrlFound: (url: string) => void) {
  logInline('(3/4)', 'Resolving Cloudflared binary...');
  let binPath: string;
  try {
    if (!fs.existsSync(bin)) {
      logInline('(3/4)', 'Downloading Cloudflare tunnel binary (first run)...');
      await install(bin);
    }
    binPath = bin;
  } catch (err) {
    console.error('[cloudflared] Failed to obtain the tunnel binary:', err);
    console.error('[cloudflared] Install it manually with: npm i -g cloudflared');
    return;
  }

  logInline('(3/4)', 'Establishing Cloudflare Quick Tunnel...');
  const args = ['tunnel', '--config', '/dev/null', '--url', `http://127.0.0.1:${activePort}`];
  if (isDebug) args.push('--loglevel', 'debug');

  runtime.cloudflaredProcess = spawn(binPath, args);

  let tunnelUrl: string | null = null;
  const cloudflareRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

  function handleOutput(data: Buffer) {
    const output = data.toString();
    if (isDebug) process.stdout.write(`[cloudflared log] ${output}`);
    if (!tunnelUrl) {
      const match = output.match(cloudflareRegex);
      if (match) {
        tunnelUrl = match[0];
        runtime.tunnelUrlStored = tunnelUrl;
        logInline('(3/4)', `Establishing Cloudflare Quick Tunnel... Done (${tunnelUrl})`);
        onUrlFound(tunnelUrl);
      }
    }
  }

  runtime.cloudflaredProcess.stdout?.on('data', handleOutput);
  runtime.cloudflaredProcess.stderr?.on('data', handleOutput);
  runtime.cloudflaredProcess.on('error', (err) => {
    console.error('[cloudflared] Process error:', err);
  });
}
