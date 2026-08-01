export const PASSERELLE_ASCII_LINES: string[] = [
  '██████╗  █████╗ ███████╗███████╗███████╗██████╗ ███████╗██╗     ██╗     ███████╗',
  '██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝██║     ██║     ██╔════╝',
  '██████╔╝███████║███████╗███████╗█████╗  ██████╔╝█████╗  ██║     ██║     █████╗  ',
  '██╔═══╝ ██╔══██║╚════██║╚════██║██╔══╝  ██╔══██╗██╔══╝  ██║     ██║     ██╔══╝  ',
  '██║     ██║  ██║███████║███████║███████╗██║  ██║███████╗███████╗███████╗███████╗',
  '╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝',
];

export const PASSERELLE_ASCII = PASSERELLE_ASCII_LINES.join('\n');

export function printBanner() {
  console.log(`\n${PASSERELLE_ASCII}\n`);
}

export const ANSI = {
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

// Draws a rounded-corner ASCII box with content CENTERED, so every line has
// equal left/right margins. ANSI color codes are stripped for width computation
// so the box hugs the visible text, not the invisible escape sequences.
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export function drawBox(lines: string[]): string {
  const visual = lines.map((l) => l.replace(ANSI_RE, ''));
  const width = Math.max(...visual.map((l) => l.length));
  const border = '─'.repeat(width + 4);
  const body = lines.map((l, i) => {
    const pad = Math.floor((width - visual[i].length) / 2);
    const rightPad = width - visual[i].length - pad;
    return `│  ${' '.repeat(pad)}${l}${' '.repeat(rightPad)}  │`;
  });
  return ['┌' + border + '┐', ...body, '└' + border + '┘'].join('\n');
}
