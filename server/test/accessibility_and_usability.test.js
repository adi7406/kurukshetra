import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Accessibility, Usability, and Recoverable Semantics (TASK-037)', () => {
  let trainerToken;
  let studentToken;
  let courseId;

  it('sets up clean trainer, student, and empty course', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app).post('/api/v1/auth/signup').send({
      email: `trainer_a11y_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'trainer',
      displayName: 'Accessibility Advocate',
    });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app).post('/api/v1/auth/signup').send({
      email: `student_a11y_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'student',
      displayName: 'Inclusive Learner',
    });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Create course without any concepts, enrollments, or assessments
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Universal Design for Learning Systems',
        description: 'Building accessible, equitable, and resilient software applications.',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;
  });

  it('guarantees clean, non-crashing empty states for newly initialized resources', async () => {
    // 1. Empty concepts list returns 200 OK with empty array
    const conceptsRes = await request(app)
      .get(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(conceptsRes.status, 200);
    assert.ok(Array.isArray(conceptsRes.body.data));
    assert.equal(conceptsRes.body.data.length, 0);

    // 2. Empty questions list returns 200 OK with empty array
    const questionsRes = await request(app)
      .get(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(questionsRes.status, 200);
    assert.ok(Array.isArray(questionsRes.body.data));
    assert.equal(questionsRes.body.data.length, 0);

    // 3. Empty student roster returns 200 OK with totalStudents = 0 and empty array
    const rosterRes = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/students`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(rosterRes.status, 200);
    assert.equal(rosterRes.body.data.totalStudents, 0);
    assert.ok(Array.isArray(rosterRes.body.data.students));
    assert.equal(rosterRes.body.data.students.length, 0);

    // 4. Empty recommendations for a new student returns 200 OK with empty array
    const recsRes = await request(app)
      .get('/api/v1/me/recommendations')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(recsRes.status, 200);
    assert.ok(Array.isArray(recsRes.body.data));

    // 5. Empty trainer drafts returns 200 OK with separated question and assessment collections
    const draftsRes = await request(app)
      .get('/api/v1/trainer/drafts')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(draftsRes.status, 200);
    assert.ok(Array.isArray(draftsRes.body.data.draftQuestions));
    assert.ok(Array.isArray(draftsRes.body.data.draftAssessments));
  });

  it('provides structured, programmatically associable field errors for form accessibility', async () => {
    // Attempt course creation with invalid data (empty title)
    const errRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: '',
        description: 'Short',
      });

    assert.equal(errRes.status, 422);
    assert.ok(errRes.body.error);
    assert.equal(errRes.body.error.code, 'VALIDATION_ERROR');
    assert.ok(errRes.body.error.message);
    assert.ok(errRes.body.meta.requestId);

    // Details array provides field associations for screen readers / aria-describedby
    if (Array.isArray(errRes.body.error.details)) {
      const titleErr = errRes.body.error.details.find((d) => d.field === 'title' || d.path?.includes('title'));
      assert.ok(titleErr, 'Field error must identify the failing input field');
      assert.ok(titleErr.issue || titleErr.message, 'Field error must contain a human-readable recovery message');
    }
  });

  it('guarantees non-color-reliant status messaging and semantic labels', async () => {
    // 1. Create a concept and a question
    const conceptRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Semantic HTML and ARIA',
        description: 'Building accessible user experiences using semantic tags.',
      });
    assert.equal(conceptRes.status, 201);
    const conceptId = conceptRes.body.data.id;

    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'Which HTML element represents the primary navigation landmarks?',
        difficulty: 'beginner',
        marks: 1,
        options: [
          { key: 'A', text: '<nav>', isCorrect: true },
          { key: 'B', text: '<div class="nav">', isCorrect: false },
        ],
        answer: { payload: { correctKey: 'A' } },
        conceptIds: [conceptId],
      });
    assert.equal(qRes.status, 201);
    const questionId = qRes.body.data.id;
    const questionVersionId = qRes.body.data.versionId;

    // Publish question
    await request(app)
      .post(`/api/v1/questions/${questionId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Accessibility Principles Quiz',
        assessmentType: 'fixed_test',
        passingPercentage: 50,
        questions: [{ questionVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    const assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Publish course and enroll student
    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Student starts attempt
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attRes.status, 201);
    const attemptId = attRes.body.data.id;

    // Verify initial attempt status conveys meaning through text, not color
    assert.equal(attRes.body.data.status, 'in_progress');

    // Submit correct answer
    await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${questionVersionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answer: {
          selectedOptionKeys: ['A'],
        },
      });

    // Submit attempt
    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.status, 'submitted');

    // Retrieve graded result
    const resultRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resultRes.status, 200);

    // Verify completion status and numerical metrics are explicitly stated without relying on color
    assert.equal(resultRes.body.data.status, 'completed');
    assert.equal(resultRes.body.data.score, 1);
    assert.equal(resultRes.body.data.maxScore, 1);
    assert.equal(resultRes.body.data.passed, true);
  });

  it('ensures unhandled route errors return sanitized, non-leaking accessible responses', async () => {
    const unhandledRes = await request(app).get('/api/v1/invalid-route-for-testing');
    assert.equal(unhandledRes.status, 404);
    assert.equal(unhandledRes.body.error.code, 'NOT_FOUND');
    assert.ok(unhandledRes.body.error.message.includes('/api/v1/invalid-route-for-testing'));
    assert.equal(unhandledRes.body.error.stack, undefined);
  });
});
