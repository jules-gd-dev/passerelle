import type { Context, Next } from 'hono';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Each createRateLimiter instance gets a unique id, so the catch-all
// `app.use('/api/*')` limiter and a route-specific limiter do NOT share a
// counter for the same key (otherwise both would count each request, silently
// halving the effective limit on throttled routes).
let limiterSeq = 0;

// Periodic clean-up to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Resolve the client IP. cf-connecting-ip is only trustworthy behind the
// Cloudflare tunnel; otherwise fall back to the raw socket address — NEVER to
// the client-spoofable X-Forwarded-For header.
function resolveIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ||
    (c.env as { incoming?: { socket?: { remoteAddress?: string } } })?.incoming
      ?.socket?.remoteAddress ||
    'default-ip'
  );
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const limiterId = ++limiterSeq;
  return async (c: Context, next: Next) => {
    const ip = resolveIp(c);
    const key = `${limiterId}:${ip}:${c.req.path}`;
    const now = Date.now();

    const record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return c.json(
        {
          success: false,
          code: 'rate_limited',
          message: 'Too many requests, please try again later.',
        },
        429,
      );
    }

    record.count += 1;
    return next();
  };
}
