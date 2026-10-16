import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { jobsService } from '../src/services/jobs.service.js';

describe('Asynchronous Job Framework & Idempotency (TASK-019)', () => {
  let studentToken = '';
  let studentId = '';
  let trainerToken = '';
  let trainerId = '';
  let testJobId = '';
  let cancellableJobId = '';

  it('sets up test users', async () => {
    // 1. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'job.trainer@example.com',
        password: 'password123',
        displayName: 'Job Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;
    trainerId = trainerRes.body.data.user.id;

    // 2. Student
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'job.student@example.com',
        password: 'password123',
        displayName: 'Job Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;
    studentId = studentRes.body.data.user.id;
  });

  it('creates an asynchronous job and transitions to succeeded in the background (TASK-019)', async () => {
    const job = await jobsService.createJob({
      type: 'content_generation',
      inputPayload: { topic: 'Algorithms', count: 5 },
      userId: trainerId,
      runnerFn: async ({ updateProgress }) => {
        await updateProgress(50, 100);
        return { generatedItemsCount: 5 };
      },
    });

    assert.ok(job.id);
    assert.equal(job.type, 'content_generation');
    testJobId = job.id;

    // Wait a tick for setImmediate execution to finish
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Fetch job status via API
    const res = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, testJobId);
    assert.equal(res.body.data.status, 'succeeded');
    assert.equal(res.body.data.progress.completed, 100);
    assert.deepEqual(res.body.data.result, { generatedItemsCount: 5 });
  });

  it('rejects cross-user job status access by another student (403 Forbidden)', async () => {
    // Student attempts to read trainer's job
    const res = await request(app)
      .get(`/api/v1/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('returns 404 for nonexistent job ID', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/nonexistent_job_123')
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('enforces idempotency: same key & payload returns existing job', async () => {
    const key = 'idemp_unique_token_abc';
    const payload = { model: 'gemini-1.5', prompt: 'generate questions' };

    // First call
    const job1 = await jobsService.createJob({
      type: 'question_generation',
      inputPayload: payload,
      idempotencyKey: key,
      userId: trainerId,
    });
    assert.ok(job1.id);

    // Second call with same key and identical payload
    const job2 = await jobsService.createJob({
      type: 'question_generation',
      inputPayload: payload,
      idempotencyKey: key,
      userId: trainerId,
    });

    assert.equal(job2.id, job1.id, 'Idempotent call must return the same job ID');
  });

  it('enforces idempotency conflict: same key with different payload throws 409 Conflict', async () => {
    const key = 'idemp_conflict_key_xyz';

    await jobsService.createJob({
      type: 'code_execution',
      inputPayload: { code: 'print("hello")' },
      idempotencyKey: key,
      userId: trainerId,
    });

    await assert.rejects(
      async () => {
        await jobsService.createJob({
          type: 'code_execution',
          inputPayload: { code: 'print("different code!")' }, // Different payload
          idempotencyKey: key,
          userId: trainerId,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'CONFLICT');
        assert.ok(err.message.includes('Idempotency-Key reused with a different request payload'));
        return true;
      }
    );
  });

  it('allows cancelling an active job (POST /jobs/:id/cancel)', async () => {
    const job = await jobsService.createJob({
      type: 'syllabus_import',
      inputPayload: { file: 'syllabus.pdf' },
      userId: studentId,
    });
    cancellableJobId = job.id;

    const cancelRes = await request(app)
      .post(`/api/v1/jobs/${cancellableJobId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');

    // Attempting to cancel again should fail with 409 Conflict
    const cancelAgain = await request(app)
      .post(`/api/v1/jobs/${cancellableJobId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(cancelAgain.status, 409);
    assert.equal(cancelAgain.body.error.code, 'CONFLICT');
  });
});
