import { Router } from 'express';
import { env } from '../config/env.js';
import { checkDatabaseConnection } from '../config/supabase.js';
import { monitoringService } from '../services/monitoring.service.js';

const router = Router();

/**
 * Liveness probe: confirms the process is alive and responsive
 */
router.get('/health', (req, res) => {
  const memory = process.memoryUsage();
  res.status(200).json({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
      memory: {
        rssMb: parseFloat((memory.rss / (1024 * 1024)).toFixed(2)),
        heapUsedMb: parseFloat((memory.heapUsed / (1024 * 1024)).toFixed(2)),
      },
    },
    meta: {
      requestId: req.requestId,
    },
  });
});

/**
 * Diagnostic database connectivity check.
 * Checks PostgreSQL connectivity via Supabase without exposing credentials,
 * database records, SQL statements, or sensitive error details.
 * Safeguard: Restricted with 403 Forbidden in production unless authorized.
 */
router.get('/health/database', async (req, res) => {
  if (env.NODE_ENV === 'production') {
    const diagnosticKey = req.headers['x-diagnostic-key'];
    const authHeader = req.headers['authorization'];
    const isAuthorizedKey = env.DIAGNOSTIC_KEY && diagnosticKey === env.DIAGNOSTIC_KEY;
    const hasAuth = Boolean(authHeader || isAuthorizedKey);

    if (!hasAuth) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Database diagnostic endpoint is restricted in production environments.',
        },
        meta: {
          requestId: req.requestId,
        },
      });
    }
  }

  const result = await checkDatabaseConnection();

  if (!result.ok) {
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connectivity check failed',
      },
      meta: {
        requestId: req.requestId,
        timestamp: result.timestamp,
        latencyMs: result.latencyMs,
      },
    });
  }

  return res.status(200).json({
    data: {
      status: 'connected',
      database: 'postgresql',
      latencyMs: result.latencyMs,
      timestamp: result.timestamp,
    },
    meta: {
      requestId: req.requestId,
    },
  });
});

/**
 * Readiness probe: checks critical backing services (PostgreSQL, isolated runner)
 */
router.get('/readiness', async (req, res) => {
  const readiness = await monitoringService.checkReadiness();
  const statusCode = readiness.ready ? 200 : 503;

  res.status(statusCode).json({
    data: {
      status: readiness.ready ? 'ready' : 'degraded',
      timestamp: readiness.timestamp,
      checks: readiness.checks,
    },
    meta: {
      requestId: req.requestId,
    },
  });
});

export default router;

