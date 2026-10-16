import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { monitoringService } from '../src/services/monitoring.service.js';
import { getSupabase } from '../src/integrations/supabase.js';

describe('Monitoring, Telemetry, and AI Cost Controls (TASK-038)', () => {
  let adminToken;
  let trainerToken;
  let studentToken;
  let studentId;

  before(async () => {
    // 1. Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `mon_admin_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Platform Admin',
        role: 'trainer',
      });
    assert.equal(adminRes.status, 201);
    adminToken = adminRes.body.data.session.access_token;
    const adminId = adminRes.body.data.user.id;

    // Elevate admin user in profiles database
    const supabase = getSupabase();
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', adminId);

    // 2. Trainer
    const trainerRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `mon_trainer_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Telemetry Trainer',
        role: 'trainer',
      });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 3. Student
    const studentRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `mon_student_${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Telemetry Student',
        role: 'student',
      });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;
    studentId = studentRes.body.data.user.id;
  });

  describe('1. Health and Readiness Diagnostics', () => {
    it('returns healthy status, uptime, and memory utilization on GET /health', async () => {
      const res = await request(app).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'healthy');
      assert.ok(res.body.data.uptimeSeconds !== undefined);
      assert.ok(res.body.data.memory.rssMb > 0);
      assert.ok(res.body.data.memory.heapUsedMb > 0);
      assert.ok(res.body.meta.requestId);
    });

    it('performs backing services inspection on GET /readiness', async () => {
      const res = await request(app).get('/readiness');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'ready');
      assert.equal(res.body.data.checks.database, 'healthy');
      assert.equal(res.body.data.checks.runner, 'ready');
      assert.ok(res.body.meta.requestId);
    });
  });

  describe('2. Request Telemetry, Latency, and Error Tracking', () => {
    it('tracks completed request counts, status codes, and latency percentiles', async () => {
      // Generate some requests
      await request(app).get('/health');
      await request(app).get('/api/v1/attempts/non-existent-404').set('Authorization', `Bearer ${studentToken}`);

      const metrics = monitoringService.getSystemMetrics();
      assert.ok(metrics.traffic.totalRequests >= 2);
      assert.ok(metrics.traffic.statusCodes['2xx'] >= 1);
      assert.ok(metrics.traffic.statusCodes['4xx'] >= 1);

      // Latency statistics
      assert.ok(metrics.latency.samples >= 2);
      assert.ok(metrics.latency.avgMs >= 0);
      assert.ok(metrics.latency.p95Ms >= 0);
      assert.ok(metrics.errors.breakdownByCategory.NOT_FOUND >= 1);
    });

    it('rejects student access to /api/v1/admin/metrics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    });

    it('allows trainer and admin to inspect platform metrics on GET /api/v1/admin/metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/metrics')
        .set('Authorization', `Bearer ${trainerToken}`);

      assert.equal(res.status, 200);
      const data = res.body.data;
      assert.ok(data.uptimeSeconds !== undefined);
      assert.ok(data.traffic);
      assert.ok(data.latency);
      assert.ok(data.system.rssMb > 0);
      assert.ok(Array.isArray(data.alerts));
    });
  });

  describe('3. AI Token Tracking, Cost Controls, and Budget Enforcement', () => {
    it('records AI token consumption and accurately calculates estimated USD cost', () => {
      const record = monitoringService.recordAiUsage({
        userId: studentId,
        operation: 'ai_viva',
        model: 'gpt-4o-mini',
        promptTokens: 1000,
        completionTokens: 500,
      });

      assert.equal(record.totalTokens, 1500);
      // Pricing for gpt-4o-mini:
      // prompt: 1000 / 1M * 0.15 = $0.00015
      // completion: 500 / 1M * 0.60 = $0.0003
      // total = $0.00045
      assert.equal(record.totalCostUsd, 0.00045);
    });

    it('allows admin/trainer to view AI usage summary and token breakdown on GET /api/v1/admin/ai-usage', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ai-usage')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.totalTokens >= 1500);
      assert.ok(res.body.data.totalSpendUsd > 0);
      assert.ok(Array.isArray(res.body.data.records));
    });

    it('enforces AI cost limits when budget cap is exceeded', async () => {
      // 1. Admin sets a strict budget of $0.01 for student
      const setBudgetRes = await request(app)
        .post('/api/v1/admin/ai-budget')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: studentId,
          maxBudgetUsd: 0.01,
        });

      assert.equal(setBudgetRes.status, 200);
      assert.equal(setBudgetRes.body.data.maxBudgetUsd, 0.01);

      // 2. Consume tokens exceeding the $0.01 limit
      // e.g. 50,000 completion tokens on claude-3-5-sonnet (50,000 / 1M * $15 = $0.75)
      monitoringService.recordAiUsage({
        userId: studentId,
        operation: 'ai_viva',
        model: 'claude-3-5-sonnet',
        promptTokens: 10000,
        completionTokens: 50000,
      });

      // 3. Verifying budget check throws RateLimitError
      assert.throws(
        () => {
          monitoringService.checkBudget(studentId);
        },
        (err) => {
          assert.equal(err.statusCode, 429);
          assert.ok(err.message.includes('AI usage cost limit'));
          return true;
        }
      );
    });

    it('triggers critical alert when sustained error thresholds are exceeded', () => {
      // Reset and simulate 6 consecutive 5xx errors
      monitoringService.reset();
      for (let i = 0; i < 6; i++) {
        monitoringService.recordRequest({ statusCode: 500, latencyMs: 50, errorCode: 'INTERNAL_ERROR' });
      }

      const alerts = monitoringService.getActiveAlerts();
      assert.ok(alerts.length >= 1);
      const sustainedFailureAlert = alerts.find((a) => a.type === 'sustained_consecutive_failures');
      assert.ok(sustainedFailureAlert);
      assert.equal(sustainedFailureAlert.severity, 'critical');
    });
  });
});
