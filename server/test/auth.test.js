import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import app from '../src/app.js';
import { authenticate, requireRole } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestIdMiddleware } from '../src/middleware/requestId.js';

describe('Supabase Auth and Profiles (TASK-007 & TASK-008)', () => {
  let studentToken = '';
  let trainerToken = '';

  it('rejects protected GET /api/v1/me without token (401)', async () => {
    const res = await request(app).get('/api/v1/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('rejects protected GET /api/v1/me with invalid token (401)', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer invalid_bogus_token');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('allows student registration and creates student profile (201)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'alice.student@example.com',
        password: 'password123',
        displayName: 'Alice Student',
        role: 'student',
        metadata: { className: 'Grade 10', rollNo: '101' },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.profile.role, 'student');
    assert.equal(res.body.data.profile.display_name, 'Alice Student');
    assert.ok(res.body.data.session.access_token);
    studentToken = res.body.data.session.access_token;
  });

  it('allows trainer registration with trainer role (201)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'bob.trainer@example.com',
        password: 'password123',
        displayName: 'Bob Trainer',
        role: 'trainer',
        metadata: { courseTaught: 'Physics' },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.profile.role, 'trainer');
    trainerToken = res.body.data.session.access_token;
  });

  it('prohibits self-assignment of admin role during registration (403)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'malicious@example.com',
        password: 'password123',
        displayName: 'Hacker',
        role: 'admin',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows signin with valid credentials (200)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'alice.student@example.com',
        password: 'password123',
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.session.access_token);
    assert.equal(res.body.data.profile.role, 'student');
  });

  it('rejects signin with incorrect password (401)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'alice.student@example.com',
        password: 'wrong_password',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('fetches current user and profile on GET /api/v1/me with Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.profile.role, 'student');
    assert.equal(res.body.data.profile.display_name, 'Alice Student');
  });

  it('allows updating display_name on PATCH /api/v1/me', async () => {
    const res = await request(app)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        displayName: 'Alice S. Updated',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.profile.display_name, 'Alice S. Updated');
  });

  it('prohibits self-updating role on PATCH /api/v1/me (403)', async () => {
    const res = await request(app)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        role: 'trainer',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('requireRole middleware allows trainer and forbids student (403)', async () => {
    const guardedApp = express();
    guardedApp.use(requestIdMiddleware);
    guardedApp.get('/trainer-only', authenticate, requireRole('trainer', 'admin'), (req, res) => {
      res.status(200).json({ data: 'welcome trainer' });
    });
    guardedApp.use(errorHandler);

    // Student attempt: forbidden
    const studentRes = await request(guardedApp)
      .get('/trainer-only')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(studentRes.status, 403);
    assert.equal(studentRes.body.error.code, 'FORBIDDEN');

    // Trainer attempt: allowed
    const trainerRes = await request(guardedApp)
      .get('/trainer-only')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(trainerRes.status, 200);
    assert.equal(trainerRes.body.data, 'welcome trainer');
  });
});
