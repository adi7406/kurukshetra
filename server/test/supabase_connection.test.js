import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import {
  validateSupabaseConfig,
  createSupabaseClient,
  getSupabaseClient,
  resetSupabaseClient,
  getPrivilegedSupabaseClient,
  checkDatabaseConnection,
} from '../src/config/supabase.js';
import { env } from '../src/config/env.js';

describe('Supabase Client Configuration and Diagnostics', () => {
  it('validates configured Supabase environment variables successfully', () => {
    const config = validateSupabaseConfig();
    assert.ok(config.url, 'Expected url to be defined');
    assert.ok(config.key, 'Expected publishable/anon key to be defined');
    assert.equal(typeof config.url, 'string');
    assert.equal(typeof config.key, 'string');
  });

  it('fails clearly with ConfigurationError when required environment variables are missing', () => {
    const origUrl = process.env.SUPABASE_URL;
    const origAnon = process.env.SUPABASE_ANON_KEY;
    const origPub = process.env.SUPABASE_PUBLISHABLE_KEY;
    const origEnvUrl = env.SUPABASE_URL;
    const origEnvAnon = env.SUPABASE_ANON_KEY;
    const origEnvPub = env.SUPABASE_PUBLISHABLE_KEY;

    try {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_PUBLISHABLE_KEY;
      env.SUPABASE_URL = undefined;
      env.SUPABASE_ANON_KEY = undefined;
      env.SUPABASE_PUBLISHABLE_KEY = undefined;

      assert.throws(
        () => validateSupabaseConfig(),
        (err) => {
          assert.equal(err.name, 'ConfigurationError');
          assert.ok(err.message.includes('SUPABASE_URL'));
          assert.ok(err.message.includes('SUPABASE_PUBLISHABLE_KEY'));
          return true;
        }
      );
    } finally {
      process.env.SUPABASE_URL = origUrl;
      process.env.SUPABASE_ANON_KEY = origAnon;
      process.env.SUPABASE_PUBLISHABLE_KEY = origPub;
      env.SUPABASE_URL = origEnvUrl;
      env.SUPABASE_ANON_KEY = origEnvAnon;
      env.SUPABASE_PUBLISHABLE_KEY = origEnvPub;
    }
  });

  it('creates client with non-persistent server-side auth configuration', () => {
    const testUrl = 'https://example-project.supabase.co';
    const testKey = 'test-anon-key-12345';
    const client = createSupabaseClient(testUrl, testKey);

    assert.ok(client, 'Expected client instance');
    assert.equal(typeof client.from, 'function');
    assert.equal(typeof client.auth, 'object');

    // Rejects empty or invalid initialization parameters
    assert.throws(
      () => createSupabaseClient('', testKey),
      (err) => err.name === 'ConfigurationError'
    );
    assert.throws(
      () => createSupabaseClient(testUrl, ''),
      (err) => err.name === 'ConfigurationError'
    );
  });

  it('getSupabaseClient returns singleton instance and honors reset', () => {
    resetSupabaseClient();
    const client1 = getSupabaseClient();
    const client2 = getSupabaseClient();
    assert.strictEqual(client1, client2, 'Expected singleton client instance');

    resetSupabaseClient();
    const client3 = getSupabaseClient();
    assert.ok(client3);
  });

  it('provides privileged service client strictly when credentials are configured', () => {
    const privilegedClient = getPrivilegedSupabaseClient();
    assert.ok(privilegedClient, 'Expected privileged service client instance');
    assert.equal(typeof privilegedClient.from, 'function');
  });

  it('safely handles simulated database query errors in checkDatabaseConnection', async () => {
    // Injected mock client returning a query error
    const mockFailingClient = {
      from() {
        return {
          select() {
            return {
              limit() {
                return Promise.resolve({
                  data: null,
                  error: { code: 'PGRST500', message: 'Simulated connection drop' },
                  status: 500,
                });
              },
            };
          },
        };
      },
    };

    const result = await checkDatabaseConnection({ client: mockFailingClient });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'disconnected');
    assert.equal(result.error, 'Database query probe failed');
    assert.ok(typeof result.latencyMs === 'number');
    assert.ok(result.timestamp);
  });

  it('safely handles unhandled exceptions or network failure in checkDatabaseConnection', async () => {
    const mockCrashingClient = {
      from() {
        throw new Error('ECONNREFUSED network unreachable');
      },
    };

    const result = await checkDatabaseConnection({ client: mockCrashingClient });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'unreachable');
    assert.equal(result.error, 'Database service unreachable');
    assert.ok(result.timestamp);
  });

  it('GET /health/database returns 200 and sanitized connectivity data', async () => {
    const res = await request(app).get('/health/database');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'connected');
    assert.equal(res.body.data.database, 'postgresql');
    assert.ok(typeof res.body.data.latencyMs === 'number');
    assert.ok(res.body.data.timestamp);
    assert.ok(res.body.meta.requestId);

    // Verify sensitive data is NOT exposed
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes('supabase.co'));
    assert.ok(!text.includes('sb_'));
    assert.ok(!text.includes('secret'));
    assert.ok(!text.includes('password'));
  });

  it('GET /api/v1/health/database mounts correctly and preserves envelope', async () => {
    const res = await request(app).get('/api/v1/health/database');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'connected');
    assert.ok(res.body.meta.requestId);
  });

  it('GET /api/health/database mounts correctly and preserves envelope', async () => {
    const res = await request(app).get('/api/health/database');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'connected');
    assert.ok(res.body.meta.requestId);
  });

  it('enforces safeguard in production environment (403 Forbidden without credentials)', async () => {
    const origEnv = env.NODE_ENV;
    try {
      env.NODE_ENV = 'production';

      const unauthenticatedRes = await request(app).get('/health/database');
      assert.equal(unauthenticatedRes.status, 403);
      assert.equal(unauthenticatedRes.body.error.code, 'FORBIDDEN');

      // Authorized with diagnostic key
      env.DIAGNOSTIC_KEY = 'test-secret-key-xyz';
      const authorizedRes = await request(app)
        .get('/health/database')
        .set('x-diagnostic-key', 'test-secret-key-xyz');
      assert.equal(authorizedRes.status, 200);

      // Authorized with Bearer token
      const bearerRes = await request(app)
        .get('/health/database')
        .set('Authorization', 'Bearer mock-test-token');
      assert.equal(bearerRes.status, 200);
    } finally {
      env.NODE_ENV = origEnv;
      delete env.DIAGNOSTIC_KEY;
    }
  });

  it('performs live harmless read test against Supabase PostgreSQL database', async () => {
    const client = getSupabaseClient();
    const startTime = Date.now();

    // Query harmless profiles table with limit 1
    const { data, error, status } = await client
      .from('profiles')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    assert.equal(error, null, `Live query failed: ${error?.message}`);
    assert.equal(status, 200, `Expected status 200 but got ${status}`);
    assert.ok(Array.isArray(data), 'Expected array response from Supabase PostgREST');
    // RLS safely returns empty array or accessible rows without throwing
    assert.ok(latency >= 0, 'Expected positive query latency');
  });
});
