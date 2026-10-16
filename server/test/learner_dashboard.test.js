import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Learner Dashboard (TASK-033)', () => {
  let trainerToken = '';
  let activeStudentToken = '';
  let activeStudentId = '';
  let freshStudentToken = '';
  let otherStudentToken = '';
  let courseId = '';
  let conceptId = '';
  let unpracticedConceptId = '';
  let assessmentId = '';

  it('sets up trainer, active student, fresh student, course with concepts and assessment', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'dashboard.trainer@example.com',
        password: 'password123',
        displayName: 'Dashboard Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Active student signup
    const activeRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'active.student@example.com',
        password: 'password123',
        displayName: 'Active Learner',
        role: 'student',
      });
    assert.equal(activeRes.status, 201);
    activeStudentToken = activeRes.body.data.session.access_token;
    activeStudentId = activeRes.body.data.user.id;

    // 3. Fresh student signup (no enrollments or attempts)
    const freshRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'fresh.student@example.com',
        password: 'password123',
        displayName: 'Fresh Learner',
        role: 'student',
      });
    assert.equal(freshRes.status, 201);
    freshStudentToken = freshRes.body.data.session.access_token;

    // 4. Other student signup (for boundary checks)
    const otherRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'other.student@example.com',
        password: 'password123',
        displayName: 'Other Learner',
        role: 'student',
      });
    assert.equal(otherRes.status, 201);
    otherStudentToken = otherRes.body.data.session.access_token;

    // 5. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Full Stack Performance Architecture',
        description: 'Complete dashboard progress tracking lab',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Create concepts in course
    const c1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Database Indexing & B-Trees',
        description: 'Index structures, queries, and performance',
      });
    assert.equal(c1Res.status, 201);
    conceptId = c1Res.body.data.id;

    const c2Res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Cache Eviction Strategies',
        description: 'LRU, LFU, and distributed caching',
      });
    assert.equal(c2Res.status, 201);
    unpracticedConceptId = c2Res.body.data.id;

    // Enroll active student
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${activeStudentToken}`);

    // Create question tied to concept
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Which index structure provides O(log N) lookup in relational engines?',
        questionType: 'mcq_single',
        difficulty: 'intermediate',
        marks: 5,
        conceptIds: [conceptId],
        options: [
          { key: 'A', text: 'B+ Tree', isCorrect: true },
          { key: 'B', text: 'Linked List', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'A' },
        },
      });
    assert.equal(qRes.status, 201);
    const qVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Database Storage Quiz',
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

    // Active student attempts and submits assessment
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${activeStudentToken}`);
    assert.equal(attRes.status, 201);
    const attemptId = attRes.body.data.id;

    // Save correct answer
    await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${qVersionId}`)
      .set('Authorization', `Bearer ${activeStudentToken}`)
      .send({
        answer: { selectedOptionKeys: ['A'] },
      });

    // Submit attempt
    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${activeStudentToken}`);
    assert.equal(submitRes.status, 200);

    // Process mastery evidence
    await request(app)
      .post(`/api/v1/attempts/${attemptId}/process-mastery`)
      .set('Authorization', `Bearer ${activeStudentToken}`);
  });

  it('renders clean empty state for a fresh student without fabricated data', async () => {
    const res = await request(app)
      .get('/api/v1/me/dashboard')
      .set('Authorization', `Bearer ${freshStudentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.state.isEmpty, true);
    assert.equal(res.body.data.state.status, 'empty');
    assert.deepEqual(res.body.data.enrolledCourses, []);
    assert.deepEqual(res.body.data.assessmentHistory, []);
    assert.deepEqual(res.body.data.mastery.concepts, []);
    assert.equal(res.body.data.mastery.summary.totalConcepts, 0);
  });

  it('aggregates real courses, progress, assessment history, and categorized mastery for active student', async () => {
    const res = await request(app)
      .get('/api/v1/me/dashboard')
      .set('Authorization', `Bearer ${activeStudentToken}`);

    assert.equal(res.status, 200);
    const data = res.body.data;

    // 1. Learner profile
    assert.equal(data.learner.id, activeStudentId);
    assert.equal(data.learner.displayName, 'Active Learner');

    // 2. Enrolled courses & progress
    assert.equal(data.enrolledCourses.length, 1);
    const course = data.enrolledCourses[0];
    assert.equal(course.courseId, courseId);
    assert.equal(course.assessmentsTotal, 1);
    assert.equal(course.assessmentsCompleted, 1);
    assert.equal(course.progressPercentage, 100);

    // 3. Assessment history
    assert.equal(data.assessmentHistory.length, 1);
    const attempt = data.assessmentHistory[0];
    assert.equal(attempt.assessmentId, assessmentId);
    assert.equal(attempt.status, 'completed');
    assert.ok(typeof attempt.score === 'number');

    // 4. Concept mastery & non-fabrication guarantee
    assert.ok(data.mastery.concepts.length >= 2);
    assert.ok(data.mastery.disclaimer.includes('probabilistic estimates'));

    // Practiced concept has an estimate
    const practiced = data.mastery.concepts.find((c) => c.conceptId === conceptId);
    assert.ok(practiced);
    assert.equal(practiced.isEstimated, true);
    assert.ok(typeof practiced.masteryProbability === 'number');
    assert.ok(['strong', 'developing', 'weak'].includes(practiced.category));

    // Unpracticed concept is strictly marked insufficient_evidence without fabricated probability
    const unpracticed = data.mastery.concepts.find((c) => c.conceptId === unpracticedConceptId);
    assert.ok(unpracticed);
    assert.equal(unpracticed.category, 'insufficient_evidence');
    assert.equal(unpracticed.masteryProbability, null);
    assert.equal(unpracticed.isEstimated, false);

    // 5. State metadata
    assert.equal(data.state.isEmpty, false);
    assert.equal(data.state.status, 'active');
    assert.ok(data.state.lastActivityAt);
  });

  it('rejects unauthenticated request to /me/dashboard with 401', async () => {
    const res = await request(app).get('/api/v1/me/dashboard');
    assert.equal(res.status, 401);
  });

  it('rejects another student from viewing target student dashboard (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${activeStudentId}/dashboard`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows authorized trainer to inspect student dashboard via /students/:id/dashboard', async () => {
    const res = await request(app)
      .get(`/api/v1/students/${activeStudentId}/dashboard`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.learner.id, activeStudentId);
    assert.equal(res.body.data.enrolledCourses.length, 1);
  });

  it('returns 404 when requested student ID does not exist', async () => {
    const res = await request(app)
      .get('/api/v1/students/00000000-0000-0000-0000-000000000000/dashboard')
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
