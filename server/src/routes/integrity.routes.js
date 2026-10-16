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

// 7. Initiate a human integrity review for an attempt (authorized reviewers only)
router.post(
  '/attempts/:attemptId/integrity-reviews',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.createReview
);

// 8. Retrieve all integrity reviews for an attempt (authorized reviewers only)
router.get(
  '/attempts/:attemptId/integrity-reviews',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.getAttemptReviews
);

// 9. Retrieve specific integrity review with evidence & audit history (authorized reviewers only)
router.get(
  '/integrity-reviews/:reviewId',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.getReview
);

// 10. Update or resolve an integrity review (authorized reviewers only)
router.patch(
  '/integrity-reviews/:reviewId',
  authenticate,
  requireRole('trainer', 'admin'),
  integrityController.updateReview
);

// 11. Candidate appeal or context submission (candidate or reviewer)
router.post(
  '/integrity-reviews/:reviewId/appeal',
  authenticate,
  integrityController.submitAppeal
);

export default router;
