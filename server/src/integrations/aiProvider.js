import OpenAI from 'openai';
import { monitoringService } from '../services/monitoring.service.js';
import { ValidationError } from '../utils/errors.js';

export const NVIDIA_CONFIG = {
  get PRIMARY_MODEL() {
    return process.env.NVIDIA_PRIMARY_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
  },
  get SECONDARY_MODEL() {
    return process.env.NVIDIA_SECONDARY_MODEL || 'openai/gpt-oss-20b';
  },
  get BASE_URL() {
    return process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  },
};

export const NVIDIA_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'openai/gpt-oss-20b',
];

/**
 * Custom error hierarchy for AI provider error categorization
 */
export class AiProviderError extends Error {
  constructor(message, { status = 500, category = 'provider_error', model = null, retryable = false } = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.status = status;
    this.category = category; // 'authentication' | 'access' | 'model_unavailable' | 'rate_limit' | 'quota' | 'timeout' | 'provider_error' | 'validation'
    this.model = model;
    this.retryable = retryable;
  }
}

/**
 * Categorize errors from the OpenAI / NVIDIA SDK into standard MasterPath AI categories
 */
export function categorizeAiError(error, model) {
  const status = error.status || error.statusCode || (error.name === 'AbortError' ? 504 : 500);
  const msg = (error.message || '').toLowerCase();

  // 1. Authentication (401)
  if (status === 401 || msg.includes('unauthorized') || msg.includes('invalid api key') || msg.includes('missing api key')) {
    return new AiProviderError('Authentication failed with AI provider. Please verify server API key.', {
      status: 401,
      category: 'authentication',
      model,
      retryable: false,
    });
  }

  // 2. Access / Permissions (403)
  if (status === 403 || msg.includes('forbidden') || msg.includes('access denied')) {
    return new AiProviderError(`Access denied to model ${model}. Verify account access and permissions.`, {
      status: 403,
      category: 'access',
      model,
      retryable: false,
    });
  }

  // 3. Model Unavailable / Not Found (404)
  if (status === 404 || msg.includes('not found') || msg.includes('model not found') || msg.includes('does not exist')) {
    return new AiProviderError(`Model ${model} is not available on this endpoint.`, {
      status: 404,
      category: 'model_unavailable',
      model,
      retryable: false,
    });
  }

  // 4. Rate Limiting (429)
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return new AiProviderError(`Rate limit reached for model ${model}. Please back off and retry.`, {
      status: 429,
      category: 'rate_limit',
      model,
      retryable: true,
    });
  }

  // 5. Quota / Billing Exceeded (402)
  if (status === 402 || msg.includes('quota') || msg.includes('insufficient_quota') || msg.includes('credit')) {
    return new AiProviderError(`Provider quota or billing limit exceeded for model ${model}.`, {
      status: 402,
      category: 'quota',
      model,
      retryable: false,
    });
  }

  // 6. Timeout (504 / AbortError / Connection Timeout)
  if (
    status === 504 ||
    status === 408 ||
    error.name === 'AbortError' ||
    error.name?.includes('Timeout') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('time out') ||
    msg.includes('etimedout')
  ) {
    return new AiProviderError(`Request to AI model ${model} timed out.`, {
      status: 504,
      category: 'timeout',
      model,
      retryable: true,
    });
  }

  // 7. Temporary Service Overload (503 / 502)
  if (status === 503 || status === 502 || msg.includes('overloaded') || msg.includes('temporarily unavailable')) {
    return new AiProviderError(`AI model ${model} is temporarily overloaded or unavailable.`, {
      status,
      category: 'provider_error',
      model,
      retryable: true,
    });
  }

  // 8. General provider error
  return new AiProviderError(`AI generation error with model ${model}: ${error.message || 'Unknown error'}`, {
    status: status || 500,
    category: 'provider_error',
    model,
    retryable: false,
  });
}

/**
 * Strip reasoning tags (<think>...</think>), markdown fences, and whitespace
 * Strictly guarantees internal reasoning is never exposed to users
 */
export function sanitizeModelText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  // Strip <think>...</think> reasoning blocks
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return text;
}

