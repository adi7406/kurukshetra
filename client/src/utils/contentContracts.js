/**
 * Content Contracts and Normalizers
 * 
 * Strict data contracts for:
 * A. Concept Content (Theory, Learning Objectives, Typed Sections, Structured Diagrams)
 * B. Quiz Content (MCQ, Questions, Countdown, Explanations)
 * C. Coding Assessment Content (Problem Statement, I/O Format, Starter Code, Tests, Reasoning)
 * 
 * Prevents AI-generated free-form text from breaking component layout.
 */

// ---------------------------------------------------------------------------
// A. CONCEPT CONTENT CONTRACT & NORMALIZER
// ---------------------------------------------------------------------------
export function normalizeConcept(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id || raw.conceptId || `concept_${Date.now()}`;
  const title = raw.title || raw.name || 'Untitled Concept';
  const summary = raw.summary || raw.description || '';
  const courseId = raw.courseId || raw.course_id || 'course_default';
  const unitId = raw.unitId || raw.unit_id || raw.moduleId || raw.module_id || null;
  const topicId = raw.topicId || raw.topic_id || id;
  const estimatedMinutes = Number(raw.estimatedMinutes || raw.estimated_minutes || 15);
  const difficulty = raw.difficulty || 'Intermediate';
  const status = raw.status || 'available';

  // Learning Objectives
  const learningObjectives = Array.isArray(raw.learningObjectives)
    ? raw.learningObjectives
    : Array.isArray(raw.learning_objectives)
    ? raw.learning_objectives
    : [];

  // Key Takeaways & Misconceptions
  const keyTakeaways = Array.isArray(raw.keyTakeaways)
    ? raw.keyTakeaways
    : Array.isArray(raw.key_takeaways)
    ? raw.key_takeaways
    : [];

  const misconceptions = Array.isArray(raw.misconceptions)
    ? raw.misconceptions
    : [];

  const prerequisites = Array.isArray(raw.prerequisites)
    ? raw.prerequisites
    : [];

  // Structured Diagram: nodes, edges, labels, layout
  let diagram = null;
  if (raw.diagram && typeof raw.diagram === 'object') {
    diagram = {
      type: raw.diagram.type || 'graph',
      nodes: Array.isArray(raw.diagram.nodes) ? raw.diagram.nodes : [],
      edges: Array.isArray(raw.diagram.edges) ? raw.diagram.edges : [],
      labels: raw.diagram.labels || {},
      layout: raw.diagram.layout || 'horizontal',
    };
  }

  // Predictable Sections: text, heading, list, code, callout, diagram
  let sections = [];
  if (Array.isArray(raw.sections)) {
    sections = raw.sections.map((sec, idx) => ({
      id: sec.id || `sec_${idx}`,
      type: ['text', 'heading', 'list', 'code', 'callout', 'diagram'].includes(sec.type)
        ? sec.type
        : 'text',
      title: sec.title || sec.heading || null,
      content: typeof sec.content === 'string' ? sec.content : JSON.stringify(sec.content || ''),
      language: sec.language || 'python',
      items: Array.isArray(sec.items) ? sec.items : [],
      calloutVariant: sec.calloutVariant || 'info', // 'info' | 'warning' | 'tip'
    }));
  } else if (raw.theory) {
    sections.push({
      id: 'sec_theory',
      type: 'text',
      title: 'Invariant Theory & Mechanics',
      content: String(raw.theory),
    });
  }

  // Executable Examples
  const examples = Array.isArray(raw.examples)
    ? raw.examples
    : raw.example
    ? [
        {
          id: 'ex_1',
          title: 'Canonical Implementation',
          language: 'python',
          code: String(raw.example),
          explanation: 'Standard algorithmic invariant implementation.',
        },
      ]
    : [];

  return {
    id,
    courseId,
    unitId,
    topicId,
    title,
    summary,
    learningObjectives,
    sections,
    examples,
    keyTakeaways,
    misconceptions,
    prerequisites,
    diagram,
    estimatedMinutes,
    difficulty,
    status,
    // Preserved raw fields for backward compatibility
    name: title,
    description: summary,
    theory: raw.theory || summary,
    example: examples[0]?.code || raw.example || '',
  };
}

