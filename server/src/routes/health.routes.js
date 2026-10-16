import { Router } from 'express';
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
