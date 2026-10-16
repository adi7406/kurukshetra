import { Router } from 'express';
import { z } from 'zod';
import { syllabusController } from '../controllers/syllabus.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const uploadSyllabusSchema = {
  body: z.object({
    fileName: z.string().min(1, 'fileName is required'),
    fileType: z.string().min(1, 'fileType is required'),
    fileSize: z.number().int().positive().optional(),
    content: z.string().optional(),
  }),
};

const putSyllabusSchema = {
  body: z.object({
    modules: z.array(
      z.object({
        title: z.string().min(1, 'Module title is required'),
        description: z.string().optional().nullable(),
        orderIndex: z.number().int().optional(),
        concepts: z
          .array(
            z.object({
              name: z.string().min(1, 'Concept name is required'),
              description: z.string().optional().nullable(),
              orderIndex: z.number().int().optional(),
            })
          )
          .optional(),
      })
    ),
  }),
};

// Course syllabus hierarchy
router.get('/courses/:courseId/syllabus', authenticate, syllabusController.getSyllabus);
router.put(
  '/courses/:courseId/syllabus',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(putSyllabusSchema),
  syllabusController.putSyllabus
);

// Syllabus document import workflows (TASK-011, TASK-012)
router.post(
  '/courses/:courseId/syllabus/imports',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(uploadSyllabusSchema),
  syllabusController.uploadSyllabusDocument
);
router.get(
  '/syllabus-imports/:jobId',
  authenticate,
  syllabusController.getImportStatus
);

export default router;