// ---------------------------------------------------------------------------
// B. QUIZ CONTENT CONTRACT & NORMALIZER
// ---------------------------------------------------------------------------
export function normalizeQuiz(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id || raw.quizId || `quiz_${Date.now()}`;
  const courseId = raw.courseId || raw.course_id || 'course_default';
  const topicId = raw.topicId || raw.topic_id || raw.conceptId || id;
  const title = raw.title || 'Diagnostic Assessment Quiz';
  const description = raw.description || 'Evaluate mastery of conceptual invariants and algorithmic bounds.';
  const instructions = raw.instructions || 'Select the most accurate option. You may mark questions for review before submitting.';
  const durationSeconds = Number(raw.durationSeconds || raw.duration_seconds || (raw.timeLimit ? parseInt(raw.timeLimit, 10) * 60 : 600));
  const passingScore = Number(raw.passingScore || raw.passing_score || 70);
  const status = raw.status || 'published';

  // Questions normalization
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map((q, idx) => {
        const qId = q.id || `q_${idx + 1}`;
        const type = q.type || 'mcq_single';
        const prompt = q.prompt || q.stem || `Question ${idx + 1}`;
        const points = Number(q.points || q.marks || 1);
        const difficulty = q.difficulty || 'intermediate';
        const conceptId = q.conceptId || q.concept_id || topicId;
        const explanation = q.explanation || '';

        // Safe options list
        const rawOptions = Array.isArray(q.options) ? q.options : [];
        const options = rawOptions.map((opt, oIdx) => {
          if (typeof opt === 'string') {
            return { id: String(oIdx), text: opt };
          }
          return {
            id: String(opt.id ?? oIdx),
            text: String(opt.text || opt.label || ''),
          };
        });

        // Note: correctIndex / answer key is server-owned. If present (e.g. mock test), preserve safely.
        const correctIndex = q.correctIndex !== undefined ? Number(q.correctIndex) : undefined;

        return {
          id: qId,
          type,
          prompt,
          options,
          points,
          difficulty,
          conceptId,
          explanation,
          correctIndex,
          codeSnippet: q.codeSnippet || q.code || null,
        };
      })
    : [];

  return {
    id,
    courseId,
    topicId,
    conceptId: raw.conceptId || topicId,
    conceptName: raw.conceptName || title,
    title,
    description,
    instructions,
    durationSeconds,
    passingScore,
    questions,
    status,
    questionsCount: questions.length,
    estimatedMinutes: Math.round(durationSeconds / 60),
    timeLimit: `${Math.round(durationSeconds / 60)} mins`,
  };
}

