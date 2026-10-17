import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const signupSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    displayName: z.string().min(1).optional(),
    role: z.enum(['student', 'trainer', 'admin']).default('student'),
    metadata: z.record(z.any()).optional(),
  }),
};

const signinSchema = {
  body: z.object({
    email: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
    role: z.string().optional(),
  }),
};

const updateMeSchema = {
  body: z.object({
    displayName: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
    role: z.string().optional(),
  }),
};

router.post('/auth/signup', validateRequest(signupSchema), authController.signup);
router.post('/auth/signin', validateRequest(signinSchema), authController.signin);
router.post('/auth/login', validateRequest(signinSchema), authController.signin);
router.get('/teachers', authController.listTeachers);
router.get('/students', authenticate, authController.listStudents);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validateRequest(updateMeSchema), authController.updateMe);

export default router;
