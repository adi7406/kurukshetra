import { integrityService } from '../services/integrity.service.js';

export const integrityController = {
  /**
   * Get dictionary of permitted integrity signal types, definitions, and review policy
   */
  async getCatalog(req, res, next) {
    try {
      const catalog = integrityService.getSignalCatalog();
      res.status(200).json({
        data: catalog,
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Manually record an integrity signal for an assessment attempt (trainers/admins)
   */
  async recordSignal(req, res, next) {
    try {
      const { attemptId } = req.params;
      const { signalType, confidence, evidence, detectorVersion, occurredAt } = req.body || {};

      const result = await integrityService.recordSignal(
        {
          attemptId,
          signalType,
          confidence,
          evidence,
          detectorVersion,
          occurredAt,
        },
        req.user
      );

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
   * Analyze recorded events of a coding session and derive rule-based integrity signals
   */
  async analyzeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const result = await integrityService.analyzeSessionEvents(sessionId, req.user);

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
   * Get all integrity signals for an assessment attempt
   */
  async getAttemptSignals(req, res, next) {
    try {
      const { attemptId } = req.params;
      const result = await integrityService.getSignalsForAttempt(attemptId, req.user);

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
   * Get all integrity signals for a coding session
   */
  async getSessionSignals(req, res, next) {
    try {
      const { sessionId } = req.params;
      const result = await integrityService.getSignalsForSession(sessionId, req.user);

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
   * Get specific integrity signal by ID
   */
  async getSignal(req, res, next) {
    try {
      const { signalId } = req.params;
      const result = await integrityService.getSignalById(signalId, req.user);

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
   * Initiate a human integrity review case for an assessment attempt (trainers/admins)
   */
  async createReview(req, res, next) {
    try {
      const { attemptId } = req.params;
      const { status, outcomeNotes } = req.body || {};

      const result = await integrityService.createReview(
        {
          attemptId,
          status,
          outcomeNotes,
        },
        req.user
      );

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
   * Update or resolve an existing human integrity review (trainers/admins)
   */
  async updateReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const { status, outcomeNotes } = req.body || {};

      const result = await integrityService.updateReview(
        reviewId,
        {
          status,
          outcomeNotes,
        },
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
   * Submit an appeal / explanation context for an integrity review (candidate or reviewer)
   */
  async submitAppeal(req, res, next) {
    try {
      const { reviewId } = req.params;
      const { appealReason, supportingContext } = req.body || {};

      const result = await integrityService.submitAppeal(
        reviewId,
        {
          appealReason,
          supportingContext,
        },
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
   * Retrieve an integrity review with full evidence and audit history (trainers/admins)
   */
  async getReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const result = await integrityService.getReviewById(reviewId, req.user);

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
   * Retrieve all integrity reviews for an assessment attempt (trainers/admins)
   */
  async getAttemptReviews(req, res, next) {
    try {
      const { attemptId } = req.params;
      const result = await integrityService.getReviewsForAttempt(attemptId, req.user);

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
