import { monitoringService } from '../services/monitoring.service.js';

/**
 * Express middleware to track latency, status codes, and error categories
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const latencyMs = Math.max(0, Date.now() - start);
    const statusCode = res.statusCode;
    const errorCode = res.locals?.errorCode || null;

    monitoringService.recordRequest({
      statusCode,
      latencyMs,
      errorCode,
    });
  });

  next();
}
