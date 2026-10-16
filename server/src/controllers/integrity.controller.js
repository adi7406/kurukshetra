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
};
