import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { bin, install } from 'cloudflared';
import type { DaemonRuntime } from './runtime.js';
import { isDebug } from '../utils/config.js';
import { logInline } from '../utils/term.js';

// The cloudflared binary ships as an npm dependency (`cloudflared` package): it
// is downloaded on first use, so users do NOT need to install cloudflared on
// their system. The binary lives in the package's own bin/ dir.
export class TunnelManager {
  private runtime: DaemonRuntime;
  private binPath: string | null = null;
  private tunnels = new Map<string, { process: ChildProcess, url: string | null }>();

  constructor(runtime: DaemonRuntime) {
    this.runtime = runtime;
  }

  async init() {
    logInline('(3/4)', 'Resolving Cloudflared binary...');
    try {
      if (!fs.existsSync(bin)) {
        logInline('(3/4)', 'Downloading Cloudflare tunnel binary (first run)...');
        await install(bin);
      }
      this.binPath = bin;
    } catch (err) {
      console.error('[cloudflared] Failed to obtain the tunnel binary:', err);
      console.error('[cloudflared] Install it manually with: npm i -g cloudflared');
    }
  }

  async startTunnel(tunnelId: string, targetPort: number, onUrlFound: (url: string) => void): Promise<void> {
    if (!this.binPath) return;
    if (this.tunnels.has(tunnelId)) this.stopTunnel(tunnelId);

    const args = ['tunnel', '--config', '/dev/null', '--url', `http://127.0.0.1:${targetPort}`];
    if (isDebug) args.push('--loglevel', 'debug');

    const cp = spawn(this.binPath, args);
    const tunnelState = { process: cp, url: null as string | null };
    this.tunnels.set(tunnelId, tunnelState);

    const cloudflareRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

    const handleOutput = (data: Buffer) => {
      const output = data.toString();
      if (isDebug) process.stdout.write(`[cloudflared log ${tunnelId}] ${output}`);
      
      if (!tunnelState.url) {
        if (output.includes('429 Too Many Requests') || output.includes('1015')) {
          console.error(`\n[!] CLOUDFLARE RATE LIMIT REACHED for tunnel '${tunnelId}'.`);
          console.error(`[!] Cloudflare is temporarily blocking your IP because too many tunnels were requested.`);
          console.error(`[!] Please wait 10-15 minutes before trying again.\n`);
          this.stopTunnel(tunnelId);
          return;
        }

        const match = output.match(cloudflareRegex);
        if (match) {
          tunnelState.url = match[0];
          onUrlFound(tunnelState.url);
        }
      }
    };

    cp.stdout?.on('data', handleOutput);
    cp.stderr?.on('data', handleOutput);
    cp.on('error', (err) => {
      console.error(`[cloudflared ${tunnelId}] Process error:`, err);
    });
    cp.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`\n[!] cloudflared process for tunnel '${tunnelId}' exited unexpectedly with code ${code}.`);
      }
    });
  }

  stopTunnel(tunnelId: string) {
    const t = this.tunnels.get(tunnelId);
    if (t) {
      t.process.kill();
      this.tunnels.delete(tunnelId);
    }
  }

  stopAll() {
    for (const [id, t] of this.tunnels.entries()) {
      t.process.kill();
    }
    this.tunnels.clear();
  }
}

