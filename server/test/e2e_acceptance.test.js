import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Comprehensive End-to-End System Acceptance (TASK-040)', () => {
  let trainerToken;
  let studentToken;
  let studentId;
  let otherStudentToken;
  let courseId;
  let prerequisiteConceptId;
  let advancedConceptId;
  let resourceId;
  let mcqQuestionVersionId;
  let codingQuestionVersionId;
  let assessmentId;
  let attemptId;
  let codingSessionId;
  let submissionId;
  let vivaSessionId;
  let exportId;
  let downloadUrl;

  it('Stage 1: Trainer & Student Onboarding, Role Boundaries, and Course Setup', async () => {
    // 1. Trainer signup
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `e2e_trainer_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Professor Turing',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Student 1 signup
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `e2e_student_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Ada Lovelace',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;
    studentId = studentRes.body.data.user.id;

    // 3. Other Student signup
    const otherStudentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `e2e_other_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Charles Babbage',
        role: 'student',
      });
    assert.equal(otherStudentRes.status, 201);
    otherStudentToken = otherStudentRes.body.data.session.access_token;

    // 4. Create and publish Course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Full-Stack Distributed Systems Engineering',
        code: `E2E-CS-${Date.now()}`,
        description: 'Comprehensive end-to-end curriculum from fundamentals to consensus',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 5. Enroll Student in Course
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);
  });

  it('Stage 2: Syllabus, Concepts with DAG Prerequisites, and Learning Resources', async () => {
    // 1. Create Prerequisite Concept: Networking Fundamentals
    const c1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Networking Fundamentals & Sockets',
        description: 'TCP/IP, UDP, ports, and socket abstraction',
      });
    assert.equal(c1Res.status, 201);
    prerequisiteConceptId = c1Res.body.data.id;

    // 2. Create Advanced Concept: Paxos & Raft Consensus
    const c2Res = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Consensus Protocols',
        description: 'Leader election, log replication, and Byzantine fault tolerance',
      });
    assert.equal(c2Res.status, 201);
    advancedConceptId = c2Res.body.data.id;

    // 3. Connect Prerequisite (C1 -> C2) using PUT /concepts/:id/prerequisites
    const prereqRes = await request(app)
      .put(`/api/v1/concepts/${advancedConceptId}/prerequisites`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prerequisiteIds: [prerequisiteConceptId],
      });
    assert.equal(prereqRes.status, 200);

    // 4. Add Learning Resource
    const resRes = await request(app)
      .post(`/api/v1/concepts/${prerequisiteConceptId}/resources`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'TCP Handshake and Socket Programming Guide',
        resourceType: 'article',
        content: 'Comprehensive technical walkthrough of TCP 3-way handshake and reliable data streams.',
        difficulty: 'beginner',
      });
    assert.equal(resRes.status, 201);
    resourceId = resRes.body.data.id;

    // Publish Resource
    await request(app)
      .post(`/api/v1/resources/${resourceId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Student accesses learning resources
    const studentResList = await request(app)
      .get(`/api/v1/concepts/${prerequisiteConceptId}/resources`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(studentResList.status, 200);
    assert.ok(studentResList.body.data.length >= 1);
  });

  it('Stage 3: Question Authoring, Assessments, and Safe Candidate Attempt Lifecycle', async () => {
    // 1. Author MCQ Question
    const mcqRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Which flag initiates the 3-way handshake in TCP?',
        questionType: 'mcq_single',
        difficulty: 'beginner',
        marks: 10,
        conceptIds: [prerequisiteConceptId],
        options: [
          { key: 'A', text: 'SYN', isCorrect: true },
          { key: 'B', text: 'FIN', isCorrect: false },
          { key: 'C', text: 'ACK', isCorrect: false },
          { key: 'D', text: 'RST', isCorrect: false },
        ],
        answer: {
          type: 'mcq_single',
          payload: { correctOptionKey: 'A' },
        },
      });
    assert.equal(mcqRes.status, 201);
    mcqQuestionVersionId = mcqRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${mcqRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 2. Author Coding Question
    const codeQRes = await request(app)
      .post(`/api/v1/courses/${courseId}/questions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        prompt: 'Implement a function socketCount(activeConnections) returning number of active sockets',
        questionType: 'coding',
        difficulty: 'intermediate',
        marks: 20,
        conceptIds: [prerequisiteConceptId],
        testCases: [
          { input: '5', expectedOutput: '5', isHidden: false },
          { input: '0', expectedOutput: '0', isHidden: false },
          { input: '99999', expectedOutput: '99999', isHidden: true },
        ],
      });
    assert.equal(codeQRes.status, 201);
    codingQuestionVersionId = codeQRes.body.data.versionId;

    await request(app)
      .post(`/api/v1/questions/${codeQRes.body.data.id}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 3. Create Assessment combining both questions
    const assessRes = await request(app)
      .post(`/api/v1/courses/${courseId}/assessments`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Sockets & Protocols Midterm Examination',
        assessmentType: 'fixed_test',
        passingPercentage: 60,
        maxAttempts: 2,
        questions: [
          { questionVersionId: mcqQuestionVersionId, position: 0 },
          { questionVersionId: codingQuestionVersionId, position: 1 },
        ],
      });
    assert.equal(assessRes.status, 201);
    assessmentId = assessRes.body.data.id;

    await request(app)
      .post(`/api/v1/assessments/${assessmentId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // 4. Student starts attempt
    const attRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(attRes.status, 201);
    attemptId = attRes.body.data.id;

    // ZERO LEAKAGE CHECK:
    const activeAttView = await request(app)
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(activeAttView.status, 200);
    const viewJson = JSON.stringify(activeAttView.body.data);
    assert.ok(!viewJson.includes('correctOptionKey'), 'Must NOT leak correctOptionKey');
    assert.ok(!viewJson.includes('"isCorrect":true'), 'Must NOT leak isCorrect:true in options');
    assert.ok(!viewJson.includes('99999'), 'Must NOT leak hidden test case input');

    // 5. Student submits answer for MCQ
    const saveAnsRes = await request(app)
      .put(`/api/v1/attempts/${attemptId}/answers/${mcqQuestionVersionId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: { selectedOptionKeys: ['A'] } });
    assert.equal(saveAnsRes.status, 200);

    // 6. Submit assessment attempt
    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.status, 'submitted');

    // 7. Retrieve graded result
    const resultRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resultRes.status, 200);
    assert.equal(resultRes.body.data.status, 'completed');
    assert.ok(resultRes.body.data.score >= 10);
  });

  it('Stage 4: Automated Grading, BKT Mastery Processing, and Adaptive Recommendations', async () => {
    // 1. Process mastery update for completed attempt
    const masteryRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/process-mastery`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(masteryRes.status, 200);

    // 2. Query student mastery summary
    const myMasteryRes = await request(app)
      .get('/api/v1/me/mastery')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(myMasteryRes.status, 200);
    assert.ok(myMasteryRes.body.data.length >= 1);

    // 3. Query adaptive recommendations
    const recsRes = await request(app)
      .get('/api/v1/me/recommendations')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(recsRes.status, 200);
    assert.ok(Array.isArray(recsRes.body.data));
  });

  it('Stage 5: Isolated Code Execution, Keystroke Replay Timeline, and Submissions', async () => {
    // 1. Start coding session under assessment
    const sessionRes = await request(app)
      .post(`/api/v1/assessments/${assessmentId}/coding-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        questionVersionId: codingQuestionVersionId,
        language: 'python',
        attemptId,
      });
    assert.equal(sessionRes.status, 201);
    codingSessionId = sessionRes.body.data.session.id;

    // 2. Stream editor keystroke and paste events
    const eventRes = await request(app)
      .post(`/api/v1/coding-sessions/${codingSessionId}/events`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        events: [
          {
            sequenceNumber: 0,
            eventType: 'paste',
            occurredAt: new Date().toISOString(),
            payload: { pastedLength: 60 },
          },
        ],
      });
    assert.equal(eventRes.status, 201);

    // 3. Execute dry run against public test cases
    const runRes = await request(app)
      .post(`/api/v1/coding-sessions/${codingSessionId}/run`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        language: 'python',
        sourceCode: 'import sys\nval = sys.stdin.read().strip()\nprint(val)',
      });
    assert.equal(runRes.status, 200);

    // 4. Submit official coding solution for grading
    const subRes = await request(app)
      .post(`/api/v1/coding-sessions/${codingSessionId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        sourceCode: 'import sys\nval = sys.stdin.read().strip()\nprint(val)',
        language: 'python',
        questionVersionId: codingQuestionVersionId,
      });
    assert.equal(subRes.status, 202);
    submissionId = subRes.body.data.submissionId;

    // 5. Query submission results
    const subDetailRes = await request(app)
      .get(`/api/v1/submissions/${submissionId}/results`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(subDetailRes.status, 200);
    assert.equal(subDetailRes.body.data.status, 'accepted');
    assert.equal(subDetailRes.body.data.passedTests, 3); // All 3 passed including hidden test
  });

  it('Stage 6: AI Viva Session Lifecycle, Progressive Answers, and Released Report', async () => {
    // 1. Start AI Viva session
    const vivaRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/viva-sessions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ durationSeconds: 600, totalQuestions: 3 });
    assert.equal(vivaRes.status, 201);
    vivaSessionId = vivaRes.body.data.session.id;
    assert.equal(vivaRes.body.data.session.status, 'started');

    // 2. Answer question 1
    const q1Res = await request(app)
      .post(`/api/v1/viva-sessions/${vivaSessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'The TCP handshake begins with a SYN packet from client to server to negotiate initial sequence numbers.',
      });
    assert.equal(q1Res.status, 200);

    // 3. Answer remaining questions to complete session
    const q2Res = await request(app)
      .post(`/api/v1/viva-sessions/${vivaSessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'Server responds with SYN-ACK acknowledging client sequence and transmitting its own sequence number.',
      });
    assert.equal(q2Res.status, 200);

    const q3Res = await request(app)
      .post(`/api/v1/viva-sessions/${vivaSessionId}/answers`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answerText: 'Finally client sends ACK, completing connection establishment and enabling full duplex data transmission.',
      });
    assert.equal(q3Res.status, 200);
    assert.equal(q3Res.body.data.status, 'completed');
    assert.equal(q3Res.body.data.isCompleted, true);

    // 4. Retrieve released Viva evaluation report
    const reportRes = await request(app)
      .get(`/api/v1/viva-sessions/${vivaSessionId}/report`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(reportRes.status, 200);
    assert.ok(reportRes.body.data.totalScore > 0);
    assert.ok(reportRes.body.data.questions.length === 3);
  });

  it('Stage 7: Learner & Trainer Dashboards, Reporting, and Signed Private Exports', async () => {
    // 1. Learner Dashboard
    const learnerDashRes = await request(app)
      .get('/api/v1/me/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(learnerDashRes.status, 200);
    assert.equal(learnerDashRes.body.data.state.status, 'active');
    assert.ok(learnerDashRes.body.data.enrolledCourses.length >= 1);
    assert.ok(learnerDashRes.body.data.assessmentHistory.length >= 1);

    // 2. Trainer Course Dashboard
    const trainerDashRes = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/dashboard`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(trainerDashRes.status, 200);
    assert.ok(trainerDashRes.body.data.enrollmentStats.totalEnrolled >= 1);

    // 3. Trainer Student Progress Roster
    const rosterRes = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/students`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(rosterRes.status, 200);
    assert.ok(rosterRes.body.data.students.length >= 1);
    assert.equal(rosterRes.body.data.students[0].studentId, studentId);

    // 4. Trainer Assessment Analytics
    const analyticsRes = await request(app)
      .get(`/api/v1/trainer/courses/${courseId}/assessments/${assessmentId}/analytics`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(analyticsRes.status, 200);
    assert.ok(analyticsRes.body.data.stats.completedAttempts >= 1);

    // 5. Trainer Course Gradebook Export
    const exportRes = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        reportType: 'course_gradebook',
        format: 'csv',
        parameters: { courseId },
      });
    assert.equal(exportRes.status, 201);
    exportId = exportRes.body.data.exportId;
    downloadUrl = exportRes.body.data.downloadUrl;
    assert.ok(exportId);
    assert.ok(downloadUrl);

    // 6. Download private export artifact
    const dlRes = await request(app).get(downloadUrl);
    assert.equal(dlRes.status, 200);
    assert.equal(dlRes.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(dlRes.text.includes('"Ada Lovelace"'));
  });

  it('Stage 8: Security Boundary Guarantees and Unauthorized Access Rejection', async () => {
    // 1. Cross-Student: Other student cannot access Student 1's attempt
    const crossAttRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(crossAttRes.status, 403);

    // 2. Cross-Student: Other student cannot access Student 1's viva session
    const crossVivaRes = await request(app)
      .get(`/api/v1/viva-sessions/${vivaSessionId}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);
    assert.equal(crossVivaRes.status, 403);

    // 3. Student cannot access trainer gradebook export
    const forbiddenExportRes = await request(app)
      .post('/api/v1/reports/export')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        reportType: 'course_gradebook',
        parameters: { courseId },
      });
    assert.equal(forbiddenExportRes.status, 403);

    // 4. Unauthenticated access rejected with 401
    const unauthRes = await request(app).get('/api/v1/me/dashboard');
    assert.equal(unauthRes.status, 401);
  });
});
