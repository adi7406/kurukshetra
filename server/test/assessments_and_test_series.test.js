import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Assessments and Test Series (TASK-018)', () => {
  let studentToken = '';
  let trainerToken = '';
  let courseId = '';
  let questionVersionId = '';
  let draftAssessmentId = '';
  let emptyAssessmentId = '';
  let testSeriesId = '';

  it('sets up users, course, enrollment, and questions', async () => {
    // 1. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'assessment.trainer@example.com',
        password: 'password123',
        displayName: 'Assessment Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'assessment.student@example.com',
        password: 'password123',
        displayName: 'Assessment Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Create course & publish it
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Operating Systems & Concurrency',
        description: 'Processes, threads, and synchronization',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 4. Enroll student
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);

    // 5. Create a question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'Which condition is NOT required for a deadlock to occur?',
        options: [
          { key: 'A', text: 'Mutual Exclusion', isCorrect: false },
          { key: 'B', text: 'Preemption', isCorrect: true },
          { key: 'C', text: 'Hold and Wait', isCorrect: false },
          { key: 'D', text: 'Circular Wait', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'B' },
        },
      });
    assert.equal(qRes.status, 201);
    questionVersionId = qRes.body.data.versionId;
  });

  it('allows trainer to create a draft assessment with assigned questions (TASK-018)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Midterm Assessment 1',
        description: 'Deadlocks and Concurrency',
        assessmentType: 'fixed_test',
        durationMinutes: 45,
        maxAttempts: 2,
        passingPercentage: 70.0,
        questions: [
          {
            questionVersionId,
            position: 0,
            marksOverride: 5,
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.status, 'draft');
    assert.equal(res.body.data.duration_minutes, 45);
    draftAssessmentId = res.body.data.id;
  });

  it('hides draft assessment from student listing (GET /assessments)', async () => {
    const res = await request(app)
      .get('/api/v1/assessments')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const found = res.body.data.find((a) => a.id === draftAssessmentId);
    assert.equal(found, undefined, 'Draft assessment must be hidden from student');
  });

  it('rejects student access to draft assessment by ID (404 Not Found)', async () => {
    const res = await request(app)
      .get(`/api/v1/assessments/${draftAssessmentId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('rejects publishing an assessment with zero questions (422)', async () => {
    // Create empty assessment
    const emptyRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Empty Assessment',
        questions: [],
      });
    assert.equal(emptyRes.status, 201);
    emptyAssessmentId = emptyRes.body.data.id;

    // Attempt to publish
    const publishRes = await request(app)
      .post(`/api/v1/assessments/${emptyAssessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(publishRes.status, 422);
    assert.equal(publishRes.body.error.code, 'VALIDATION_ERROR');
    assert.ok(publishRes.body.error.message.includes('Cannot publish an assessment with zero questions'));
  });

  it('allows trainer to publish assessment (POST /assessments/:id/publish)', async () => {
    const res = await request(app)
      .post(`/api/v1/assessments/${draftAssessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'published');
  });

  it('makes published assessment visible in student listing', async () => {
    const res = await request(app)
      .get('/api/v1/assessments')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const found = res.body.data.find((a) => a.id === draftAssessmentId);
    assert.ok(found, 'Published assessment must be visible to enrolled student');
  });

  it('STRICT SECURITY: Student GET /assessments/:id never leaks question answer keys', async () => {
    const res = await request(app)
      .get(`/api/v1/assessments/${draftAssessmentId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const assessment = res.body.data;
    assert.equal(assessment.id, draftAssessmentId);
    assert.equal(assessment.questions.length, 1);

    const q = assessment.questions[0];
    assert.equal(q.marks, 5); // marks override applied
    assert.equal(q.options.length, 4);

    // Verify option answer keys are not exposed
    for (const opt of q.options) {
      assert.equal(opt.is_correct, undefined, 'is_correct must be stripped from student');
      assert.equal(opt.isCorrect, undefined, 'isCorrect must be stripped from student');
    }
  });

  it('allows trainer to create and publish a test series', async () => {
    // 1. Create test series
    const createRes = await request(app)
      .post(`/api/v1/courses/${courseId}/test-series`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'OS Mastery Test Series',
        description: 'Comprehensive evaluation of OS concepts',
        assessmentIds: [draftAssessmentId],
      });
    assert.equal(createRes.status, 201);
    assert.ok(createRes.body.data.id);
    testSeriesId = createRes.body.data.id;

    // 2. Publish test series
    const pubRes = await request(app)
      .post(`/api/v1/test-series/${testSeriesId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.body.data.status, 'published');

    // 3. Student can view published test series
    const studentRes = await request(app)
      .get(`/api/v1/test-series/${testSeriesId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(studentRes.status, 200);
    assert.equal(studentRes.body.data.title, 'OS Mastery Test Series');
    assert.equal(studentRes.body.data.assessments.length, 1);
  });
});
