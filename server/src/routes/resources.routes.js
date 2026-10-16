import { Router } from 'express';
import { z } from 'zod';
import { resourcesController } from '../controllers/resources.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const createResourceSchema = {
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    resourceType: z.enum(['article', 'notes', 'video', 'link', 'example', 'document', 'interactive']),
    content: z.string().optional().nullable(),
    url: z.string().url().optional().nullable(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    sourceType: z.enum(['trainer', 'imported', 'ai_generated']).optional(),
    reviewStatus: z.enum(['draft', 'in_review', 'approved', 'rejected', 'archived']).optional(),
  }),
};

const updateResourceSchema = {
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional().nullable(),
    url: z.string().url().optional().nullable(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    reviewStatus: z.enum(['draft', 'in_review', 'approved', 'rejected', 'archived']).optional(),
  }),
};

// Concept resources
router.get('/concepts/:conceptId/resources', authenticate, resourcesController.listResourcesForConcept);
router.post(
  '/concepts/:conceptId/resources',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(createResourceSchema),
  resourcesController.createResource
);

// Individual resource management
router.patch(
  '/resources/:resourceId',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(updateResourceSchema),
  resourcesController.updateResource
);
router.post(
  '/resources/:resourceId/publish',
  authenticate,
  requireRole('trainer', 'admin'),
  resourcesController.publishResource
);

export default router;
