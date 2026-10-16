import { Router } from 'express';
import { z } from 'zod';
import { masteryController } from '../controllers/mastery.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const simulateSchema = {
  body: z.object({
    modelName: z.enum(['rule_based_baseline', 'bkt']).optional(),
    oldMastery: z.number().min(0).max(1).optional(),
    isCorrect: z.boolean(),
    modelParams: z.record(z.any()).optional(),
  }),
};

// Student mastery endpoints (API_SPEC Section 5.8)
router.get('/me/mastery', authenticate, masteryController.getMyMastery);
router.get('/me/mastery/concepts/:conceptId', authenticate, masteryController.getMyConceptMastery);

// Trainer / Admin learner mastery inspection
router.get(
  '/courses/:courseId/students/:studentId/mastery',
  authenticate,
  masteryController.getCourseStudentMastery
);

// Model parameter dry-run simulation endpoint
router.post(
  '/mastery/simulate',
  authenticate,
  validateRequest(simulateSchema),
  masteryController.simulateEstimate
);

export default router;