// ---------------------------------------------------------------------------
// C. CODING ASSESSMENT CONTRACT & NORMALIZER
// ---------------------------------------------------------------------------
export function normalizeCodingAssessment(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const id = raw.id || raw.assessmentId || `code_task_${Date.now()}`;
  const courseId = raw.courseId || raw.course_id || 'course_default';
  const topicId = raw.topicId || raw.topic_id || raw.conceptId || id;
  const title = typeof raw.title === 'string' ? raw.title : 'Algorithmic Coding Challenge';

  // Safely extract description / problem statement / prompt
  let description = '';
  if (typeof raw.description === 'string') {
    description = raw.description;
  } else if (typeof raw.problemStatement === 'string') {
    description = raw.problemStatement;
  } else if (typeof raw.prompt === 'string') {
    description = raw.prompt;
  } else if (raw.prompt && typeof raw.prompt === 'object') {
    description = raw.prompt.prompt || raw.prompt.description || raw.prompt.text || '';
  } else if (raw.description && typeof raw.description === 'object') {
    description = raw.description.prompt || raw.description.description || '';
  }

  // Safely extract rubric
  let rubric = null;
  if (typeof raw.rubric === 'string') {
    rubric = raw.rubric;
  } else if (raw.rubric && typeof raw.rubric === 'object') {
    rubric = raw.rubric;
  } else if (raw.prompt && typeof raw.prompt === 'object' && raw.prompt.rubric) {
    rubric = raw.prompt.rubric;
  }

  const difficulty = typeof raw.difficulty === 'string' ? raw.difficulty : 'Medium';
  const constraints = typeof raw.constraints === 'string'
    ? raw.constraints
    : Array.isArray(raw.constraints)
    ? raw.constraints.join('\n')
    : 'Time Limit: 2000ms | Memory Limit: 256MB';
  const inputFormat = typeof raw.inputFormat === 'string' ? raw.inputFormat : (raw.input_format || 'Standard input format via stdin');
  const outputFormat = typeof raw.outputFormat === 'string' ? raw.outputFormat : (raw.output_format || 'Return the expected result');
  const supportedLanguages = Array.isArray(raw.supportedLanguages)
    ? raw.supportedLanguages
    : Array.isArray(raw.allowedLanguages)
    ? raw.allowedLanguages
    : ['python', 'javascript'];
  const timeLimitMs = Number(raw.timeLimitMs || raw.time_limit_ms || 2000);
  const memoryLimitMb = Number(raw.memoryLimitMb || raw.memory_limit_mb || 256);
  const status = raw.status || 'published';

  // Starter Code templates
  const starterCode = raw.starterCode || {
    python: `# Implement solution for ${title}\ndef solve(input_data):\n    # Write your solution here\n    pass\n`,
    javascript: `// Implement solution for ${title}\nfunction solve(inputData) {\n  // Write your solution here\n}\n`,
  };

  // Sample Examples
  const examples = Array.isArray(raw.examples)
    ? raw.examples
    : Array.isArray(raw.sampleTests)
    ? raw.sampleTests.map((st, i) => ({
        id: `ex_${i + 1}`,
        input: typeof st.input === 'object' ? JSON.stringify(st.input) : String(st.input || ''),
        output: typeof (st.expectedOutput || st.output) === 'object' ? JSON.stringify(st.expectedOutput || st.output) : String(st.expectedOutput || st.output || ''),
        explanation: st.explanation || `Sample case ${i + 1}`,
      }))
    : [];

  // Normalize vivaQuestion ensuring it never renders raw objects directly
  let vivaQuestion = {
    prompt: 'Explain the invariant guarantees, computational time complexity O(N), and space trade-offs of your approach.',
    rubric: 'Evaluates algorithm comprehension, runtime invariants, and edge case resilience.',
  };

  if (typeof raw.vivaQuestion === 'string') {
    vivaQuestion = {
      prompt: raw.vivaQuestion,
      rubric: rubric || 'Evaluates algorithm comprehension, runtime invariants, and edge case resilience.',
    };
  } else if (raw.vivaQuestion && typeof raw.vivaQuestion === 'object') {
    vivaQuestion = {
      prompt: typeof raw.vivaQuestion.prompt === 'string'
        ? raw.vivaQuestion.prompt
        : 'Explain the runtime invariants and space/time complexity.',
      rubric: typeof raw.vivaQuestion.rubric === 'string'
        ? raw.vivaQuestion.rubric
        : rubric || 'Evaluates algorithm comprehension, runtime invariants, and edge case resilience.',
    };
  }

  return {
    id,
    courseId,
    topicId,
    conceptId: raw.conceptId || topicId,
    concept: raw.concept || raw.conceptName || title,
    title,
    description: description || 'Implement the algorithmic solution satisfying boundary invariants and asymptotic bounds.',
    problemStatement: description || 'Implement the algorithmic solution satisfying boundary invariants and asymptotic bounds.',
    prompt: description,
    rubric,
    difficulty,
    constraints,
    inputFormat,
    outputFormat,
    examples,
    sampleTests: examples.map((ex) => ({
      input: ex.input,
      expectedOutput: ex.output,
      explanation: ex.explanation,
    })),
    starterCode,
    supportedLanguages,
    allowedLanguages: supportedLanguages,
    timeLimitMs,
    memoryLimitMb,
    testCaseSummary: raw.testCaseSummary || {
      publicTests: examples.length || 2,
      hiddenTests: raw.hiddenTestsCount || 15,
    },
    vivaQuestion,
    status,
  };
}
