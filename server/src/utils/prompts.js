/**
 * Versioned prompt registry for AI generation and evaluation tasks
 */
export const PROMPT_REGISTRY = {
  QUESTION_GEN: {
    version: '1.0.0',
    description: 'Generates structured multiple-choice, coding, or theory draft questions based on topic and concept',
    format: 'json',
    buildPrompt({ topic, conceptName, difficulty = 'intermediate', count = 3, existingQuestions = [] }) {
      return {
        systemPrompt: `You are an expert curriculum author. Output ONLY valid JSON adhering to the following schema:
{
  "questions": [
    {
      "type": "mcq_single",
      "stem": "Question prompt here?",
      "options": [
        {"id": "A", "text": "Option text 1"},
        {"id": "B", "text": "Option text 2"},
        {"id": "C", "text": "Option text 3"},
        {"id": "D", "text": "Option text 4"}
      ],
      "correctOptionIds": ["A"],
      "explanation": "Explanation of correct choice.",
      "difficulty": "${difficulty}",
      "conceptNames": ["${conceptName || topic}"],
      "marks": 1
    }
  ]
}
Strict constraints:
- Do not output markdown code blocks or conversational preamble.
- Separate question text from answers.
- Ensure correctOptionIds match valid option IDs.`,
        userPrompt: `<context>
Topic: ${topic}
Concept: ${conceptName || 'General'}
Target Difficulty: ${difficulty}
Count: ${count}
Existing Question Samples to avoid duplicating: ${JSON.stringify(existingQuestions.slice(0, 5))}
</context>`,
      };
    },
  },

  CONTENT_GEN: {
    version: '1.0.0',
    description: 'Generates structured draft learning content and explanations for a syllabus concept',
    format: 'json',
    buildPrompt({ title, conceptName, difficulty = 'intermediate', focusTopic }) {
      return {
        systemPrompt: `You are an expert instructional designer. Output ONLY valid JSON adhering to the following schema:
{
  "title": "Clear educational title",
  "summary": "High-level summary of the concept",
  "sections": [
    {"heading": "Introduction", "content": "Detailed explanatory text."},
    {"heading": "Practical Application", "content": "Example code or walkthrough."}
  ],
  "keyTakeaways": ["Core takeaway 1", "Core takeaway 2"]
}
Strict constraints:
- Do not output markdown code blocks or preamble.
- Output pure JSON only.`,
        userPrompt: `<context>
Title: ${title}
Concept: ${conceptName}
Difficulty: ${difficulty}
Focus: ${focusTopic || 'Comprehensive overview'}
</context>`,
      };
    },
  },
};
