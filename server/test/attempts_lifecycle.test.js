import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Assessment Attempt Lifecycle (TASK-020)', () => {
  let studentToken = '';
  let studentId = '';
  let otherStudentToken = '';
  let trainerToken = '';
  let courseId = '';
  let questionVersionId = '';
  let assessmentId = '';
  let attemptId = '';

  it('sets up users, course, enrollment, question, and assessment', async () => {
    // 1. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'attempt.trainer@example.com',
        password: 'password123',
        displayName: 'Attempt Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'attempt.student1@example.com',
        password: 'password123',
        displayName: 'Student One',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    studentToken = s1Res.body.data.session.access_token;
    studentId = s1Res.body.data.user.id;

    // 3. Student 2 (Unenrolled)
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'attempt.student2@example.com',
        password: 'password123',
        displayName: 'Student Two',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    otherStudentToken = s2Res.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Computer Networking Protocols',
        description: 'TCP/IP and Reliable Transport',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 5. Enroll Student 1
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    // 6. Create question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'Which protocol operates at the Transport Layer of the OSI model?',
        options: [
          { key: 'A', text: 'IP', isCorrect: false },
          { key: 'B', text: 'TCP', isCorrect: true },
          { key: 'C', text: 'HTTP', isCorrect: false },
          { key: 'D', text: 'Ethernet', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'B' },
        },
      });
    assert.equal(qRes.status, 201);
    questionVersionId = qRes.body.data.versionId;

    // 7. Create and publish assessment with max_attempts: 1
    const aRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Transport Layer Quiz',
        assessmentType: 'fixed_test',
        durationMinutes: 30,
        maxAttempts: 1, // Only 1 attempt allowed
        questions: [{ questionVersionId, position: 0, marksOverride: 2 }],
      });
    assert.equal(aRes.status, 201);
    assessmentId = aRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);
  });

  it('rejects attempt start by unenrolled student (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('actively enrolled'));
  });

  it('allows enrolled student to start an attempt (201 Created)', async () => {
    const res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.assessmentId, assessmentId);
    assert.equal(res.body.data.attemptNumber, 1);
    assert.equal(res.body.data.status, 'in_progress');
    assert.ok(res.body.data.expiresAt);
    attemptId = res.body.data.id;
  });

  it('enforces maximum attempt limit when student attempts to start again (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('Maximum attempt limit of 1 reached'));
  });

  it('allows student to save answer during active attempt (PUT /attempts/:id/answers/:qId)', async () => {
    const res = await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${questionVersionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answer: {
          selectedOptionKeys: ['B'],
        },
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.attemptId, attemptId);
    assert.equal(res.body.data.questionVersionId, questionVersionId);
    assert.ok(res.body.data.savedAt);
  });

  it('rejects saving answers to another student attempt (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${questionVersionId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        answer: {
          selectedOptionKeys: ['A'],
        },
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('retrieves attempt state and saved answers (GET /attempts/:id)', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, attemptId);
    assert.equal(res.body.data.status, 'in_progress');
    assert.equal(res.body.data.answers.length, 1);
    assert.deepEqual(res.body.data.answers[0].answer, { selectedOptionKeys: ['B'] });
  });

  it('allows student to finalize and submit attempt (POST /attempts/:id/submit)', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, attemptId);
    assert.equal(res.body.data.status, 'submitted');
    assert.ok(res.body.data.submittedAt);
  });

  it('submitting an already submitted attempt is idempotent (returns 200 without error)', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'submitted');
    assert.ok(res.body.data.message.includes('already finalized'));
  });

  it('rejects saving answers after attempt is finalized (409 Conflict)', async () => {
    const res = await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${questionVersionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answer: {
          selectedOptionKeys: ['C'],
        },
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('no longer active'));
  });

  it('allows student to list their attempts (GET /me/attempts)', async () => {
    const res = await request(app)
      .get('/api/v1/me/attempts')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const myAttempt = res.body.data.find((a) => a.id === attemptId);
    assert.ok(myAttempt);
    assert.equal(myAttempt.student_id, studentId);
    assert.equal(myAttempt.status, 'submitted');
  });
});
