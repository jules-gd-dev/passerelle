import type { ChildProcess } from 'node:child_process';
import type net from 'node:net';
import type WebSocket from 'ws';

export interface DaemonConfig {
  jwtSecret: string;
  revokedBefore: number; // UTC Unix timestamp in seconds
  // M1: per-purpose revocation. API tokens (purpose: 'api') are cut off by
  // apiRevokedBefore, so "revoke API tokens" does not kill the web session.
  apiRevokedBefore: number; // UTC Unix timestamp in seconds
  machineId?: string;
  gatewayUrl?: string;
  gatewaySecret?: string; // shared bootstrap secret sent to the gateway on register
  // H1: optional restrict list. When set, only these commands (or their
  // basenames) may be started via /api/start. Undefined/empty = unrestricted.
  commandAllowlist?: string[];
}

export interface JWTPayload {
  machineId: string;
  iat: number;
  exp: number;
  purpose?: 'api'; // 'api' = long-lived API token; absent = web session
}

export interface ServiceItem {
  id: string;
  name: string;
  type: 'cli' | 'docker' | 'network';
  icon: string;
  command: string;
  args: string[];
  port?: number;
  ports?: number[];
  target?: string;
  status: 'running' | 'stopped';
  process?: ChildProcess;
}

export interface DaemonState {
  port: number;
  pin: string;
  pinCreatedAt: number;
  activeConnectionsCount: number;
  actionMessage: string;
  isLoading: boolean;
  loadingText: string;
  privacyMode: boolean;
  machineIdStored: string;
  tunnelUrlStored: string;
  ws: WebSocket | null;
  cloudflaredProcess: ReturnType<typeof import('node:child_process').spawn> | null;
  attachedSockets: Set<net.Socket>;
}
