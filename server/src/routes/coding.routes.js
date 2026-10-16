import { Router } from 'express';
import { z } from 'zod';
import { codingController } from '../controllers/coding.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const startSessionSchema = {
  body: z.object({
    questionVersionId: z.string().min(1, 'questionVersionId is required'),
    language: z.enum(['javascript', 'python', 'java', 'cpp', 'c', 'go']).optional(),
    attemptId: z.string().optional().nullable(),
    recordingConsent: z.string().optional(),
  }),
};

const saveDraftSchema = {
  body: z.object({
    code: z.string(),
    language: z.enum(['javascript', 'python', 'java', 'cpp', 'c', 'go']).optional(),
  }),
};

const runCodeSchema = {
  body: z.object({
    sourceCode: z.string().optional(),
    language: z.enum(['javascript', 'python', 'java', 'cpp', 'c', 'go']).optional(),
  }),
};

const createSubmissionSchema = {
  body: z.object({
    sourceCode: z.string().min(1, 'sourceCode is required'),
    language: z.enum(['javascript', 'python', 'java', 'cpp', 'c', 'go']),
    taskVersionId: z.string().optional(),
    questionVersionId: z.string().optional(),
  }),
};

// Coding session endpoints (API_SPEC Section 5.9)
router.post(
  '/assessments/:assessmentId/coding-sessions',
  authenticate,
  validateRequest(startSessionSchema),
  codingController.startSession
);

router.get('/coding-sessions/:sessionId', authenticate, codingController.getSession);

router.put(
  '/coding-sessions/:sessionId/drafts',
  authenticate,
  validateRequest(saveDraftSchema),
  codingController.saveDraft
);

router.post('/coding-sessions/:sessionId/close', authenticate, codingController.closeSession);

router.post(
  '/coding-sessions/:sessionId/run',
  authenticate,
  validateRequest(runCodeSchema),
  codingController.runSampleTests
);

// Code Submissions & Execution Jobs (API_SPEC Section 5.9)
router.post(
  '/coding-sessions/:sessionId/submissions',
  authenticate,
  validateRequest(createSubmissionSchema),
  codingController.createSubmission
);

router.get('/submissions/:submissionId', authenticate, codingController.getSubmission);

router.get('/submissions/:submissionId/results', authenticate, codingController.getSubmissionResults);

router.get('/execution-jobs/:jobId', authenticate, codingController.getExecutionJob);

export default router;


