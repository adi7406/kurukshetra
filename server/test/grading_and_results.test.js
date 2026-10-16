import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Server-Side Grading and Results (TASK-021)', () => {
  let studentToken = '';
  let otherStudentToken = '';
  let trainerToken = '';
  let courseId = '';
  let mcqQId = '';
  let numQId = '';
  let shortQId = '';
  let assessmentId = '';
  let perfectAttemptId = '';
  let failingAttemptId = '';

  it('sets up questions, course, enrollment, and published assessment', async () => {
    // 1. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'grading.trainer@example.com',
        password: 'password123',
        displayName: 'Grading Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'grading.student1@example.com',
        password: 'password123',
        displayName: 'Grading Student',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    studentToken = s1Res.body.data.session.access_token;

    // 3. Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'grading.student2@example.com',
        password: 'password123',
        displayName: 'Other Grading Student',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    otherStudentToken = s2Res.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Data Structures & Algorithms',
        description: 'Analysis and complexity',
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
      .set('Authorization', `Bearer ${otherStudentToken}`);

    // 5. Create Q1: MCQ Single (2 marks)
    const q1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'What is the worst-case time complexity of QuickSort?',
        marks: 2,
        negativeMarks: 0.5,
        options: [
          { key: 'A', text: 'O(N)', isCorrect: false },
          { key: 'B', text: 'O(N^2)', isCorrect: true },
          { key: 'C', text: 'O(log N)', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'B' },
        },
      });
    assert.equal(q1Res.status, 201);
    mcqQId = q1Res.body.data.versionId;

    // 6. Create Q2: Numeric (3 marks)
    const q2Res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'numeric',
        prompt: 'What is the height of a complete binary tree with 15 nodes?',
        marks: 3,
        answer: {
          type: 'numeric',
          payload: { value: 3, tolerance: 0 },
        },
      });
    assert.equal(q2Res.status, 201);
    numQId = q2Res.body.data.versionId;

    // 7. Create Q3: Short Answer (5 marks)
    const q3Res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'short_answer',
        prompt: 'State the binary search lookup complexity:',
        marks: 5,
        answer: {
          type: 'short_answer',
          payload: { acceptedAnswers: ['O(log n)', 'O(logn)'] },
        },
      });
    assert.equal(q3Res.status, 201);
    shortQId = q3Res.body.data.versionId;

    // 8. Create & publish assessment (total marks: 10, passing: 60%)
    const aRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Algorithms Midterm Evaluation',
        assessmentType: 'fixed_test',
        passingPercentage: 60.0,
        maxAttempts: 2,
        questions: [
          { questionVersionId: mcqQId, position: 0 },
          { questionVersionId: numQId, position: 1 },
          { questionVersionId: shortQId, position: 2 },
        ],
      });
    assert.equal(aRes.status, 201);
    assessmentId = aRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);
  });

  it('rejects viewing results for an in-progress attempt (409 Conflict)', async () => {
    // Start attempt
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attRes.status, 201);
    perfectAttemptId = attRes.body.data.id;

    // Attempt to view result before submit
    const res = await request(app)
      .get(`/api/v1/attempts/${perfectAttemptId}/result`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('still in progress'));
  });

  it('evaluates perfect score server-side across all objective question types (TASK-021)', async () => {
    // Student 1 answers all questions correctly:
    // Q1: B (2/2)
    await request(app)
      .put(`/api/v1/attempts/${perfectAttemptId}/answers/${mcqQId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: { selectedOptionKeys: ['B'] } });

    // Q2: 3 (3/3)
    await request(app)
      .put(`/api/v1/attempts/${perfectAttemptId}/answers/${numQId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: { value: 3 } });

    // Q3: O(log n) (5/5)
    await request(app)
      .put(`/api/v1/attempts/${perfectAttemptId}/answers/${shortQId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: { text: 'O(log n)' } });

    // Submit attempt
    const subRes = await request(app)
      .post(`/api/v1/attempts/${perfectAttemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(subRes.status, 200);
    assert.equal(subRes.body.data.status, 'submitted');
  });

  it('retrieves detailed result breakdown (GET /attempts/:id/result)', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${perfectAttemptId}/result`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const r = res.body.data;
    assert.equal(r.attemptId, perfectAttemptId);
    assert.equal(r.status, 'completed');
    assert.equal(r.score, 10);
    assert.equal(r.maxScore, 10);
    assert.equal(r.percentage, 100);
    assert.equal(r.passed, true);
    assert.equal(r.items.length, 3);
    for (const item of r.items) {
      assert.equal(item.isCorrect, true);
    }
  });

  it('applies negative marking and evaluates failing score below passing percentage', async () => {
    // Student 2 starts attempt
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(attRes.status, 201);
    failingAttemptId = attRes.body.data.id;

    // Student 2 answers incorrectly:
    // Q1: A (Incorrect, -0.5 negative mark)
    await request(app)
      .put(`/api/v1/attempts/${failingAttemptId}/answers/${mcqQId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ answer: { selectedOptionKeys: ['A'] } });

    // Q2: 99 (Incorrect, 0/3)
    await request(app)
      .put(`/api/v1/attempts/${failingAttemptId}/answers/${numQId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ answer: { value: 99 } });

    // Submit attempt
    const subRes = await request(app)
      .post(`/api/v1/attempts/${failingAttemptId}/submit`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(subRes.status, 200);
    assert.equal(subRes.body.data.status, 'submitted');

    // Get result
    const res = await request(app)
      .get(`/api/v1/attempts/${failingAttemptId}/result`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'completed');
    assert.equal(res.body.data.score, 0); // Bounded at 0
    assert.equal(res.body.data.passed, false);
  });

  it('rejects access to another student attempt result (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${perfectAttemptId}/result`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows trainer to view student attempt result', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${perfectAttemptId}/result`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.attemptId, perfectAttemptId);
    assert.equal(res.body.data.score, 10);
  });
});
