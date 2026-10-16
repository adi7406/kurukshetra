import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Job status and lifecycle management (TASK-019)
router.get('/jobs/:jobId', authenticate, jobsController.getJobStatus);
router.post('/jobs/:jobId/cancel', authenticate, jobsController.cancelJob);

export default router;
