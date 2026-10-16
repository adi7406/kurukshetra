import { jobsService } from '../services/jobs.service.js';

export const jobsController = {
  /**
   * Get job status and progress
   */
  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const job = await jobsService.getJobById(jobId, user.id, user.role);

      res.status(200).json({
        data: job,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancel an active job
   */
  async cancelJob(req, res, next) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const updated = await jobsService.cancelJob(jobId, user.id, user.role);

      res.status(200).json({
        data: {
          id: updated.id,
          status: updated.status,
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
