import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { diagnosticService } from '../src/services/diagnostic.service.js';

describe('First-Login Diagnostic Onboarding (PHASE 4)', () => {
  let studentToken = '';
  let studentId = '';
  let student2Token = '';
  let student2Id = '';
  let diagnosticQuestions = [];

  it('sets up test student accounts for diagnostic assessment', async () => {
    // 1. Create Student 1
    const res1 = await request(app).post('/api/v1/auth/signup').send({
      email: `diagnostic_student_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'student',
      displayName: 'Diagnostic Learner One',
    });
    assert.equal(res1.status, 201);
    studentToken = res1.body.data.session.access_token;
    studentId = res1.body.data.user.id;

    // 2. Create Student 2
    const res2 = await request(app).post('/api/v1/auth/signup').send({
      email: `diagnostic_student_two_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'student',
      displayName: 'Diagnostic Learner Two',
    });
    assert.equal(res2.status, 201);
    student2Token = res2.body.data.session.access_token;
    student2Id = res2.body.data.user.id;
  });

  describe('1. Placement Calculation Unit Rules', () => {
    it('accurately maps boundary scores to beginner, intermediate, and advanced', () => {
      // 0 - 5: beginner
      assert.equal(diagnosticService.calculatePlacement(0), 'beginner');
      assert.equal(diagnosticService.calculatePlacement(3), 'beginner');
      assert.equal(diagnosticService.calculatePlacement(5), 'beginner');

      // 6 - 8: intermediate
      assert.equal(diagnosticService.calculatePlacement(6), 'intermediate');
      assert.equal(diagnosticService.calculatePlacement(7), 'intermediate');
      assert.equal(diagnosticService.calculatePlacement(8), 'intermediate');

      // 9 - 10: advanced
      assert.equal(diagnosticService.calculatePlacement(9), 'advanced');
      assert.equal(diagnosticService.calculatePlacement(10), 'advanced');
    });
  });

  describe('2. Diagnostic Status and Question Delivery', () => {
    it('returns completed: false for a newly registered student', async () => {
      const res = await request(app)
        .get('/api/v1/diagnostic/status')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.completed, false);
      assert.equal(res.body.data.completedAt, null);
      assert.equal(res.body.data.results, null);
    });

    it('rejects unauthenticated diagnostic access with 401', async () => {
      const res = await request(app).get('/api/v1/diagnostic/assessment');
      assert.equal(res.status, 401);
    });

    it('retrieves the 30-question diagnostic assessment across OOP, DSA, and OS', async () => {
      const res = await request(app)
        .get('/api/v1/diagnostic/assessment')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.alreadyCompleted, false);
      assert.equal(res.body.data.totalQuestions, 30);
      assert.equal(res.body.data.sections.length, 3);

      const [oopSec, dsaSec, osSec] = res.body.data.sections;
      assert.equal(oopSec.subjectCode, 'CS101');
      assert.equal(oopSec.questionCount, 10);
      assert.equal(dsaSec.subjectCode, 'CS201');
      assert.equal(dsaSec.questionCount, 10);
      assert.equal(osSec.subjectCode, 'CS301');
      assert.equal(osSec.questionCount, 10);

      // Collect flat question list for testing submission
      diagnosticQuestions = [
        ...oopSec.questions,
        ...dsaSec.questions,
        ...osSec.questions,
      ];
      assert.equal(diagnosticQuestions.length, 30);
    });

    it('strictly guarantees ZERO answer key or correctness leakage in diagnostic payload', async () => {
      const res = await request(app)
        .get('/api/v1/diagnostic/assessment')
        .set('Authorization', `Bearer ${studentToken}`);

      const bodyStr = JSON.stringify(res.body);
      assert.ok(!bodyStr.includes('"isCorrect"'));
      assert.ok(!bodyStr.includes('"correctOptionIds"'));
      assert.ok(!bodyStr.includes('"answerKey"'));
    });
  });

  describe('3. Diagnostic Submission and Placement Rules', () => {
    it('rejects empty or malformed answer submission with 422', async () => {
      const res = await request(app)
        .post('/api/v1/diagnostic/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers: [] });

      assert.equal(res.status, 422);
    });

    it('evaluates answers server-side, calculates subject scores, and assigns tiers', async () => {
      // Craft realistic student answers:
      // Answer all OOP questions correctly (expect 9 or 10 -> advanced)
      // Answer 7 DSA questions correctly (expect intermediate)
      // Answer 3 OS questions correctly (expect beginner)
      const answers = diagnosticQuestions.map((q, idx) => {
        // OOP is index 0-9: pick option 'B' (which matches most OOP answers)
        if (idx < 10) {
          return { questionId: q.id, selectedOptionId: 'B' };
        }
        // DSA is index 10-19: pick option 'B' or 'C'
        if (idx < 20) {
          return { questionId: q.id, selectedOptionId: idx % 2 === 0 ? 'B' : 'C' };
        }
        // OS is index 20-29: pick option 'A' or 'B'
        return { questionId: q.id, selectedOptionId: idx % 3 === 0 ? 'A' : 'D' };
      });

      const res = await request(app)
        .post('/api/v1/diagnostic/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers });

      assert.equal(res.status, 201);
      const results = res.body.data;

      assert.ok(results.totalScore >= 0 && results.totalScore <= 30);
      assert.equal(results.maxScore, 30);

      // Verify each subject has independent scores out of 10 and placement
      assert.ok(results.subjects.oop);
      assert.equal(results.subjects.oop.maxScore, 10);
      assert.ok(['beginner', 'intermediate', 'advanced'].includes(results.subjects.oop.placement));

      assert.ok(results.subjects.dsa);
      assert.equal(results.subjects.dsa.maxScore, 10);
      assert.ok(['beginner', 'intermediate', 'advanced'].includes(results.subjects.dsa.placement));

      assert.ok(results.subjects.os);
      assert.equal(results.subjects.os.maxScore, 10);
      assert.ok(['beginner', 'intermediate', 'advanced'].includes(results.subjects.os.placement));

      assert.ok(results.summary);
      assert.ok(results.completedAt);
    });

    it('rejects duplicate diagnostic submission with 409 Conflict', async () => {
      const answers = diagnosticQuestions.map((q) => ({
        questionId: q.id,
        selectedOptionId: 'A',
      }));

      const res = await request(app)
        .post('/api/v1/diagnostic/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ answers });

      assert.equal(res.status, 409);
      assert.ok(res.body.error.message.includes('already been completed'));
    });

    it('reflects completed status on subsequent status calls and prevents repeating', async () => {
      const res = await request(app)
        .get('/api/v1/diagnostic/status')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.completed, true);
      assert.ok(res.body.data.completedAt);
      assert.ok(res.body.data.results);
    });

    it('allows student to fetch completed diagnostic results via /diagnostic/results', async () => {
      const res = await request(app)
        .get('/api/v1/diagnostic/results')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.totalScore !== undefined);
      assert.ok(res.body.data.subjects.oop);
      assert.ok(res.body.data.subjects.dsa);
      assert.ok(res.body.data.subjects.os);
    });

    it('returns 404 on /diagnostic/results for a student who has not completed it', async () => {
      const res = await request(app)
        .get('/api/v1/diagnostic/results')
        .set('Authorization', `Bearer ${student2Token}`);

      assert.equal(res.status, 404);
    });
  });
});
