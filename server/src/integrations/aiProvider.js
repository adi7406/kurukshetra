import { monitoringService } from '../services/monitoring.service.js';
import { ValidationError, GatewayTimeoutError } from '../utils/errors.js';

export const aiProvider = {
  /**
   * Generates validated structured output with bounded retries, budget enforcement, and telemetry.
   */
  async generateStructuredOutput({
    systemPrompt,
    userPrompt,
    schema,
    model = 'gpt-4o-mini',
    userId,
    courseId = null,
    operation = 'ai_question_generation',
    maxRetries = 2,
    timeoutMs = 10000,
  }) {
    // 1. Enforce AI budget before invoking external generation
    if (userId) {
      monitoringService.checkBudget(userId);
    }

    let attempts = 0;
    let lastError = null;

    while (attempts <= maxRetries) {
      attempts += 1;
      try {
        const rawJsonString = await this._callModel({
          systemPrompt,
          userPrompt,
          model,
          timeoutMs,
        });

        // Parse JSON
        let parsed;
        try {
          parsed = JSON.parse(rawJsonString);
        } catch (jsonErr) {
          throw new ValidationError(`AI model returned non-JSON output: ${jsonErr.message}`);
        }

        // Validate against runtime schema
        const validated = schema.parse(parsed);

        // Record telemetry & usage
        if (userId) {
          const promptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
          const completionTokens = Math.ceil(rawJsonString.length / 4);
          monitoringService.recordAiUsage({
            userId,
            courseId,
            operation,
            model,
            promptTokens,
            completionTokens,
          });
        }

        return validated;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          throw new GatewayTimeoutError(`AI provider timed out after ${timeoutMs}ms.`);
        }
        // If it's a budget error, do not retry
        if (err.statusCode === 429) {
          throw err;
        }
      }
    }

    throw new ValidationError(
      `AI generation failed after ${attempts} attempts. Details: ${lastError?.message || 'Validation error'}`
    );
  },

  /**
   * Internal model dispatcher
   */
  async _callModel({ systemPrompt, userPrompt, model, timeoutMs }) {
    const apiKey = process.env.OPENAI_API_KEY;

    // Use live API if key is available and not in test environment
    if (apiKey && process.env.NODE_ENV !== 'test') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API responded with status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '{}';
      } finally {
        clearTimeout(timer);
      }
    }

    // Deterministic mock generator for tests and local development
    return this._mockGenerate(systemPrompt, userPrompt);
  },

  /**
   * Deterministic mock generator that adheres to schemas
   */
  _mockGenerate(systemPrompt, userPrompt) {
    if (systemPrompt.includes('curriculum author') || userPrompt.includes('Topic:')) {
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

    if (systemPrompt.includes('instructional designer') || userPrompt.includes('Title:')) {
      return JSON.stringify({
        title: 'Introduction to Binary Search Trees',
        summary: 'A fundamental data structure providing efficient lookup, insertion, and deletion operations.',
        sections: [
          {
            heading: 'Core Concept',
            content: 'A Binary Search Tree is a node-based binary tree data structure with the key ordered property.',
          },
          {
            heading: 'Key Operations',
            content: 'Search, Insertion, and Deletion can all be performed in O(h) time, where h is the tree height.',
          },
        ],
        keyTakeaways: [
          'Maintains sorted order dynamically',
          'Search complexity is proportional to height',
          'Balancing prevents degradation to O(n) linked lists',
        ],
      });
    }

    return '{}';
  },
};
