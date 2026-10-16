import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Rubric-Based Viva Feedback and Human Review (TASK-030)', () => {
  let trainerToken = '';
  let studentToken = '';
  let otherStudentToken = '';
  let courseId = '';
  let assessmentId = '';
  let attemptId = '';
  let sessionId = '';
  let answerId = '';

  it('sets up course, assessment, attempt, and viva session', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'rubric.trainer@example.com',
        password: 'password123',
        displayName: 'Rubric Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'rubric.student@example.com',
        password: 'password123',
        displayName: 'Rubric Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Other student signup
    const otherRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'rubric.other@example.com',
        password: 'password123',
        displayName: 'Rubric Other',
        role: 'student',
      });
    assert.equal(otherRes.status, 201);
    otherStudentToken = otherRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Advanced Data Structures & Algorithms Viva',
        description: 'Rigorous oral exam preparation with rubric evaluations',
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

    // 5. Create coding question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Design a self-balancing binary search tree.',
        questionType: 'coding',
        difficulty: 'advanced',
        marks: 20,
        testCases: [{ input: 'insert(10)', expectedOutput: 'true', isHidden: false, orderIndex: 0 }],
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
        title: 'Tree Data Structures Viva',
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

    // 7. Student starts attempt & viva session
    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attemptRes.status, 201);
    attemptId = attemptRes.body.data.id;

    const sessRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/viva-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ durationSeconds: 600, totalQuestions: 2 });
    assert.equal(sessRes.status, 201);
    sessionId = sessRes.body.data.session.id;
  });

  it('evaluates student response against rubric criteria with evidence citations and score bounds', async () => {
    const ansRes = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'We achieve O(log n) search and insertion time complexity by performing tree rotations on balance violation.',
      });

    assert.equal(ansRes.status, 200);
    const feedback = ansRes.body.data.feedback;

    assert.equal(feedback.isProvisional, true);
    assert.ok(feedback.score > 0);
    assert.ok(feedback.score <= feedback.maxScore);

    // Fetch report to extract recorded answer ID
    const reportRes = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(reportRes.status, 200);
  });

  it('detects unsupported claims and flags answer for human review (needs_review)', async () => {
    const ansRes = await request(app)
      .post(`/api/v1/viva-sessions/${sessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'Our algorithm utilizes quantum_flux and runs in O(-1) negative time with fabricated guarantees.',
      });

    assert.equal(ansRes.status, 200);
    const feedback = ansRes.body.data.feedback;

    assert.equal(ansRes.body.data.isCompleted, true);
    assert.equal(feedback.isProvisional, true);
    assert.equal(feedback.score, 0); // Penalized due to unsupported claim

    // Check report to verify needs_review status
    const reportRes = await request(app)
      .get(`/api/v1/viva-sessions/${sessionId}/report`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(reportRes.status, 200);

    const question2 = reportRes.body.data.questions[1];
    assert.equal(question2.reviewStatus, 'needs_review');
    assert.ok(question2.rubricEvaluation.summary.includes('unsupported claims'));
    assert.equal(question2.rubricEvaluation.confidence, 0.35);

    // Save question 1 answerId for trainer review test
    const question1 = reportRes.body.data.questions[0];
    assert.ok(question1.answerId);
    answerId = question1.answerId;
  });

  it('allows trainer to review and override provisional AI scores and criterion points', async () => {
    const reviewRes = await request(app)
      .patch(`/api/v1/viva-answers/${answerId}/review`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        score: 8,
        criteriaScores: [
          { criterionId: 'crit_correctness', points: 3, notes: 'Thorough tree balancing explanation' },
          { criterionId: 'crit_depth', points: 3 },
          { criterionId: 'crit_clarity', points: 2 },
        ],
        reviewerNotes: 'Verified tree balance rotation explanation.',
        reviewStatus: 'reviewed',
      });

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.body.data.id, answerId);
    assert.equal(reviewRes.body.data.score, 8);
    assert.equal(reviewRes.body.data.isProvisional, false);
    assert.equal(reviewRes.body.data.reviewStatus, 'reviewed');
    assert.equal(reviewRes.body.data.reviewerNotes, 'Verified tree balance rotation explanation.');

    // Fetch answer details
    const getRes = await request(app)
      .get(`/api/v1/viva-answers/${answerId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.isProvisional, false);
    assert.equal(getRes.body.data.score, 8);
    assert.equal(getRes.body.data.reviewStatus, 'reviewed');
  });

  it('validates score bounds and criterion IDs during trainer review', async () => {
    // 1. Score exceeds maxScore (e.g. 25 when maxScore is 10)
    const badScoreRes = await request(app)
      .patch(`/api/v1/viva-answers/${answerId}/review`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ score: 25 });
    assert.equal(badScoreRes.status, 422);
    assert.equal(badScoreRes.body.error.code, 'VALIDATION_ERROR');

    // 2. Invalid criterion ID
    const badCritRes = await request(app)
      .patch(`/api/v1/viva-answers/${answerId}/review`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        criteriaScores: [{ criterionId: 'non_existent_crit', points: 2 }],
      });
    assert.equal(badCritRes.status, 422);
    assert.equal(badCritRes.body.error.code, 'VALIDATION_ERROR');
    assert.ok(badCritRes.body.error.message.includes('not defined'));
  });

  it('forbids students from reviewing or altering viva answer grades (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/viva-answers/${answerId}/review`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ score: 10, reviewerNotes: 'Self-grading attempt' });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');

    // Other student forbidden from viewing answer
    const otherGet = await request(app)
      .get(`/api/v1/viva-answers/${answerId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(otherGet.status, 403);
  });
});

