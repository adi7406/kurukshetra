import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Editor Event Recording and Replay Timeline (TASK-028)', () => {
  let trainerToken = '';
  let studentToken = '';
  let intruderToken = '';
  let courseId = '';
  let assessmentId = '';
  let codingQuestionVersionId = '';
  let sessionId = '';

  it('sets up course, question, assessment and active coding session', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'replay.trainer@example.com',
        password: 'password123',
        displayName: 'Replay Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'replay.student@example.com',
        password: 'password123',
        displayName: 'Replay Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Intruder student signup
    const intruderRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'replay.intruder@example.com',
        password: 'password123',
        displayName: 'Replay Intruder',
        role: 'student',
      });
    assert.equal(intruderRes.status, 201);
    intruderToken = intruderRes.body.data.session.access_token;

    // 4. Create and publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Software Development & Audit Lab',
        description: 'Track editor replay and developmental process',
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
        prompt: 'Implement Fibonacci function solution(n).',
        questionType: 'coding',
        difficulty: 'intermediate',
        marks: 10,
        testCases: [
          {
            input: '5',
            expectedOutput: '5',
            isHidden: false,
            orderIndex: 0,
          },
        ],
      });
    assert.equal(qRes.status, 201);
    codingQuestionVersionId = qRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${qRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 6. Create assessment and publish
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Fibonacci Implementation Exam',
        assessmentType: 'practice',
        passingPercentage: 60,
        maxAttempts: 2,
        questions: [{ questionVersionId: codingQuestionVersionId, position: 0 }],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 7. Student starts coding session
    const sessionRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/coding-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionVersionId: codingQuestionVersionId,
        language: 'javascript',
      });
    assert.equal(sessionRes.status, 201);
    sessionId = sessionRes.body.data.session.id;
  });

  it('records initial batch of editor events with sequence numbers and timestamps', async () => {
    const baseTime = Date.now() - 30000;

    const events = [
      {
        sequenceNumber: 0,
        eventType: 'editor_focus',
        occurredAt: new Date(baseTime).toISOString(),
        payload: { focused: true },
      },
      {
        sequenceNumber: 1,
        eventType: 'document_change',
        occurredAt: new Date(baseTime + 2000).toISOString(),
        payload: { changeType: 'insert', text: 'function solution(n) {', range: { startLine: 1, endLine: 1 } },
      },
      {
        sequenceNumber: 2,
        eventType: 'paste',
        occurredAt: new Date(baseTime + 4000).toISOString(),
        payload: { charCount: 45, textSnippet: 'if (n <= 1) return n;' },
      },
      {
        sequenceNumber: 3,
        eventType: 'editor_blur',
        occurredAt: new Date(baseTime + 6000).toISOString(),
        payload: { durationMs: 1500 },
      },
      {
        sequenceNumber: 4,
        eventType: 'visibility_change',
        occurredAt: new Date(baseTime + 7000).toISOString(),
        payload: { hidden: true },
      },
    ];

    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        events,
        isFinal: false,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.recordedCount, 5);
    assert.equal(res.body.data.lastSequenceNumber, 4);
    assert.equal(res.body.data.isComplete, false);
  });

  it('rejects event submission with invalid event types or future timestamps (422)', async () => {
    // 1. Invalid event type
    const invalidTypeRes = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        events: [
          {
            sequenceNumber: 5,
            eventType: 'malicious_system_hook',
            occurredAt: new Date().toISOString(),
          },
        ],
      });
    assert.equal(invalidTypeRes.status, 422);

    // 2. Future timestamp (>60 seconds)
    const futureTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const futureRes = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        events: [
          {
            sequenceNumber: 5,
            eventType: 'document_change',
            occurredAt: futureTime,
          },
        ],
      });
    assert.equal(futureRes.status, 422);
    assert.ok(futureRes.body.error.message.includes('future'));
  });

  it('forbids other students from recording events on unowned sessions (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({
        events: [
          {
            sequenceNumber: 5,
            eventType: 'document_change',
            occurredAt: new Date().toISOString(),
          },
        ],
      });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('reconstructs complete replay timeline with milestone markers and retention policy', async () => {
    const res = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}/replay`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const data = res.body.data;

    assert.equal(data.sessionId, sessionId);
    assert.equal(data.hasGaps, false);
    assert.equal(data.eventCount, 5);
    assert.equal(data.retentionPolicy.periodDays, 90);

    // Milestone summary
    assert.equal(data.summary.pasteCount, 1);
    assert.equal(data.summary.focusLossCount, 2); // 1 editor_blur + 1 visibility_change(hidden: true)
    assert.equal(data.summary.runCount, 0);

    // Events are in order
    assert.equal(data.events[0].sequenceNumber, 0);
    assert.equal(data.events[1].sequenceNumber, 1);
    assert.equal(data.events[2].sequenceNumber, 2);
    assert.equal(data.events[3].sequenceNumber, 3);
    assert.equal(data.events[4].sequenceNumber, 4);
  });

  it('detects sequence gaps in replay timeline when network dropped intermediate events', async () => {
    // Record sequence 8 (skipping 5, 6, 7)
    const gapRes = await request(app)
      .post(`/api/v1/coding-sessions/${sessionId}/events`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        events: [
          {
            sequenceNumber: 8,
            eventType: 'run',
            occurredAt: new Date().toISOString(),
            payload: { trigger: 'sample_test' },
          },
        ],
        isFinal: true,
      });
    assert.equal(gapRes.status, 201);
    assert.equal(gapRes.body.data.isComplete, true);

    // Replay timeline should detect the gap
    const replayRes = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}/replay`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(replayRes.status, 200);
    const data = replayRes.body.data;

    assert.equal(data.hasGaps, true);
    assert.deepEqual(data.missingSequences, [5, 6, 7]);
    assert.equal(data.summary.runCount, 1);
    assert.equal(data.isComplete, true);
  });

  it('allows trainer to review replay timeline and forbids unauthorized student', async () => {
    // Trainer access
    const trainerRes = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}/replay`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(trainerRes.status, 200);
    assert.equal(trainerRes.body.data.sessionId, sessionId);

    // Intruder student forbidden
    const intruderRes = await request(app)
      .get(`/api/v1/coding-sessions/${sessionId}/replay`)
      .set('Authorization', `Bearer ${intruderToken}`);
    assert.equal(intruderRes.status, 403);
    assert.equal(intruderRes.body.error.code, 'FORBIDDEN');
  });

  it('returns 404 for non-existent session replay', async () => {
    const res = await request(app)
      .get('/api/v1/coding-sessions/non-existent-uuid/replay')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(res.status, 404);
  });
});
