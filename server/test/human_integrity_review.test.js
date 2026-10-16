import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Human Integrity Review Workflow (TASK-032)', () => {
  let trainerToken = '';
  let candidateToken = '';
  let candidateId = '';
  let intruderToken = '';
  let courseId = '';
  let assessmentId = '';
  let attemptId = '';
  let questionVersionId = '';
  let reviewId = '';

  it('sets up course, assessment, candidate attempt, and initial integrity signal', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'workflow.trainer@example.com',
        password: 'password123',
        displayName: 'Review Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Candidate student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'workflow.candidate@example.com',
        password: 'password123',
        displayName: 'Review Candidate',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    candidateToken = studentRes.body.data.session.access_token;
    candidateId = studentRes.body.data.user.id;

    // 3. Intruder student signup
    const intruderRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'workflow.intruder@example.com',
        password: 'password123',
        displayName: 'Review Intruder',
        role: 'student',
      });
    assert.equal(intruderRes.status, 201);
    intruderToken = intruderRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Integrity Review and Appeal Operations',
        description: 'Testing human review decision workflows and audit history',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll candidate
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${candidateToken}`);

    // Create and publish coding question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Implement merge sort',
        questionType: 'coding',
        difficulty: 'intermediate',
        marks: 10,
        testCases: [
          {
            input: '[3, 1, 2]',
            expectedOutput: '[1, 2, 3]',
            isHidden: false,
            orderIndex: 0,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    questionVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Review Monitored Assessment',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 3,
        questions: [{ questionVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Candidate starts attempt
    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${candidateToken}`);
    assert.equal(attemptRes.status, 201);
    attemptId = attemptRes.body.data.id;

    // Trainer records initial integrity signal
    const sigRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        signalType: 'multiple_focus_loss',
        confidence: 0.6,
        evidence: {
          focusLossCount: 4,
          rationale: 'Editor lost focus 4 times during key implementation phase.',
        },
      });
    assert.equal(sigRes.status, 201);
  });

  it('rejects student creation of integrity review cases (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-reviews`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        status: 'in_review',
        outcomeNotes: 'Student cannot self-initiate review',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('rejects review creation with invalid status enum (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-reviews`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        status: 'guilty_without_trial',
        outcomeNotes: 'Invalid enum test',
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('allows authorized reviewer to initiate human review case with initial audit trail', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-reviews`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        status: 'in_review',
        outcomeNotes: 'Initiating preliminary inquiry into focus loss signals.',
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    reviewId = res.body.data.id;
    assert.equal(res.body.data.status, 'in_review');
    assert.equal(res.body.data.outcome_notes, 'Initiating preliminary inquiry into focus loss signals.');
    assert.ok(Array.isArray(res.body.data.audit_trail));
    assert.equal(res.body.data.audit_trail.length, 1);
    assert.equal(res.body.data.audit_trail[0].action, 'review_created');
  });

  it('restricts sensitive evidence access from students (403 Forbidden)', async () => {
    // Candidate student tries to fetch full review case
    const candidateRes = await request(app)
      .get(`/api/v1/integrity-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${candidateToken}`);
    assert.equal(candidateRes.status, 403);

    // Intruder student tries to fetch full review case
    const intruderRes = await request(app)
      .get(`/api/v1/integrity-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${intruderToken}`);
    assert.equal(intruderRes.status, 403);

    // Student tries to list attempt reviews
    const listRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/integrity-reviews`)
      .set('Authorization', `Bearer ${candidateToken}`);
    assert.equal(listRes.status, 403);
  });

  it('allows authorized reviewer to view complete review case with signals and attempt evidence', async () => {
    const res = await request(app)
      .get(`/api/v1/integrity-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.review.id, reviewId);
    assert.equal(res.body.data.review.status, 'in_review');
    assert.ok(res.body.data.evidence);
    assert.equal(res.body.data.evidence.attempt.id, attemptId);
    assert.ok(res.body.data.evidence.signalsCount >= 1);
    assert.ok(res.body.data.evidence.disclaimer.includes('review leads, not proof'));
    assert.equal(res.body.data.evidence.retentionPolicy.retentionDays, 90);
  });

  it('rejects student update of integrity review decisions (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/integrity-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        status: 'cleared',
        outcomeNotes: 'Unauthorized student clear attempt',
      });

    assert.equal(res.status, 403);
  });

  it('allows reviewer to update review status with outcome notes and audit entry', async () => {
    const res = await request(app)
      .patch(`/api/v1/integrity-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        status: 'flagged_misconduct',
        outcomeNotes: 'Focus loss correlated with unexplained sudden code insertion.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'flagged_misconduct');
    assert.equal(res.body.data.outcome_notes, 'Focus loss correlated with unexplained sudden code insertion.');

    // Audit trail should now have 2 entries
    assert.equal(res.body.data.audit_trail.length, 2);
    assert.equal(res.body.data.audit_trail[1].action, 'review_updated');
    assert.equal(res.body.data.audit_trail[1].previousStatus, 'in_review');
    assert.equal(res.body.data.audit_trail[1].newStatus, 'flagged_misconduct');
  });

  it('rejects unrelated student from appealing the review (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/integrity-reviews/${reviewId}/appeal`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({
        appealReason: 'I am an unrelated student submitting an appeal.',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('rejects appeal without appealReason (422 Validation Error)', async () => {
    const res = await request(app)
      .post(`/api/v1/integrity-reviews/${reviewId}/appeal`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        supportingContext: 'Missing reason test',
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('allows candidate to submit an appeal/context and reopens case in in_review status', async () => {
    const res = await request(app)
      .post(`/api/v1/integrity-reviews/${reviewId}/appeal`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        appealReason: 'Dual monitor setup caused editor focus to shift while referencing course notes.',
        supportingContext: 'Notes are permitted as per the open-book practice assessment instructions.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'in_review');

    // Audit trail should now have 3 entries
    assert.equal(res.body.data.audit_trail.length, 3);
    const lastEntry = res.body.data.audit_trail[2];
    assert.equal(lastEntry.action, 'appeal_submitted');
    assert.equal(lastEntry.performedBy, candidateId);
    assert.equal(lastEntry.previousStatus, 'flagged_misconduct');
    assert.equal(lastEntry.newStatus, 'in_review');
    assert.ok(lastEntry.appealReason.includes('Dual monitor setup'));
  });

  it('allows reviewer to re-evaluate appeal context and clear the case with complete audit history', async () => {
    const res = await request(app)
      .patch(`/api/v1/integrity-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        status: 'cleared',
        outcomeNotes: 'Appeal accepted: open-book notes permitted for this practice assessment.',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'cleared');

    // Audit trail should have 4 entries reflecting complete lifecycle
    assert.equal(res.body.data.audit_trail.length, 4);
    assert.equal(res.body.data.audit_trail[0].action, 'review_created');
    assert.equal(res.body.data.audit_trail[1].action, 'review_updated');
    assert.equal(res.body.data.audit_trail[2].action, 'appeal_submitted');
    assert.equal(res.body.data.audit_trail[3].action, 'review_updated');
    assert.equal(res.body.data.audit_trail[3].previousStatus, 'in_review');
    assert.equal(res.body.data.audit_trail[3].newStatus, 'cleared');
  });

  it('lists all integrity reviews for an attempt for authorized reviewers', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${attemptId}/integrity-reviews`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.attemptId, attemptId);
    assert.ok(res.body.data.reviewsCount >= 1);
    const found = res.body.data.reviews.find((r) => r.id === reviewId);
    assert.ok(found);
    assert.equal(found.status, 'cleared');
  });

  it('returns 404 for non-existent review case ID', async () => {
    const res = await request(app)
      .get('/api/v1/integrity-reviews/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
