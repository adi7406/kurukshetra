import { Router } from 'express';
import { z } from 'zod';
import { questionsController } from '../controllers/questions.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const createQuestionSchema = {
  body: z.object({
    questionType: z.enum([
      'mcq_single',
      'mcq_multiple',
      'short_answer',
      'numeric',
      'theory',
      'coding',
      'debugging',
    ]),
    title: z.string().optional(),
    prompt: z.string().min(1, 'Question prompt is required'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    marks: z.number().positive().optional(),
    negativeMarks: z.number().min(0).optional(),
    explanation: z.string().optional().nullable(),
    conceptIds: z.array(z.string().min(1)).optional(),
    options: z
      .array(
        z.object({
          key: z.string().optional(),
          text: z.string().min(1),
          orderIndex: z.number().int().optional(),
          isCorrect: z.boolean().optional(),
        })
      )
      .optional(),
    answer: z
      .object({
        type: z.string().optional(),
        payload: z.any(),
        evaluationConfig: z.record(z.any()).optional(),
      })
      .optional(),
    testCases: z
      .array(
        z.object({
          input: z.string(),
          expectedOutput: z.string(),
          isHidden: z.boolean().optional(),
          weight: z.number().positive().optional(),
          timeLimitMs: z.number().int().positive().optional(),
          memoryLimitMb: z.number().int().positive().optional(),
          orderIndex: z.number().int().optional(),
        })
      )
      .optional(),
  }),
};

const updateQuestionSchema = {
  body: z.object({
    title: z.string().optional(),
    prompt: z.string().min(1).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    marks: z.number().positive().optional(),
    explanation: z.string().optional().nullable(),
    options: z
      .array(
        z.object({
          key: z.string().optional(),
          text: z.string().min(1),
          orderIndex: z.number().int().optional(),
          isCorrect: z.boolean().optional(),
        })
      )
      .optional(),
    answer: z
      .object({
        type: z.string().optional(),
        payload: z.any(),
        evaluationConfig: z.record(z.any()).optional(),
      })
      .optional(),
  }),
};

// Course question bank
router.get(
  '/courses/:courseId/questions',
  authenticate,
  requireRole('trainer', 'admin'),
  questionsController.listQuestions
);
router.post(
  '/courses/:courseId/questions',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(createQuestionSchema),
  questionsController.createQuestion
);

// Individual question operations (context-dependent: students cannot access answer keys/hidden tests)
router.get('/questions/:questionId', authenticate, questionsController.getQuestionById);
router.patch(
  '/questions/:questionId',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(updateQuestionSchema),
  questionsController.updateQuestion
);

export default router;
