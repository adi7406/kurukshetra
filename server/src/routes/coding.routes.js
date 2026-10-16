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

const recordEventsSchema = {
  body: z.object({
    events: z
      .array(
        z.object({
          sequenceNumber: z.number().int().min(0),
          eventType: z.enum([
            'document_change',
            'paste',
            'run',
            'submit',
            'editor_focus',
            'editor_blur',
            'visibility_change',
            'language_change',
            'snapshot',
          ]),
          occurredAt: z.string(),
          payload: z.record(z.any()).optional(),
          clientEventId: z.string().optional(),
        })
      )
      .min(1, 'At least one event required'),
    isFinal: z.boolean().optional(),
  }),
};

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

// Editor Event Recording & Session Replay (API_SPEC Section 5.9 & TASK-028)
router.post(
  '/coding-sessions/:sessionId/events',
  authenticate,
  validateRequest(recordEventsSchema),
  codingController.recordEvents
);

router.get('/coding-sessions/:sessionId/replay', authenticate, codingController.getReplayTimeline);

export default router;



