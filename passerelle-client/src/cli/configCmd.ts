import { loadDaemonConfig, saveDaemonConfig, GATEWAY_WEB_URL, GATEWAY_WS_URL, CONFIG_FILE } from '../utils/config.js';
import { printBanner } from '../utils/banner.js';
import { getStatus, isJson, jsonOut } from './status.js';

export function handleConfigCommands(cmd: string): boolean {
  if (cmd !== 'config') return false;

  const args = process.argv.slice(3);

  if (args.length === 0) {
    const cfg = loadDaemonConfig();
    if (isJson()) {
      jsonOut({
        configFile: CONFIG_FILE,
        gatewayUrl: GATEWAY_WEB_URL,
        gatewayWs: GATEWAY_WS_URL,
        machineId: cfg.machineId || null,
        revokedBefore: cfg.revokedBefore || 0,
        apiRevokedBefore: cfg.apiRevokedBefore || 0,
        commandAllowlist: cfg.commandAllowlist || [],
        gatewaySecret: cfg.gatewaySecret ? true : false,
      });
      return true;
    }
    printBanner();
    console.log('=== PASSERELLE CONFIGURATION ===\n');
    console.log(`* Config File (config_file)       : ${CONFIG_FILE}`);
    console.log(`* Gateway URL (gateway_url)       : ${GATEWAY_WEB_URL}`);
    console.log(`* Gateway WebSocket (gateway_ws)  : ${GATEWAY_WS_URL}`);
    console.log(`* Machine ID (machine_id)         : ${cfg.machineId || 'N/A (Generated upon first connection)'}`);
    console.log(`* Revoked Before (revoked_before)        : ${cfg.revokedBefore || 0}`);
    console.log(`* API Revoked Before (api_revoked_before): ${cfg.apiRevokedBefore || 0}`);
    console.log(`* Command Allowlist (command_allowlist)   : ${cfg.commandAllowlist && cfg.commandAllowlist.length > 0 ? cfg.commandAllowlist.join(', ') : '(empty = unrestricted)'}`);
    console.log(`* Gateway Secret (gateway_secret) : ${cfg.gatewaySecret ? '<set>' : 'N/A (required to register on a secured gateway)'}`);
    console.log('\n-> To update a config key, run: passerelle config <key> <new_value>');
    console.log('-> Example: passerelle config gateway_url https://my-custom-gateway.tld\n');
    return true;
  }

  const keyInput = args[0].toLowerCase();
  let valInput = args[1] || '';

  // Handle direct url shorthand: passerelle config https://my-custom-url
  if (args.length === 1 && (keyInput.startsWith('http://') || keyInput.startsWith('https://'))) {
    valInput = keyInput.replace(/\/+$/, '');
    updateConfigKey('gateway_url', valInput);
    return true;
  }

  if (!valInput) {
    if (isJson()) {
      jsonOut({ error: 'missing_value', message: 'Missing new value for key: ' + args[0] });
    } else {
      console.error('[ERROR] Missing new value for key:', args[0]);
      console.error('Usage: passerelle config <key> <new_value>');
    }
    process.exit(1);
  }

  updateConfigKey(keyInput, valInput);
  return true;
}

function updateConfigKey(rawKey: string, rawVal: string) {
  const cfg = loadDaemonConfig();
  const jsonMode = isJson();
  const emit = (payload: Record<string, unknown>, msg: string) => {
    if (jsonMode) jsonOut(payload);
    else console.log(msg);
  };
  const emitError = (payload: Record<string, unknown>, msg: string) => {
    if (jsonMode) jsonOut(payload);
    else console.error(msg);
    process.exit(1);
  };

  if (['gateway_url', 'gatewayurl', 'gateway', 'url'].includes(rawKey)) {
    let url = rawVal.replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    cfg.gatewayUrl = url;
    saveDaemonConfig(cfg);
    if (!jsonMode) printBanner();
    emit({ ok: true, key: 'gateway_url', value: url }, `[OK] Gateway URL (gateway_url) updated to: ${url}`);
  } else if (['machine_id', 'machineid'].includes(rawKey)) {
    cfg.machineId = rawVal;
    saveDaemonConfig(cfg);
    emit({ ok: true, key: 'machine_id', value: rawVal }, `[OK] Machine ID (machine_id) updated to: ${rawVal}`);
  } else if (['revoked_before', 'revokedbefore'].includes(rawKey)) {
    const num = Number(rawVal);
    if (isNaN(num)) {
      emitError({ error: 'invalid_value', key: 'revoked_before', message: 'revoked_before must be a valid timestamp number.' }, '[ERROR] revoked_before must be a valid timestamp number.');
    }
    cfg.revokedBefore = num;
    saveDaemonConfig(cfg);
    emit({ ok: true, key: 'revoked_before', value: num }, `[OK] Revoked Before (revoked_before) updated to: ${num}`);
  } else if (['api_revoked_before', 'apirevokedbefore'].includes(rawKey)) {
    const num = Number(rawVal);
    if (isNaN(num)) {
      emitError({ error: 'invalid_value', key: 'api_revoked_before', message: 'api_revoked_before must be a valid timestamp number.' }, '[ERROR] api_revoked_before must be a valid timestamp number.');
    }
    cfg.apiRevokedBefore = num;
    saveDaemonConfig(cfg);
    emit({ ok: true, key: 'api_revoked_before', value: num }, `[OK] API Revoked Before (api_revoked_before) updated to: ${num}`);
  } else if (['command_allowlist', 'commandallowlist', 'allowlist'].includes(rawKey)) {
    // H1: restrict which commands the daemon may start via the web API.
    // Empty string clears the allowlist (= unrestricted).
    cfg.commandAllowlist = rawVal ? rawVal.split(',').map((s) => s.trim()).filter(Boolean) : [];
    saveDaemonConfig(cfg);
    emit({ ok: true, key: 'command_allowlist', value: cfg.commandAllowlist || [] }, `[OK] Command allowlist (command_allowlist) updated to: ${(cfg.commandAllowlist || []).join(', ') || '(empty = unrestricted)'}`);
  } else if (['gateway_secret', 'gatewaysecret'].includes(rawKey)) {
    // C2: shared bootstrap secret the daemon presents to register on the gateway.
    // Generate on the gateway side with: openssl rand -hex 32
    cfg.gatewaySecret = rawVal;
    saveDaemonConfig(cfg);
    emit({ ok: true, key: 'gateway_secret', value: rawVal }, `[OK] Gateway Secret (gateway_secret) updated.`);
  } else {
    emitError({ error: 'unknown_key', message: `Unknown configuration key: "${rawKey}"` }, `[ERROR] Unknown configuration key: "${rawKey}"`);
  }

  if (!jsonMode) {
    const st = getStatus();
    if (st) {
      console.log('\n[INFO] The daemon is running. Run "passerelle restart" to apply changes.');
    }
  }
}
