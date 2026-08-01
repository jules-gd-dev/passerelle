import { isDebug } from './config.js';

export function getTerminalWidth(): number {
  return process.stdout.columns && process.stdout.columns > 20
    ? process.stdout.columns
    : 80;
}

export function getTerminalHeight(): number {
  return process.stdout.rows && process.stdout.rows > 10
    ? process.stdout.rows
    : 24;
}

export function centerLine(text: string, width = getTerminalWidth()): string {
  const cleanText = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  const textLen = Array.from(cleanText).length;
  const padding = Math.max(0, Math.floor((width - textLen) / 2));
  return ' '.repeat(padding) + text;
}

export function getHiddenQRBoxLines(): string[] {
  return [
    '┌───────────────────────────┐',
    '│                           │',
    '│        [  LOCKED  ]       │',
    '│                           │',
    '│    [ PRIVACY MODE ON ]    │',
    '│    Press [h] to unhide    │',
    '│                           │',
    '└───────────────────────────┘',
  ];
}

export function logInline(step: string, detail: string) {
  if (isDebug) {
    process.stdout.write(`[Startup] ${step} ${detail}\n`);
    return;
  }
  const rows = getTerminalHeight();
  const topPadding = Math.max(0, Math.floor((rows - 6) / 2));
  let buf = '\x1B[2J\x1B[3J\x1B[H';
  buf += '\n'.repeat(topPadding);
  buf += `${centerLine(`[STARTUP] Getting ready... ${step}`)}\n\n`;
  buf += `${centerLine(detail)}\n`;
  process.stdout.write(buf);
}
