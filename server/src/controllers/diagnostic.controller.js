import { diagnosticService } from '../services/diagnostic.service.js';

export const diagnosticController = {
  /**
   * GET /api/v1/diagnostic/status
   * Check whether authenticated student has completed diagnostic
   */
  async getStatus(req, res, next) {
    try {
      const studentId = req.user.id;
      const status = await diagnosticService.getDiagnosticStatus(studentId);
      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/diagnostic/assessment
   * Retrieve the 30 diagnostic questions across OOP, DSA, and OS
   */
  async getAssessment(req, res, next) {
    try {
      const studentId = req.user.id;
      const assessment = await diagnosticService.getDiagnosticAssessment(studentId);
      return res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/diagnostic/submit
   * Submit student diagnostic responses and compute independent subject placements
   */
  async submitAssessment(req, res, next) {
    try {
      const studentId = req.user.id;
      const { answers } = req.body;
      const results = await diagnosticService.submitDiagnosticAssessment({
        studentId,
        answers,
      });
      return res.status(201).json({
        success: true,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/diagnostic/results
   * Return existing diagnostic results for authenticated student
   */
  async getResults(req, res, next) {
    try {
      const studentId = req.user.id;
      const status = await diagnosticService.getDiagnosticStatus(studentId);
      if (!status.completed) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Diagnostic assessment has not been completed yet.',
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: status.results,
      });
    } catch (err) {
      next(err);
    }
  },
};
