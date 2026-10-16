import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Learning Resources & Question Bank (TASK-014 & TASK-015)', () => {
  let studentToken = '';
  let trainerToken = '';
  let otherTrainerToken = '';
  let courseId = '';
  let conceptId = '';
  let resourceId = '';
  let mcqQuestionId = '';
  let codingQuestionId = '';

  it('sets up users, course, and concept', async () => {
    // 1. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'resource.trainer@example.com',
        password: 'password123',
        displayName: 'Resource Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'resource.student@example.com',
        password: 'password123',
        displayName: 'Resource Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Other Trainer
    const otherTrainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'other.resource.trainer@example.com',
        password: 'password123',
        displayName: 'Other Trainer',
        role: 'trainer',
      });
    assert.equal(otherTrainerRes.status, 201);
    otherTrainerToken = otherTrainerRes.body.data.session.access_token;

    // 4. Create course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Fullstack Systems Engineering',
        description: 'Advanced architecture & practice',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    // 5. Create concept
    const conceptRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Database Indexing & B-Trees',
        description: 'B-tree anatomy and indexing optimization',
      });
    assert.equal(conceptRes.status, 201);
    conceptId = conceptRes.body.data.id;
  });

  /* ====================================================================
   * TASK-014: Learning Resources Management
   * ==================================================================== */
  it('allows trainer to create a draft learning resource (TASK-014)', async () => {
    const res = await request(app)
      .post(`/api/v1/concepts/${conceptId}/resources`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'B-Tree Deep Dive Notes',
        resourceType: 'notes',
        content: 'Detailed explanations of B+ trees, branching factor, and depth.',
        difficulty: 'intermediate',
        reviewStatus: 'draft',
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.review_status, 'draft');
    assert.equal(res.body.data.version_number, 1);
    resourceId = res.body.data.id;
  });

  it('hides draft learning resources from students', async () => {
    const res = await request(app)
      .get(`/api/v1/concepts/${conceptId}/resources`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    // Student should see 0 approved resources
    const draft = res.body.data.find((r) => r.id === resourceId);
    assert.equal(draft, undefined, 'Draft resource should not be returned to student');
  });

  it('shows draft learning resources to trainers', async () => {
    const res = await request(app)
      .get(`/api/v1/concepts/${conceptId}/resources`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    const draft = res.body.data.find((r) => r.id === resourceId);
    assert.ok(draft, 'Draft resource should be visible to trainer');
    assert.equal(draft.review_status, 'draft');
  });

  it('allows trainer to update resource and increments version number', async () => {
    const res = await request(app)
      .patch(`/api/v1/resources/${resourceId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'B-Tree Deep Dive Notes (Updated)',
        content: 'Expanded notes with concrete disk I/O examples.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, 'B-Tree Deep Dive Notes (Updated)');
    assert.equal(res.body.data.version_number, 2, 'Version should increment on edit');
  });

  it('rejects resource modification by other unauthorized trainer (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/resources/${resourceId}`)
      .set('Authorization', `Bearer ${otherTrainerToken}`)
      .send({
        title: 'Hacked title',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows creator to publish resource (status becomes approved)', async () => {
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.review_status, 'approved');
  });

  it('makes approved learning resources visible to students', async () => {
    const res = await request(app)
      .get(`/api/v1/concepts/${conceptId}/resources`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const resource = res.body.data.find((r) => r.id === resourceId);
    assert.ok(resource, 'Approved resource must be visible to students');
    assert.equal(resource.title, 'B-Tree Deep Dive Notes (Updated)');
  });

  /* ====================================================================
   * TASK-015: Question Bank and Versioning
   * ==================================================================== */
  it('allows trainer to create an objective MCQ question (TASK-015)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        title: 'B-Tree Search Complexity',
        prompt: 'What is the worst-case time complexity of searching a key in a B-Tree of size N?',
        difficulty: 'intermediate',
        marks: 2,
        negativeMarks: 0.5,
        conceptIds: [conceptId],
        explanation: 'In a B-tree of order M, height is O(log_M N), leading to search complexity of O(log N).',
        options: [
          { key: 'A', text: 'O(1)', isCorrect: false },
          { key: 'B', text: 'O(log N)', isCorrect: true },
          { key: 'C', text: 'O(N)', isCorrect: false },
          { key: 'D', text: 'O(N log N)', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'B' },
        },
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.versionNumber, 1);
    mcqQuestionId = res.body.data.id;
  });

  it('allows trainer to create a coding question with public and hidden test cases', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'coding',
        title: 'Implement Binary Search',
        prompt: 'Write a function binarySearch(arr, target) that returns the index of target or -1.',
        difficulty: 'intermediate',
        marks: 10,
        conceptIds: [conceptId],
        testCases: [
          {
            input: '[1, 2, 3, 4, 5], 3',
            expectedOutput: '2',
            isHidden: false, // Sample test case
          },
          {
            input: '[], 1',
            expectedOutput: '-1',
            isHidden: false, // Sample test case
          },
          {
            input: '[10, 20, 30, 40, 50, 60, 70, 80], 70',
            expectedOutput: '6',
            isHidden: true, // Hidden grading test case
          },
          {
            input: '[-5, -2, 0, 8, 12, 19], -2',
            expectedOutput: '1',
            isHidden: true, // Hidden grading test case
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    codingQuestionId = res.body.data.id;
  });

  it('STRICT SECURITY: Student GET /questions/:id never leaks correct options or answer keys', async () => {
    const res = await request(app)
      .get(`/api/v1/questions/${mcqQuestionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const q = res.body.data;

    // Verify prompt and options exist
    assert.equal(q.id, mcqQuestionId);
    assert.equal(q.prompt, 'What is the worst-case time complexity of searching a key in a B-Tree of size N?');
    assert.equal(q.options.length, 4);

    // CRITICAL: Ensure `is_correct` is completely stripped from student's view
    for (const opt of q.options) {
      assert.equal(opt.is_correct, undefined, 'Option is_correct flag must not be exposed to student');
      assert.equal(opt.isCorrect, undefined, 'Option isCorrect flag must not be exposed to student');
    }

    // CRITICAL: Ensure answer key payload and explanation are completely stripped
    assert.equal(q.answer, null, 'Answer key must be null for student');
    assert.equal(q.explanation, null, 'Explanation must be hidden from student before release');
  });

  it('STRICT SECURITY: Student GET /questions/:id never leaks hidden test cases', async () => {
    const res = await request(app)
      .get(`/api/v1/questions/${codingQuestionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const q = res.body.data;

    // Student should see ONLY sample test cases (2 sample cases, 0 hidden cases)
    assert.equal(q.sampleTestCases.length, 2);
    for (const tc of q.sampleTestCases) {
      assert.equal(tc.isHidden, false);
      assert.notEqual(tc.input, '[10, 20, 30, 40, 50, 60, 70, 80], 70', 'Hidden test case must not be exposed');
    }
  });

  it('Trainer GET /questions/:id receives complete answers and all hidden test cases', async () => {
    // 1. MCQ question check for trainer
    const mcqRes = await request(app)
      .get(`/api/v1/questions/${mcqQuestionId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(mcqRes.status, 200);
    assert.ok(mcqRes.body.data.answer, 'Trainer must see answer payload');
    assert.equal(mcqRes.body.data.answer.payload.correctOptionKey, 'B');
    assert.ok(mcqRes.body.data.explanation, 'Trainer must see explanation');

    const correctOpt = mcqRes.body.data.options.find((o) => o.is_correct === true);
    assert.ok(correctOpt, 'Trainer must see is_correct flags');
    assert.equal(correctOpt.option_key, 'B');

    // 2. Coding question check for trainer
    const codeRes = await request(app)
      .get(`/api/v1/questions/${codingQuestionId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(codeRes.status, 200);
    // Trainer sees all 4 test cases (both sample and hidden)
    assert.equal(codeRes.body.data.sampleTestCases.length, 4);
  });

  it('preserves question versioning when trainer updates question (increments versionNumber)', async () => {
    const res = await request(app)
      .patch(`/api/v1/questions/${mcqQuestionId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'What is the worst-case search complexity in a standard B-Tree of order M with N keys?',
        difficulty: 'advanced',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.versionNumber, 2, 'Question version should increment to 2');
    assert.equal(res.body.data.prompt, 'What is the worst-case search complexity in a standard B-Tree of order M with N keys?');
    assert.equal(res.body.data.difficulty, 'advanced');
  });

  it('allows trainer to search course question bank', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 2);
  });

  it('rejects student access to course question bank management (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });
});