export const aiProvider = {
  /**
   * Resolve appropriate API key for the target model
   */
  getApiKeyForModel(model) {
    if (model === NVIDIA_CONFIG.PRIMARY_MODEL || model?.includes('nemotron')) {
      return (
        process.env.NVIDIA_API_KEY ||
        process.env.NVIDIA_NEMOTRON_API_KEY ||
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        ''
      );
    }
    if (model === NVIDIA_CONFIG.SECONDARY_MODEL || model?.includes('gpt-oss')) {
      return (
        process.env.NVIDIA_API_KEY ||
        process.env.NVIDIA_GPT_API_KEY ||
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        ''
      );
    }
    return (
      process.env.NVIDIA_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      ''
    );
  },

  /**
   * Create an OpenAI client configured for the NVIDIA base URL
   */
  getClient(model) {
    const apiKey = this.getApiKeyForModel(model);
    if (!apiKey) {
      throw new AiProviderError('NVIDIA API key is not configured. Set NVIDIA_API_KEY in server environment.', {
        status: 401,
        category: 'authentication',
        model,
      });
    }

    return new OpenAI({
      apiKey,
      baseURL: NVIDIA_CONFIG.BASE_URL,
      maxRetries: 0, // Managed manually with bounded exponential backoff
    });
  },

  /**
   * Internal call with bounded exponential backoff retries for transient errors
   */
  async _callWithRetries({ client, model, messages, maxTokens = 3000, temperature = 0.7, timeoutMs = 25000, maxRetries = 2 }) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.chat.completions.create(
          {
            model,
            messages,
            response_format: { type: 'json_object' },
            temperature,
            max_tokens: maxTokens,
          },
          { timeout: timeoutMs }
        );

        const choice = response.choices?.[0];
        const rawContent = choice?.message?.content || '';
        const sanitized = sanitizeModelText(rawContent);

        return {
          content: sanitized,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          model: response.model || model,
        };
      } catch (err) {
        const categorized = categorizeAiError(err, model);
        lastError = categorized;

        // If not retryable or final attempt, throw immediately
        if (!categorized.retryable || attempt === maxRetries) {
          throw categorized;
        }

        // Bounded exponential backoff with jitter
        const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 6000);
        console.warn(`[AI Provider] Transient failure (${categorized.status} ${categorized.category}) for ${model}. Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  },

  /**
   * Generates validated structured output with:
   * - Explicit model selection
   * - Bounded failover (only when explicitly requested)
   * - Bounded JSON schema validation and repair
   * - No silent fallbacks
   * - Zero reasoning leakage
   */
  async generateStructuredOutput({
    systemPrompt,
    userPrompt,
    schema,
    model = null,
    allowFallback = false,
    fallbackModel = null,
    userId = null,
    courseId = null,
    operation = 'ai_question_generation',
    maxRetries = 2,
    timeoutMs = 25000,
    mockMode = null,
  }) {
    // 1. Budget enforcement
    if (userId) {
      monitoringService.checkBudget(userId);
    }

    // 2. Resolve target model
    const primaryTarget = model || NVIDIA_CONFIG.PRIMARY_MODEL;
    const secondaryTarget = fallbackModel || (primaryTarget === NVIDIA_CONFIG.PRIMARY_MODEL ? NVIDIA_CONFIG.SECONDARY_MODEL : NVIDIA_CONFIG.PRIMARY_MODEL);

    // 3. Automated testing mock mode:
    // In automated testing (NODE_ENV === 'test', test runner, or test file arg, and LIVE_AI !== 'true'), use deterministic mock output
    // UNLESS mockMode is explicitly false (e.g. for unit testing pipeline logic like fallbacks / error handling).
    // In live mode (NODE_ENV !== 'test' or LIVE_AI === 'true'), NEVER mock - strictly call live models.
    const isTestRunner =
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.NODE_TEST_CONTEXT) ||
      process.env.npm_lifecycle_event === 'test' ||
      process.argv.some((a) => typeof a === 'string' && a.toLowerCase().includes('test')) ||
      process.execArgv.some((a) => typeof a === 'string' && a.toLowerCase().includes('test'));

    const isMock =
      mockMode === true ||
      (isTestRunner && process.env.LIVE_AI !== 'true' && mockMode !== false);

    if (isMock) {
      if (userId) {
        monitoringService.recordAiUsage({
          userId,
          courseId,
          operation,
          model: primaryTarget,
          promptTokens: 150,
          completionTokens: 250,
        });
      }
      const mockResult = this._mockGenerate(systemPrompt, userPrompt);
      const parsed = JSON.parse(mockResult);
      const validated = schema.parse(parsed);
      Object.defineProperty(validated, '_meta', {
        value: {
          modelUsed: primaryTarget,
          fallbackTriggered: false,
          initialModel: primaryTarget,
          usage: { promptTokens: 150, completionTokens: 250, totalTokens: 400 },
          mock: true,
        },
        enumerable: false,
        writable: true,
      });
      return validated;
    }

    let activeModel = primaryTarget;
    let fallbackTriggered = false;
    let executionResult = null;
    let primaryError = null;

    try {
      const client = this.getClient(activeModel);
      executionResult = await this._callWithRetries({
        client,
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        timeoutMs,
        maxRetries,
      });
    } catch (err) {
      primaryError = err;
      if (allowFallback) {
        console.warn(`[AI Provider] Primary model ${primaryTarget} failed (${err.category}). Triggering explicit failover to ${secondaryTarget}.`);
        fallbackTriggered = true;
        activeModel = secondaryTarget;

        const fallbackClient = this.getClient(activeModel);
        executionResult = await this._callWithRetries({
          client: fallbackClient,
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          timeoutMs,
          maxRetries,
        });
      } else {
        throw err;
      }
    }

    // 4. Parse & Validate Schema with bounded repair
    let validatedData;
    let rawJson = executionResult.content;

    try {
      const parsed = JSON.parse(rawJson);
      validatedData = schema.parse(parsed);
    } catch (parseOrValErr) {
      console.warn(`[AI Provider] Schema validation failure on output from ${activeModel}: ${parseOrValErr.message}. Executing bounded repair attempt...`);

      // Single bounded repair attempt
      try {
        const client = this.getClient(activeModel);
        const repairResponse = await this._callWithRetries({
          client,
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: rawJson },
            {
              role: 'user',
              content: `The previous response failed schema validation: ${parseOrValErr.message}. Please correct the errors and re-output ONLY valid JSON adhering strictly to the schema.`,
            },
          ],
          timeoutMs,
          maxRetries: 1,
        });

        const repairedParsed = JSON.parse(repairResponse.content);
        validatedData = schema.parse(repairedParsed);
      } catch (repairErr) {
        throw new ValidationError(`AI model (${activeModel}) output failed schema validation: ${parseOrValErr.message}`);
      }
    }

    // 5. Record telemetry
    if (userId) {
      monitoringService.recordAiUsage({
        userId,
        courseId,
        operation,
        model: activeModel,
        promptTokens: executionResult.usage.promptTokens,
        completionTokens: executionResult.usage.completionTokens,
      });
    }

    // Attach non-enumerable metadata so callers can access metadata without breaking object destructuring
    Object.defineProperty(validatedData, '_meta', {
      value: {
        modelUsed: activeModel,
        fallbackTriggered,
        initialModel: primaryTarget,
        usage: executionResult.usage,
      },
      enumerable: false,
      writable: true,
    });

    return validatedData;
  },

  /**
   * Diagnostic health probe for an individual model
   */
  async testModelDiagnostics(modelName) {
    const startTime = Date.now();
    const apiKey = this.getApiKeyForModel(modelName);

    if (!apiKey) {
      return {
        model: modelName,
        success: false,
        latencyMs: 0,
        errorCategory: 'missing_credential',
        errorMessage: 'NVIDIA API key is not configured for this model in server environment.',
      };
    }

    try {
      const client = this.getClient(modelName);
      const res = await this._callWithRetries({
        client,
        model: modelName,
        messages: [{ role: 'user', content: 'Respond with the single word: OPERATIONAL' }],
        maxTokens: 64,
        temperature: 0.1,
        timeoutMs: 30000,
        maxRetries: 2,
      });

      const latencyMs = Date.now() - startTime;
      const preview = sanitizeModelText(res.content).substring(0, 100);

      return {
        model: modelName,
        success: true,
        latencyMs,
        preview: preview || 'OPERATIONAL',
        usage: res.usage,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const categorized = err instanceof AiProviderError ? err : categorizeAiError(err, modelName);

      return {
        model: modelName,
        success: false,
        latencyMs,
        errorCategory: categorized.category,
        errorMessage: categorized.message,
      };
    }
  },

  /**
   * Run diagnostics across both primary and secondary models independently
   */
  async runAllModelDiagnostics() {
    const primary = NVIDIA_CONFIG.PRIMARY_MODEL;
    const secondary = NVIDIA_CONFIG.SECONDARY_MODEL;

    const [primaryDiag, secondaryDiag] = await Promise.all([
      this.testModelDiagnostics(primary),
      this.testModelDiagnostics(secondary),
    ]);

    return {
      timestamp: new Date().toISOString(),
      baseUrl: NVIDIA_CONFIG.BASE_URL,
      models: {
        primary: primaryDiag,
        secondary: secondaryDiag,
      },
      overallHealthy: primaryDiag.success && secondaryDiag.success,
      degraded: (primaryDiag.success && !secondaryDiag.success) || (!primaryDiag.success && secondaryDiag.success),
    };
  },

  /**
   * Deterministic mock generator strictly for automated unit tests
   */
  _mockGenerate(systemPrompt, userPrompt) {
    if (systemPrompt.includes('technical interviewer') || userPrompt.includes('Coding') || userPrompt.includes('solve')) {
      return JSON.stringify({
        title: 'Two Sum & Contiguous Window Subarray Sum',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        difficulty: 'intermediate',
        constraints: 'Time Limit: 2000ms | Memory Limit: 256MB | Array length: 2 <= nums.length <= 10^4',
        starterCode: {
          python: 'def solve(nums, target):\n    return []\n',
          javascript: 'function solve(nums, target) {\n  return [];\n}\n',
        },
        testCases: [
          { id: 'tc_1', input: '[2,7,11,15]\n9', expectedOutput: '[0, 1]', isHidden: false, weight: 1, orderIndex: 0 },
        ],
        vivaQuestion: {
          prompt: 'What is the algorithmic time complexity of your approach?',
          rubric: 'Evaluates understanding of hash map lookup time vs brute force.',
        },
      });
    }

    if (systemPrompt.includes('curriculum author') || userPrompt.includes('Topic:') || userPrompt.includes('Count:')) {
      return JSON.stringify({
        questions: [
          {
            type: 'mcq_single',
            stem: 'What is the time complexity of searching in a balanced Binary Search Tree?',
            options: [
              { id: 'A', text: 'O(log n)' },
              { id: 'B', text: 'O(n)' },
              { id: 'C', text: 'O(1)' },
              { id: 'D', text: 'O(n log n)' },
            ],
            correctOptionIds: ['A'],
            explanation: 'In a balanced BST, tree height is log2(n), yielding O(log n) search time.',
            difficulty: 'intermediate',
            conceptNames: ['Binary Search Tree'],
            marks: 2,
          },
          {
            type: 'mcq_single',
            stem: 'Which invariant must hold for every node N in a Binary Search Tree?',
            options: [
              { id: 'A', text: 'Left child keys are smaller than N, right child keys are greater.' },
              { id: 'B', text: 'Left child keys are greater than N, right child keys are smaller.' },
              { id: 'C', text: 'All leaves must be on the same depth level.' },
              { id: 'D', text: 'Nodes must have exactly two children.' },
            ],
            correctOptionIds: ['A'],
            explanation: 'The BST property dictates that all left descendants are smaller and right descendants larger.',
            difficulty: 'beginner',
            conceptNames: ['Binary Search Tree'],
            marks: 1,
          },
        ],
      });
    }

    if (systemPrompt.includes('instructional designer') || userPrompt.includes('Title:') || userPrompt.includes('Concept:')) {
      return JSON.stringify({
        title: 'Introduction to Classes and Objects in Object-Oriented Programming',
        summary: 'Fundamental building blocks of object-oriented programming encapsulating state and behavior.',
        sections: [
          {
            heading: 'Core Concept & Mathematical Invariant',
            content: 'A class serves as an immutable blueprint defining instance variables and methods, while an object is a concrete runtime instance allocated in heap memory.',
          },
          {
            heading: 'Worked Implementation',
            content: 'public class Student { private String name; public Student(String name) { this.name = name; } }',
          },
        ],
        keyTakeaways: [
          'Classes act as blueprints while objects are runtime heap allocations',
          'Encapsulation hides internal state through access modifiers',
          'Constructors guarantee invariant initialization upon instantiation',
        ],
      });
    }

    return '{}';
  },
};
