#!/usr/bin/env node
import { handleStatusCommands, STATUS_FILE, isJson, jsonOut } from './cli/status.js';
import { handlePm2Commands } from './cli/pm2.js';
import { handleAttachCommands } from './cli/attach.js';
import { handleConfigCommands } from './cli/configCmd.js';
import { handleCreditsCommands } from './cli/creditsCmd.js';
import { handleVersionCommands } from './cli/versionCmd.js';
import { checkAndReportVersion } from './utils/versionCheck.js';
import { printBanner } from './utils/banner.js';

export { STATUS_FILE };

async function handleCommand() {
  const cmd = (process.argv[2] || '').toLowerCase();

  // Version/help always print regardless of --json (no version banner on the
  // version command itself, and no announcement noise before it either).
  if (handleVersionCommands(cmd)) return;

  // Outdated-version + admin announcement banner (stderr, non-blocking, skipped
  // in JSON mode so piped JSON output stays clean).
  if (!isJson()) {
    await checkAndReportVersion({ toStderr: true });
  }

  if (handleStatusCommands(cmd)) return;
  if (handlePm2Commands(cmd)) return;
  if (handleAttachCommands(cmd)) return;
  if (handleConfigCommands(cmd)) return;
  if (await handleCreditsCommands(cmd)) return;

  if (isJson()) {
    jsonOut({ error: 'unknown_command', command: cmd, message: 'Run "passerelle help" for usage.' });
  } else {
    printBanner();
    console.error(`[ERROR] Unknown command: "${cmd}". Run "passerelle help" for usage.`);
  }
  process.exit(1);
}

handleCommand();
