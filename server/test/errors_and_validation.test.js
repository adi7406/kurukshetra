import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestIdMiddleware } from '../src/middleware/requestId.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../src/utils/errors.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);

  const sampleSchema = {
    body: z.object({
      email: z.string().email(),
      age: z.number().min(18),
    }),
    query: z.object({
      role: z.enum(['student', 'teacher']).optional(),
    }),
  };

  app.post('/test/validate', validateRequest(sampleSchema), (req, res) => {
    res.status(200).json({ data: req.body, meta: { requestId: req.requestId } });
  });

  app.get('/test/unauthorized', () => {
    throw new UnauthorizedError('Session expired.');
  });

  app.get('/test/forbidden', () => {
    throw new ForbiddenError('Instructor privileges required.');
  });

  app.get('/test/not-found', () => {
    throw new NotFoundError('Course with specified ID does not exist.');
  });

  app.get('/test/conflict', () => {
    throw new ConflictError('Student is already enrolled in this course.');
  });

  app.get('/test/rate-limited', () => {
    throw new RateLimitError();
  });

  app.get('/test/unhandled', () => {
    throw new Error('Database connection unexpectedly dropped with credentials xyz:123');
  });

  app.use(errorHandler);
  return app;
}

describe('API Validation and Error Handling (TASK-005)', () => {
  const app = createTestApp();

  it('passes valid request body and query', async () => {
    const res = await request(app)
      .post('/test/validate?role=student')
      .send({ email: 'test@example.com', age: 25 });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'test@example.com');
    assert.equal(res.body.data.age, 25);
    assert.ok(res.body.meta.requestId);
  });

  it('rejects invalid fields with 422 and structured details', async () => {
    const res = await request(app)
      .post('/test/validate')
      .send({ email: 'not-an-email', age: 12 });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(res.body.error.details));
    assert.equal(res.body.error.details.length, 2);

    const emailIssue = res.body.error.details.find((d) => d.field === 'email');
    assert.ok(emailIssue);
    const ageIssue = res.body.error.details.find((d) => d.field === 'age');
    assert.ok(ageIssue);
  });

  it('formats UnauthorizedError as 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/test/unauthorized');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
    assert.equal(res.body.error.message, 'Session expired.');
    assert.ok(res.body.meta.requestId);
  });

  it('formats ForbiddenError as 403 FORBIDDEN', async () => {
    const res = await request(app).get('/test/forbidden');
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.equal(res.body.error.message, 'Instructor privileges required.');
  });

  it('formats NotFoundError as 404 NOT_FOUND', async () => {
    const res = await request(app).get('/test/not-found');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(res.body.error.message, 'Course with specified ID does not exist.');
  });

  it('formats ConflictError as 409 CONFLICT', async () => {
    const res = await request(app).get('/test/conflict');
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.equal(res.body.error.message, 'Student is already enrolled in this course.');
  });

  it('formats RateLimitError as 429 RATE_LIMITED', async () => {
    const res = await request(app).get('/test/rate-limited');
    assert.equal(res.status, 429);
    assert.equal(res.body.error.code, 'RATE_LIMITED');
  });

  it('formats unhandled exceptions safely without exposing internal details or stack traces', async () => {
    const res = await request(app).get('/test/unhandled');
    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    assert.equal(res.body.error.message, 'An unexpected internal error occurred.');
    assert.equal(res.body.stack, undefined);
    assert.equal(res.body.error.stack, undefined);
    assert.ok(!JSON.stringify(res.body).includes('credentials xyz'));
  });

  it('formats malformed JSON as 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/test/validate')
      .set('Content-Type', 'application/json')
      .send('{"invalid json: true');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });
});
