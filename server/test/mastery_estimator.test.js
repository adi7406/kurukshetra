import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { masteryService } from '../src/services/mastery.service.js';

describe('Mastery Estimator & BKT Engine (TASK-023)', () => {
  let trainerToken = '';
  let otherTrainerToken = '';
  let studentToken = '';
  let student2Token = '';
  let studentId = '';
  let courseId = '';
  let conceptId = '';

  it('verifies baseline and BKT mathematical update rules and boundary constraints', () => {
    // 1. Baseline update
    const baselineCorrect = masteryService.calculateNewMastery({
      oldMastery: 0.1,
      isCorrect: true,
      alpha: 0.2,
    });
    assert.equal(baselineCorrect, 0.28);

    const baselineWrong = masteryService.calculateNewMastery({
      oldMastery: 0.5,
      isCorrect: false,
      alpha: 0.2,
    });
    assert.equal(baselineWrong, 0.4);

    // 2. BKT update
    const bktCorrect = masteryService.calculateBktMastery({
      priorL: 0.1,
      isCorrect: true,
      params: { pL0: 0.1, pT: 0.15, pG: 0.2, pS: 0.1 },
    });
    // Expected: num = 0.1 * 0.9 = 0.09; denom = 0.09 + 0.9 * 0.2 = 0.27; pLGiven = 1/3 ~ 0.33333
    // nextL = 1/3 + (2/3) * 0.15 = 0.333333 + 0.1 = 0.43333
    assert.equal(bktCorrect, 0.43333);

    const bktWrong = masteryService.calculateBktMastery({
      priorL: 0.5,
      isCorrect: false,
      params: { pL0: 0.1, pT: 0.15, pG: 0.2, pS: 0.1 },
    });
    // With oldMastery 0.5, wrong answer reduces posterior before transition
    assert.ok(bktWrong < 0.5);
    assert.ok(bktWrong > 0);

    // 3. Boundary tests: repeated 25 correct answers never exceeds 1.0
    let repeatedL = 0.1;
    for (let i = 0; i < 25; i++) {
      repeatedL = masteryService.calculateBktMastery({ priorL: repeatedL, isCorrect: true });
      assert.ok(repeatedL <= 1.0);
      assert.ok(repeatedL >= 0.0);
    }
    assert.ok(repeatedL >= 0.95);

    // Repeated 25 wrong answers stays bounded >= 0.0
    let repeatedWrong = 0.9;
    for (let i = 0; i < 25; i++) {
      repeatedWrong = masteryService.calculateBktMastery({ priorL: repeatedWrong, isCorrect: false });
      assert.ok(repeatedWrong <= 1.0);
      assert.ok(repeatedWrong >= 0.0);
    }

    // 4. Reproducibility test
    const seq1 = [true, false, true, true];
    let scoreA = 0.1;
    for (const ans of seq1) {
      scoreA = masteryService.calculateBktMastery({ priorL: scoreA, isCorrect: ans });
    }

    let scoreB = 0.1;
    for (const ans of seq1) {
      scoreB = masteryService.calculateBktMastery({ priorL: scoreB, isCorrect: ans });
    }
    assert.equal(scoreA, scoreB);
  });

  it('sets up course, concepts, trainer and student accounts for API testing', async () => {
    // 1. Trainer 1 (Course Owner)
    const t1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'estimator.trainer1@example.com',
        password: 'password123',
        displayName: 'Estimator Trainer 1',
        role: 'trainer',
      });
    assert.equal(t1Res.status, 201);
    trainerToken = t1Res.body.data.session.access_token;

    // 2. Trainer 2 (Unassigned)
    const t2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'estimator.trainer2@example.com',
        password: 'password123',
        displayName: 'Estimator Trainer 2',
        role: 'trainer',
      });
    assert.equal(t2Res.status, 201);
    otherTrainerToken = t2Res.body.data.session.access_token;

    // 3. Student 1
    const s1Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'estimator.student1@example.com',
        password: 'password123',
        displayName: 'Estimator Student 1',
        role: 'student',
      });
    assert.equal(s1Res.status, 201);
    studentToken = s1Res.body.data.session.access_token;
    studentId = s1Res.body.data.user.id;

    // 4. Student 2
    const s2Res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'estimator.student2@example.com',
        password: 'password123',
        displayName: 'Estimator Student 2',
        role: 'student',
      });
    assert.equal(s2Res.status, 201);
    student2Token = s2Res.body.data.session.access_token;

    // 5. Create & publish course
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        title: 'Mastery Estimation Principles',
        description: 'BKT and cognitive modeling',
      });
    assert.equal(courseRes.status, 201);
    courseId = courseRes.body.data.id;

    await request(app)
      .post(`/api/v1/courses/${courseId}/publish`)
      .set('Authorization', `Bearer ${trainerToken}`);

    // Enroll Student 1
    const enrollRes = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(enrollRes.status, 201);

    // 6. Create Concept
    const conceptRes = await request(app)
      .post(`/api/v1/courses/${courseId}/concepts`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Bayesian Updating',
        description: 'Prior and posterior likelihoods',
      });
    assert.equal(conceptRes.status, 201);
    conceptId = conceptRes.body.data.id;
  });

  it('tests the dry-run simulation endpoint (POST /mastery/simulate)', async () => {
    // 1. Simulate BKT with valid parameters
    const simRes = await request(app)
      .post('/api/v1/mastery/simulate')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        modelName: 'bkt',
        oldMastery: 0.2,
        isCorrect: true,
        modelParams: {
          pT: 0.15,
          pG: 0.2,
          pS: 0.1,
        },
      });

    assert.equal(simRes.status, 200);
    assert.equal(simRes.body.data.modelName, 'bkt');
    assert.ok(simRes.body.data.newProbability > 0.2);
    assert.ok(simRes.body.data.disclaimer);

    // 2. Reject out-of-range oldMastery (> 1) with 422
    const invalidRes = await request(app)
      .post('/api/v1/mastery/simulate')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        oldMastery: 1.5,
        isCorrect: true,
      });
    assert.equal(invalidRes.status, 422);
  });

  it('records BKT mastery updates and allows student to inspect summary and history', async () => {
    // 1. Record BKT update for student 1
    await masteryService.updateConceptMastery({
      studentId,
      conceptId,
      isCorrect: true,
      score: 10,
      maxScore: 10,
      modelName: 'bkt',
      modelVersion: 'bkt-v1',
    });

    // 2. GET /me/mastery
    const myMasteryRes = await request(app)
      .get('/api/v1/me/mastery')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(myMasteryRes.status, 200);
    assert.ok(Array.isArray(myMasteryRes.body.data));
    const target = myMasteryRes.body.data.find((m) => m.conceptId === conceptId);
    assert.ok(target);
    assert.equal(target.modelName, 'bkt');
    assert.equal(target.modelVersion, 'bkt-v1');
    assert.equal(target.evidenceCount, 1);
    assert.ok(target.disclaimer);

    // 3. GET /me/mastery/concepts/:conceptId
    const conceptRes = await request(app)
      .get(`/api/v1/me/mastery/concepts/${conceptId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(conceptRes.status, 200);
    const detail = conceptRes.body.data;
    assert.equal(detail.conceptId, conceptId);
    assert.equal(detail.conceptName, 'Bayesian Updating');
    assert.equal(detail.modelName, 'bkt');
    assert.equal(detail.history.length, 1);
    assert.equal(detail.history[0].model_name, 'bkt');
  });

  it('allows authorized course trainer to inspect learner mastery and enforces role security', async () => {
    // 1. Course owner trainer can inspect student 1 mastery in this course
    const trainerRes = await request(app)
      .get(`/api/v1/courses/${courseId}/students/${studentId}/mastery`)
      .set('Authorization', `Bearer ${trainerToken}`);

    assert.equal(trainerRes.status, 200);
    const body = trainerRes.body.data;
    assert.equal(body.courseId, courseId);
    assert.equal(body.studentId, studentId);
    assert.ok(body.concepts.length >= 1);
    const c = body.concepts.find((entry) => entry.conceptId === conceptId);
    assert.ok(c);
    assert.equal(c.modelName, 'bkt');

    // 2. Unauthorized trainer cannot inspect student mastery for a course they do not teach
    const forbiddenTrainerRes = await request(app)
      .get(`/api/v1/courses/${courseId}/students/${studentId}/mastery`)
      .set('Authorization', `Bearer ${otherTrainerToken}`);
    assert.equal(forbiddenTrainerRes.status, 403);
    assert.equal(forbiddenTrainerRes.body.error.code, 'FORBIDDEN');

    // 3. Student cannot inspect another student's mastery in a course
    const studentSnoopRes = await request(app)
      .get(`/api/v1/courses/${courseId}/students/${studentId}/mastery`)
      .set('Authorization', `Bearer ${student2Token}`);
    assert.equal(studentSnoopRes.status, 403);

    // 4. Request for non-enrolled student returns 404
    const notEnrolledRes = await request(app)
      .get(`/api/v1/courses/${courseId}/students/non-existent-user/mastery`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(notEnrolledRes.status, 404);
  });
});
