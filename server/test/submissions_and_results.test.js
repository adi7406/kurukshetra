import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Submissions and Execution Results (TASK-027)', () => {
  let trainerToken = '';
  let studentToken = '';
  let intruderToken = '';
  let courseId = '';
  let assessmentId = '';
  let codingQuestionVersionId = '';
  let sessionId = '';
  let submissionId = '';
  let jobId = '';

  it('sets up course, question with public & hidden tests, and coding session', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'sub.trainer@example.com',
        password: 'password123',
        displayName: 'Submission Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'sub.student@example.com',
        password: 'password123',
        displayName: 'Submission Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Intruder student signup
    const intruderRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'sub.intruder@example.com',
        password: 'password123',
        displayName: 'Submission Intruder',
        role: 'student',
      });
    assert.equal(intruderRes.status, 201);
    intruderToken = intruderRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Algorithms Mastery Track',
        description: 'Rigorous coding problem sets and automated grading',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll students
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${intruderToken}`);

    // 5. Create coding question with public and secret hidden test cases
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Compute square of integer n.',
        questionType: 'coding',
        difficulty: 'intermediate',
        marks: 10,
        testCases: [
          {
            input: '4',
            expectedOutput: '16',
            isHidden: false,
            orderIndex: 0,
            weight: 2,
          },
          {
            input: '5',
            expectedOutput: '25',
            isHidden: false,
            orderIndex: 1,
            weight: 2,
          },
          {
            input: '999',
            expectedOutput: '998001',
            isHidden: true, // SECRET EVALUATION TEST
            orderIndex: 2,
            weight: 6,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    codingQuestionVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 6. Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Algorithm Assessment Final',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 2,
        questions: [{ questionVersionId: codingQuestionVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;


    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 7. Student starts coding session
    const sessionRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/coding-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionVersionId: codingQuestionVersionId,
        language: 'javascript',
      });
    assert.equal(sessionRes.status, 201);
    sessionId = sessionRes.body.data.session.id;
  });

  it('submits code for grading, runs public and hidden tests, and creates execution job (202 Accepted)', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return n * n; }',
      });

    assert.equal(res.status, 202);
    assert.ok(res.body.data.submissionId);
    assert.ok(res.body.data.executionJobId);
    assert.equal(res.body.data.status, 'accepted');
    assert.equal(res.body.data.score, 10);
    assert.equal(res.body.data.maxScore, 10);

    submissionId = res.body.data.submissionId;
    jobId = res.body.data.executionJobId;
  });

  it('polls execution job status with authorized access control', async () => {
    // 1. Intruder is forbidden
    const intruderRes = await request(app)
      .get(`/api/v1/execution-jobs/${jobId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    assert.equal(intruderRes.status, 403);
    assert.equal(intruderRes.body.error.code, 'FORBIDDEN');

    // 2. Student owner can read job status
    const studentRes = await request(app)
      .get(`/api/v1/execution-jobs/${jobId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(studentRes.status, 200);
    assert.equal(studentRes.body.data.id, jobId);
    assert.equal(studentRes.body.data.submissionId, submissionId);
    assert.equal(studentRes.body.data.status, 'succeeded');
    assert.equal(studentRes.body.data.result.status, 'accepted');
    assert.equal(studentRes.body.data.result.score, 10);

    // 3. Trainer can read job status
    const trainerRes = await request(app)
      .get(`/api/v1/execution-jobs/${jobId}`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(trainerRes.status, 200);
    assert.equal(trainerRes.body.data.id, jobId);
  });

  it('reads submission summary with authorized access control', async () => {
    // 1. Intruder is forbidden
    const intruderRes = await request(app)
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    assert.equal(intruderRes.status, 403);

    // 2. Student owner can read summary
    const res = await request(app)
      .get(`/api/v1/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, submissionId);
    assert.equal(res.body.data.language, 'javascript');
    assert.equal(res.body.data.status, 'accepted');
    assert.equal(res.body.data.score, 10);
    assert.equal(res.body.data.maxScore, 10);
    assert.ok(res.body.data.completedAt);
  });

  it('returns permitted test results and strictly redacts hidden tests for students', async () => {
    // 1. Student reads results
    const res = await request(app)
      .get(`/api/v1/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.submissionId, submissionId);
    assert.equal(res.body.data.status, 'accepted');
    assert.equal(res.body.data.score, 10);
    assert.equal(res.body.data.maxScore, 10);
    assert.equal(res.body.data.passedTests, 3);
    assert.equal(res.body.data.totalTests, 3);

    const testResults = res.body.data.testResults;
    assert.equal(testResults.length, 3);

    const publicTests = testResults.filter((tr) => !tr.isHidden);
    const hiddenTests = testResults.filter((tr) => tr.isHidden);

    assert.equal(publicTests.length, 2);
    assert.equal(hiddenTests.length, 1);

    // Public test case details are visible
    for (const pt of publicTests) {
      assert.ok(pt.input !== null);
      assert.ok(pt.expectedOutput !== null);
      assert.ok(pt.actualOutput !== null);
      assert.equal(pt.pointsAwarded, 2);
    }

    // STRICT CONFIDENTIALITY: Hidden test case details MUST BE NULL for student
    const ht = hiddenTests[0];
    assert.equal(ht.isHidden, true);
    assert.equal(ht.status, 'accepted');
    assert.equal(ht.pointsAwarded, 6);
    assert.equal(ht.input, null, 'Hidden test input must be redacted');
    assert.equal(ht.expectedOutput, null, 'Hidden test expectedOutput must be redacted');
    assert.equal(ht.actualOutput, null, 'Hidden test actualOutput must be redacted');
    assert.equal(ht.diagnostic, null, 'Hidden test diagnostic must be redacted');
  });

  it('allows trainer to see full details of all tests during submission review', async () => {
    const res = await request(app)
      .get(`/api/v1/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    const hiddenTest = res.body.data.testResults.find((tr) => tr.isHidden);
    assert.ok(hiddenTest);
    // Trainer can see hidden test input and output for auditing/grading
    assert.equal(hiddenTest.input, '999');
    assert.equal(hiddenTest.expectedOutput, '998001');
  });

  it('handles partial credit when student solution fails hidden tests', async () => {
    // Solution hardcoded for 4 and 5, but fails on 999
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { if (n === 4) return 16; if (n === 5) return 25; return 0; }',
      });

    assert.equal(res.status, 202);
    assert.equal(res.body.data.status, 'wrong_answer');
    // Only 2 public tests passed (2 + 2 = 4 points)
    assert.equal(res.body.data.score, 4);
    assert.equal(res.body.data.maxScore, 10);

    const subId = res.body.data.submissionId;
    const resultsRes = await request(app)
      .get(`/api/v1/submissions/${subId}/results`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resultsRes.status, 200);
    assert.equal(resultsRes.body.data.passedTests, 2);
    assert.equal(resultsRes.body.data.totalTests, 3);
  });

  it('guarantees idempotency via Idempotency-Key header', async () => {
    const key = 'idem-sub-unique-key-42';

    // First attempt
    const res1 = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .set('Idempotency-Key', key)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return n * n; }',
      });
    assert.equal(res1.status, 202);

    // Repeated identical attempt returns cached result safely
    const res2 = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .set('Idempotency-Key', key)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return n * n; }',
      });
    assert.equal(res2.status, 202);
    assert.equal(res2.body.data.submissionId, res1.body.data.submissionId);

    // Reused with different payload returns 409 Conflict
    const resConflict = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .set('Idempotency-Key', key)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return 0; }', // Different payload!
      });
    assert.equal(resConflict.status, 409);
    assert.equal(resConflict.body.error.code, 'CONFLICT');
  });

  it('rejects submissions to a closed coding session (422)', async () => {
    // Close the session
    await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${studentToken}`);

    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return n * n; }',
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('closed'));
  });

  it('returns 404 for non-existent submission or execution job', async () => {
    const sub404 = await request(app)
      .get('/api/v1/submissions/non-existent-uuid')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(sub404.status, 404);

    const job404 = await request(app)
      .get('/api/v1/execution-jobs/non-existent-uuid')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(job404.status, 404);
  });
});
