import { RateLimitError } from '../utils/errors.js';

/**
 * In-memory sliding-window rate limiter middleware.
 * Conforms to API_SPEC.md Section 3.2 and SECURITY.md Section 7.
 */
export function createRateLimiter({
  windowMs = 60 * 1000, // 1 minute window
  maxRequests = 100, // max 100 requests per window
  message = 'Too many requests. Please slow down and try again later.',
  keyGenerator = (req) => req.user?.id || req.ip || 'anonymous',
} = {}) {
  const store = new Map();

  // Periodic cleanup to avoid memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, records] of store.entries()) {
      const active = records.filter((timestamp) => now - timestamp < windowMs);
      if (active.length === 0) {
        store.delete(key);
      } else {
        store.set(key, active);
      }
    }
  }, Math.max(windowMs, 30000));

  // Allow Node process to exit gracefully without waiting for the timer
  if (interval.unref) {
    interval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const now = Date.now();
    const key = keyGenerator(req);
    const existing = store.get(key) || [];

    // Filter timestamps within current window
    const windowStart = now - windowMs;
    const recent = existing.filter((t) => t > windowStart);

    const remaining = Math.max(0, maxRequests - recent.length);
    const resetTime = recent.length > 0 ? recent[0] + windowMs : now + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, remaining - 1));
    res.setHeader('RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (recent.length >= maxRequests) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(new RateLimitError(message));
    }

    recent.push(now);
    store.set(key, recent);
    next();
  };
}

// Pre-configured rate limiters for sensitive endpoints
export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
});

export const sensitiveOpLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many operations in a short period. Please wait before retrying.',
});
