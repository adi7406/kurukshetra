import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Trainer Dashboard and Analytics (TASK-034)', () => {
  let trainerToken = '';
  let otherTrainerToken = '';
  let student1Token = '';
  let student2Token = '';
  let courseId = '';
  let conceptId = '';
  let assessmentId = '';
  let draftQuestionId = '';

  it('sets up trainer, other trainer, 2 students, course, assessment, and attempts', async () => {
    // 1. Trainer 1 (Course Owner)
    const t1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'trainer1.dashboard@example.com',
        password: 'password123',
        displayName: 'Lead Trainer',
        role: 'trainer',
      });
    assert.equal(t1Res.status, 201);
    trainerToken = t1Res.body.data.session.access_token;

    // 2. Trainer 2 (Unrelated Trainer)
    const t2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'trainer2.dashboard@example.com',
        password: 'password123',
        displayName: 'Other Trainer',
        role: 'trainer',
      });
    assert.equal(t2Res.status, 201);
    otherTrainerToken = t2Res.body.data.session.access_token;

    // 3. Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 's1.dashboard@example.com',
        password: 'password123',
        displayName: 'Alice Student',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    student1Token = s1Res.body.data.session.access_token;

    // 4. Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 's2.dashboard@example.com',
        password: 'password123',
        displayName: 'Bob Student',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    student2Token = s2Res.body.data.session.access_token;

    // 5. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Distributed Systems & Consistency',
        description: 'Trainer aggregate analytics lab',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Create concepts in course
    const cRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Raft Consensus Protocol',
        description: 'Leader election, log replication, and safety',
      });
    assert.equal(cRes.status, 201);
    conceptId = cRes.body.data.id;

    // Enroll both students
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${student1Token}`);

    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${student2Token}`);

    // Create and publish question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Which role initiates log entry heartbeats in Raft?',
        questionType: 'mcq_single',
        difficulty: 'intermediate',
        marks: 10,
        conceptIds: [conceptId],
        options: [
          { key: 'A', text: 'Leader', isCorrect: true },
          { key: 'B', text: 'Follower', isCorrect: false },
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

    // Create a draft question awaiting review/publication
    const draftQRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Unpublished draft question on Paxos versus Raft',
        questionType: 'mcq_single',
        difficulty: 'advanced',
        marks: 10,
        conceptIds: [conceptId],
        options: [
          { key: 'A', text: 'Draft Option 1', isCorrect: true },
          { key: 'B', text: 'Draft Option 2', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'A' },
        },
        reviewStatus: 'draft',
      });
    assert.equal(draftQRes.status, 201);
    draftQuestionId = draftQRes.body.data.id;

    // Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Consensus Protocols Midterm',
        assessmentType: 'fixed_test',
        passingPercentage: 50,
        maxAttempts: 2,
        questions: [{ questionVersionId: qVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Student 1 attempts and passes
    const att1Res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${student1Token}`);
    assert.equal(att1Res.status, 201);
    const att1Id = att1Res.body.data.id;

    await request(app)
      .put(`/api/v1/attempts/${att1Id}/answers/${qVersionId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ answer: { selectedOptionKeys: ['A'] } });

    await request(app)
      .post(`/api/v1/attempts/${att1Id}/submit`)
      .set('Authorization', `Bearer ${student1Token}`);

    await request(app)
      .post(`/api/v1/attempts/${att1Id}/process-mastery`)
      .set('Authorization', `Bearer ${student1Token}`);

    // Student 2 attempts and fails
    const att2Res = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${student2Token}`);
    assert.equal(att2Res.status, 201);
    const att2Id = att2Res.body.data.id;

    await request(app)
      .put(`/api/v1/attempts/${att2Id}/answers/${qVersionId}`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ answer: { selectedOptionKeys: ['B'] } });

    await request(app)
      .post(`/api/v1/attempts/${att2Id}/submit`)
      .set('Authorization', `Bearer ${student2Token}`);

    await request(app)
      .post(`/api/v1/attempts/${att2Id}/process-mastery`)
      .set('Authorization', `Bearer ${student2Token}`);
  });

  it('provides course-level participation, assessment summaries, and concept diagnostics for owner trainer', async () => {
    const res = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/dashboard`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    const data = res.body.data;

    // Course info
    assert.equal(data.course.id, courseId);
    assert.equal(data.course.title, 'Distributed Systems & Consistency');

    // Enrollment stats
    assert.equal(data.enrollmentStats.totalEnrolled, 2);
    assert.equal(data.enrollmentStats.activeEnrolled, 2);

    // Assessment summaries
    assert.equal(data.assessmentSummaries.length, 1);
    const assess = data.assessmentSummaries[0];
    assert.equal(assess.id, assessmentId);
    assert.equal(assess.totalAttempts, 2);
    assert.equal(assess.completedAttempts, 2);
    assert.equal(assess.passRate, 50); // 1 passed, 1 failed = 50%
    assert.equal(assess.averageScore, 5); // (10 + 0) / 2 = 5

    // Concept diagnostics
    assert.ok(Array.isArray(data.classConceptMastery.concepts));
    assert.ok(data.classConceptMastery.concepts.length >= 1);
    const raftConcept = data.classConceptMastery.concepts.find((c) => c.conceptId === conceptId);
    assert.ok(raftConcept);
    assert.equal(raftConcept.evaluatedStudentsCount, 2);

    // Pending reviews
    assert.ok(typeof data.pendingReviews.total === 'number');
  });

  it('rejects student access to trainer course dashboard (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/dashboard`)
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('rejects unauthorized trainer access to another trainer’s course dashboard (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/dashboard`)
      .set('Authorization', `Bearer ${otherTrainerToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('provides student roster with privacy minimization', async () => {
    const res = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/students`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.totalStudents, 2);
    assert.equal(res.body.data.students.length, 2);

    const s1 = res.body.data.students.find((s) => s.displayName === 'Alice Student');
    assert.ok(s1);
    assert.equal(s1.assessmentsCompletedCount, 1);
    assert.equal(s1.progressPercentage, 100);
    assert.equal(s1.averageScore, 10);

    // Data minimization assertion: No sensitive tokens, hashes, or passwords leaked
    for (const student of res.body.data.students) {
      assert.equal(student.password, undefined);
      assert.equal(student.password_hash, undefined);
      assert.equal(student.access_token, undefined);
    }
  });

  it('provides assessment performance analytics and score distribution buckets', async () => {
    const res = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/assessments/${assessmentId}/analytics`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    const data = res.body.data;

    assert.equal(data.assessment.id, assessmentId);
    assert.equal(data.stats.totalAttempts, 2);
    assert.equal(data.stats.completedAttempts, 2);
    assert.equal(data.stats.passedCount, 1);
    assert.equal(data.stats.failedCount, 1);
    assert.equal(data.stats.passRate, 50);

    // Score distribution contains 5 buckets
    assert.ok(data.stats.scoreDistribution);
    assert.equal(data.stats.scoreDistribution['0-20'], 1); // 0 score
    assert.equal(data.stats.scoreDistribution['81-100'], 1); // 100% score (10/10)
  });

  it('provides draft questions and assessments awaiting review or publication', async () => {
    const res = await request(app)
      .get('/api/v1/trainer/drafts')
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalDrafts >= 1);

    const foundDraftQ = res.body.data.draftQuestions.find((q) => q.id === draftQuestionId);
    assert.ok(foundDraftQ);
    assert.equal(foundDraftQ.courseId, courseId);
  });
});
