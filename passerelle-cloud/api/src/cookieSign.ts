import crypto from 'node:crypto';

// H4: the session cookie carries the daemons' plaintext session tokens (7-day,
// full-access). An httpOnly cookie mitigates theft via XSS, but any other read
// vector (log capture, backup, shared browser profile, process memory dump)
// would expose raw tokens. We additionally AES-256-GCM encrypt the cookie
// value so its content is confidential AND integrity-protected (tampering or
// forgery is detected via the GCM auth tag).
//
// The key MUST be stable across restarts, otherwise every existing session is
// invalidated on each deploy. Provide it via SESSION_COOKIE_KEY (32 bytes as
// 64 hex chars, or base64). When absent we fall back to an ephemeral random
// key (dev only) and warn loudly.

const KEY_ENV = 'SESSION_COOKIE_KEY';

function loadKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
    console.error(
      `[cookieSign] ${KEY_ENV} must be 32 bytes (hex or base64). Got ${b.length} bytes.`,
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      `[cookieSign] ${KEY_ENV} not set — using an ephemeral key. Set SESSION_COOKIE_KEY (32 bytes, hex) in production so sessions survive restarts.`,
    );
  }
  return crypto.randomBytes(32);
}

const KEY = loadKey();

// Format: base64(iv).base64(ciphertext).base64(authTag)
export function encryptString(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${enc.toString('base64')}.${tag.toString('base64')}`;
}

export function decryptString(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'base64');
    const data = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
