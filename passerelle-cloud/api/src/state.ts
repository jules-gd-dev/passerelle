import type WebSocket from 'ws';

export interface Machine {
  id: string;
  ws: WebSocket;
  tunnelUrl: string;
  lastSeen: number;
}

export const machines = new Map<string, Machine>();

export interface PendingValidation {
  requestId: string;
  machineId: string;
  pin: string;
  resolve: (result: {
    success: boolean;
    code?: string;
    message?: string;
    tunnelUrl?: string;
    sessionToken?: string;
  }) => void;
  timer: NodeJS.Timeout;
}

export const pendingValidations = new Map<string, PendingValidation>();

export interface PendingProxyRequest {
  requestId: string;
  timer: NodeJS.Timeout;
  resolve: (res: Response) => void;
}

export const pendingProxyRequests = new Map<string, PendingProxyRequest>();
