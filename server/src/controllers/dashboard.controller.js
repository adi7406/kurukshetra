import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  /**
   * Get learner dashboard for authenticated student or requested student
   */
  async getLearnerDashboard(req, res, next) {
    try {
      const targetStudentId = req.params.studentId || req.user.id;
      const dashboard = await dashboardService.getLearnerDashboard(targetStudentId, req.user);

      res.status(200).json({
        data: dashboard,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
