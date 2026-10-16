import { Router } from 'express';
import { z } from 'zod';
import { recommendationsController } from '../controllers/recommendations.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const feedbackSchema = {
  body: z.object({
    status: z.enum(['recommended', 'accepted', 'completed', 'dismissed', 'expired']),
    feedbackText: z.string().optional().nullable(),
  }),
};

// Student recommendations endpoints (API_SPEC Section 5.8)
router.get('/me/recommendations', authenticate, recommendationsController.getMyRecommendations);
router.post(
  '/me/recommendations/:recommendationId/feedback',
  authenticate,
  validateRequest(feedbackSchema),
  recommendationsController.recordFeedback
);

export default router;
