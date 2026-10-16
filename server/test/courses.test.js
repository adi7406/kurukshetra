import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Courses and Enrollment (TASK-009 & TASK-010)', () => {
  let studentToken = '';
  let trainerToken = '';
  let otherTrainerToken = '';
  let courseId = '';

  // Setup test users
  it('registers student and trainer users', async () => {
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'course.student@example.com',
        password: 'password123',
        displayName: 'Course Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'course.trainer@example.com',
        password: 'password123',
        displayName: 'Course Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    const otherTrainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'other.trainer@example.com',
        password: 'password123',
        displayName: 'Other Trainer',
        role: 'trainer',
      });
    assert.equal(otherTrainerRes.status, 201);
    otherTrainerToken = otherTrainerRes.body.data.session.access_token;
  });

  it('rejects course creation by student (403)', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Hacked Course',
        description: 'Should fail',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows course creation by trainer in draft status (201)', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Advanced Data Structures & Algorithms',
        description: 'Comprehensive DSA course covering trees, graphs, and dynamic programming.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'Advanced Data Structures & Algorithms');
    assert.equal(res.body.data.status, 'draft');
    assert.ok(res.body.data.id);
    courseId = res.body.data.id;
  });

  it('draft course is not visible to student (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('draft course is visible to trainer creator (200)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, courseId);
    assert.equal(res.body.data.status, 'draft');
  });

  it('student cannot enroll in draft course (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('other trainer cannot publish course they do not own (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${otherTrainerToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('creator can publish course (200)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'published');
  });

  it('published course is now visible to student (200)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'published');
  });

  it('student can enroll in published course (201)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.course_id, courseId);
    assert.equal(res.body.data.status, 'active');
  });

  it('prevents duplicate enrollment with 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.equal(res.body.error.message, 'Student is already enrolled in this course.');
  });

  it('student can list own enrollments on /api/v1/me/enrollments (200)', async () => {
    const res = await request(app)
      .get('/api/v1/me/enrollments')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].course_id, courseId);
  });

  it('trainer can view course enrollments (200)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);
  });

  it('student cannot view full course enrollments (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });
});
