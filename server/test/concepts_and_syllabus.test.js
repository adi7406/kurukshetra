import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Concepts, Prerequisites & Syllabus (TASK-011, TASK-012, TASK-013)', () => {
  let studentToken = '';
  let trainerToken = '';
  let courseId = '';
  let conceptAId = '';
  let conceptBId = '';
  let conceptCId = '';
  let importJobId = '';

  it('sets up trainer, student, and a course', async () => {
    // 1. Sign up trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'syllabus.trainer@example.com',
        password: 'password123',
        displayName: 'Syllabus Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Sign up student
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'syllabus.student@example.com',
        password: 'password123',
        displayName: 'Syllabus Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;

    // 3. Create course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Computer Science Fundamentals',
        description: 'Algorithms and Data Structures',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;
  });

  it('rejects concept creation by student (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Illegal Concept',
        description: 'Should be rejected',
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('allows trainer to create concepts (TASK-013)', async () => {
    // Create Concept A: Variables
    const resA = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Variables & Data Types',
        description: 'Primitive and composite data types',
        orderIndex: 1,
      });
    assert.equal(resA.status, 201);
    assert.ok(resA.body.data.id);
    conceptAId = resA.body.data.id;

    // Create Concept B: Control Flow & Functions
    const resB = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Control Flow & Functions',
        description: 'Conditionals, loops, and procedures',
        orderIndex: 2,
      });
    assert.equal(resB.status, 201);
    conceptBId = resB.body.data.id;

    // Create Concept C: Recursion
    const resC = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Recursion & Induction',
        description: 'Recursive step and base cases',
        orderIndex: 3,
      });
    assert.equal(resC.status, 201);
    conceptCId = resC.body.data.id;
  });

  it('allows trainer to update a concept', async () => {
    const res = await request(app)
      .patch(`/api/v1/concepts/${conceptAId}`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        description: 'Updated description for variables and data types.',
        status: 'published',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'published');
  });

  it('rejects self-referencing prerequisite (422/ValidationError)', async () => {
    const res = await request(app)
      .put(`/api/v1/concepts/${conceptAId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prerequisiteIds: [conceptAId],
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('Self-referencing prerequisite is not allowed'));
  });

  it('rejects non-existent prerequisite ID (422/ValidationError)', async () => {
    const res = await request(app)
      .put(`/api/v1/concepts/${conceptAId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prerequisiteIds: ['non_existent_concept_id_xyz'],
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('does not exist'));
  });

  it('allows setting valid prerequisite dependencies (B depends on A)', async () => {
    const res = await request(app)
      .put(`/api/v1/concepts/${conceptBId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prerequisiteIds: [conceptAId],
      });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.prerequisiteIds, [conceptAId]);
  });

  it('allows setting valid downstream prerequisite (C depends on B)', async () => {
    const res = await request(app)
      .put(`/api/v1/concepts/${conceptCId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prerequisiteIds: [conceptBId],
      });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.prerequisiteIds, [conceptBId]);
  });

  it('rejects circular dependency when A attempts to depend on C (Cycle detection)', async () => {
    // Currently: A -> B -> C (C depends on B which depends on A)
    // If A depends on C, this creates cycle A -> C -> B -> A
    const res = await request(app)
      .put(`/api/v1/concepts/${conceptAId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prerequisiteIds: [conceptCId],
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('Cycle detected'));
  });

  it('retrieves concept graph with nodes and directed edges (TASK-013)', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/concept-graph`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    const { nodes, edges } = res.body.data;
    assert.ok(Array.isArray(nodes));
    assert.ok(Array.isArray(edges));
    assert.ok(nodes.length >= 3);

    // Verify directed edges: A -> B (from A to B) and B -> C (from B to C)
    const edgeAtoB = edges.find((e) => e.from === conceptAId && e.to === conceptBId);
    const edgeBtoC = edges.find((e) => e.from === conceptBId && e.to === conceptCId);
    assert.ok(edgeAtoB, 'Should have edge from A to B');
    assert.ok(edgeBtoC, 'Should have edge from B to C');
  });

  it('lists enriched concepts for course with prerequisite IDs', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    const concepts = res.body.data;
    assert.ok(Array.isArray(concepts));
    const conceptB = concepts.find((c) => c.id === conceptBId);
    assert.ok(conceptB);
    assert.deepEqual(conceptB.prerequisiteIds, [conceptAId]);
  });

  it('rejects syllabus document upload by student (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/syllabus/imports`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        fileName: 'syllabus.pdf',
        fileType: 'pdf',
        fileSize: 1024,
      });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('rejects unsupported file type for syllabus upload (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/syllabus/imports`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        fileName: 'malicious.exe',
        fileType: 'exe',
        fileSize: 1024,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('Unsupported file type'));
  });

  it('rejects file exceeding maximum size limit of 10MB (422)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/syllabus/imports`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        fileName: 'huge-file.pdf',
        fileType: 'pdf',
        fileSize: 15 * 1024 * 1024, // 15MB
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('File size exceeds maximum'));
  });

  it('allows trainer to upload valid syllabus document and returns 202 Accepted (TASK-011)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${courseId}/syllabus/imports`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        fileName: 'cs101_syllabus.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        content: 'CS101 Syllabus: Module 1 Foundations. Module 2 Algorithms.',
      });

    assert.equal(res.status, 202);
    assert.ok(res.body.data.jobId);
    assert.equal(res.body.data.status, 'uploaded');
    assert.ok(res.body.data.statusUrl.includes(res.body.data.jobId));
    importJobId = res.body.data.jobId;
  });

  it('tracks import job status via GET /syllabus-imports/:jobId (TASK-012)', async () => {
    const res = await request(app)
      .get(`/api/v1/syllabus-imports/${importJobId}`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.jobId, importJobId);
    assert.equal(res.body.data.fileName, 'cs101_syllabus.pdf');
    assert.equal(res.body.data.status, 'uploaded');
  });

  it('allows defining syllabus structure and retrieving hierarchy', async () => {
    // PUT syllabus
    const putRes = await request(app)
      .put(`/api/v1/courses/${courseId}/syllabus`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        modules: [
          {
            title: 'Unit 1: Programming Basics',
            description: 'Core concepts of software execution',
            orderIndex: 0,
            concepts: [
              { name: 'Memory & CPU', orderIndex: 0 },
              { name: 'Binary Representation', orderIndex: 1 },
            ],
          },
        ],
      });
    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.data.modules.length, 1);
    assert.equal(putRes.body.data.modules[0].concepts.length, 2);

    // GET syllabus
    const getRes = await request(app)
      .get(`/api/v1/courses/${courseId}/syllabus`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.courseTitle, 'Computer Science Fundamentals');
    assert.ok(getRes.body.data.modules.length >= 1);
  });
});
