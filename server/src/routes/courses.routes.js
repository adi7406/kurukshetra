import { Router } from 'express';
import { z } from 'zod';
import { coursesController } from '../controllers/courses.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const createCourseSchema = {
  body: z.object({
    title: z.string().min(1, 'Course title is required'),
    description: z.string().optional(),
  }),
};

const updateCourseSchema = {
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
};

const enrollSchema = {
  body: z
    .object({
      studentId: z.string().optional(),
    })
    .optional(),
};

// Course collection & creation
router.get('/courses', authenticate, coursesController.listCourses);
router.post(
  '/courses',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(createCourseSchema),
  coursesController.createCourse
);

// Individual course operations
router.get('/courses/:courseId', authenticate, coursesController.getCourseById);
router.patch(
  '/courses/:courseId',
  authenticate,
  requireRole('trainer', 'admin'),
  validateRequest(updateCourseSchema),
  coursesController.updateCourse
);
router.post(
  '/courses/:courseId/publish',
  authenticate,
  requireRole('trainer', 'admin'),
  coursesController.publishCourse
);

// Course enrollment operations
router.post(
  '/courses/:courseId/enrollments',
  authenticate,
  validateRequest(enrollSchema),
  coursesController.enrollStudent
);
router.get(
  '/courses/:courseId/enrollments',
  authenticate,
  requireRole('trainer', 'admin'),
  coursesController.listCourseEnrollments
);
router.get('/me/enrollments', authenticate, coursesController.listMyEnrollments);

export default router;
