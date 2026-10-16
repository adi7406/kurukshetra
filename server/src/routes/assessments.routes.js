import { Router } from 'express';
import { z } from 'zod';
import { assessmentsController } from '../controllers/assessments.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const createAssessmentSchema = {
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    assessmentType: z.enum(['practice', 'adaptive_practice', 'fixed_test', 'test_series']).optional(),
    durationMinutes: z.number().int().positive().optional().nullable(),
    maxAttempts: z.number().int().positive().optional(),
    passingPercentage: z.number().min(0).max(100).optional(),
    settings: z.record(z.any()).optional(),
    questions: z
      .array(
        z.object({
          questionVersionId: z.string().optional(),
          id: z.string().optional(),
          position: z.number().int().optional(),
          marksOverride: z.number().positive().optional().nullable(),
        })
      )
      .optional(),
  }),
};

const updateAssessmentSchema = {
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    durationMinutes: z.number().int().positive().optional().nullable(),
    maxAttempts: z.number().int().positive().optional(),
    passingPercentage: z.number().min(0).max(100).optional(),
    settings: z.record(z.any()).optional(),
    questions: z
      .array(
        z.object({
          questionVersionId: z.string().optional(),
          id: z.string().optional(),
          position: z.number().int().optional(),
          marksOverride: z.number().positive().optional().nullable(),
        })
      )
      .optional(),
  }),
};

const createTestSeriesSchema = {
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    assessmentIds: z.array(z.string().min(1)).optional(),
  }),
};

// Assessment collection and creation
router.get('/assessments', authenticate, assessmentsController.listAssessments);
router.post(
  '/courses/:courseId/assessments',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(createAssessmentSchema),
  assessmentsController.createAssessment
);

// Assessment operations
router.get('/assessments/:assessmentId', authenticate, assessmentsController.getAssessmentById);
router.patch(
  '/assessments/:assessmentId',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(updateAssessmentSchema),
  assessmentsController.updateAssessment
);
router.post(
  '/assessments/:assessmentId/publish',
  authenticate,
  requireRole('trainer', 'admin'),
  assessmentsController.publishAssessment
);

// Test series operations
router.get('/test-series', authenticate, assessmentsController.listTestSeries);
router.get('/test-series/:testSeriesId', authenticate, assessmentsController.getTestSeriesById);
router.post(
  '/courses/:courseId/test-series',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(createTestSeriesSchema),
  assessmentsController.createTestSeries
);
router.post(
  '/test-series/:testSeriesId/publish',
  authenticate,
  requireRole('trainer', 'admin'),
  assessmentsController.publishTestSeries
);

export default router;
