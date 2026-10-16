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
