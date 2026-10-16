import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

// Learner dashboard routes
router.get('/me/dashboard', authenticate, dashboardController.getLearnerDashboard);
router.get('/students/:studentId/dashboard', authenticate, dashboardController.getLearnerDashboard);

export default router;
