import { printBanner } from '../utils/banner.js';

export const HELP_COMMANDS = [
  'setup / start',
  'stop',
  'restart',
  'status',
  'link',
  'pin',
  'qr',
  'json',
  'config',
  'register / sync',
  'credits',
  'version',
  'ui / attach',
  'logs',
  'help',
];

export function printHelp() {
  printBanner();
  console.log(`Usage:
  passerelle <command>

Available Commands:
  setup / start      Start the Passerelle background service with auto-restart (PM2)
  stop               Stop the running Passerelle background service
  restart            Restart the Passerelle service
  status             Show quick status summary (online/offline, PIN, services up)
  link               Print the direct web login connection URL with a pretty banner
  pin                Print the current connection PIN code (no extra text)
  qr                 Display the connection QR code and PIN in terminal
  json               Output raw diagnostics and state in JSON format
  config <key> <val> View or update configuration (keys: gateway_url, machine_id, revoked_before)
  register / sync    Re-declare and synchronize daemon presence directly with the Gateway
  credits            Display project credits, author, github, and donations transmitted by Gateway
  version            Print the installed Passerelle daemon version and commit
  ui / attach        Connect to the live interactive terminal console
  logs               Stream real-time log output from PM2
  help               Display this list of commands

Examples:
  passerelle setup
  passerelle config gateway_url https://my-custom-gateway.tld
  passerelle status
  passerelle qr

JSON Output:
  Append --json (or -j) to any command to get its result as JSON.
`);
}
