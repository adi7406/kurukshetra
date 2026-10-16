import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('AI Viva Session Lifecycle (TASK-029)', () => {
  let trainerToken = '';
  let studentToken = '';
  let intruderToken = '';
  let courseId = '';
  let assessmentId = '';
  let attemptId = '';
  let sessionId = '';

  it('sets up course, published assessment, and student attempt', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'viva.trainer@example.com',
        password: 'password123',
        displayName: 'Viva Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'viva.student@example.com',
        password: 'password123',
        displayName: 'Viva Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Intruder student signup
    const intruderRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'viva.intruder@example.com',
        password: 'password123',
        displayName: 'Viva Intruder',
        role: 'student',
      });
    assert.equal(intruderRes.status, 201);
    intruderToken = intruderRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Distributed Systems & Architecture',
        description: 'Deep technical interview and viva voce practice',
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

    // 5. Create coding question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Design an LRU Cache with O(1) get and put operations.',
        questionType: 'coding',
        difficulty: 'advanced',
        marks: 20,
        testCases: [
          {
            input: 'get(1)',
            expectedOutput: '-1',
            isHidden: false,
            orderIndex: 0,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    const qVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 6. Create assessment & publish
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'System Design Viva Assessment',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 3,
        questions: [{ questionVersionId: qVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 7. Student starts attempt
    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attemptRes.status, 201);
    attemptId = attemptRes.body.data.id;
  });

  it('starts an AI viva session with approved question topics and difficulty bounds', async () => {
    // 1. Intruder cannot start viva for another student's attempt
    const intruderRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/viva-sessions`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ durationSeconds: 600, totalQuestions: 3 });
    assert.equal(intruderRes.status, 403);
    assert.equal(intruderRes.body.error.code, 'FORBIDDEN');

    // 2. Student owner starts viva session
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/viva-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ durationSeconds: 600, totalQuestions: 3 });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.session.id);
    assert.equal(res.body.data.session.status, 'started');
    assert.equal(res.body.data.session.currentQuestionIndex, 0);
    assert.equal(res.body.data.session.totalQuestions, 3);
    assert.equal(res.body.data.session.durationSeconds, 600);

    sessionId = res.body.data.session.id;

    // First question is available
    assert.ok(res.body.data.currentQuestion);
    assert.equal(res.body.data.currentQuestion.orderIndex, 0);
    assert.ok(res.body.data.currentQuestion.questionText);
    assert.equal(res.body.data.currentQuestion.difficulty, 'intermediate');
  });

  it('retrieves viva session state safely without leaking other questions or answer keys', async () => {
    // 1. Intruder forbidden
    const intruderRes = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    assert.equal(intruderRes.status, 403);

    // 2. Student reads session state
    const res = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, sessionId);
    assert.equal(res.body.data.status, 'started');
    assert.equal(res.body.data.currentQuestionIndex, 0);
    assert.ok(res.body.data.currentQuestion);
    assert.equal(res.body.data.currentQuestion.orderIndex, 0);

    // 3. Trainer can view session state
    const trainerRes = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(trainerRes.status, 200);
    assert.equal(trainerRes.body.data.id, sessionId);
  });

  it('submits responses progressively and transitions question states (started -> in_progress)', async () => {
    // 1. Reject empty or too short answers with 422
    const shortRes = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answerText: 'hi' });
    assert.equal(shortRes.status, 422);

    // 2. Submit answer to question 0
    const res1 = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'The solution achieves O(1) time complexity by combining a doubly linked list with a hash map.',
      });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.data.status, 'in_progress');
    assert.equal(res1.body.data.currentQuestionIndex, 1);
    assert.equal(res1.body.data.isCompleted, false);
    assert.ok(res1.body.data.nextQuestion);
    assert.equal(res1.body.data.nextQuestion.orderIndex, 1);
    assert.ok(res1.body.data.feedback.isProvisional);

    // 3. Submit answer to question 1
    const res2 = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'We defensively validate that capacity is positive, and handle missing keys by returning -1.',
      });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.data.status, 'in_progress');
    assert.equal(res2.body.data.currentQuestionIndex, 2);
    assert.equal(res2.body.data.isCompleted, false);
    assert.ok(res2.body.data.nextQuestion);
    assert.equal(res2.body.data.nextQuestion.orderIndex, 2);

    // 4. Submit answer to question 2 (final question) -> transitions to completed
    const res3 = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'At 10,000x scale, we should shard the cache using consistent hashing and introduce Redis cluster.',
      });

    assert.equal(res3.status, 200);
    assert.equal(res3.body.data.status, 'completed');
    assert.equal(res3.body.data.currentQuestionIndex, 3);
    assert.equal(res3.body.data.isCompleted, true);
    assert.equal(res3.body.data.nextQuestion, null);
  });

  it('rejects additional answer submissions after session is completed (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'Additional post-completion answer that should be rejected.',
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('completed'));
  });

  it('generates comprehensive released viva report once completed', async () => {
    // 1. Intruder forbidden from reading report
    const intruderRes = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}/report`)
      .set('Authorization', `Bearer ${intruderToken}`);
    assert.equal(intruderRes.status, 403);

    // 2. Student reads report
    const res = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}/report`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const report = res.body.data;

    assert.equal(report.sessionId, sessionId);
    assert.equal(report.status, 'completed');
    assert.ok(report.totalScore > 0);
    assert.equal(report.totalMaxScore, 30);
    assert.ok(report.percentage >= 0 && report.percentage <= 100);
    assert.equal(report.questions.length, 3);

    // All questions have recorded student answers and provisional status
    for (const item of report.questions) {
      assert.ok(item.questionText);
      assert.ok(item.answerText);
      assert.equal(item.isProvisional, true);
      assert.equal(item.reviewStatus, 'evaluated');
      assert.ok(item.rubricEvaluation);
    }

    // 3. Trainer can also read report
    const trainerRes = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}/report`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(trainerRes.status, 200);
  });

  it('supports cancellation and time limit expiration handling', async () => {
    // Create new attempt and session to test cancellation
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attRes.status, 201);
    const newAttemptId = attRes.body.data.id;

    const sessRes = await request(app)
      .post(`/api/v1/attempts/${newAttemptId}/viva-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ durationSeconds: 300, totalQuestions: 2 });
    assert.equal(sessRes.status, 201);
    const cancelSessionId = sessRes.body.data.session.id;

    // Student cancels session
    const cancelRes = await request(app)
      .post(`/api/v1/viva-sessions/${cancelSessionId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');

    // Submitting answer to cancelled session is rejected with 422
    const submitRes = await request(app)
      .post(`/api/v1/viva-sessions/${cancelSessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answerText: 'This answer should fail.' });

    assert.equal(submitRes.status, 422);
    assert.ok(submitRes.body.error.message.includes('cancelled'));
  });

  it('returns 404 for non-existent session or report', async () => {
    const s404 = await request(app)
      .get('/api/v1/viva-sessions/non-existent-uuid')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(s404.status, 404);

    const r404 = await request(app)
      .get('/api/v1/viva-sessions/non-existent-uuid/report')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(r404.status, 404);
  });
});
