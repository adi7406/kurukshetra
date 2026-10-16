import { reportsService } from '../services/reports.service.js';

export const reportsController = {
  /**
   * Request a new data export / report
   * POST /api/v1/reports/export
   */
  async createExport(req, res, next) {
    try {
      const { reportType, format, parameters } = req.body;
      const user = req.user;
      const reqMeta = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await reportsService.generateReport({
        reportType,
        format,
        parameters,
        user,
        reqMeta,
      });

      res.status(201).json({
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
   * Download generated report by signed token
   * GET /api/v1/reports/:exportId/download
   */
  async downloadExport(req, res, next) {
    try {
      const { exportId } = req.params;
      const { token } = req.query;
      const user = req.user || null;

      const exportData = await reportsService.getExportForDownload(exportId, token, user);

      res.setHeader('Content-Type', exportData.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.status(200).send(exportData.payload);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get metadata of a report
   * GET /api/v1/reports/:exportId
   */
  async getReport(req, res, next) {
    try {
      const { exportId } = req.params;
      const user = req.user;

      const report = await reportsService.getReportById(exportId, user);

      res.status(200).json({
        data: report,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * List exports requested by current user
   * GET /api/v1/reports
   */
  async listReports(req, res, next) {
    try {
      const user = req.user;
      const reports = await reportsService.listUserReports(user);

      res.status(200).json({
        data: reports,
        meta: {
          requestId: req.requestId,
          count: reports.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
