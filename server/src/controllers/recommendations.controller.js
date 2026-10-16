import { recommendationsService } from '../services/recommendations.service.js';

export const recommendationsController = {
  /**
   * Get personalized recommendations for authenticated student
   */
  async getMyRecommendations(req, res, next) {
    try {
      const user = req.user;
      const data = await recommendationsService.getRecommendationsForStudent(user.id);

      res.status(200).json({
        data,
        meta: {
          requestId: req.requestId,
          count: data.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Record student feedback on a recommendation
   */
  async recordFeedback(req, res, next) {
    try {
      const user = req.user;
      const { recommendationId } = req.params;
      const { status } = req.body;

      const updated = await recommendationsService.recordRecommendationFeedback(user.id, recommendationId, {
        status,
      });

      res.status(200).json({
        data: updated,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
