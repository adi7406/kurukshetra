import { Router } from 'express';
import { z } from 'zod';
import { attemptsController } from '../controllers/attempts.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const saveAnswerSchema = {
  body: z.object({
    answer: z.object({
      selectedOptionKeys: z.array(z.string()).optional(),
      selectedOptionIds: z.array(z.string()).optional(),
      text: z.string().optional().nullable(),
      value: z.number().optional().nullable(),
      code: z.string().optional().nullable(),
    }),
  }),
};

// Start attempt
router.post('/assessments/:assessmentId/attempts', authenticate, attemptsController.startAttempt);
router.post('/quizzes/:assessmentId/attempts', authenticate, attemptsController.startAttempt);
router.post('/quizzes/:assessmentId/submit', authenticate, attemptsController.submitAttempt);

// Attempt state & answer submission
router.get('/attempts/:attemptId', authenticate, attemptsController.getAttempt);
router.put(
  '/attempts/:attemptId/answers/:questionId',
  authenticate,
  validateRequest(saveAnswerSchema),
  attemptsController.saveAnswer
);
router.post('/attempts/:attemptId/submit', authenticate, attemptsController.submitAttempt);

// Student attempts listing & results
router.get('/attempts/:attemptId/result', authenticate, attemptsController.getAttemptResult);
router.post('/attempts/:attemptId/process-mastery', authenticate, attemptsController.processMasteryEvidence);
router.get('/me/attempts', authenticate, attemptsController.listMyAttempts);
router.post('/me/attempts', authenticate, attemptsController.recordDirectAttempt);

export default router;
