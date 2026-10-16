import { Router } from 'express';
import { z } from 'zod';
import { vivaController } from '../controllers/viva.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const startSessionSchema = {
  body: z.object({
    durationSeconds: z.number().int().positive().optional(),
    totalQuestions: z.number().int().min(1).max(10).optional(),
  }),
};

const submitAnswerSchema = {
  body: z.object({
    answerText: z.string().min(1, 'Answer text is required'),
  }),
};

// AI Viva endpoints (API_SPEC Section 5.11 & TASK-029)
router.post(
  '/attempts/:attemptId/viva-sessions',
  authenticate,
  validateRequest(startSessionSchema),
  vivaController.startSession
);

router.get('/viva-sessions/:sessionId', authenticate, vivaController.getSession);

router.post(
  '/viva-sessions/:sessionId/answers',
  authenticate,
  validateRequest(submitAnswerSchema),
  vivaController.submitAnswer
);

router.post('/viva-sessions/:sessionId/complete', authenticate, vivaController.completeSession);

router.post('/viva-sessions/:sessionId/cancel', authenticate, vivaController.cancelSession);

router.get('/viva-sessions/:sessionId/report', authenticate, vivaController.getReport);

export default router;
