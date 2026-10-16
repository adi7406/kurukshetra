import crypto from 'node:crypto';

/**
 * Middleware to assign or forward an X-Request-ID header.
 */
export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim()
    ? incomingId.trim()
    : `req_${crypto.randomUUID().replace(/-/g, '')}`;

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
