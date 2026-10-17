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

const reviewAnswerSchema = {
  body: z.object({
    score: z.number().min(0).optional(),
    criteriaScores: z
      .array(
        z.object({
          criterionId: z.string().min(1),
          points: z.number().min(0).optional(),
          notes: z.string().optional(),
        })
      )
      .optional(),
    reviewerNotes: z.string().optional(),
    reviewStatus: z.enum(['evaluated', 'needs_review', 'reviewed']).optional(),
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

// Viva Answers & Rubric Review (TASK-030)
router.get('/viva-answers/:answerId', authenticate, vivaController.getAnswer);

router.patch(
  '/viva-answers/:answerId/review',
  authenticate,
  validateRequest(reviewAnswerSchema),
  vivaController.reviewAnswer
);

router.post(
  '/assessments/viva/evaluate',
  vivaController.evaluateVivaAnswer
);

export default router;

