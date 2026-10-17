import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import {
  aiProvider,
  NVIDIA_CONFIG,
  AiProviderError,
  categorizeAiError,
  sanitizeModelText,
} from '../src/integrations/aiProvider.js';
import {
  generatedContentSchema,
  generatedQuestionsArraySchema,
} from '../src/utils/aiSchemas.js';

describe('NVIDIA AI Dual-Model Integration & Verification', () => {
  let trainerToken;
  let studentToken;

  it('sets up trainer and student authentication tokens', async () => {
    // 1. Create trainer
    const trainerRes = await request(app).post('/api/v1/auth/signup').send({
      email: `trainer_nvidia_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'trainer',
      displayName: 'NVIDIA AI Evaluator',
    });
    assert.equal(trainerRes.status, 201);
    trainerToken = trainerRes.body.data.session.access_token;

    // 2. Create student
    const studentRes = await request(app).post('/api/v1/auth/signup').send({
      email: `student_nvidia_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      role: 'student',
      displayName: 'NVIDIA Test Student',
    });
    assert.equal(studentRes.status, 201);
    studentToken = studentRes.body.data.session.access_token;
  });

  describe('1. Error Categorization & Classification', () => {
    it('categorizes 401 as non-retryable authentication error', () => {
      const err = new Error('Incorrect API key provided');
      err.status = 401;
      const cat = categorizeAiError(err, 'nvidia/nemotron-3-ultra-550b-a55b');

      assert.equal(cat.category, 'authentication');
      assert.equal(cat.status, 401);
      assert.equal(cat.retryable, false);
      assert.ok(cat.message.includes('Authentication failed'));
      assert.ok(!cat.message.includes('nvapi-')); // Zero secret leakage
    });

    it('categorizes 403 as non-retryable access error', () => {
      const err = new Error('Access denied to requested model');
      err.status = 403;
      const cat = categorizeAiError(err, 'openai/gpt-oss-20b');

      assert.equal(cat.category, 'access');
      assert.equal(cat.status, 403);
      assert.equal(cat.retryable, false);
      assert.ok(cat.message.includes('Access denied'));
    });

    it('categorizes 404 as non-retryable model_unavailable error', () => {
      const err = new Error('The model nvidia/nonexistent does not exist');
      err.status = 404;
      const cat = categorizeAiError(err, 'nvidia/nonexistent');

      assert.equal(cat.category, 'model_unavailable');
      assert.equal(cat.status, 404);
      assert.equal(cat.retryable, false);
      assert.ok(cat.message.includes('not available'));
    });

    it('categorizes 429 as retryable rate_limit error', () => {
      const err = new Error('Too many requests, rate limit exceeded');
      err.status = 429;
      const cat = categorizeAiError(err, 'nvidia/nemotron-3-ultra-550b-a55b');

      assert.equal(cat.category, 'rate_limit');
      assert.equal(cat.status, 429);
      assert.equal(cat.retryable, true);
      assert.ok(cat.message.includes('Rate limit reached'));
    });

    it('categorizes 402 as non-retryable quota error', () => {
      const err = new Error('Insufficient credit or quota exceeded');
      err.status = 402;
      const cat = categorizeAiError(err, 'openai/gpt-oss-20b');

      assert.equal(cat.category, 'quota');
      assert.equal(cat.status, 402);
      assert.equal(cat.retryable, false);
      assert.ok(cat.message.includes('quota or billing limit exceeded'));
    });

    it('categorizes timeout and connection timeouts as retryable timeout error', () => {
      const err = new Error('Request timed out.');
      err.name = 'APIConnectionTimeoutError';
      const cat = categorizeAiError(err, 'nvidia/nemotron-3-ultra-550b-a55b');

      assert.equal(cat.category, 'timeout');
      assert.equal(cat.status, 504);
      assert.equal(cat.retryable, true);
      assert.ok(cat.message.includes('timed out'));
    });

    it('categorizes 503 service overloaded as retryable provider_error', () => {
      const err = new Error('503 Service temporarily overloaded');
      err.status = 503;
      const cat = categorizeAiError(err, 'nvidia/nemotron-3-ultra-550b-a55b');

      assert.equal(cat.category, 'provider_error');
      assert.equal(cat.status, 503);
      assert.equal(cat.retryable, true);
      assert.ok(cat.message.includes('temporarily overloaded'));
    });
  });

  describe('2. Reasoning Sanitization and Secret Redaction', () => {
    it('strips <think>...</think> tags and code fences cleanly', () => {
      const rawWithThinking = `
<think>
We need to solve the binary search invariant problem.
User prompt says count 3. Let's think carefully.
</think>
\`\`\`json
{
  "title": "Clean Title",
  "summary": "This is a clean summary text."
}
\`\`\``;

      const sanitized = sanitizeModelText(rawWithThinking);
      assert.ok(!sanitized.includes('<think>'));
      assert.ok(!sanitized.includes('We need to solve'));
      assert.ok(!sanitized.startsWith('```'));
      assert.ok(sanitized.includes('"title": "Clean Title"'));
    });

    it('never leaks API keys in error representations', () => {
      const sensitiveKey = 'nvapi-TEST-FAKE-KEY-SECRET-999';
      const err = new Error(`Failed to authenticate with key ${sensitiveKey}`);
      err.status = 401;

      const cat = categorizeAiError(err, 'nvidia/nemotron-3-ultra-550b-a55b');
      assert.ok(!cat.message.includes(sensitiveKey));
      assert.ok(!JSON.stringify(cat).includes(sensitiveKey));
    });
  });

  describe('3. Model Selection & Fallback Behavior', () => {
    it('exposes configured primary and secondary model identifiers', () => {
      assert.ok(NVIDIA_CONFIG.PRIMARY_MODEL);
      assert.ok(NVIDIA_CONFIG.SECONDARY_MODEL);
      assert.equal(NVIDIA_CONFIG.BASE_URL, 'https://integrate.api.nvidia.com/v1');
    });

    it('throws authentication error when API key is completely missing', async () => {
      const savedKey = process.env.NVIDIA_API_KEY;
      const savedNemotronKey = process.env.NVIDIA_NEMOTRON_API_KEY;
      const savedGptKey = process.env.NVIDIA_GPT_API_KEY;
      const savedAiKey = process.env.AI_API_KEY;
      const savedOpenAiKey = process.env.OPENAI_API_KEY;

      try {
        delete process.env.NVIDIA_API_KEY;
        delete process.env.NVIDIA_NEMOTRON_API_KEY;
        delete process.env.NVIDIA_GPT_API_KEY;
        delete process.env.AI_API_KEY;
        delete process.env.OPENAI_API_KEY;

        const diag = await aiProvider.testModelDiagnostics('nvidia/nemotron-3-ultra-550b-a55b');
        assert.equal(diag.success, false);
        assert.equal(diag.errorCategory, 'missing_credential');
        assert.ok(diag.errorMessage.includes('not configured'));
      } finally {
        if (savedKey) process.env.NVIDIA_API_KEY = savedKey;
        if (savedNemotronKey) process.env.NVIDIA_NEMOTRON_API_KEY = savedNemotronKey;
        if (savedGptKey) process.env.NVIDIA_GPT_API_KEY = savedGptKey;
        if (savedAiKey) process.env.AI_API_KEY = savedAiKey;
        if (savedOpenAiKey) process.env.OPENAI_API_KEY = savedOpenAiKey;
      }
    });

    it('supports mockMode for deterministic automated test passes', async () => {
      const result = await aiProvider.generateStructuredOutput({
        systemPrompt: 'You are an instructional designer',
        userPrompt: 'Title: Binary Search Trees',
        schema: generatedContentSchema,
        mockMode: true,
      });

      assert.ok(result.title);
      assert.ok(result.summary);
      assert.ok(Array.isArray(result.sections));
      assert.ok(Array.isArray(result.keyTakeaways));
    });

    it('does NOT silently fall back to another model when allowFallback is false', async () => {
      // Create a mock client that throws an error on primary
      const fakeError = new Error('Primary model unavailable');
      fakeError.status = 404;

      const originalCall = aiProvider._callWithRetries;
      let callCount = 0;

      try {
        aiProvider._callWithRetries = async ({ model }) => {
          callCount++;
          throw categorizeAiError(fakeError, model);
        };

        await assert.rejects(
          async () => {
            await aiProvider.generateStructuredOutput({
              systemPrompt: 'test',
              userPrompt: 'test',
              schema: generatedContentSchema,
              model: 'nvidia/nemotron-3-ultra-550b-a55b',
              allowFallback: false, // Strict: no fallback
              mockMode: false,
            });
          },
          (err) => {
            assert.equal(err.category, 'model_unavailable');
            assert.equal(callCount, 1); // No secondary model call attempted
            return true;
          }
        );
      } finally {
        aiProvider._callWithRetries = originalCall;
      }
    });

    it('explicitly falls back and records metadata when allowFallback is true', async () => {
      const fakePrimaryError = new Error('503 Service overloaded');
      fakePrimaryError.status = 503;

      const originalCall = aiProvider._callWithRetries;
      const calledModels = [];

      try {
        aiProvider._callWithRetries = async ({ model }) => {
          calledModels.push(model);
          if (model === 'nvidia/nemotron-3-ultra-550b-a55b') {
            throw categorizeAiError(fakePrimaryError, model);
          }
          return {
            content: JSON.stringify({
              title: 'Fallback Content',
              summary: 'Summary generated by secondary model after explicit failover.',
              sections: [{ heading: 'Overview', content: 'Fallback explanation content.' }],
              keyTakeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
            }),
            usage: { promptTokens: 50, completionTokens: 40, totalTokens: 90 },
            model: 'openai/gpt-oss-20b',
          };
        };

        const result = await aiProvider.generateStructuredOutput({
          systemPrompt: 'test',
          userPrompt: 'test',
          schema: generatedContentSchema,
          model: 'nvidia/nemotron-3-ultra-550b-a55b',
          allowFallback: true, // Explicit fallback allowed
          mockMode: false,
        });

        assert.equal(calledModels[0], 'nvidia/nemotron-3-ultra-550b-a55b');
        assert.equal(calledModels[1], NVIDIA_CONFIG.SECONDARY_MODEL);
        assert.equal(result._meta.fallbackTriggered, true);
        assert.equal(result._meta.initialModel, 'nvidia/nemotron-3-ultra-550b-a55b');
        assert.equal(result._meta.modelUsed, NVIDIA_CONFIG.SECONDARY_MODEL);
        assert.equal(result.title, 'Fallback Content');
      } finally {
        aiProvider._callWithRetries = originalCall;
      }
    });

    it('guarantees no accidental mock success when provider fails in live mode', async () => {
      const liveFailure = new Error('NVIDIA 500 internal server error');
      liveFailure.status = 500;

      const originalCall = aiProvider._callWithRetries;
      try {
        aiProvider._callWithRetries = async ({ model }) => {
          throw categorizeAiError(liveFailure, model);
        };

        await assert.rejects(
          async () => {
            await aiProvider.generateStructuredOutput({
              systemPrompt: 'test',
              userPrompt: 'test',
              schema: generatedContentSchema,
              mockMode: false, // Forces live code path
            });
          },
          (err) => {
            assert.equal(err.category, 'provider_error');
            return true;
          }
        );
      } finally {
        aiProvider._callWithRetries = originalCall;
      }
    });
  });

  describe('4. Protected Model Diagnostics Endpoint', () => {
    it('rejects unauthenticated requests to /api/v1/ai/diagnostics (401)', async () => {
      const res = await request(app).get('/api/v1/ai/diagnostics');
      assert.equal(res.status, 401);
    });

    it('rejects student role access to /api/v1/ai/diagnostics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/ai/diagnostics')
        .set('Authorization', `Bearer ${studentToken}`);
      assert.equal(res.status, 403);
    });

    it('allows trainer/admin to run diagnostics and returns sanitized metadata', async () => {
      // Mock diagnostic probe response for deterministic test
      const originalDiagnostics = aiProvider.runAllModelDiagnostics;
      try {
        aiProvider.runAllModelDiagnostics = async () => ({
          timestamp: new Date().toISOString(),
          baseUrl: 'https://integrate.api.nvidia.com/v1',
          models: {
            primary: {
              model: 'nvidia/nemotron-3-ultra-550b-a55b',
              success: true,
              latencyMs: 1420,
              preview: 'OPERATIONAL',
              usage: { promptTokens: 20, completionTokens: 5 },
            },
            secondary: {
              model: 'openai/gpt-oss-20b',
              success: true,
              latencyMs: 820,
              preview: 'OPERATIONAL',
              usage: { promptTokens: 20, completionTokens: 5 },
            },
          },
          overallHealthy: true,
          degraded: false,
        });

        const res = await request(app)
          .get('/api/v1/ai/diagnostics')
          .set('Authorization', `Bearer ${trainerToken}`);

        assert.equal(res.status, 200);
        assert.ok(res.body.data.models.primary);
        assert.ok(res.body.data.models.secondary);
        assert.equal(res.body.data.models.primary.success, true);
        assert.equal(res.body.data.models.secondary.success, true);
        assert.ok(!JSON.stringify(res.body).includes('nvapi-')); // Zero API key leakage
        assert.ok(!JSON.stringify(res.body).includes('Bearer')); // Zero auth header leakage
      } finally {
        aiProvider.runAllModelDiagnostics = originalDiagnostics;
      }
    });
  });
});
