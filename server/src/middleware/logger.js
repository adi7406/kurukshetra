/**
 * Safe HTTP logger that logs request method, path, status, latency, and requestId
 * without leaking sensitive payloads, tokens, or passwords.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, requestId } = req;
    const { statusCode } = res;

    // Skip verbose logs during automated test runs
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const logLine = `[${new Date().toISOString()}] [${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      console.error(logLine);
    } else if (statusCode >= 400) {
      console.warn(logLine);
    } else {
      console.info(logLine);
    }
  });

  next();
}
