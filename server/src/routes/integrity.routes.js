import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { integrityController } from '../controllers/integrity.controller.js';

const router = Router();

// 1. Signal types catalog and policy guidelines
router.get('/integrity-signals/types', authenticate, integrityController.getCatalog);

// 2. Specific integrity signal by ID (authorized reviewers only)
router.get(
  '/integrity-signals/:signalId',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.getSignal
);

// 3. Record signal for an assessment attempt (authorized reviewers only)
router.post(
  '/attempts/:attemptId/integrity-signals',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.recordSignal
);

// 4. Retrieve signals for an assessment attempt (authorized reviewers only)
router.get(
  '/attempts/:attemptId/integrity-signals',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.getAttemptSignals
);

// 5. Analyze events of a coding session (authorized reviewers only)
router.post(
  '/coding-sessions/:sessionId/analyze-signals',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.analyzeSession
);

// 6. Retrieve signals for a coding session (authorized reviewers only)
router.get(
  '/coding-sessions/:sessionId/integrity-signals',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.getSessionSignals
);

export default router;
