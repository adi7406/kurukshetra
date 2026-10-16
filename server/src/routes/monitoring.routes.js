import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { monitoringController } from '../controllers/monitoring.controller.js';

const router = Router();

// Monitoring and telemetry routes (Admin / Trainer accessible)
router.get(
  '/admin/metrics',
  authenticate,
  requireRole('trainer', 'admin'),
  monitoringController.getMetrics
);

router.get(
  '/admin/ai-usage',
  authenticate,
  requireRole('trainer', 'admin'),
  monitoringController.getAiUsage
);

router.post(
  '/admin/ai-budget',
  authenticate,
  requireRole('admin'),
  monitoringController.setUserBudget
);

export default router;
