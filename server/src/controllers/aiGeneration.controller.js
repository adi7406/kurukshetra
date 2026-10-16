import { aiGenerationService } from '../services/aiGeneration.service.js';

export const aiGenerationController = {
  /**
   * Generate draft questions for a course/concept
   */
  async generateQuestions(req, res, next) {
    try {
      const { courseId } = req.params;
      const { conceptId, topic, difficulty, count, async: isAsync } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] || null;

      const result = await aiGenerationService.generateQuestions({
        courseId,
        conceptId,
        topic,
        difficulty,
        count,
        trainerUser: req.user,
        useAsyncJob: Boolean(isAsync),
        idempotencyKey,
      });

      const statusCode = result.async ? 202 : 201;

      res.status(statusCode).json({
        data: result,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate draft learning content for a concept
   */
  async generateContent(req, res, next) {
    try {
      const { conceptId } = req.params;
      const { courseId, title, focusTopic, difficulty, async: isAsync } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] || null;

      const result = await aiGenerationService.generateContent({
        courseId,
        conceptId,
        title,
        focusTopic,
        difficulty,
        trainerUser: req.user,
        useAsyncJob: Boolean(isAsync),
        idempotencyKey,
      });

      const statusCode = result.async ? 202 : 201;

      res.status(statusCode).json({
        data: result,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
