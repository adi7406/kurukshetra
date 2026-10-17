import { Router } from 'express';
import { z } from 'zod';
import { aiGenerationController } from '../controllers/aiGeneration.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const generateQuestionsSchema = {
  body: z.object({
    topic: z.string().min(1, 'Topic is required for question generation'),
    conceptId: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    count: z.number().int().min(1).max(10).optional(),
    async: z.boolean().optional(),
  }),
};

const generateContentSchema = {
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    title: z.string().optional(),
    focusTopic: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    async: z.boolean().optional(),
  }),
};

const generateCodingSchema = {
  body: z.object({
    topic: z.string().optional(),
    conceptId: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }),
};

// Trainer & Admin endpoints for AI-assisted curriculum authoring
router.post(
  '/courses/:courseId/ai/generate-questions',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(generateQuestionsSchema),
  aiGenerationController.generateQuestions
);

router.post(
  '/concepts/:conceptId/ai/generate-content',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(generateContentSchema),
  aiGenerationController.generateContent
);

router.post(
  '/courses/:courseId/ai/generate-coding',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(generateCodingSchema),
  aiGenerationController.generateCoding
);

router.post(
  '/concepts/:conceptId/ai/generate-coding',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(generateCodingSchema),
  aiGenerationController.generateCoding
);

// Endpoints for syllabus curriculum extraction
router.post(
  '/ai/extract-curriculum',
  authenticate,
  aiGenerationController.extractCurriculum
);

// Protected diagnostic endpoint for NVIDIA AI models (trainers & admins)
router.get(
  '/ai/diagnostics',
  authenticate,
  requireRole('trainer', 'admin'),
  aiGenerationController.getModelDiagnostics
);

export default router;

