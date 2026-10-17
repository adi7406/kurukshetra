import { z } from 'zod';

export const generatedQuestionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const generatedQuestionSchema = z
  .object({
    type: z.enum(['mcq_single', 'mcq_multiple', 'short_answer', 'coding', 'theory']),
    stem: z.string().min(5),
    options: z.array(generatedQuestionOptionSchema).optional().default([]),
    correctOptionIds: z.array(z.string()).optional().default([]),
    explanation: z.string().optional().default(''),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    conceptNames: z.array(z.string()).optional().default([]),
    marks: z.number().positive().default(1),
  })
  .refine(
    (q) => {
      if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
        if (!q.options || q.options.length < 2) return false;
        const ids = new Set(q.options.map((o) => o.id));
        if (ids.size !== q.options.length) return false;
        if (!q.correctOptionIds || q.correctOptionIds.length === 0) return false;
        const validIds = new Set(q.options.map((o) => o.id));
        return q.correctOptionIds.every((id) => validIds.has(id));
      }
      return true;
    },
    { message: 'Multiple-choice questions must have distinct options and valid correctOptionIds' }
  );

export const generatedQuestionsArraySchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

export const generatedContentSectionSchema = z.object({
  heading: z.string().min(2),
  content: z.string().min(10),
});

export const generatedContentSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  sections: z.array(generatedContentSectionSchema).min(1),
  keyTakeaways: z.array(z.string().min(3)).optional().default([]),
});

export const generatedTestCaseSchema = z.object({
  id: z.string().optional(),
  input: z.string().default(''),
  expectedOutput: z.string().default(''),
  isHidden: z.boolean().default(false),
  weight: z.number().positive().default(1),
  orderIndex: z.number().int().default(0),
});

export const generatedCodingAssessmentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  constraints: z.string().optional().default('Time Limit: 2000ms | Memory Limit: 256MB'),
  starterCode: z.object({
    python: z.string().min(5),
    javascript: z.string().min(5),
  }),
  testCases: z.array(generatedTestCaseSchema).min(1),
  vivaQuestion: z
    .object({
      prompt: z.string().min(5),
      rubric: z.string().optional().default('Evaluate conceptual complexity, edge cases, and algorithmic invariant guarantees.'),
    })
    .optional(),
});

export const structuredLessonSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(10),
  learningObjectives: z.array(z.string().min(3)).optional().default([]),
  prerequisiteReview: z.string().optional().default(''),
  definitions: z
    .array(
      z.object({
        term: z.string(),
        definition: z.string(),
      })
    )
    .optional()
    .default([]),
  coreExplanation: z.string().min(20),
  workedExamples: z.string().optional().default(''),
  asciiDiagram: z.string().optional().default(''),
  misconceptions: z.array(z.string().min(3)).optional().default([]),
  keyTakeaways: z.array(z.string().min(3)).optional().default([]),
  syllabusReference: z.string().optional().default(''),
  sections: z.array(generatedContentSectionSchema).optional().default([]),
});

export const codingAssessmentsArraySchema = z.object({
  assessments: z.array(generatedCodingAssessmentSchema).min(1),
});

export const syllabusTopicItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  module: z.string().optional().default('Module 1: Core Fundamentals'),
  prerequisite: z.string().optional().default('Foundational Programming'),
  prerequisiteReview: z.string().optional().default(''),
  description: z.string().optional().default(''),
  isProgrammingTopic: z.boolean().optional().default(true),
});

export const syllabusTopicsListSchema = z.object({
  courseTitle: z.string().min(2),
  moduleName: z.string().optional().default('Module 1: Core Fundamentals'),
  isProgrammingSubject: z.boolean().optional().default(true),
  topics: z.array(syllabusTopicItemSchema).min(1),
});

export const generatedCurriculumSchema = z.object({
  courseTitle: z.string().min(3),
  moduleName: z.string().optional(),
  concepts: z.array(z.any()).min(1),
  quizzes: z.array(z.any()).optional().default([]),
  codingAssessments: z.array(z.any()).optional().default([]),
});

