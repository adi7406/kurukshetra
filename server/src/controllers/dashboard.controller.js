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

  /**
   * Get course-level dashboard aggregate for trainer/admin
   */
  async getCourseDashboard(req, res, next) {
    try {
      const { courseId } = req.params;
      const dashboard = await dashboardService.getTrainerCourseDashboard(courseId, req.user);

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

  /**
   * Get student roster and permitted progress summary for a course
   */
  async getCourseStudents(req, res, next) {
    try {
      const { courseId } = req.params;
      const result = await dashboardService.getTrainerCourseStudents(courseId, req.user);

      res.status(200).json({
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
   * Get assessment analytics for a course
   */
  async getAssessmentAnalytics(req, res, next) {
    try {
      const { courseId, assessmentId } = req.params;
      const result = await dashboardService.getTrainerAssessmentAnalytics(
        courseId,
        assessmentId,
        req.user
      );

      res.status(200).json({
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
   * Get draft questions and assessments awaiting review or publication
   */
  async getDrafts(req, res, next) {
    try {
      const result = await dashboardService.getTrainerDrafts(req.user);

      res.status(200).json({
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
