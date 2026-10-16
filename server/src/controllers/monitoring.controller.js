import { monitoringService } from '../services/monitoring.service.js';
import { ValidationError } from '../utils/errors.js';

export const monitoringController = {
  /**
   * System metrics, latency percentiles, error breakdown, and alerts
   * GET /api/v1/admin/metrics
   */
  async getMetrics(req, res, next) {
    try {
      const metrics = monitoringService.getSystemMetrics();

      res.status(200).json({
        data: metrics,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * AI usage and cost breakdown
   * GET /api/v1/admin/ai-usage
   */
  async getAiUsage(req, res, next) {
    try {
      const { userId } = req.query;
      let records = monitoringService.aiUsageRecords;

      if (userId) {
        records = records.filter((r) => r.userId === userId);
      }

      const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
      const totalSpendUsd = parseFloat(
        records.reduce((sum, r) => sum + r.totalCostUsd, 0).toFixed(4)
      );

      res.status(200).json({
        data: {
          totalTokens,
          totalSpendUsd,
          recordCount: records.length,
          records: records.slice(-50), // Last 50 records
        },
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Configure AI cost budget limit for a user
   * POST /api/v1/admin/ai-budget
   */
  async setUserBudget(req, res, next) {
    try {
      const { userId, maxBudgetUsd } = req.body;
      if (!userId || maxBudgetUsd === undefined || isNaN(Number(maxBudgetUsd))) {
        throw new ValidationError('userId and numeric maxBudgetUsd are required.');
      }

      monitoringService.setUserBudget(userId, maxBudgetUsd);

      res.status(200).json({
        data: {
          userId,
          maxBudgetUsd: Number(maxBudgetUsd),
          updatedAt: new Date().toISOString(),
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
