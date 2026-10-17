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

  CODING_GEN: {
    version: '1.0.0',
    description: 'Generates structured coding assessment with test cases, starter templates, and viva prompt',
    format: 'json',
    buildPrompt({ topic, conceptName, difficulty = 'intermediate' }) {
      return {
        systemPrompt: `You are an expert computer science professor and technical interviewer. Output ONLY valid JSON adhering to the following schema:
{
  "title": "Clear algorithm problem title",
  "description": "Full problem description, input format, output format, and constraints.",
  "difficulty": "${difficulty}",
  "constraints": "Time Limit: 2000ms | Memory Limit: 256MB",
  "starterCode": {
    "python": "def solve(n):\\n    # Write your code here\\n    pass\\n",
    "javascript": "function solve(n) {\\n    // Write your code here\\n}\\n"
  },
  "testCases": [
    {"input": "5", "expectedOutput": "25", "isHidden": false, "weight": 1},
    {"input": "10", "expectedOutput": "100", "isHidden": true, "weight": 2}
  ],
  "vivaQuestion": {
    "prompt": "Explain the time complexity of your solution and how it handles edge cases.",
    "rubric": "Evaluates time/space complexity analysis and invariant correctness."
  }
}
Strict constraints:
- Do not output markdown code blocks or conversational preamble.
- Output pure JSON only.`,
        userPrompt: `<context>
Topic: ${topic}
Concept: ${conceptName || topic}
Target Difficulty: ${difficulty}
</context>`,
      };
    },
  },

  CURRICULUM_EXTRACTION: {
    version: '1.0.0',
    description: 'Extracts full curriculum with topics (text+diagram+example), 5 quizzes per topic, and coding challenges from syllabus',
    format: 'json',
    buildPrompt({ syllabusText, courseTitle }) {
      return {
        systemPrompt: `You are an expert academic curriculum synthesizer. Parse the course syllabus and output ONLY valid JSON with:
1. concepts: each topic having title, name, description, visualDiagram (ASCII/Mermaid), textContent, and codeExample.
2. quizzes: at least 5 multiple-choice questions per topic covering Bloom taxonomy levels.
3. codingAssessments: an applicable coding challenge for each programming topic with starter code and test cases.`,
        userPrompt: `<syllabus>
Course: ${courseTitle}
Content: ${syllabusText}
</syllabus>`,
      };
    },
  },
};
