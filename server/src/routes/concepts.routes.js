import { Router } from 'express';
import { z } from 'zod';
import { conceptsController } from '../controllers/concepts.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const createConceptSchema = {
  body: z.object({
    moduleId: z.string().optional(),
    name: z.string().min(1, 'Concept name is required').max(255),
    description: z.string().optional().nullable(),
    orderIndex: z.number().int().optional(),
  }),
};

const updateConceptSchema = {
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    orderIndex: z.number().int().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  }),
};

const setPrerequisitesSchema = {
  body: z.object({
    prerequisiteIds: z.array(z.string().min(1)),
  }),
};

// Course concepts & graph
router.get('/courses/:courseId/concepts', authenticate, conceptsController.listConcepts);
router.post(
  '/courses/:courseId/concepts',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(createConceptSchema),
  conceptsController.createConcept
);
router.get('/courses/:courseId/concept-graph', authenticate, conceptsController.getConceptGraph);

// Concept item operations
router.patch(
  '/concepts/:conceptId',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(updateConceptSchema),
  conceptsController.updateConcept
);
router.put(
  '/concepts/:conceptId/prerequisites',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(setPrerequisitesSchema),
  conceptsController.setPrerequisites
);

export default router;
