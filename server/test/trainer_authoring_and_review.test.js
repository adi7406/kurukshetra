import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Trainer Authoring and Review (TASK-017)', () => {
  let studentToken = '';
  let trainerToken = '';
  let otherTrainerToken = '';
  let courseId = '';
  let draftQuestionId = '';

  it('sets up users and a course', async () => {
    // 1. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'authoring.trainer@example.com',
        password: 'password123',
        displayName: 'Authoring Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'authoring.student@example.com',
        password: 'password123',
        displayName: 'Authoring Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Other Trainer
    const otherTrainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'other.authoring.trainer@example.com',
        password: 'password123',
        displayName: 'Other Authoring Trainer',
        role: 'trainer',
      });
    assert.equal(otherTrainerRes.status, 201);
    otherTrainerToken = otherTrainerRes.body.data.session.access_token;

    // 4. Create course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Distributed Systems Architecture',
        description: 'Consensus protocols and fault tolerance',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;
  });

  it('rejects objective MCQ with fewer than 2 options (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'Is Paxos a consensus algorithm?',
        options: [{ key: 'A', text: 'Yes', isCorrect: true }],
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('must have at least 2 options'));
  });

  it('rejects objective MCQ with no correct option or answer key (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'Which protocol guarantees linearizability?',
        options: [
          { key: 'A', text: 'Raft', isCorrect: false },
          { key: 'B', text: 'Gossip', isCorrect: false },
        ],
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('must specify a valid answer key'));
  });

  it('allows trainer to author a valid question in draft status', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        title: 'Consensus Leader Election',
        prompt: 'In Raft consensus, how is split-vote resolved during leader election?',
        difficulty: 'intermediate',
        marks: 3,
        reviewStatus: 'draft',
        options: [
          { key: 'A', text: 'Randomized election timeouts', isCorrect: true },
          { key: 'B', text: 'Round-robin assignment', isCorrect: false },
          { key: 'C', text: 'Highest node IP address', isCorrect: false },
        ],
        explanation: 'Randomized election timeouts prevent nodes from restarting elections simultaneously.',
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    draftQuestionId = res.body.data.id;
  });

  it('rejects duplicate question with identical prompt in same course (409 Conflict)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        questionType: 'mcq_single',
        prompt: 'In Raft consensus, how is split-vote resolved during leader election?', // Exact duplicate prompt
        options: [
          { key: 'A', text: 'Randomized election timeouts', isCorrect: true },
          { key: 'B', text: 'Static priority', isCorrect: false },
        ],
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('identical prompt already exists'));
  });

  it('allows trainer to preview question with full answer keys (GET /questions/:id/preview)', async () => {
    const res = await request(app)
      .get(`/api/v1/questions/${draftQuestionId}/preview`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.previewMode, true);
    assert.equal(res.body.data.reviewStatus, 'draft');
    assert.ok(res.body.data.explanation.includes('Randomized election timeouts'));
    const correctOption = res.body.data.options.find((o) => o.is_correct === true);
    assert.ok(correctOption);
    assert.equal(correctOption.option_key, 'A');
  });

  it('rejects student access to preview endpoint (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/questions/${draftQuestionId}/preview`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('rejects publication by unauthorized other trainer (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/questions/${draftQuestionId}/publish`)
      .set('Authorization', `Bearer ${otherTrainerToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows owner trainer to publish question (POST /questions/:id/publish)', async () => {
    const res = await request(app)
      .post(`/api/v1/questions/${draftQuestionId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.reviewStatus, 'approved');
  });
});
