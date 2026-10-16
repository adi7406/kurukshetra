import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { masteryService } from '../src/services/mastery.service.js';

describe('Personalized Recommendations & Prerequisite Readiness (TASK-024)', () => {
  let trainerToken = '';
  let studentToken = '';
  let otherStudentToken = '';
  let studentId = '';
  let courseId = '';
  let conceptAId = '';
  let conceptBId = '';
  let conceptCId = '';
  let resourceAId = '';
  let assessmentBId = '';
  let topRecId = '';

  it('sets up a course with a prerequisite concept graph and learning resources', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'rec.trainer@example.com',
        password: 'password123',
        displayName: 'Rec Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student 1 signup
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'rec.student1@example.com',
        password: 'password123',
        displayName: 'Rec Student 1',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    studentToken = s1Res.body.data.session.access_token;
    studentId = s1Res.body.data.user.id;

    // 3. Student 2 signup (not enrolled)
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'rec.student2@example.com',
        password: 'password123',
        displayName: 'Rec Student 2',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    otherStudentToken = s2Res.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Computer Science Foundations',
        description: 'From variables to recursion',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll student 1
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);

    // 5. Create Concepts: A (Variables), B (Functions), C (Recursion)
    const cARes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ name: 'Variables & Data Types', orderIndex: 0 });
    assert.equal(cARes.status, 201);
    conceptAId = cARes.body.data.id;

    const cBRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ name: 'Functions & Scope', orderIndex: 1 });
    assert.equal(cBRes.status, 201);
    conceptBId = cBRes.body.data.id;

    const cCRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ name: 'Recursion', orderIndex: 2 });
    assert.equal(cCRes.status, 201);
    conceptCId = cCRes.body.data.id;

    // 6. Define Prerequisites: B requires A, C requires B
    const p1Res = await request(app)
      .put(`/api/v1/concepts/${conceptBId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ prerequisiteIds: [conceptAId] });
    assert.equal(p1Res.status, 200);

    const p2Res = await request(app)
      .put(`/api/v1/concepts/${conceptCId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ prerequisiteIds: [conceptBId] });
    assert.equal(p2Res.status, 200);

    // 7. Add published Learning Resource for Concept A
    const resARes = await request(app)
      .post(`/api/v1/concepts/${conceptAId}/resources`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Variables and Types Cheatsheet',
        resourceType: 'article',
        content: 'Primitive types in memory',
        sourceType: 'trainer',
      });
    assert.equal(resARes.status, 201);
    resourceAId = resARes.body.data.id;

    // Publish resource
    await request(app)
      .post(`/api/v1/resources/${resourceAId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 8. Create question for Concept B and published Practice Assessment
    const qBRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'What is variable scope in a function?',
        questionType: 'mcq_single',
        difficulty: 'intermediate',
        marks: 5,
        conceptIds: [conceptBId],
        options: [
          { key: 'A', text: 'Local to the function', isCorrect: true },
          { key: 'B', text: 'Universal across all files', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'A' },
        },
      });
    assert.equal(qBRes.status, 201);
    const qBVersionId = qBRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qBRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Functions Diagnostic Quiz',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 5,
        questions: [{ questionVersionId: qBVersionId, marks: 5, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentBId = assessRes.body.data.id;

    const pubRes = await request(app)
      .post(`/api/v1/assessments/${assessmentBId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(pubRes.status, 200);
  });

  it('prioritizes prerequisite gaps when foundational concepts are unmastered', async () => {
    // Current student mastery: empty / unmastered (0.10 < 0.60 for all)
    const res = await request(app)
      .get('/api/v1/me/recommendations')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const recs = res.body.data;
    assert.ok(Array.isArray(recs));
    assert.ok(recs.length > 0);

    // Concept B & C require Concept A. Therefore Concept A MUST be the top recommendation
    const topRec = recs[0];
    assert.equal(topRec.conceptId, conceptAId);
    assert.equal(topRec.targetConceptName, 'Variables & Data Types');
    assert.equal(topRec.activityType, 'read');
    assert.equal(topRec.learningResourceId, resourceAId);
    assert.equal(topRec.priority, 1);
    assert.ok(topRec.reason.includes('Prerequisite'));
    topRecId = topRec.id;
  });

  it('updates recommendations dynamically when prerequisite is mastered', async () => {
    // Update Concept A mastery to 0.85 (>= 0.60 ready threshold)
    await masteryService.updateConceptMastery({
      studentId,
      conceptId: conceptAId,
      isCorrect: true,
      score: 10,
      maxScore: 10,
    });
    // Manually boost to 0.85
    const { getSupabase } = await import('../src/integrations/supabase.js');
    const supabase = getSupabase();
    await supabase
      .from('student_mastery')
      .update({ mastery_probability: 0.85000, evidence_count: 5 })
      .eq('student_id', studentId);

    // Fetch recommendations again
    const res = await request(app)
      .get('/api/v1/me/recommendations')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const recs = res.body.data;

    // Concept A is now mastered. Concept B is unlocked!
    // Top recommendation should target Concept B
    const bRec = recs.find((r) => r.conceptId === conceptBId);
    assert.ok(bRec);
    assert.equal(bRec.prerequisitesMet, true);
    assert.ok(bRec.reason.includes('Prerequisites met'));

    // Concept A now receives review recommendation (mastered)
    const aRec = recs.find((r) => r.conceptId === conceptAId);
    assert.ok(aRec);
    assert.equal(aRec.activityType, 'review');
  });

  it('records student feedback on recommendations (POST /me/recommendations/:id/feedback)', async () => {
    assert.ok(topRecId);

    // 1. Student accepts recommendation
    const acceptRes = await request(app)
      .post(`/api/v1/me/recommendations/${topRecId}/feedback`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        status: 'accepted',
      });

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.id, topRecId);
    assert.equal(acceptRes.body.data.status, 'accepted');

    // 2. Reject invalid status with 422 Validation Error
    const invalidRes = await request(app)
      .post(`/api/v1/me/recommendations/${topRecId}/feedback`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        status: 'invalid_status',
      });
    assert.equal(invalidRes.status, 422);

    // 3. Other student cannot modify someone else's recommendation feedback (403)
    const snoopRes = await request(app)
      .post(`/api/v1/me/recommendations/${topRecId}/feedback`)
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({
        status: 'dismissed',
      });
    assert.equal(snoopRes.status, 403);
  });

  it('returns empty array cleanly for unenrolled student without errors', async () => {
    const unenrolledRes = await request(app)
      .get('/api/v1/me/recommendations')
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(unenrolledRes.status, 200);
    assert.deepEqual(unenrolledRes.body.data, []);
    assert.equal(unenrolledRes.body.meta.count, 0);
  });
});
