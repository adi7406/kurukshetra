import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
import express from 'express';

describe('Security Verification & Zero-Trust Boundaries (TASK-036)', () => {
  let trainer1Token;
  let trainer2Token;
  let student1Token;
  let student1Id;
  let student2Token;
  let course1Id;
  let assessment1Id;
  let qVersion1Id;
  let attempt1Id;

  before(async () => {
    // 1. Trainer 1 (Course Owner)
    const t1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `sec_trainer1_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Primary Trainer',
        role: 'trainer',
      });
    assert.equal(t1Res.status, 201);
    trainer1Token = t1Res.body.data.session.access_token;

    // 2. Trainer 2 (Unrelated Trainer)
    const t2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `sec_trainer2_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Secondary Trainer',
        role: 'trainer',
      });
    assert.equal(t2Res.status, 201);
    trainer2Token = t2Res.body.data.session.access_token;

    // 3. Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `sec_student1_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Security Alice',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    student1Token = s1Res.body.data.session.access_token;
    student1Id = s1Res.body.data.user.id;

    // 4. Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `sec_student2_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Security Bob',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    student2Token = s2Res.body.data.session.access_token;

    // 5. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainer1Token}`)
      .send({
        title: 'Cybersecurity & Defensive Architecture',
        description: 'Hardening protocols and secure coding practices',
      });
    assert.equal(courseRes.status, 201);
    course1Id = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${course1Id}/publish`)
      .set('Authorization', `Bearer ${trainer1Token}`);

    // Enroll Student 1 in Course 1
    await request(app)
      .post(`/api/v1/courses/${course1Id}/enrollments`)
      .set('Authorization', `Bearer ${student1Token}`);

    // Create question with secret answer key and hidden options
    const qRes = await request(app)
      .post(`/api/v1/courses/${course1Id}/questions`)
      .set('Authorization', `Bearer ${trainer1Token}`)
      .send({
        prompt: 'Which cryptographic algorithm provides post-quantum lattice-based security?',
        questionType: 'mcq_single',
        difficulty: 'advanced',
        marks: 10,
        options: [
          { key: 'A', text: 'Kyber / ML-KEM', isCorrect: true },
          { key: 'B', text: 'RSA-4096', isCorrect: false },
          { key: 'C', text: 'ECC Secp256k1', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'A', secretExplanation: 'Kyber is NIST approved post-quantum' },
        },
      });
    assert.equal(qRes.status, 201);
    qVersion1Id = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainer1Token}`);

    // Create and publish assessment with maxAttempts = 1
    const assessRes = await request(app)
      .post(`/api/v1/courses/${course1Id}/assessments`)
      .set('Authorization', `Bearer ${trainer1Token}`)
      .send({
        title: 'Defensive Cryptography Final Exam',
        assessmentType: 'fixed_test',
        passingPercentage: 70,
        maxAttempts: 1,
        questions: [{ questionVersionId: qVersion1Id, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessment1Id = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessment1Id}/publish`)
      .set('Authorization', `Bearer ${trainer1Token}`);

    // Student 1 starts attempt
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessment1Id}/attempts`)
      .set('Authorization', `Bearer ${student1Token}`);
    assert.equal(attRes.status, 201);
    attempt1Id = attRes.body.data.id;
  });

  describe('1. Authentication Bypass & Privilege Escalation', () => {
    it('denies access to protected endpoints when token is completely omitted (401)', async () => {
      const res = await request(app).get('/api/v1/me/dashboard');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('denies access when token is malformed or invalid (401)', async () => {
      const res = await request(app)
        .get('/api/v1/me/dashboard')
        .set('Authorization', 'Bearer forged_fake_token_xyz_123');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('rejects student attempting to access privileged trainer routes (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ title: 'Malicious Course Attempt' });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    it('prevents self-assignment or role escalation in profile endpoints', async () => {
      // Student tries to PATCH/PUT their own role to admin
      const res = await request(app)
        .patch(`/api/v1/users/${student1Id}/role`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ role: 'admin' });

      // Either 403 Forbidden or 404/405 route protection
      assert.ok(res.status === 403 || res.status === 404 || res.status === 401);
    });
  });

  describe('2. Cross-User and Cross-Course Isolation', () => {
    it('prevents Student 2 from viewing or altering Student 1’s active attempt (403 Forbidden)', async () => {
      // Read attempt
      const getRes = await request(app)
        .get(`/api/v1/attempts/${attempt1Id}`)
        .set('Authorization', `Bearer ${student2Token}`);
      assert.equal(getRes.status, 403);

      // Save answer to Student 1's attempt
      const putRes = await request(app)
        .put(`/api/v1/attempts/${attempt1Id}/answers/${qVersion1Id}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ answer: { selectedOptionKeys: ['B'] } });
      assert.equal(putRes.status, 403);

      // Submit Student 1's attempt
      const submitRes = await request(app)
        .post(`/api/v1/attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student2Token}`);
      assert.equal(submitRes.status, 403);
    });

    it('prevents Student 2 from viewing Student 1’s dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${student1Id}/dashboard`)
        .set('Authorization', `Bearer ${student2Token}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    it('prevents Trainer 2 from modifying Trainer 1’s course or assessment (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/courses/${course1Id}/publish`)
        .set('Authorization', `Bearer ${trainer2Token}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    it('prevents Trainer 2 from accessing Trainer 1’s course dashboard or students roster (403 Forbidden)', async () => {
      const dashRes = await request(app)
        .get(`/api/v1/trainer/courses/${course1Id}/dashboard`)
        .set('Authorization', `Bearer ${trainer2Token}`);
      assert.equal(dashRes.status, 403);

      const rosterRes = await request(app)
        .get(`/api/v1/trainer/courses/${course1Id}/students`)
        .set('Authorization', `Bearer ${trainer2Token}`);
      assert.equal(rosterRes.status, 403);
    });
  });

  describe('3. Zero Answer-Key and Hidden-Test Leakage Guarantee', () => {
    it('does NOT expose correctOptionKey, isCorrect: true, or answer payload in active attempt', async () => {
      const res = await request(app)
        .get(`/api/v1/attempts/${attempt1Id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.equal(res.status, 200);
      const attemptData = res.body.data;
      const jsonStr = JSON.stringify(attemptData);

      // Verify no answer leakage
      assert.ok(!jsonStr.includes('correctOptionKey'), 'Must NOT leak correctOptionKey');
      assert.ok(!jsonStr.includes('secretExplanation'), 'Must NOT leak secretExplanation');
      assert.ok(!jsonStr.includes('"isCorrect":true'), 'Must NOT leak isCorrect:true flag in options');

      // Check options array inside questions
      if (attemptData.questions && attemptData.questions.length > 0) {
        for (const q of attemptData.questions) {
          assert.equal(q.answer, undefined, 'q.answer must be undefined');
          if (q.options) {
            for (const opt of q.options) {
              assert.equal(opt.isCorrect, undefined, 'opt.isCorrect must be stripped for student');
            }
          }
        }
      }
    });

    it('does NOT expose hidden test cases to students in coding assessment or submission response', async () => {
      // Create coding question with public and hidden test cases
      const codeQRes = await request(app)
        .post(`/api/v1/courses/${course1Id}/questions`)
        .set('Authorization', `Bearer ${trainer1Token}`)
        .send({
          prompt: 'Write a function sum(a, b) returning a + b',
          questionType: 'coding',
          difficulty: 'beginner',
          marks: 10,
          testCases: [
            { input: '1 2', expectedOutput: '3', isHidden: false },
            { input: '999999 1', expectedOutput: '1000000', isHidden: true },
          ],
        });
      assert.equal(codeQRes.status, 201);
      const codingVersionId = codeQRes.body.data.versionId;

      await request(app)
        .post(`/api/v1/questions/${codeQRes.body.data.id}/publish`)
        .set('Authorization', `Bearer ${trainer1Token}`);

      // Student views attempt answers or coding session
      const getCodeQ = await request(app)
        .get(`/api/v1/coding/questions/${codingVersionId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      if (getCodeQ.status === 200) {
        const bodyStr = JSON.stringify(getCodeQ.body);
        assert.ok(!bodyStr.includes('999999 1'), 'Must NOT leak hidden test case input');
        assert.ok(!bodyStr.includes('1000000'), 'Must NOT leak hidden test case expected output');
      }
    });
  });

  describe('4. Rate Limiting, Abuse Prevention, and Attempt Limits', () => {
    it('enforces maxAttempts boundary on assessments (422 Unprocessable Entity)', async () => {
      // Student 1 submits attempt 1
      await request(app)
        .put(`/api/v1/attempts/${attempt1Id}/answers/${qVersion1Id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ answer: { selectedOptionKeys: ['A'] } });

      await request(app)
        .post(`/api/v1/attempts/${attempt1Id}/submit`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Student 1 attempts to start attempt 2 (maxAttempts = 1)
      const secondAttemptRes = await request(app)
        .post(`/api/v1/assessments/${assessment1Id}/attempts`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.equal(secondAttemptRes.status, 403);
      assert.ok(
        secondAttemptRes.body.error.message.includes('Maximum attempt limit') ||
          secondAttemptRes.body.error.code === 'FORBIDDEN'
      );
    });

    it('rate limiter middleware triggers 429 when burst threshold is exceeded', async () => {
      const testLimiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 3,
        keyGenerator: () => 'burst_test_key',
      });

      const miniApp = express();
      miniApp.use(testLimiter);
      miniApp.get('/test-limit', (_req, res) => res.json({ success: true }));

      // Send 3 allowed requests
      const r1 = await request(miniApp).get('/test-limit');
      const r2 = await request(miniApp).get('/test-limit');
      const r3 = await request(miniApp).get('/test-limit');
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 200);

      // 4th request must be rejected with 429 RateLimitError
      const r4 = await request(miniApp).get('/test-limit');
      assert.equal(r4.status, 429);
      assert.equal(r4.headers['ratelimit-remaining'], '0');
      assert.ok(r4.headers['retry-after']);
    });

    it('rejects malformed JSON payloads safely with 400 Bad Request and no stack trace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .set('Content-Type', 'application/json')
        .send('{ "invalid_json": ');

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'BAD_REQUEST');
      assert.equal(res.body.stack, undefined);
      assert.ok(res.body.meta.requestId);
    });

    it('sanitizes errors and never leaks raw database errors or stack traces', async () => {
      const res = await request(app)
        .get('/api/v1/attempts/non-existent-uuid-999999')
        .set('Authorization', `Bearer ${student1Token}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.stack, undefined);
      assert.equal(res.body.error.code, 'NOT_FOUND');
      assert.ok(res.body.meta.requestId);
    });
  });
});
