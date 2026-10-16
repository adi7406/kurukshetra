import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { getSupabase } from '../src/integrations/supabase.js';

describe('Reports and Export (TASK-035)', () => {
  let trainerToken;
  let otherTrainerToken;
  let student1Token;
  let student1Id;
  let student2Token;
  let student2Id;
  let courseId;
  let assessmentId;
  let conceptId;

  before(async () => {
    // 1. Create trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `reports_trainer_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Reports Lead Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Create another trainer
    const otherTrainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `reports_other_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Unrelated Trainer',
        role: 'trainer',
      });
    assert.equal(otherTrainerRes.status, 201);
    otherTrainerToken = otherTrainerRes.body.data.session.access_token;

    // 3. Create student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `reports_student1_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Alice Student',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    student1Token = s1Res.body.data.session.access_token;
    student1Id = s1Res.body.data.user.id;

    // 4. Create student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `reports_student2_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Bob Student',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    student2Token = s2Res.body.data.session.access_token;
    student2Id = s2Res.body.data.user.id;

    // 5. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Distributed Systems & Data Engineering',
        code: `DS-${Date.now()}`,
        description: 'Advanced engineering fundamentals with reporting and telemetry.',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 6. Create concept
    const conceptRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'MapReduce & Spark Partitioning',
        description: 'MapReduce shuffle, sort, and Spark RDD partitioning',
      });
    assert.equal(conceptRes.status, 201);
    conceptId = conceptRes.body.data.id;

    // 7. Enroll students
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${student1Token}`);

    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${student2Token}`);

    // 8. Create question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'What happens during the Shuffle and Sort phase of MapReduce?',
        questionType: 'mcq_single',
        difficulty: 'intermediate',
        marks: 10,
        conceptIds: [conceptId],
        options: [
          { key: 'A', text: 'Data partitions are transferred across nodes based on hash key', isCorrect: true },
          { key: 'B', text: 'All reducers write directly to disk without network transfer', isCorrect: false },
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

    // 9. Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Distributed Compute Midterm',
        assessmentType: 'fixed_test',
        passingPercentage: 60,
        maxAttempts: 3,
        questions: [{ questionVersionId: qVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 10. Student 1 attempts and submits assessment
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${student1Token}`);
    assert.equal(attRes.status, 201);
    const attId = attRes.body.data.id;

    await request(app)
      .put(`/api/v1/attempts/${attId}/answers/${qVersionId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ answer: { selectedOptionKeys: ['A'] } });

    await request(app)
      .post(`/api/v1/attempts/${attId}/submit`)
      .set('Authorization', `Bearer ${student1Token}`);

    await request(app)
      .post(`/api/v1/attempts/${attId}/process-mastery`)
      .set('Authorization', `Bearer ${student1Token}`);
  });

  it('allows student to export their own assessment history in CSV format with signed download token', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        reportType: 'student_assessment_history',
        format: 'csv',
        parameters: { courseId },
      });

    assert.equal(res.status, 201);
    const data = res.body.data;

    assert.equal(data.reportType, 'student_assessment_history');
    assert.equal(data.format, 'csv');
    assert.equal(data.status, 'ready');
    assert.ok(data.recordCount >= 1);
    assert.ok(data.downloadToken);
    assert.ok(data.downloadUrl);
    assert.ok(data.expiresAt);

    // Download the file via signed download URL
    const dlRes = await request(app)
      .get(data.downloadUrl);

    assert.equal(dlRes.status, 200);
    assert.equal(dlRes.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(dlRes.headers['content-disposition'].includes('attachment'));
    assert.ok(dlRes.text.includes('"attemptId"'));
    assert.ok(dlRes.text.includes('"Distributed Compute Midterm"'));
    assert.ok(dlRes.text.includes('"completed"'));

    // Data minimization check: no answer keys or candidate raw answers in CSV
    assert.ok(!dlRes.text.includes('correctOptionKey'));
  });

  it('allows student to export concept mastery in JSON format', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        reportType: 'student_mastery_report',
        format: 'json',
      });

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.equal(data.format, 'json');

    const dlRes = await request(app).get(data.downloadUrl);
    assert.equal(dlRes.status, 200);
    assert.equal(dlRes.headers['content-type'], 'application/json; charset=utf-8');

    const parsed = JSON.parse(dlRes.text);
    assert.equal(parsed.reportType, 'student_mastery_report');
    assert.ok(Array.isArray(parsed.data));
    assert.ok(parsed.data.length >= 1);
    assert.equal(parsed.data[0].studentId, student1Id);
  });

  it('rejects student attempting to export another student’s history (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        reportType: 'student_assessment_history',
        format: 'json',
        parameters: { studentId: student2Id },
      });

    assert.equal(res.status, 403);
    assert.ok(res.body.error.message.includes('only authorized to export their own'));
  });

  it('rejects student attempting to export course gradebook (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        reportType: 'course_gradebook',
        format: 'csv',
        parameters: { courseId },
      });

    assert.equal(res.status, 403);
    assert.ok(res.body.error.message.includes('Only trainers and administrators'));
  });

  it('allows course trainer to export gradebook and writes an audit log', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        reportType: 'course_gradebook',
        format: 'csv',
        parameters: { courseId },
      });

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.equal(data.reportType, 'course_gradebook');
    assert.equal(data.recordCount, 2); // 2 enrolled students

    const dlRes = await request(app).get(data.downloadUrl);
    assert.equal(dlRes.status, 200);
    assert.ok(dlRes.text.includes('"displayName"'));
    assert.ok(dlRes.text.includes('"Alice Student"'));
    assert.ok(dlRes.text.includes('"Bob Student"'));
    assert.ok(dlRes.text.includes('"totalAttempts"'));

    // Verify privileged audit log was recorded
    const supabase = getSupabase();
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'export_course_gradebook')
      .eq('resource_id', courseId);

    assert.ok(auditLogs && auditLogs.length >= 1);
    assert.equal(auditLogs[0].resource_type, 'course');
  });

  it('rejects unauthorized trainer from exporting gradebook for another trainer’s course (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${otherTrainerToken}`)
      .send({
        reportType: 'course_gradebook',
        format: 'csv',
        parameters: { courseId },
      });

    assert.equal(res.status, 403);
    assert.ok(res.body.error.message.includes('not authorized'));
  });

  it('allows trainer to export assessment item analysis and audits privileged operation', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        reportType: 'assessment_item_analysis',
        format: 'json',
        parameters: { assessmentId },
      });

    assert.equal(res.status, 201);
    const data = res.body.data;
    assert.equal(data.reportType, 'assessment_item_analysis');

    const dlRes = await request(app).get(data.downloadUrl);
    assert.equal(dlRes.status, 200);
    const parsed = JSON.parse(dlRes.text);
    assert.ok(parsed.data.length >= 1);
    assert.equal(parsed.data[0].assessmentId, assessmentId);
    assert.ok(parsed.data[0].successRatePercentage !== undefined);

    // Verify privileged audit log
    const supabase = getSupabase();
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'export_assessment_analysis')
      .eq('resource_id', assessmentId);

    assert.ok(auditLogs && auditLogs.length >= 1);
  });

  it('rejects download request with tampered or expired token (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        reportType: 'student_assessment_history',
        format: 'json',
      });

    assert.equal(res.status, 201);
    const exportId = res.body.data.exportId;

    // Tampered token
    const tamperedRes = await request(app)
      .get(`/api/v1/reports/${exportId}/download?token=invalid.tampered_signature_hex`);
    assert.equal(tamperedRes.status, 403);

    // Expired token (simulate timestamp in the past)
    const expiredTimestamp = Date.now() - 5000;
    const expiredRes = await request(app)
      .get(`/api/v1/reports/${exportId}/download?token=${expiredTimestamp}.abcdef1234567890`);
    assert.equal(expiredRes.status, 403);
  });

  it('retrieves report metadata and user list of exports', async () => {
    // 1. List user exports
    const listRes = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.length >= 1);

    const firstReportId = listRes.body.data[0].id;

    // 2. Get specific report metadata
    const detailRes = await request(app)
      .get(`/api/v1/reports/${firstReportId}`)
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.data.id, firstReportId);
    assert.ok(detailRes.body.data.recordCount !== undefined);
    assert.ok(detailRes.body.data.expiresAt);
  });
});
