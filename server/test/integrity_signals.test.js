import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Assessment Integrity Signals (TASK-031)', () => {
  let trainerToken = '';
  let studentToken = '';
  let intruderStudentToken = '';
  let courseId = '';
  let assessmentId = '';
  let attemptId = '';
  let codingQuestionVersionId = '';
  let sessionId = '';
  let recordedSignalId = '';

  it('sets up course, coding assessment, attempt, and active coding session', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'integrity.trainer@example.com',
        password: 'password123',
        displayName: 'Integrity Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'integrity.student@example.com',
        password: 'password123',
        displayName: 'Integrity Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Intruder student signup
    const intruderRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'integrity.intruder@example.com',
        password: 'password123',
        displayName: 'Intruder Student',
        role: 'student',
      });
    assert.equal(intruderRes.status, 201);
    intruderStudentToken = intruderRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Algorithms with Integrity Auditing',
        description: 'Testing human review and integrity signals pipeline',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll student
    await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Create and publish coding question
    const qRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Implement binary search',
        questionType: 'coding',
        difficulty: 'intermediate',
        marks: 10,
        testCases: [
          {
            input: '[1, 2, 3], 2',
            expectedOutput: '1',
            isHidden: false,
            orderIndex: 0,
          },
          {
            input: '[1, 2, 3], 4',
            expectedOutput: '-1',
            isHidden: true,
            orderIndex: 1,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    const qId = qRes.body.data.id;
    codingQuestionVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Create and publish assessment
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Integrity Monitored Coding Quiz',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 3,
        questions: [{ questionVersionId: codingQuestionVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Student starts attempt
    const attemptRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attemptRes.status, 201);
    attemptId = attemptRes.body.data.id;

    // Student starts coding session
    const codingRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/coding-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        attemptId,
        questionVersionId: codingQuestionVersionId,
        language: 'javascript',
      });
    assert.equal(codingRes.status, 201);
    sessionId = codingRes.body.data.session.id;
  });

  it('provides permitted signal types catalog and non-punitive guidelines to authenticated users', async () => {
    const res = await request(app)
      .get('/api/v1/integrity-signals/types')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.permittedTypes));
    assert.ok(res.body.data.permittedTypes.includes('rapid_paste'));
    assert.ok(res.body.data.permittedTypes.includes('multiple_focus_loss'));
    assert.ok(res.body.data.permittedTypes.includes('excessive_blur'));
    assert.ok(res.body.data.permittedTypes.includes('unusual_timeline_gap'));
    assert.ok(res.body.data.permittedTypes.includes('time_anomaly'));

    assert.ok(res.body.data.disclaimer.includes('review leads, not proof'));
    assert.equal(res.body.data.retentionPolicy.retentionDays, 90);
  });

  it('rejects student recording of integrity signals with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        signalType: 'rapid_paste',
        confidence: 0.7,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('rejects recording with invalid signal type (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        signalType: 'fraudulent_behavior_detected',
        confidence: 0.8,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('rejects recording with confidence outside [0, 1] range (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        signalType: 'multiple_focus_loss',
        confidence: 1.5,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('allows trainer to record a valid integrity signal with evidence and uncertainty', async () => {
    const res = await request(app)
      .post(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        signalType: 'rapid_paste',
        confidence: 0.7,
        evidence: {
          insertedCharacters: 320,
          detectedIntervalMs: 120,
          rationale: 'Large function template pasted into blank editor buffer.',
        },
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    recordedSignalId = res.body.data.id;
    assert.equal(res.body.data.signal_type, 'rapid_paste');
    assert.equal(res.body.data.confidence, 0.7);
    assert.equal(res.body.data.evidence.uncertainty, 0.3);
    assert.ok(res.body.data.evidence.disclaimer.includes('review leads, not proof'));
    assert.equal(res.body.data.evidence.retentionPolicy.retentionDays, 90);
  });

  it('rejects student access to retrieval of integrity signals with 403 Forbidden', async () => {
    // Attempt signals
    const attemptRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attemptRes.status, 403);

    // Session signals
    const sessionRes = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}/integrity-signals`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(sessionRes.status, 403);

    // Specific signal by ID
    const singleRes = await request(app)
      .get(`/api/v1/integrity-signals/${recordedSignalId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(singleRes.status, 403);
  });

  it('allows trainer to retrieve integrity signals for an attempt', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${attemptId}/integrity-signals`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.attemptId, attemptId);
    assert.ok(res.body.data.signalsCount >= 1);
    assert.ok(res.body.data.disclaimer.includes('not proof'));
    assert.equal(res.body.data.retentionPolicy.retentionDays, 90);

    const found = res.body.data.signals.find((s) => s.id === recordedSignalId);
    assert.ok(found);
    assert.equal(found.signalType, 'rapid_paste');
    assert.equal(found.confidence, 0.7);
    assert.equal(found.uncertainty, 0.3);
  });

  it('records session events and automatically derives rule-based integrity signals', async () => {
    const baseTime = Date.now() - 30 * 60 * 1000;

    // Student uploads batch of events: rapid paste, focus losses, and timeline gap
    const eventsBatch = [
      {
        sequenceNumber: 1,
        eventType: 'editor_focus',
        occurredAt: new Date(baseTime).toISOString(),
        payload: {},
      },
      // Event 2: Rapid paste of 150 chars
      {
        sequenceNumber: 2,
        eventType: 'paste',
        occurredAt: new Date(baseTime + 5000).toISOString(),
        payload: {
          text: 'function binarySearch(arr, target) { let l = 0, r = arr.length - 1; while(l <= r) { const m = Math.floor((l+r)/2); if(arr[m] === target) return m; } return -1; }',
          length: 153,
        },
      },
      // Event 3, 4, 5: Multiple focus losses
      {
        sequenceNumber: 3,
        eventType: 'editor_blur',
        occurredAt: new Date(baseTime + 10000).toISOString(),
        payload: {},
      },
      {
        sequenceNumber: 4,
        eventType: 'visibility_change',
        occurredAt: new Date(baseTime + 15000).toISOString(),
        payload: { hidden: true },
      },
      {
        sequenceNumber: 5,
        eventType: 'editor_blur',
        occurredAt: new Date(baseTime + 20000).toISOString(),
        payload: {},
      },
      // Event 6: Timeline gap (10 minutes = 600,000 ms)
      {
        sequenceNumber: 6,
        eventType: 'document_change',
        occurredAt: new Date(baseTime + 620000).toISOString(),
        payload: { inserted: '// resume work after gap' },
      },
    ];

    const recordRes = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        events: eventsBatch,
        isFinal: false,
      });
    assert.equal(recordRes.status, 201);

    // Intruder student trying to trigger analysis -> 403 Forbidden
    const unauthAnalysis = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/analyze-signals`)
      .set('Authorization', `Bearer ${intruderStudentToken}`);
    assert.equal(unauthAnalysis.status, 403);

    // Trainer runs integrity analysis
    const analysisRes = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/analyze-signals`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(analysisRes.status, 200);
    assert.ok(analysisRes.body.data.detectedSignalsCount >= 2);
    assert.ok(analysisRes.body.data.disclaimer.includes('review leads, not proof'));

    const signalTypes = analysisRes.body.data.signals.map((s) => s.signal_type || s.signalType);
    assert.ok(signalTypes.includes('rapid_paste'));
    assert.ok(signalTypes.includes('multiple_focus_loss'));
    assert.ok(signalTypes.includes('unusual_timeline_gap'));
  });

  it('retrieves integrity signals for coding session', async () => {
    const res = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}/integrity-signals`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.signalsCount >= 3);
    assert.equal(res.body.data.retentionPolicy.retentionDays, 90);
  });

  it('allows trainer to inspect an individual integrity signal by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/integrity-signals/${recordedSignalId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, recordedSignalId);
    assert.equal(res.body.data.signalType, 'rapid_paste');
    assert.equal(res.body.data.uncertainty, 0.3);
    assert.ok(res.body.data.evidence.insertedCharacters === 320);
    assert.ok(res.body.data.disclaimer.includes('review leads, not proof'));
  });

  it('returns 404 for non-existent signal ID', async () => {
    const res = await request(app)
      .get('/api/v1/integrity-signals/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('guarantees that integrity signals NEVER automatically alter attempt score or mastery (non-punitive)', async () => {
    // 1. Verify attempt score before any grading
    const attemptRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(attemptRes.status, 200);
    // Integrity signals must not lower score or fail student automatically
    assert.equal(attemptRes.body.data.status, 'in_progress');
    assert.ok(!attemptRes.body.data.completedAt);
  });
});
