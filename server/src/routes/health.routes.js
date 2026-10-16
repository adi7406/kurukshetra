import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
    },
    meta: {
      requestId: req.requestId,
    },
  });
});

router.get('/readiness', (req, res) => {
  res.status(200).json({
    data: {
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected_or_mocked',
    },
    meta: {
      requestId: req.requestId,
    },
  });
});

export default router;
