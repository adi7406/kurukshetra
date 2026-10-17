/**
 * Versioned prompt registry for AI generation and evaluation tasks
 */
export const PROMPT_REGISTRY = {
  QUESTION_GEN: {
    version: '2.0.0',
    description: 'Generates structured multiple-choice questions (default 10) based on topic and concept',
    format: 'json',
    buildPrompt({ topic, conceptName, difficulty = 'intermediate', count = 10, existingQuestions = [] }) {
      return {
        systemPrompt: `You are an expert academic curriculum author and computer science professor. Output ONLY valid JSON adhering to the following schema:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq_single",
      "stem": "Precise conceptual question stem?",
      "options": [
        {"id": "A", "text": "Distractor or correct option text 1"},
        {"id": "B", "text": "Distractor or correct option text 2"},
        {"id": "C", "text": "Distractor or correct option text 3"},
        {"id": "D", "text": "Distractor or correct option text 4"}
      ],
      "correctOptionIds": ["A"],
      "correctIndex": 0,
      "explanation": "Clear pedagogical explanation of why this answer is correct and why the distractors are incorrect.",
      "difficulty": "${difficulty}",
      "conceptNames": ["${conceptName || topic}"],
      "marks": 1
    }
  ]
}
Strict constraints:
- Generate EXACTLY ${count} distinct multiple-choice questions.
- Every question must have exactly 4 options (A, B, C, D) and exactly 1 correct option.
- Ensure correctOptionIds corresponds exactly to one of the options.
- Provide a rigorous pedagogical explanation for every question.
- Do not output markdown fences or conversational text. Output pure JSON only.`,
        userPrompt: `<context>
Topic: ${topic}
Concept: ${conceptName || topic}
Target Difficulty: ${difficulty}
Count: ${count}
Existing Questions to avoid: ${JSON.stringify(existingQuestions.slice(0, 5))}
</context>`,
      };
    },
  },

  CONTENT_GEN: {
    version: '2.0.0',
    description: 'Generates complete structured lesson containing all required educational components',
    format: 'json',
    buildPrompt({ title, conceptName, difficulty = 'intermediate', focusTopic, language = 'Java', syllabusContext = '' }) {
      return {
        systemPrompt: `You are an expert computer science professor and instructional designer. Output ONLY valid JSON adhering to the following schema:
{
  "title": "Topic title",
  "summary": "Concise 2-3 sentence overview of this topic and its role in computing.",
  "learningObjectives": [
    "Analyze and explain core invariants...",
    "Implement state manipulation and boundary logic...",
    "Evaluate asymptotic complexities and trade-offs..."
  ],
  "prerequisiteReview": "Foundational prerequisites needed to understand this topic.",
  "definitions": [
    {"term": "Core Term 1", "definition": "Rigorous definition..."},
    {"term": "Core Term 2", "definition": "Rigorous definition..."}
  ],
  "coreExplanation": "Comprehensive theoretical explanation of the concept, mechanics, and invariant guarantees (at least 150 words).",
  "workedExamples": "// Complete runnable code example in ${language} with clean formatting\\n...",
  "asciiDiagram": "+---------------------------------------------------+\\n|                  MEMORY BUFFER LAYOUT             |\\n+---------------------------------------------------+",
  "misconceptions": [
    "Common misconception 1 and how to avoid it.",
    "Common misconception 2 and runtime pitfalls."
  ],
  "keyTakeaways": [
    "Essential takeaway 1",
    "Essential takeaway 2",
    "Essential takeaway 3"
  ],
  "syllabusReference": "Aligned with syllabus core topics."
}
Strict constraints:
- No placeholder strings like 'Content will appear here'. Generate complete, real instructional material.
- Diagram must contain a valid, renderable ASCII diagram.
- Code example must be complete, syntactically correct, and runnable in ${language}.
- Output pure JSON only without markdown fences.`,
        userPrompt: `<context>
Topic Title: ${title || conceptName}
Concept: ${conceptName}
Language: ${language}
Difficulty: ${difficulty}
Syllabus Context: ${syllabusContext || focusTopic || 'Core concepts and implementation'}
</context>`,
      };
    },
  },

  CODING_GEN: {
    version: '2.0.0',
    description: 'Generates exactly 2 distinct coding assessments per programming topic with test suites',
    format: 'json',
    buildPrompt({ topic, conceptName, difficulty = 'intermediate', count = 2 }) {
      return {
        systemPrompt: `You are an expert algorithmic assessment designer and computer science professor. Output ONLY valid JSON adhering to the following schema:
{
  "assessments": [
    {
      "title": "Clear algorithm problem title",
      "description": "Full problem description, input format, output format, and constraints.",
      "difficulty": "${difficulty}",
      "constraints": "Time Limit: 2000ms | Memory Limit: 256MB",
      "inputFormat": "Description of input stream",
      "outputFormat": "Description of expected output",
      "sampleInput": "5",
      "sampleOutput": "25",
      "starterCode": {
        "python": "def solve(n):\\n    # Write your solution here\\n    pass\\n",
        "javascript": "function solve(n) {\\n    // Write your solution here\\n}\\n",
        "java": "public class Solution {\\n    public static int solve(int n) {\\n        return 0;\\n    }\\n}"
      },
      "referenceSolution": {
        "python": "def solve(n):\\n    return n * n\\n"
      },
      "testCases": [
        {"input": "5", "expectedOutput": "25", "isHidden": false, "weight": 1},
        {"input": "3", "expectedOutput": "9", "isHidden": false, "weight": 1},
        {"input": "10", "expectedOutput": "100", "isHidden": true, "weight": 2},
        {"input": "0", "expectedOutput": "0", "isHidden": true, "weight": 2},
        {"input": "12", "expectedOutput": "144", "isHidden": true, "weight": 2}
      ],
      "vivaQuestion": {
        "prompt": "Explain the time and space complexity of your solution and how it handles edge cases.",
        "rubric": "Evaluates time/space complexity analysis and invariant correctness."
      }
    }
  ]
}
Strict constraints:
- Generate EXACTLY ${count} distinct coding challenges suitable for the topic.
- Include at least 2 public test cases and at least 3 hidden evaluation test cases per challenge.
- Starter code must be provided for python, javascript, and java.
- Reference solution must be provided.
- Do not output markdown code blocks. Output pure JSON only.`,
        userPrompt: `<context>
Topic: ${topic}
Concept: ${conceptName || topic}
Target Difficulty: ${difficulty}
Count: ${count}
</context>`,
      };
    },
  },

  SYLLABUS_ANALYZE_TOPICS: {
    version: '2.0.0',
    description: 'Extracts discrete topic list and course structure from course syllabus',
    format: 'json',
    buildPrompt({ syllabusText, courseTitle }) {
      return {
        systemPrompt: `You are an expert curriculum architect. Parse the uploaded syllabus and identify all candidate topics.
Output ONLY valid JSON adhering to the following schema:
{
  "courseTitle": "${courseTitle || 'Computer Science'}",
  "moduleName": "Module 1: Core Fundamentals",
  "isProgrammingSubject": true,
  "topics": [
    {
      "id": "topic_1",
      "name": "Topic Name (e.g. Classes, Objects & Encapsulation)",
      "module": "Module 1: Encapsulation & Polymorphic Architectures",
      "prerequisite": "Foundational Programming & Memory Pointers",
      "prerequisiteReview": "Review of stack/heap allocation and references.",
      "description": "High level description of this topic.",
      "isProgrammingTopic": true
    }
  ]
}
Strict constraints:
- Extract all valid topics identified in the syllabus (typically 3 to 6 discrete units).
- Each topic must be distinct and specific.
- Indicate if the subject/topic is programming-based.
- Output pure JSON only.`,
        userPrompt: `<syllabus>
Course: ${courseTitle}
Content: ${syllabusText}
</syllabus>`,
      };
    },
  },

  CURRICULUM_EXTRACTION: {
    version: '2.0.0',
    description: 'Extracts full curriculum with topics, exactly 10 quizzes per topic, and 2 coding challenges per programming topic',
    format: 'json',
    buildPrompt({ syllabusText, courseTitle }) {
      return {
        systemPrompt: `You are an expert academic curriculum synthesizer. Parse the course syllabus and output ONLY valid JSON with:
1. concepts: each topic having title, name, description, visualDiagram (ASCII/Mermaid), textContent, and codeExample.
2. quizzes: exactly 10 multiple-choice questions per topic covering Bloom taxonomy levels.
3. codingAssessments: exactly 2 coding challenges for each programming topic with starter code, sample tests, and hidden tests.`,
        userPrompt: `<syllabus>
Course: ${courseTitle}
Content: ${syllabusText}
</syllabus>`,
      };
    },
  },
};
