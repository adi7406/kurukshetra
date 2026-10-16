import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Health and Foundation Endpoints', () => {
  it('GET /health returns healthy status with standard meta envelope', async () => {
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'healthy');
    assert.ok(res.body.data.timestamp);
    assert.ok(res.body.meta.requestId);
    assert.ok(res.headers['x-request-id']);
  });

  it('GET /api/v1/health mounts correctly on configured API_PREFIX', async () => {
    const res = await request(app).get('/api/v1/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'healthy');
    assert.ok(res.body.meta.requestId);
  });

  it('GET /api/v1/readiness returns ready status', async () => {
    const res = await request(app).get('/api/v1/readiness');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'ready');
  });

  it('Custom X-Request-ID is preserved in response header and meta', async () => {
    const customId = 'req_test_custom_123';
    const res = await request(app)
      .get('/health')
      .set('X-Request-ID', customId);

    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], customId);
    assert.equal(res.body.meta.requestId, customId);
  });

  it('Unmatched route returns 404 with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.meta.requestId);
  });
});
