import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Coding Editor Sessions & Security (TASK-025)', () => {
  let trainerToken = '';
  let studentToken = '';
  let otherStudentToken = '';
  let courseId = '';
  let codingQuestionVersionId = '';
  let assessmentId = '';
  let sessionId = '';

  it('sets up a course with a published coding assessment with public and hidden tests', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'coding.trainer@example.com',
        password: 'password123',
        displayName: 'Coding Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student 1 signup
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'coding.student1@example.com',
        password: 'password123',
        displayName: 'Coding Student 1',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    studentToken = s1Res.body.data.session.access_token;

    // 3. Student 2 signup
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'coding.student2@example.com',
        password: 'password123',
        displayName: 'Coding Student 2',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    otherStudentToken = s2Res.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Python & Algorithms Laboratory',
        description: 'Practical coding challenges',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll Student 1
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);

    // 5. Create coding question with public and hidden test cases
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Write a function solution(n) that returns the square of n.',
        questionType: 'coding',
        difficulty: 'intermediate',
        marks: 10,
        testCases: [
          {
            input: '4',
            expectedOutput: '16',
            isHidden: false,
            orderIndex: 0,
          },
          {
            input: '5',
            expectedOutput: '25',
            isHidden: false,
            orderIndex: 1,
          },
          {
            input: '999',
            expectedOutput: '998001',
            isHidden: true, // SECRET EVALUATION TEST
            orderIndex: 2,
          },
          {
            input: '-12',
            expectedOutput: '144',
            isHidden: true, // SECRET EVALUATION TEST
            orderIndex: 3,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    codingQuestionVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 6. Create & publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Coding Diagnostic Test',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 3,
        questions: [{ questionVersionId: codingQuestionVersionId, marks: 10, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    const pubRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(pubRes.status, 200);
  });

  it('starts coding session, loads starter code, and strictly redacts hidden tests (TASK-025)', async () => {
    // 1. Reject unsupported programming language with 422
    const invalidLangRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/coding-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionVersionId: codingQuestionVersionId,
        language: 'unsupported_lang',
      });
    assert.equal(invalidLangRes.status, 422);

    // 2. Start valid session with Python
    const res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/coding-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionVersionId: codingQuestionVersionId,
        language: 'python',
      });

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.ok(data.session.id);
    assert.equal(data.session.language, 'python');
    assert.equal(data.session.status, 'active');
    assert.ok(data.session.currentCode.includes('def solution'));
    sessionId = data.session.id;

    // 3. Verify task metadata & constraints
    assert.equal(data.task.marks, 10);
    assert.ok(data.task.constraints.timeLimitMs);
    assert.ok(data.task.constraints.supportedLanguages.includes('python'));

    // 4. STRICT SECURITY: Hidden test cases must never be leaked
    const tests = data.task.sampleTestCases;
    assert.equal(tests.length, 2);
    for (const t of tests) {
      assert.notEqual(t.input, '999');
      assert.notEqual(t.input, '-12');
      assert.notEqual(t.expectedOutput, '998001');
      assert.notEqual(t.expectedOutput, '144');
    }
  });

  it('retrieves coding session details and enforces security boundaries (GET /coding-sessions/:id)', async () => {
    // 1. Session owner can retrieve session
    const res = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, sessionId);
    assert.equal(res.body.data.language, 'python');
    assert.equal(res.body.data.task.sampleTestCases.length, 2);

    // 2. Other student cannot access this session (403 Forbidden)
    const forbiddenRes = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');
  });

  it('saves draft code and updates current session state (PUT /coding-sessions/:id/drafts)', async () => {
    const updatedCode = 'def solution(n):\n    return n * n\n';

    // 1. Save draft
    const res = await request(app)
      .put(`/api/v1/coding-sessions/${sessionId}/drafts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        code: updatedCode,
        language: 'python',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.currentCode, updatedCode);

    // 2. Fetch session and confirm draft persisted
    const checkRes = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(checkRes.status, 200);
    assert.equal(checkRes.body.data.currentCode, updatedCode);

    // 3. Other student cannot overwrite draft (403)
    const snoopRes = await request(app)
      .put(`/api/v1/coding-sessions/${sessionId}/drafts`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        code: 'malicious code',
      });

    assert.equal(snoopRes.status, 403);
  });

  it('closes coding session cleanly and rejects drafts after closure', async () => {
    // 1. Close session
    const closeRes = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.data.status, 'closed');
    assert.ok(closeRes.body.data.ended_at);

    // 2. Draft save after close is rejected with 422
    const failDraftRes = await request(app)
      .put(`/api/v1/coding-sessions/${sessionId}/drafts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        code: 'new code after close',
      });

    assert.equal(failDraftRes.status, 422);
  });
});
