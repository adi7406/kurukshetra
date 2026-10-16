import request from 'supertest';
import app from '../app.js';

/**
 * Executes a non-destructive post-deployment smoke test suite.
 */
export async function runSmokeTests(targetApp = app) {
  const results = {
    passed: 0,
    failed: 0,
    checks: [],
  };

  async function check(name, testFn) {
    try {
      await testFn();
      results.passed++;
      results.checks.push({ name, status: 'PASS' });
      console.info(`  [PASS] ${name}`);
    } catch (err) {
      results.failed++;
      results.checks.push({ name, status: 'FAIL', error: err.message });
      console.error(`  [FAIL] ${name}:`, err.message);
    }
  }

  console.info('[Smoke Test] Starting post-deployment verification...');

  // 1. Health check
  await check('Liveness probe responds with 200 OK', async () => {
    const res = await request(targetApp).get('/health');
    if (res.status !== 200 || res.body?.data?.status !== 'healthy') {
      throw new Error(`Unexpected health status ${res.status}`);
    }
  });

  // 2. Readiness check
  await check('Readiness probe confirms backing database', async () => {
    const res = await request(targetApp).get('/readiness');
    if (res.status !== 200 || res.body?.data?.status !== 'ready') {
      throw new Error(`Unexpected readiness status ${res.status}`);
    }
  });

  // 3. Security headers (Helmet)
  await check('Security headers (Helmet) configured correctly', async () => {
    const res = await request(targetApp).get('/health');
    if (!res.headers['x-content-type-options']) {
      throw new Error('Missing X-Content-Type-Options header');
    }
  });

  // 4. Auth protection
  await check('Protected API rejects unauthenticated requests (401)', async () => {
    const res = await request(targetApp).get('/api/v1/me/dashboard');
    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  });

  // 5. 404 handler
  await check('Unknown route returns sanitized JSON error without stack traces', async () => {
    const res = await request(targetApp).get('/api/v1/completely-unknown-route');
    if (res.status !== 404 || res.body?.error?.code !== 'NOT_FOUND') {
      throw new Error(`Expected 404 NOT_FOUND, got ${res.status}`);
    }
    if (res.body?.stack) {
      throw new Error('Leaked internal stack trace in error response');
    }
  });

  const allPassed = results.failed === 0;
  console.info(`[Smoke Test] Completed: ${results.passed} passed, ${results.failed} failed.`);
  return { allPassed, results };
}

// Run from CLI
if (process.argv[1] && process.argv[1].endsWith('smokeTest.js')) {
  runSmokeTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('[Smoke Test] Critical test failure:', err);
      process.exit(1);
    });
}
