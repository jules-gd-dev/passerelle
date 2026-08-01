import crypto from 'node:crypto';
import type { JWTPayload } from '../types.js';

export function createJWT(secret: string, payload: JWTPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

// H5: constant-time string comparison to avoid PIN timing side-channels.
export function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    crypto.createHmac('sha256', aBuf).update(bBuf).digest();
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyJWT(token: string, secret: string, revokedBefore: number, apiRevokedBefore = revokedBefore): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: JWTPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    const nowUtcSec = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < nowUtcSec) {
      return null;
    }

    // M1: API tokens are revoked with their own cutoff so that revoking
    // exposed tokens does not invalidate the user's web session.
    const cutoff = payload.purpose === 'api' ? apiRevokedBefore : revokedBefore;
    if (payload.iat && payload.iat < cutoff) {
      return null;
    }

    return payload;
  } catch (_e) {
    return null;
  }
}
