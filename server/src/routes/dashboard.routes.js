import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

// Learner dashboard routes
router.get('/me/dashboard', authenticate, dashboardController.getLearnerDashboard);
router.get('/me/progress', authenticate, dashboardController.getLearnerProgress);
router.get('/students/:studentId/dashboard', authenticate, dashboardController.getLearnerDashboard);

// General teacher dashboard route
router.get(
  '/teacher/dashboard',
  authenticate,
  requireRole('trainer', 'admin'),
  dashboardController.getTeacherDashboard
);

// Trainer dashboard routes (API_SPEC Section 5.12)
router.get(
  '/trainer/courses/:courseId/dashboard',
  authenticate,
  requireRole('trainer', 'admin'),
  dashboardController.getCourseDashboard
);

router.get(
  '/trainer/courses/:courseId/students',
  authenticate,
  requireRole('trainer', 'admin'),
  dashboardController.getCourseStudents
);

router.get(
  '/trainer/courses/:courseId/assessments/:assessmentId/analytics',
  authenticate,
  requireRole('trainer', 'admin'),
  dashboardController.getAssessmentAnalytics
);

router.get(
  '/trainer/drafts',
  authenticate,
  requireRole('trainer', 'admin'),
  dashboardController.getDrafts
);

router.post(
  '/teacher/reviews/:reviewId/resolve',
  authenticate,
  requireRole('trainer', 'admin'),
  dashboardController.resolveReview
);

export default router;
