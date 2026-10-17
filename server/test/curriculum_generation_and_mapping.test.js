import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Syllabus Extraction, Curriculum Generation & Teacher Mapping', () => {
  let oopTeacherToken = '';
  let oopTeacherId = '';
  let otherTeacherToken = '';
  let studentToken = '';
  let oopCourseId = '';
  let generatedConcepts = [];

  const SAMPLE_OOP_SYLLABUS = `Course Code: CS202 - Object-Oriented Programming (OOP)
Course Title: Object-Oriented Architecture and Design Patterns
Instructor: Department of Computer Science

Module 1: Encapsulation & Polymorphic Architectures
- Topic 1: Classes, Objects & Encapsulation Invariants (Heap Allocation, Data Hiding, Private Fields, Class Invariant Protection, Mutator Guards)
- Topic 2: Inheritance, Class Hierarchies & Abstract Bases (Subtyping, Code Reuse, Protected Scope, Abstract Classes, Template Method Pattern)
- Topic 3: Polymorphism, Virtual Method Tables & Dynamic Dispatch (Virtual Functions, VTables, Dynamic Late Binding, Runtime Type Resolution)`;

  it('1. registers an OOP teacher with teaching subject and verifies assigned course', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `oop.teacher.${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Professor Ada Lovelace',
        role: 'trainer',
        courseTaught: 'Object-Oriented Programming (OOP)',
      });

    assert.equal(signupRes.status, 201);
    oopTeacherToken = signupRes.body.data.session.access_token;
    oopTeacherId = signupRes.body.data.user.id;

    // Verify teacher course listing returns the assigned course
    const coursesRes = await request(app)
      .get('/api/v1/courses?assignedOnly=true')
      .set('Authorization', `Bearer ${oopTeacherToken}`);

    assert.equal(coursesRes.status, 200);
    const courses = coursesRes.body.data || coursesRes.body.courses || [];
    assert.ok(courses.length > 0, 'Teacher should have assigned courses');

    const oopCourse = courses.find((c) =>
      c.title.toLowerCase().includes('object') || c.title.toLowerCase().includes('oop')
    );
    assert.ok(oopCourse, 'Assigned OOP course should be present');
    assert.ok(oopCourse.id, 'Course must have a stable database ID');
    oopCourseId = oopCourse.id;

    // Register second teacher for cross-isolation tests
    const otherRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `other.teacher.${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Other Professor',
        role: 'trainer',
        courseTaught: 'Operating Systems (OS)',
      });
    assert.equal(otherRes.status, 201);
    otherTeacherToken = otherRes.body.data.session.access_token;

    // Register student for visibility checks
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `student.${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Student Jane',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;
  });

  it('2. generates complete topic-wise learning content, 10 quizzes/topic, and 2 coding assessments/topic', async () => {
    const genRes = await request(app)
      .post(`/api/v1/courses/${oopCourseId}/curriculum/generate`)
      .set('Authorization', `Bearer ${oopTeacherToken}`)
      .send({
        syllabusText: SAMPLE_OOP_SYLLABUS,
        courseTitle: 'Object-Oriented Programming (OOP)',
        async: false,
      });

    assert.equal(genRes.status, 200);
    const data = genRes.body.data || genRes.body;
    assert.ok(data, 'Should return synthesized curriculum data');
    assert.equal(data.status, 'draft', 'Generated content must start in draft status');

    // Verify 3 topics extracted
    assert.ok(Array.isArray(data.concepts) && data.concepts.length >= 3, 'Must have at least 3 topics');
    generatedConcepts = data.concepts;
    const numTopics = data.concepts.length;

    // Verify each topic has complete structured learning content
    for (const concept of data.concepts) {
      assert.ok(concept.name, 'Topic must have a name');
      assert.ok(concept.coreExplanation || concept.theory, 'Topic must have core technical explanation');
      assert.ok(concept.asciiDiagram, 'Topic must contain architectural diagram data');
      assert.ok(concept.example || concept.workedExamples, 'Topic must contain worked code example');
      assert.ok(Array.isArray(concept.learningObjectives) && concept.learningObjectives.length > 0, 'Topic must have learning objectives');
      assert.ok(Array.isArray(concept.keyTakeaways) && concept.keyTakeaways.length > 0, 'Topic must have key takeaways');
    }

    // Verify exactly 10 quizzes per topic
    const expectedQuizzes = numTopics * 10;
    assert.equal(data.quizzes.length, expectedQuizzes, `Must generate exactly 10 quizzes per topic (${expectedQuizzes} total)`);
    for (const q of data.quizzes) {
      assert.ok(q.prompt, 'Quiz question must have a prompt');
      assert.ok(Array.isArray(q.options) && q.options.length === 4, 'Quiz question must have 4 options');
      assert.ok(q.explanation, 'Quiz must have explanation');
      assert.ok(q.conceptName, 'Quiz must be associated with a topic concept');
    }

    // Verify exactly 2 coding assessments per topic
    const expectedCoding = numTopics * 2;
    assert.equal(data.codingAssessments.length, expectedCoding, `Must generate exactly 2 coding assessments per topic (${expectedCoding} total)`);
    for (const ca of data.codingAssessments) {
      assert.ok(ca.title, 'Coding assessment must have a title');
      assert.ok(ca.description, 'Coding assessment must have description');
      assert.ok(ca.constraints, 'Coding assessment must specify constraints');
      assert.ok(ca.starterCode, 'Coding assessment must include starter code');
      assert.ok(Array.isArray(ca.sampleTests) && ca.sampleTests.length > 0, 'Coding assessment must have public sample tests');
    }

    // Verify dynamic counts
    assert.equal(data.counts.concepts, numTopics);
    assert.equal(data.counts.quizzes, expectedQuizzes);
    assert.equal(data.counts.codingAssessments, expectedCoding);
  });

  it('3. persists curriculum in database and verifies retrieval after simulated refresh', async () => {
    const fetchRes = await request(app)
      .get(`/api/v1/courses/${oopCourseId}/curriculum`)
      .set('Authorization', `Bearer ${oopTeacherToken}`);

    assert.equal(fetchRes.status, 200);
    const data = fetchRes.body.data || fetchRes.body;
    assert.equal(data.courseId, oopCourseId);
    assert.equal(data.status, 'draft');
    assert.equal(data.concepts.length, generatedConcepts.length);
    assert.equal(data.quizzes.length, generatedConcepts.length * 10);
    assert.equal(data.codingAssessments.length, generatedConcepts.length * 2);
  });

  it('4. allows teacher to edit and persist topic definition', async () => {
    const targetConcept = generatedConcepts[0];
    const updateRes = await request(app)
      .patch(`/api/v1/courses/${oopCourseId}/curriculum`)
      .set('Authorization', `Bearer ${oopTeacherToken}`)
      .send({
        type: 'concept',
        itemId: targetConcept.id,
        updates: {
          name: 'Classes, Objects & Encapsulation Invariants (Refined)',
          theory: 'Updated detailed lesson text with strict mutator guards and invariant enforcement.',
        },
      });

    assert.equal(updateRes.status, 200);

    // Verify update survived
    const fetchRes = await request(app)
      .get(`/api/v1/courses/${oopCourseId}/curriculum`)
      .set('Authorization', `Bearer ${oopTeacherToken}`);

    assert.equal(fetchRes.status, 200);
    const updatedConcept = fetchRes.body.data.concepts.find((c) => c.id === targetConcept.id);
    assert.ok(updatedConcept, 'Updated concept should exist');
    assert.equal(updatedConcept.name, 'Classes, Objects & Encapsulation Invariants (Refined)');
  });

  it('5. enforces security: unauthorized teacher cannot publish another teacher course', async () => {
    const publishRes = await request(app)
      .post(`/api/v1/courses/${oopCourseId}/curriculum/publish`)
      .set('Authorization', `Bearer ${otherTeacherToken}`)
      .send({ publishAll: true });

    assert.equal(publishRes.status, 403, 'Other teacher must be forbidden from publishing this course');
  });

  it('6. prevents student from viewing curriculum while in draft state (403 Forbidden)', async () => {
    const studentRes = await request(app)
      .get(`/api/v1/courses/${oopCourseId}/curriculum`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(studentRes.status, 403, 'Draft curriculum must not be student visible');
  });

  it('7. allows authorized teacher to approve and publish curriculum to student graph', async () => {
    const publishRes = await request(app)
      .post(`/api/v1/courses/${oopCourseId}/curriculum/publish`)
      .set('Authorization', `Bearer ${oopTeacherToken}`)
      .send({ publishAll: true });

    assert.equal(publishRes.status, 200);
    assert.equal(publishRes.body.data.status, 'published');

    // Confirm that subsequent read shows published status
    const fetchRes = await request(app)
      .get(`/api/v1/courses/${oopCourseId}/curriculum`)
      .set('Authorization', `Bearer ${oopTeacherToken}`);

    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.data.status, 'published');
  });

  it('8. allows student to view published curriculum with answer keys and hidden tests strictly redacted', async () => {
    const studentRes = await request(app)
      .get(`/api/v1/courses/${oopCourseId}/curriculum`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(studentRes.status, 200, 'Published curriculum must be accessible to students');
    const studentData = studentRes.body.data || studentRes.body;

    // Correct answers must not be exposed to students before submission
    for (const q of studentData.quizzes) {
      assert.equal(q.correctIndex, undefined, 'Student must not see correctIndex');
      assert.equal(q.correctOptionKey, undefined, 'Student must not see correctOptionKey');
      for (const opt of q.options) {
        assert.equal(opt.is_correct, undefined, 'Student must not see option is_correct flag');
      }
    }

    // Hidden tests must not be exposed to students
    for (const ca of studentData.codingAssessments) {
      assert.equal(ca.hiddenTests, undefined, 'Student must not see hidden tests');
      assert.equal(ca.referenceSolution, undefined, 'Student must not see reference solution');
    }
  });
});
