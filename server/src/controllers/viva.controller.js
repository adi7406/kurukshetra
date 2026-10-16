import { vivaService } from '../services/viva.service.js';

export const vivaController = {
  /**
   * Start a new viva session for an eligible attempt
   */
  async startSession(req, res, next) {
    try {
      const { attemptId } = req.params;
      const { durationSeconds, totalQuestions } = req.body || {};
      const user = req.user;

      const result = await vivaService.startVivaSession({
        attemptId,
        studentId: user.id,
        durationSeconds,
        totalQuestions,
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
   * Get viva session state
   */
  async getSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      const result = await vivaService.getSessionById(sessionId, user);

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
   * Submit an answer to the current viva question
   */
  async submitAnswer(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { answerText } = req.body || {};
      const user = req.user;

      const result = await vivaService.submitAnswer({
        sessionId,
        studentId: user.id,
        answerText,
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

  /**
   * Complete viva session manually
   */
  async completeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      const result = await vivaService.completeSession({
        sessionId,
        requestingUser: user,
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

  /**
   * Cancel viva session
   */
  async cancelSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      const result = await vivaService.cancelSession({
        sessionId,
        requestingUser: user,
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

  /**
   * Get released viva report
   */
  async getReport(req, res, next) {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      const result = await vivaService.getVivaReport({
        sessionId,
        requestingUser: user,
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

  /**
   * Get specific viva answer details
   */
  async getAnswer(req, res, next) {
    try {
      const { answerId } = req.params;
      const user = req.user;

      const result = await vivaService.getVivaAnswerById(answerId, user);

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
   * Trainer review and override of viva answer score/rubric
   */
  async reviewAnswer(req, res, next) {
    try {
      const { answerId } = req.params;
      const { score, criteriaScores, reviewerNotes, reviewStatus } = req.body || {};
      const user = req.user;

      const result = await vivaService.reviewVivaAnswer({
        answerId,
        reviewerUser: user,
        score,
        criteriaScores,
        reviewerNotes,
        reviewStatus,
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

