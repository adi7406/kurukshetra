import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { monitoringService } from '../src/services/monitoring.service.js';

describe('AI Content and Question Generation (TASK-016)', () => {
  let trainerToken;
  let otherTrainerToken;
  let studentToken;
  let courseId;
  let conceptId;
  let generatedQuestionId;

  it('sets up trainer, other trainer, student, course, and concept', async () => {
    // 1. Create trainer
    const trainerRes = await request(app).post('/api/v1/auth/signup').send({
      email: `trainer_ai_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'trainer',
      displayName: 'AI Curriculum Author',
    });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Create other trainer
    const otherRes = await request(app).post('/api/v1/auth/signup').send({
      email: `other_trainer_ai_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'trainer',
      displayName: 'Other Trainer',
    });
    assert.equal(otherRes.status, 201);
    otherTrainerToken = otherRes.body.data.session.access_token;

    // 3. Create student
    const studentRes = await request(app).post('/api/v1/auth/signup').send({
      email: `student_ai_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'student',
      displayName: 'Learner User',
    });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 4. Create course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Advanced Data Structures and Algorithms',
        description: 'Comprehensive study of trees, graphs, and algorithmic complexity.',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    // 5. Create concept
    const conceptRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Binary Search Trees',
        description: 'Binary trees maintaining keys in strict sorted order for O(log n) lookups.',
      });
    assert.equal(conceptRes.status, 201);
    conceptId = conceptRes.body.data.id;
  });

  it('generates curriculum-aligned draft questions synchronously', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/ai/generate-questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        conceptId,
        topic: 'Binary Search Trees',
        difficulty: 'intermediate',
        count: 2,
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.questions.length >= 2);
    assert.equal(res.body.data.requiresTrainerApproval, true);

    const firstQ = res.body.data.questions[0];
    generatedQuestionId = firstQ.questionId;
    assert.ok(firstQ.questionId);
    assert.ok(firstQ.versionId);
    assert.equal(firstQ.reviewStatus, 'draft'); // Never silently published
    assert.equal(firstQ.source, 'ai_generated');
  });

  it('generates draft questions asynchronously via background job queue', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/ai/generate-questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        conceptId,
        topic: 'Binary Search Trees',
        difficulty: 'beginner',
        count: 2,
        async: true,
      });

    assert.equal(res.status, 202);
    assert.equal(res.body.data.async, true);
    assert.ok(res.body.data.jobId);

    const jobId = res.body.data.jobId;

    // Poll background job status
    let attempts = 0;
    let jobData;
    while (attempts < 10) {
      await new Promise((r) => setTimeout(r, 100));
      const jobRes = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      assert.equal(jobRes.status, 200);
      jobData = jobRes.body.data;
      if (jobData.status === 'succeeded' || jobData.status === 'failed') break;
      attempts += 1;
    }

    assert.equal(jobData.status, 'succeeded');
    assert.ok(jobData.result.questions.length >= 2);
    assert.equal(jobData.result.questions[0].reviewStatus, 'draft');
  });

  it('generates draft educational content for a concept', async () => {
    const res = await request(app)
      .post(`/api/v1/concepts/${conceptId}/ai/generate-content`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        courseId,
        focusTopic: 'Balancing and invariants',
        difficulty: 'intermediate',
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.resourceId);
    assert.equal(res.body.data.reviewStatus, 'draft'); // Strictly draft
    assert.equal(res.body.data.sourceType, 'ai_generated');
    assert.equal(res.body.data.requiresTrainerApproval, true);
  });

  it('generates draft content asynchronously via background job queue', async () => {
    const res = await request(app)
      .post(`/api/v1/concepts/${conceptId}/ai/generate-content`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        courseId,
        focusTopic: 'Time complexity breakdown',
        async: true,
      });

    assert.equal(res.status, 202);
    assert.ok(res.body.data.jobId);
  });

  it('strictly isolates draft questions and answers from learner visibility', async () => {
    // 1. Student previewing generated question does NOT receive answer key
    const previewRes = await request(app)
      .get(`/api/v1/questions/${generatedQuestionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    if (previewRes.status === 200) {
      assert.ok(!previewRes.body.data.answer); // null or stripped
      assert.equal(previewRes.body.data.answerPayload, undefined);
    } else {
      assert.ok([403, 404].includes(previewRes.status));
    }
  });

  it('enforces role authorization: student cannot generate questions or content', async () => {
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/ai/generate-questions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        topic: 'Cheating Tricks',
      });
    assert.equal(qRes.status, 403);

    const cRes = await request(app)
      .post(`/api/v1/concepts/${conceptId}/ai/generate-content`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId,
      });
    assert.equal(cRes.status, 403);
  });

  it('rejects unauthorized trainer access to another trainer’s course', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/ai/generate-questions`)
      .set('Authorization', `Bearer ${otherTrainerToken}`)
      .send({
        topic: 'Graph Theory',
      });
    assert.equal(res.status, 403);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/ai/generate-questions`)
      .send({
        topic: 'Unauthenticated prompt',
      });
    assert.equal(res.status, 401);
  });

  it('rejects invalid or missing request payloads with 422', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/ai/generate-questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({}); // missing topic
    assert.equal(res.status, 422);
  });

  it('enforces AI cost budget limits and records telemetry', async () => {
    // 1. Verify telemetry was recorded
    const metrics = monitoringService.getSystemMetrics();
    assert.ok(metrics.aiCostControls.totalOperations > 0);
    assert.ok(metrics.aiCostControls.totalTokens > 0);

    // 2. Set an artificially tight budget for a test user
    const restrictedUserId = `user_budget_test_${Date.now()}`;
    monitoringService.setUserBudget(restrictedUserId, 0.0001); // $0.0001
    monitoringService.recordAiUsage({
      userId: restrictedUserId,
      operation: 'ai_question_generation',
      model: 'gpt-4o',
      promptTokens: 2000,
      completionTokens: 2000,
    });

    // 3. Next budget check throws RateLimitError
    assert.throws(
      () => monitoringService.checkBudget(restrictedUserId),
      (err) => err.statusCode === 429 && err.message.includes('exceeded')
    );
  });
});
