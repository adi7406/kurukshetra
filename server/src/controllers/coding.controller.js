import { codingService } from '../services/coding.service.js';
import { executionService } from '../services/execution.service.js';


export const codingController = {
  /**
   * Start a new coding session for an assessment
   */
  async startSession(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const { questionVersionId, language, attemptId, recordingConsent } = req.body;
      const user = req.user;

      const result = await codingService.startCodingSession({
        studentId: user.id,
        assessmentId,
        questionVersionId,
        language,
        attemptId,
        recordingConsent,
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
   * Get coding session details
   */
  async getSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      const data = await codingService.getSessionById(sessionId, user);

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
   * Save draft code for an active session
   */
  async saveDraft(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { code, language } = req.body;
      const user = req.user;

      const data = await codingService.saveDraft(sessionId, user.id, {
        code,
        language,
      });

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
   * Close a coding session
   */
  async closeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      const data = await codingService.closeSession(sessionId, user.id);

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
   * Run sample tests for active coding session
   */
  async runSampleTests(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { language, sourceCode } = req.body || {};
      const user = req.user;

      const session = await codingService.getSessionById(sessionId, user);

      const codeToRun = sourceCode !== undefined ? sourceCode : session.currentCode;
      const langToRun = language || session.language;

      const result = await executionService.runSampleTests({
        studentId: user.id,
        questionVersionId: session.questionVersionId,
        language: langToRun,
        sourceCode: codeToRun,
      });

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

