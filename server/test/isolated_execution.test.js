import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Isolated Code Execution & Security (TASK-026)', () => {
  let trainerToken = '';
  let studentToken = '';
  let intruderToken = '';
  let courseId = '';
  let assessmentId = '';
  let codingQuestionVersionId = '';
  let sessionId = '';

  it('sets up a course, published assessment, and coding question with public/hidden tests', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'exec.trainer@example.com',
        password: 'password123',
        displayName: 'Exec Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'exec.student@example.com',
        password: 'password123',
        displayName: 'Exec Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Intruder student signup
    const intruderRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'exec.intruder@example.com',
        password: 'password123',
        displayName: 'Exec Intruder',
        role: 'student',
      });
    assert.equal(intruderRes.status, 201);
    intruderToken = intruderRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'High-Performance Isolated Compute Lab',
        description: 'Testing isolated execution and sandboxing',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll student
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);

    // 5. Create coding question with 2 public test cases and 1 hidden secret test case
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Calculate the square of integer n.',
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
            input: '1000',
            expectedOutput: '1000000',
            isHidden: true, // STRICT HIDDEN TEST
            orderIndex: 2,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    codingQuestionVersionId = qRes.body.data.versionId;

    // Publish question
    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 6. Create assessment with this coding question and publish
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Isolated Execution Benchmark Challenge',
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

  it('runs sample tests with accepted solution in isolated runner', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return n * n; }',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'accepted');
    assert.equal(res.body.data.passedTests, 2);
    assert.equal(res.body.data.totalTests, 2);
    assert.ok(Array.isArray(res.body.data.testResults));
    assert.equal(res.body.data.testResults.length, 2);
    assert.equal(res.body.data.testResults[0].status, 'accepted');
    assert.equal(res.body.data.testResults[1].status, 'accepted');
  });

  it('runs sample tests and correctly marks wrong answers without crashing', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return 42; }',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'wrong_answer');
    assert.equal(res.body.data.passedTests, 0);
    assert.equal(res.body.data.totalTests, 2);
    assert.equal(res.body.data.testResults[0].status, 'wrong_answer');
  });

  it('handles infinite loop / timeouts safely (time_limit)', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { while(true) {} }',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'wrong_answer');
    assert.equal(res.body.data.testResults[0].status, 'time_limit');
    assert.ok(res.body.data.testResults[0].diagnostic.includes('Time Limit Exceeded'));
  });

  it('handles compilation / syntax errors cleanly (compile_error)', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'SYNTAX_ERROR invalid token &&&',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'wrong_answer');
    assert.equal(res.body.data.testResults[0].status, 'compile_error');
    assert.ok(res.body.data.testResults[0].diagnostic.includes('SyntaxError'));
  });

  it('strictly protects confidentiality of hidden test cases during sample runs', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'function solution(n) { return n * n; }',
      });

    assert.equal(res.status, 200);
    const testResults = res.body.data.testResults;
    // Hidden tests must NEVER be returned in sample runs
    assert.equal(testResults.length, 2);
    for (const tr of testResults) {
      assert.equal(tr.isHidden, false);
      assert.notEqual(tr.input, '1000');
      assert.notEqual(tr.expectedOutput, '1000000');
    }
  });

  it('rejects unsupported languages outside allowlist with 422', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'ruby', // not supported
        sourceCode: 'puts "hello"',
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('rejects code payloads exceeding 64KB with 422', async () => {
    const largeSourceCode = 'a'.repeat(65 * 1024); // 65 KB
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'javascript',
        sourceCode: largeSourceCode,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('exceeds maximum permitted limit'));
  });

  it('forbids another student from executing code on an unowned session', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/run`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({
        language: 'javascript',
        sourceCode: 'return 1;',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('enforces execution rate limit (429 Too Many Requests) when threshold is exceeded', async () => {
    // Current user has already executed ~5 times. We burst up to >15 within 1 minute.
    let rateLimited = false;
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post(`/api/v1/coding-sessions/${sessionId}/run`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'javascript',
          sourceCode: 'function solution(n) { return n * n; }',
        });

      if (res.status === 429) {
        rateLimited = true;
        assert.equal(res.body.error.code, 'RATE_LIMITED');
        assert.ok(res.body.error.message.includes('Rate limit exceeded'));
        break;
      }
    }
    assert.ok(rateLimited, 'Expected rate limit (429) to trigger after exceeding limit');
  });
});
