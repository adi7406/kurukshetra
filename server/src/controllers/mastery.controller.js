import { masteryService } from '../services/mastery.service.js';

export const masteryController = {
  /**
   * Get current authenticated student's mastery summary
   */
  async getMyMastery(req, res, next) {
    try {
      const user = req.user;
      const data = await masteryService.getStudentMasterySummary(user.id);

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
   * Get current student's mastery and history for a specific concept
   */
  async getMyConceptMastery(req, res, next) {
    try {
      const user = req.user;
      const { conceptId } = req.params;
      const data = await masteryService.getConceptMasteryDetails(user.id, conceptId);

      res.status(200).json({
        data,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a learner's mastery for a specific course (Trainer / Admin)
   */
  async getCourseStudentMastery(req, res, next) {
    try {
      const { courseId, studentId } = req.params;
      const data = await masteryService.getCourseLearnerMastery(courseId, studentId, req.user);

      res.status(200).json({
        data,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Simulation / Dry-run estimation endpoint for testing model parameters
   */
  async simulateEstimate(req, res, next) {
    try {
      const { modelName, oldMastery, isCorrect, modelParams } = req.body;
      const newProbability = masteryService.calculateEstimate({
        modelName,
        oldMastery,
        isCorrect,
        modelParams,
      });

      res.status(200).json({
        data: {
          modelName: modelName || 'rule_based_baseline',
          oldMastery: oldMastery ?? 0.1,
          isCorrect: Boolean(isCorrect),
          newProbability,
          modelParams: modelParams || {},
          disclaimer: 'Mastery estimates are mathematical approximations based on learning evidence, not a guarantee of ability.',
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
