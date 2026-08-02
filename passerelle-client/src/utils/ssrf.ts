import dns from 'node:dns/promises';
import net from 'node:net';

// Hostnames known to serve cloud instance metadata (SSRF targets).
const BLOCKED_HOSTNAMES = new Set([
  '169.254.169.254', // AWS / Azure / GCP / OpenStack IPv4 metadata
  'fd00:ec2::254', // AWS IPv6 metadata
  'metadata.google.internal', // GCP
  'metadata.azure.com', // Azure
  '100.100.100.200', // Alibaba Cloud
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0) return true; // current network
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata range)
    if (a >= 224) return true; // multicast / reserved
    return false; // LAN and Loopback are ALLOWED for proxying local services
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower.startsWith('fe80')) return true; // link-local
    return false; // LAN and loopback allowed
  }
  return true;
}

// M2: reject network service targets pointing at private/internal addresses,
// which would let a token holder scan the LAN or reach cloud metadata endpoints.
export async function assertSafeNetworkTarget(target: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    throw new Error('Target URL is invalid');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Target URL must use http or https');
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) throw new Error('Targeting metadata/internal hosts is blocked');

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Targeting private/internal IP addresses is blocked');
    return;
  }

  let addrs: string[];
  try {
    const records = await dns.lookup(host, { all: true });
    addrs = records.map((r) => r.address);
  } catch {
    throw new Error('Could not resolve target hostname');
  }
  for (const addr of addrs) {
    if (isPrivateIp(addr)) throw new Error('Target hostname resolves to a private/internal address');
  }
}
