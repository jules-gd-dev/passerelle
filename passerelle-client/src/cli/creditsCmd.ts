import { GATEWAY_WEB_URL } from '../utils/config.js';
import { printBanner } from '../utils/banner.js';

export async function handleCreditsCommands(cmd: string): Promise<boolean> {
  if (cmd !== 'credits') return false;

  const url = `${GATEWAY_WEB_URL}/api/credits`;
  const isJson = process.argv.includes('--json') || process.argv.includes('-j');

  if (!isJson) {
    printBanner();
    console.log(`[INFO] Fetching project credits and acknowledgments from: ${GATEWAY_WEB_URL}...`);
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      if (isJson) {
        console.log(JSON.stringify({ error: `Gateway HTTP error: ${res.status}` }, null, 2));
      } else {
        console.error(`[ERROR] Gateway responded with HTTP status ${res.status}`);
      }
      process.exit(1);
    }

    const data: any = await res.json();

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
      return true;
    }

    const info = data.credits || data;
    console.log('\n=== PASSERELLE PROJECT CREDITS ===\n');
    console.log(`* Project Name (project_name)     : ${info.project_name || 'Passerelle'}`);
    console.log(`* Author / Creator (author)       : ${info.author || 'Jules GD (julesgd.dev)'}`);
    console.log(`* GitHub Repository (github)      : ${info.github || 'https://github.com/jules-gd-dev/paserelle'}`);
    console.log(`* Donations / Sponsors (donations): ${info.donations || 'https://github.com/sponsors/julesgd'}`);
    if (info.message) console.log(`* Message (message)               : ${info.message}`);
    console.log('\n-> Thank you for supporting Passerelle!\n');
    return true;
  } catch (err: any) {
    if (isJson) {
      console.log(JSON.stringify({ error: 'Failed to connect to gateway', details: err.message }, null, 2));
    } else {
      console.error(`[ERROR] Connection failure: cannot reach gateway (${GATEWAY_WEB_URL}).`);
      console.error(`Details: ${err.message}`);
    }
    process.exit(1);
  }
}
