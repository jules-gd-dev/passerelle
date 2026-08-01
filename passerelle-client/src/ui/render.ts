import qrcode from 'qrcode-terminal';
import type { DaemonRuntime } from '../daemon/runtime.js';
import { services } from '../services/storage.js';
import { isDebug, GATEWAY_WEB_URL, PIN_TTL_SECONDS } from '../utils/config.js';
import { getTerminalWidth, getTerminalHeight, centerLine, getHiddenQRBoxLines } from '../utils/term.js';

export function renderProgressBar(remainingSec: number, totalSec: number, width = 24): string {
  const ratio = Math.max(0, Math.min(1, remainingSec / totalSec));
  const remainingCount = Math.round(ratio * width);
  const elapsedCount = width - remainingCount;

  const remainingBar = `\x1B[97m${'█'.repeat(remainingCount)}\x1B[0m`;
  const elapsedBar = `\x1B[90m${'█'.repeat(elapsedCount)}\x1B[0m`;

  return `[${remainingBar}${elapsedBar}]`;
}

export function renderUI(runtime: DaemonRuntime) {
  if (isDebug || !runtime.machineIdStored) return;

  const termWidth = getTerminalWidth();
  const termHeight = getTerminalHeight();
  const elapsedSec = Math.floor((Date.now() - runtime.pinCreatedAt) / 1000);
  const remainingSec = Math.max(0, PIN_TTL_SECONDS - elapsedSec);

  const servicesList = Array.from(services.values());
  const upCount = servicesList.filter((s) => s.status === 'running').length;
  const downCount = servicesList.filter((s) => s.status === 'stopped').length;
  const servicesSummary = `${upCount} up / 0 in failure / ${downCount} down`;
  const connectUrl = `${GATEWAY_WEB_URL}?machine=${runtime.machineIdStored}&pin=${runtime.pin}`;

  const contentLines: string[] = [];
  contentLines.push(centerLine('██████╗  █████╗ ███████╗███████╗███████╗██████╗ ███████╗██╗     ██╗     ███████╗', termWidth));
  contentLines.push(centerLine('██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝██║     ██║     ██╔════╝', termWidth));
  contentLines.push(centerLine('██████╔╝███████║███████╗███████╗█████╗  ██████╔╝█████╗  ██║     ██║     █████╗  ', termWidth));
  contentLines.push(centerLine('██╔═══╝ ██╔══██║╚════██║╚════██║██╔══╝  ██╔══██╗██╔══╝  ██║     ██║     ██╔══╝  ', termWidth));
  contentLines.push(centerLine('██║     ██║  ██║███████║███████║███████╗██║  ██║███████╗███████╗███████╗███████╗', termWidth));
  contentLines.push(centerLine('╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝', termWidth));
  contentLines.push('');

  if (runtime.isLoading) {
    contentLines.push('', centerLine(`[LOADING] ${runtime.loadingText}`, termWidth), '');
  } else {
    if (runtime.privacyMode) {
      for (const line of getHiddenQRBoxLines()) { contentLines.push(centerLine(line, termWidth)); }
    } else {
      qrcode.generate(connectUrl, { small: true }, (qr) => {
        for (const line of qr.split('\n')) { if (line) contentLines.push(centerLine(line, termWidth)); }
      });
      contentLines.push('', centerLine(renderProgressBar(remainingSec, PIN_TTL_SECONDS, 24), termWidth), '');
    }

    contentLines.push(centerLine('-> Scan this QR code to connect', termWidth), '');
    contentLines.push(centerLine(`Services Status    : ${servicesSummary}`, termWidth));
    contentLines.push(centerLine('Gateway WebSocket  : [CONNECTED]', termWidth));

    if (runtime.actionMessage) {
      contentLines.push('', centerLine(runtime.actionMessage, termWidth));
    }
    contentLines.push(centerLine('────────────────────────────────────────────────────────────────────────────────', termWidth));
    contentLines.push(centerLine('[r] Renew PIN   [s] Copy Link   [c] Connections   [l] View Svcs   [h] Hide   [k] Finish all sessions   [p] Re-register   [d] Detach   [q] Quit', termWidth));
  }

  const totalContentHeight = contentLines.length;
  const topPadding = Math.max(0, Math.floor((termHeight - totalContentHeight) / 2));

  const buf = '\x1B[2J\x1B[3J\x1B[H' + '\n'.repeat(topPadding) + contentLines.join('\n') + '\n';
  runtime.broadcastUIRender(buf);
}
