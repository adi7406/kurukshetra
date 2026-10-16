import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { getSupabase } from '../src/integrations/supabase.js';

describe('Mastery Evidence Pipeline (TASK-022)', () => {
  let trainerToken = '';
  let studentToken = '';
  let otherStudentToken = '';
  let studentId = '';
  let courseId = '';
  let conceptId = '';
  let concept2Id = '';
  let assessmentId = '';
  let attemptId = '';
  let q1VersionId = '';

  it('sets up course, concepts, questions with concept mappings, and enrollment', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'mastery.trainer@example.com',
        password: 'password123',
        displayName: 'Mastery Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student 1 signup
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'mastery.student1@example.com',
        password: 'password123',
        displayName: 'Mastery Learner 1',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    studentToken = s1Res.body.data.session.access_token;
    studentId = s1Res.body.data.user.id;

    // 3. Student 2 signup
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'mastery.student2@example.com',
        password: 'password123',
        displayName: 'Mastery Learner 2',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    otherStudentToken = s2Res.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Algorithms & Data Structures',
        description: 'Advanced Algorithms',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 5. Create concepts for the course
    const c1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Memoization & Tabulation',
        description: 'Overlapping subproblems and optimal substructure',
        orderIndex: 0,
      });
    assert.equal(c1Res.status, 201);
    conceptId = c1Res.body.data.id;

    const c2Res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'State Transitions',
        description: 'Recurrence relation formulation',
        orderIndex: 1,
      });
    assert.equal(c2Res.status, 201);
    concept2Id = c2Res.body.data.id;

    // 6. Create questions mapped to concepts
    // 6. Create questions mapped to concepts
    const q1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'What defines dynamic programming?',
        questionType: 'mcq_single',
        difficulty: 'intermediate',
        marks: 5,
        conceptIds: [conceptId, concept2Id],
        options: [
          { key: 'A', text: 'Optimal substructure and overlapping subproblems', isCorrect: true },
          { key: 'B', text: 'Random divide and conquer', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'A' },
        },
      });
    assert.equal(q1Res.status, 201);
    q1VersionId = q1Res.body.data.versionId;

    // Publish question
    await request(app)
      .post(`/api/v1/questions/${q1Res.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 7. Create assessment with this question and publish
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'DP Mastery Quiz',
        description: 'Testing core DP concepts',
        assessmentType: 'fixed_test',
        passingPercentage: 60,
        maxAttempts: 3,
        questions: [{ questionVersionId: q1VersionId, marks: 5, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 8. Enroll student
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);
  });

  it('ingests normalized evidence and updates student mastery on attempt submission', async () => {
    // 1. Start attempt
    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(startRes.status, 201);
    attemptId = startRes.body.data.id;

    // 2. Answer correctly
    const ansRes = await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${q1VersionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answer: {
          selectedOptionKeys: ['A'],
        },
      });
    assert.equal(ansRes.status, 200);

    // 3. Submit attempt
    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(submitRes.status, 200);

    // 4. Fetch result (grades attempt and ingests mastery evidence)
    const resultRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resultRes.status, 200);
    assert.equal(resultRes.body.data.status, 'completed');

    // 5. Verify learning_attempts evidence rows created in database
    const supabase = getSupabase();
    const { data: evidenceRows = [] } = await supabase
      .from('learning_attempts')
      .select('*')
      .eq('student_id', studentId);

    // Question mapped to 2 concepts -> exactly 2 evidence rows
    assert.equal(evidenceRows.length, 2);
    const c1Evidence = evidenceRows.find((e) => e.concept_id === conceptId);
    assert.ok(c1Evidence);
    assert.equal(c1Evidence.is_correct, true);
    assert.equal(c1Evidence.score, 5);

    // 5. Verify student_mastery updated
    const { data: mastery1 } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId)
      .single();

    assert.ok(mastery1);
    // Baseline formula: 0.10 + 0.2*(1 - 0.10) = 0.28
    assert.equal(Number(mastery1.mastery_probability), 0.28);
    assert.equal(mastery1.evidence_count, 1);
    assert.equal(mastery1.model_name, 'rule_based_baseline');

    // 6. Verify append-only mastery_history
    const { data: history = [] } = await supabase
      .from('mastery_history')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId);

    assert.equal(history.length, 1);
    assert.equal(Number(history[0].previous_probability), 0.1);
    assert.equal(Number(history[0].new_probability), 0.28);
    assert.equal(history[0].evidence_source_type, 'learning_attempt');
    assert.equal(history[0].evidence_source_id, c1Evidence.id);
  });

  it('guarantees idempotent evidence processing without double counting', async () => {
    const supabase = getSupabase();

    // Call process-mastery explicitly for the already-ingested attempt
    const reprocessRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/process-mastery`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(reprocessRes.status, 200);
    assert.equal(reprocessRes.body.data.newEvidenceRecorded, 0);

    // Check that learning_attempts still has exactly 2 rows
    const { data: evidenceRows = [] } = await supabase
      .from('learning_attempts')
      .select('*')
      .eq('student_id', studentId);
    assert.equal(evidenceRows.length, 2);

    // Check that student_mastery probability and evidence count are completely unchanged
    const { data: mastery1 } = await supabase
      .from('student_mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId)
      .single();
    assert.equal(Number(mastery1.mastery_probability), 0.28);
    assert.equal(mastery1.evidence_count, 1);

    // Check that mastery_history has not appended any duplicate records
    const { data: history = [] } = await supabase
      .from('mastery_history')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId);
    assert.equal(history.length, 1);
  });

  it('enforces authorization rules on evidence processing', async () => {
    // Other student cannot trigger mastery processing on student1 attempt
    const forbiddenRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/process-mastery`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');

    // Anonymous cannot trigger mastery processing
    const unauthRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/process-mastery`);
    assert.equal(unauthRes.status, 401);

    // Non-existent attempt returns 404
    const notFoundRes = await request(app)
      .post('/api/v1/attempts/non-existent-uuid/process-mastery')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(notFoundRes.status, 404);
  });
});
