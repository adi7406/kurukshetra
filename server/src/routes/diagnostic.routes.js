import { Router } from 'express';
import { z } from 'zod';
import { diagnosticController } from '../controllers/diagnostic.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const submitDiagnosticSchema = {
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.string().min(1, 'Question ID is required'),
        selectedOptionId: z.string().min(1, 'Selected option ID is required'),
      })
    ).min(1, 'At least one answer must be provided'),
  }),
};

// Diagnostic status
router.get('/diagnostic/status', authenticate, diagnosticController.getStatus);

// Diagnostic assessment questions (30 MCQs across OOP, DSA, OS)
router.get('/diagnostic/assessment', authenticate, diagnosticController.getAssessment);

// Diagnostic submission & placement computation
router.post(
  '/diagnostic/submit',
  authenticate,
  validateRequest(submitDiagnosticSchema),
  diagnosticController.submitAssessment
);

// Diagnostic historical results
router.get('/diagnostic/results', authenticate, diagnosticController.getResults);

export default router;
