import { monitoringService } from '../services/monitoring.service.js';
import { ValidationError, GatewayTimeoutError } from '../utils/errors.js';

export const NVIDIA_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'openai/gpt-oss-20b',
];

let roundRobinCounter = 0;

export const aiProvider = {
  /**
   * Returns the next model pair for round-robin routing and bounded failover.
   */
  getNextModelPair(preferredModel = null) {
    if (preferredModel && NVIDIA_MODELS.includes(preferredModel)) {
      const failover = NVIDIA_MODELS.find((m) => m !== preferredModel) || NVIDIA_MODELS[0];
      return { primaryModel: preferredModel, failoverModel: failover };
    }

    const index = roundRobinCounter % NVIDIA_MODELS.length;
    roundRobinCounter = (roundRobinCounter + 1) % NVIDIA_MODELS.length;

    const primaryModel = NVIDIA_MODELS[index];
    const failoverModel = NVIDIA_MODELS[(index + 1) % NVIDIA_MODELS.length];
    return { primaryModel, failoverModel };
  },

  /**
   * Generates validated structured output with round-robin routing,
   * bounded failover between NVIDIA dual models, budget enforcement, and telemetry.
   */
  async generateStructuredOutput({
    systemPrompt,
    userPrompt,
    schema,
    model = null,
    userId,
    courseId = null,
    operation = 'ai_question_generation',
    maxRetries = 2,
    timeoutMs = 15000,
  }) {
    // 1. Enforce AI budget before invoking external generation
    if (userId) {
      monitoringService.checkBudget(userId);
    }

    const { primaryModel, failoverModel } = this.getNextModelPair(model);
    const candidateModels = [primaryModel, failoverModel];

    let lastError = null;

    for (let modelIndex = 0; modelIndex < candidateModels.length; modelIndex++) {
      const activeModel = candidateModels[modelIndex];
      let attempts = 0;

      while (attempts <= maxRetries) {
        attempts += 1;
        try {
          const rawJsonString = await this._callModel({
            systemPrompt,
            userPrompt,
            model: activeModel,
            timeoutMs,
          });

          // Clean markdown wrappers if model enclosed output in ```json ... ```
          let cleanJson = rawJsonString.trim();
          if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          }

          let parsed;
          try {
            parsed = JSON.parse(cleanJson);
          } catch (jsonErr) {
            throw new ValidationError(`AI model (${activeModel}) returned non-JSON output: ${jsonErr.message}`);
          }

          // Validate against runtime schema
          const validated = schema.parse(parsed);

          // Record telemetry & usage
          if (userId) {
            const promptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
            const completionTokens = Math.ceil(cleanJson.length / 4);
            monitoringService.recordAiUsage({
              userId,
              courseId,
              operation,
              model: activeModel,
              promptTokens,
              completionTokens,
            });
          }

          return validated;
        } catch (err) {
          lastError = err;
          if (err.name === 'AbortError') {
            console.warn(`[AI Provider] Timeout (${timeoutMs}ms) calling ${activeModel}. Triggering retry/failover.`);
            break; // Try next candidate model via failover
          }
          if (err.statusCode === 429) {
            throw err; // User budget limit exceeded
          }
          console.warn(`[AI Provider] Model ${activeModel} attempt ${attempts} failed: ${err.message}`);
        }
      }
    }

    throw new ValidationError(
      `AI generation failed after failover across models [${candidateModels.join(', ')}]. Details: ${lastError?.message || 'Validation error'}`
    );
  },

  /**
   * Internal NVIDIA API dispatcher
   */
  async _callModel({ systemPrompt, userPrompt, model, timeoutMs }) {
    const apiKey =
      process.env.NVIDIA_API_KEY ||
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY;

    const baseUrl =
      process.env.NVIDIA_API_URL ||
      process.env.AI_BASE_URL ||
      'https://integrate.api.nvidia.com/v1';

    // Use live API if key is available and not in test environment
    if (apiKey && process.env.NODE_ENV !== 'test') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = baseUrl.endsWith('/chat/completions')
          ? baseUrl
          : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

        const response = await fetch(endpoint, {
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
            max_tokens: 3000,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`NVIDIA API (${model}) responded with status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '{}';
      } finally {
        clearTimeout(timer);
      }
    }

    // Deterministic mock generator for unit tests and offline local development
    return this._mockGenerate(systemPrompt, userPrompt);
  },

  /**
   * Deterministic mock generator that strictly adheres to runtime Zod schemas
   */
  _mockGenerate(systemPrompt, userPrompt) {
    // 1. Coding Assessment Generation
    if (systemPrompt.includes('technical interviewer') || userPrompt.includes('Coding') || userPrompt.includes('solve')) {
      return JSON.stringify({
        title: 'Two Sum & Contiguous Window Subarray Sum',
        description:
          'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.',
        difficulty: 'intermediate',
        constraints: 'Time Limit: 2000ms | Memory Limit: 256MB | Array length: 2 <= nums.length <= 10^4',
        starterCode: {
          python: 'def solve(nums, target):\n    # Implement optimal O(n) solution using hash map\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n',
          javascript: 'function solve(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\n',
        },
        testCases: [
          { id: 'tc_1', input: '[2,7,11,15]\n9', expectedOutput: '[0, 1]', isHidden: false, weight: 1, orderIndex: 0 },
          { id: 'tc_2', input: '[3,2,4]\n6', expectedOutput: '[1, 2]', isHidden: false, weight: 1, orderIndex: 1 },
          { id: 'tc_3', input: '[3,3]\n6', expectedOutput: '[0, 1]', isHidden: true, weight: 2, orderIndex: 2 },
        ],
        vivaQuestion: {
          prompt: 'What is the algorithmic time complexity of your approach, and how would it behave if duplicates exist?',
          rubric: 'Evaluates understanding of hash map O(1) lookup vs O(n^2) brute force and collision resolution.',
        },
      });
    }

    // 2. Question Generation (Multiple Choice Quizzes)
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
          {
            type: 'mcq_single',
            stem: 'What is the amortized time complexity of dynamic array push (appending)?',
            options: [
              { id: 'A', text: 'O(1) amortized' },
              { id: 'B', text: 'O(n) amortized' },
              { id: 'C', text: 'O(log n)' },
              { id: 'D', text: 'O(n^2)' },
            ],
            correctOptionIds: ['A'],
            explanation: 'Geometric resizing doubles array capacity periodically, averaging O(1) per insert.',
            difficulty: 'beginner',
            conceptNames: ['Arrays'],
            marks: 1,
          },
        ],
      });
    }

    // 3. Learning Content / Theory Generation
    if (systemPrompt.includes('instructional designer') || userPrompt.includes('Title:') || userPrompt.includes('Concept:')) {
      return JSON.stringify({
        title: 'Introduction to Binary Search Trees and Linear Buffers',
        summary: 'A fundamental data structure providing efficient lookup, insertion, and ordered traversal operations.',
        sections: [
          {
            heading: 'Core Concept & Mathematical Invariant',
            content: 'A Binary Search Tree is an ordered node-based binary tree where for each node, all left subtree keys are smaller and right subtree keys are greater.',
          },
          {
            heading: 'Architectural Diagram & Layout',
            content: 'Root [8] -> Left [3] -> Left [1], Right [6]; Root -> Right [10] -> Right [14]. Balanced depth ensures logarithmic height.',
          },
          {
            heading: 'Practical Implementation & Complexity Analysis',
            content: 'Lookup requires O(h) time where h is tree height. In self-balancing trees (AVL, Red-Black), h = O(log n).',
          },
        ],
        keyTakeaways: [
          'Maintains sorted order dynamically',
          'Search complexity is proportional to tree height',
          'Balancing prevents degradation into an O(n) linked list',
        ],
      });
    }

    // 4. Curriculum Extraction
    if (systemPrompt.includes('curriculum synthesizer') || userPrompt.includes('syllabus')) {
      return JSON.stringify({
        courseTitle: 'Data Structures & Algorithmic Problem Solving',
        moduleName: 'Module 1: Linear Sequence Structures & Buffers',
        concepts: [
          {
            name: 'Arrays',
            title: 'Contiguous Memory Buffers & Array Bounds',
            description: 'Cache locality, O(1) index calculation, and geometric resizing strategies.',
            difficulty: 'beginner',
          },
          {
            name: 'Strings',
            title: 'String Manipulation & Sliding Window',
            description: 'Immutable byte buffers, in-place reversal, and substring matching algorithms.',
            difficulty: 'intermediate',
          },
          {
            name: 'Stack',
            title: 'Last-In-First-Out Discipline & Monotonic Stacks',
            description: 'Activation records, expression evaluation, and next greater element paradigms.',
            difficulty: 'intermediate',
          },
        ],
        quizzes: [],
        codingAssessments: [],
      });
    }

    return '{}';
  },
};
