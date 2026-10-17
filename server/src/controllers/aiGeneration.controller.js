import { aiGenerationService } from '../services/aiGeneration.service.js';

export const aiGenerationController = {
  /**
   * Generate draft questions for a course/concept
   */
  async generateQuestions(req, res, next) {
    try {
      const { courseId } = req.params;
      const { conceptId, topic, difficulty, count, async: isAsync } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] || null;

      const result = await aiGenerationService.generateQuestions({
        courseId,
        conceptId,
        topic,
        difficulty,
        count,
        trainerUser: req.user,
        useAsyncJob: Boolean(isAsync),
        idempotencyKey,
      });

      const statusCode = result.async ? 202 : 201;

      res.status(statusCode).json({
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
   * Generate draft learning content for a concept
   */
  async generateContent(req, res, next) {
    try {
      const { conceptId } = req.params;
      const { courseId, title, focusTopic, difficulty, async: isAsync } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] || null;

      const result = await aiGenerationService.generateContent({
        courseId,
        conceptId,
        title,
        focusTopic,
        difficulty,
        trainerUser: req.user,
        useAsyncJob: Boolean(isAsync),
        idempotencyKey,
      });

      const statusCode = result.async ? 202 : 201;

      res.status(statusCode).json({
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
   * Generate draft coding assessment with test cases for a course/concept
   */
  async generateCoding(req, res, next) {
    try {
      const { courseId } = req.params;
      const { conceptId, topic, difficulty } = req.body;

      const result = await aiGenerationService.generateCodingAssessment({
        courseId,
        conceptId,
        topic: topic || 'Algorithmic Problem Solving',
        difficulty,
        trainerUser: req.user,
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
   * Synthesize full curriculum from uploaded syllabus
   */
  async extractCurriculum(req, res, next) {
    try {
      const { syllabusText, courseTitle } = req.body;

      const result = await aiGenerationService.extractCurriculum({
        syllabusText: syllabusText || 'Data Structures & Algorithms',
        courseTitle: courseTitle || 'CS201 Data Structures',
        trainerUser: req.user,
      });

      res.status(200).json({
        data: result,
        ...result, // Frontend compatibility envelope
        meta: {
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Diagnostic verification for configured NVIDIA AI models
   */
  async getModelDiagnostics(req, res, next) {
    try {
      const { model } = req.query;
      let result;
      if (model) {
        result = await aiGenerationService.checkModelDiagnostics(model);
      } else {
        result = await aiGenerationService.checkAllModelDiagnostics();
      }

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

