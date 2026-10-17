import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import app from '../src/app.js';
import { pistonAdapter, PISTON_LANGUAGE_MAP } from '../src/integrations/piston.adapter.js';
import { compareOutputs, executionService } from '../src/services/execution.service.js';

describe('Self-Hosted Piston Execution Engine & Fast Coding Assessment', () => {
  const request = supertest(app);
  const studentToken = 'demo_student';

  describe('1. Piston Adapter & Language Registry', () => {
    it('maps all supported languages to valid Piston configurations', () => {
      const expectedLangs = ['python', 'javascript', 'cpp', 'java', 'c', 'go'];
      for (const lang of expectedLangs) {
        const resolved = pistonAdapter.resolveLanguage(lang);
        assert.ok(resolved.language, `Piston language missing for ${lang}`);
        assert.ok(resolved.defaultVersion, `Default version missing for ${lang}`);
        assert.ok(resolved.defaultFile, `Default file missing for ${lang}`);
      }
    });

    it('rejects unsupported languages cleanly with ValidationError', () => {
      assert.throws(
        () => pistonAdapter.resolveLanguage('brainfuck'),
        /not supported/i
      );
    });

    it('validates source code size limits', async () => {
      const hugeSource = 'a'.repeat(70000);
      await assert.rejects(
        () => pistonAdapter.execute({ language: 'python', sourceCode: hugeSource }),
        /exceeds limit/i
      );
    });

    it('retrieves installed runtimes list', async () => {
      const runtimes = await pistonAdapter.getInstalledRuntimes();
      assert.ok(Array.isArray(runtimes), 'Runtimes must be an array');
      assert.ok(runtimes.length >= 5, 'Should support at least 5 standard runtimes');
    });

    it('probes Piston health without executing code', async () => {
      const health = await pistonAdapter.checkHealth();
      assert.ok(typeof health.configured === 'boolean');
      assert.ok(typeof health.reachable === 'boolean');
    });
  });

  describe('2. Output Comparison Policies', () => {
    it('performs exact output comparison accurately', () => {
      assert.strictEqual(compareOutputs('42\n', '42\n', 'exact'), true);
      assert.strictEqual(compareOutputs('42', '42\n', 'exact'), true); // single trailing newline tolerated
      assert.strictEqual(compareOutputs('42  ', '42', 'exact'), false); // trailing spaces distinguish exact
    });

    it('performs whitespace-normalized comparison when policy enabled', () => {
      assert.strictEqual(compareOutputs('42  \n', '42\n', 'whitespace_normalized'), true);
      assert.strictEqual(compareOutputs('hello   world\r\n', 'hello   world\n', 'whitespace_normalized'), true);
      assert.strictEqual(compareOutputs('hello\nworld', 'hello\n\nworld', 'whitespace_normalized'), false);
    });
  });

  describe('3. Piston Output Normalization', () => {
    it('normalizes successful execution output', () => {
      const data = {
        language: 'python',
        version: '3.10.0',
        run: {
          stdout: 'Hello World\n',
          stderr: '',
          code: 0,
          signal: null,
        },
      };
      const normalized = pistonAdapter.normalizePistonResponse(data, 45, 3000);
      assert.strictEqual(normalized.status, 'success');
      assert.strictEqual(normalized.stdout, 'Hello World\n');
      assert.strictEqual(normalized.stderr, null);
      assert.strictEqual(normalized.exitCode, 0);
    });

    it('normalizes compilation errors', () => {
      const data = {
        language: 'c++',
        version: '10.2.0',
        compile: {
          stdout: '',
          stderr: 'error: expected semicolon',
          code: 1,
        },
        run: {},
      };
      const normalized = pistonAdapter.normalizePistonResponse(data, 120, 3000);
      assert.strictEqual(normalized.status, 'compile_error');
      assert.ok(normalized.stderr.includes('expected semicolon'));
      assert.strictEqual(normalized.exitCode, 1);
    });

    it('normalizes timeout signals (SIGKILL)', () => {
      const data = {
        language: 'python',
        version: '3.10.0',
        run: {
          stdout: '',
          stderr: 'Killed',
          code: null,
          signal: 'SIGKILL',
        },
      };
      const normalized = pistonAdapter.normalizePistonResponse(data, 3000, 3000);
      assert.strictEqual(normalized.status, 'time_limit');
      assert.strictEqual(normalized.exitCode, 124);
    });

    it('normalizes runtime errors (non-zero exit code)', () => {
      const data = {
        language: 'python',
        version: '3.10.0',
        run: {
          stdout: '',
          stderr: 'ZeroDivisionError: division by zero',
          code: 1,
          signal: null,
        },
      };
      const normalized = pistonAdapter.normalizePistonResponse(data, 30, 3000);
      assert.strictEqual(normalized.status, 'runtime_error');
      assert.ok(normalized.stderr.includes('ZeroDivisionError'));
    });
  });

  describe('4. Backend API Routes for Coding Assessment', () => {
    it('GET /api/v1/coding/languages returns supported runtimes for authenticated user', async () => {
      const res = await request
        .get('/api/v1/coding/languages')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((l) => l.id === 'python'));
    });

    it('GET /api/v1/health/piston reports sandbox reachability status', async () => {
      const res = await request.get('/api/v1/health/piston');
      assert.strictEqual(res.status, 200);
      assert.ok('reachable' in res.body.data);
    });

    it('POST /api/v1/assessments/:id/run executes sample tests safely', async () => {
      const res = await request
        .post('/api/v1/assessments/test_asmt_1/run')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'python',
          code: 'def solve(n):\n    return n * n',
        });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.status !== undefined);
      assert.ok(res.body.output !== undefined);
    });

    it('POST /api/v1/assessments/:id/run handles custom stdin input', async () => {
      const res = await request
        .post('/api/v1/assessments/test_asmt_1/run')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'python',
          code: 'import sys\nprint("CUSTOM_PROCESSED:" + sys.stdin.read().strip())',
          customInput: '42_TEST_INPUT',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.output.includes('CUSTOM_PROCESSED') || res.body.output.includes('Execution complete'));
    });

    it('POST /api/v1/assessments/:id/submit executes hidden tests and grades submission', async () => {
      const res = await request
        .post('/api/v1/assessments/test_asmt_1/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          language: 'python',
          code: 'def solve(n):\n    return n * n',
        });

      assert.strictEqual(res.status, 200);
      assert.ok('success' in res.body);
      assert.ok('testsPassed' in res.body);
      assert.ok('totalTests' in res.body);
      assert.ok(Array.isArray(res.body.vivaQuestions));
    });
  });
});
