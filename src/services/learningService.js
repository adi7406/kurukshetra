/**
 * Learning and Assessment Service
 * Implements Courses, Concepts, Quizzes, Coding Submissions, and Mastery
 */

import {
  INITIAL_COURSES,
  INITIAL_QUIZZES,
  INITIAL_ASSESSMENTS,
  INITIAL_PROGRESS_DATA,
  INITIAL_TEACHER_DASHBOARD,
} from './mockData';

// In-memory / localStorage cache for interactive demo experience
const COURSES_KEY = 'pathwise_courses_store';
const QUIZZES_KEY = 'pathwise_quizzes_store';
const ASSESSMENTS_KEY = 'pathwise_assessments_store';
const PROGRESS_KEY = 'pathwise_progress_store';
const TEACHER_KEY = 'pathwise_teacher_store';

function getOrInit(key, fallback) {
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      // Fallback if corrupt
    }
  }
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

export const learningService = {
  // Course and Concepts
  async getCourses() {
    return getOrInit(COURSES_KEY, INITIAL_COURSES);
  },

  async getCourseById(courseId) {
    const courses = await this.getCourses();
    return courses.find((c) => c.id === courseId) || courses[0];
  },

  async getAllConcepts() {
    const courses = await this.getCourses();
    const concepts = [];
    courses.forEach((c) => {
      c.modules?.forEach((m) => {
        m.concepts?.forEach((concept) => {
          concepts.push({
            ...concept,
            courseId: c.id,
            courseTitle: c.title,
            moduleTitle: m.title,
          });
        });
      });
    });
    return concepts;
  },

  async updateConcept(conceptId, updates) {
    const courses = await this.getCourses();
    let updated = null;
    courses.forEach((c) => {
      c.modules?.forEach((m) => {
        m.concepts?.forEach((concept) => {
          if (concept.id === conceptId) {
            Object.assign(concept, updates);
            updated = concept;
          }
        });
      });
    });
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
    return updated;
  },

  // Quizzes
  async getQuizzes() {
    return getOrInit(QUIZZES_KEY, INITIAL_QUIZZES);
  },

  async getQuizById(quizId) {
    const quizzes = await this.getQuizzes();
    return quizzes.find((q) => q.id === quizId) || null;
  },

  async submitQuizAttempt(quizId, answers) {
    const quizzes = await this.getQuizzes();
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) throw new Error('Quiz not found');

    let correctCount = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    quiz.status = 'completed';
    quiz.lastAttemptScore = score;
    quiz.lastAttemptDate = 'Just now';

    localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));

    // Also update concept mastery slightly based on result
    if (quiz.conceptId) {
      await this.recordLearningAttempt(quiz.conceptId, score >= quiz.passingScore);
    }

    return {
      score,
      correctCount,
      totalCount: quiz.questions.length,
      passed: score >= quiz.passingScore,
      details: quiz.questions.map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        selectedOption: answers[q.id],
        correctOption: q.correctIndex,
        isCorrect: answers[q.id] === q.correctIndex,
        explanation: q.explanation,
      })),
    };
  },

  // Coding Assessments
  async getAssessments() {
    return getOrInit(ASSESSMENTS_KEY, INITIAL_ASSESSMENTS);
  },

  async getAssessmentById(id) {
    const list = await this.getAssessments();
    return list.find((a) => a.id === id) || null;
  },

  async runCode(assessmentId, code, language) {
    // Simulated sandbox run against sample tests
    await new Promise((res) => setTimeout(res, 850)); // Simulating execution delay

    // Basic heuristic to verify if code has syntax errors or runtime issues
    if (!code || code.trim().length === 0) {
      return {
        status: 'Compilation Error',
        success: false,
        output: 'Error: Empty source code submitted.',
        executionTimeMs: 12,
        memoryKb: 3400,
      };
    }

    return {
      status: 'Sample Tests Passed',
      success: true,
      output: `[Execution complete in 42ms | Memory: 8.4MB]\nRunning sample test 1: Passed\nAll 1 sample test cases succeeded. Note: Run Code only tests sample cases. Official score requires Submission.`,
      executionTimeMs: 42,
      memoryKb: 8600,
    };
  },

  async submitSolution(assessmentId, code, language) {
    // Simulated isolated sandbox execution against hidden test suite
    await new Promise((res) => setTimeout(res, 1200));

    const assessments = await this.getAssessments();
    const item = assessments.find((a) => a.id === assessmentId);
    if (item) {
      item.status = 'completed';
      localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments));
    }

    // Update mastery evidence
    if (item?.conceptId) {
      await this.recordLearningAttempt(item.conceptId, true);
    }

    return {
      status: 'Accepted',
      success: true,
      testsPassed: 18,
      totalTests: 18,
      runtimeMs: 58,
      memoryMb: 14.2,
      vivaQuestions: item?.vivaQuestions || [],
    };
  },

  // Code Viva evaluation (FR-15)
  async evaluateVivaAnswer(questionId, answer) {
    await new Promise((res) => setTimeout(res, 900));

    const wordCount = answer.trim().split(/\s+/).length;
    const isAdequate = wordCount >= 8;

    return {
      evaluated: true,
      score: isAdequate ? 92 : 55,
      feedback: isAdequate
        ? 'Well articulated. Your explanation accurately reflects the O(1) amortized access and edge-case prevention mechanisms implemented in your code.'
        : 'Explanation is too brief. Please elaborate on specific invariants and pointer movements in your solution.',
    };
  },

  // Progress and Mastery
  async getProgress() {
    return getOrInit(PROGRESS_KEY, INITIAL_PROGRESS_DATA);
  },

  async recordLearningAttempt(conceptId, isSuccess) {
    const progress = await this.getProgress();
    const item = progress.conceptBreakdown.find((c) => c.conceptId === conceptId);
    if (item) {
      const alpha = 0.15; // Learning rate from PRD Section 9.1
      const observed = isSuccess ? 100 : 0;
      item.mastery = Math.min(100, Math.max(0, Math.round(item.mastery + alpha * (observed - item.mastery))));
      item.evidenceCount += 1;
      item.lastUpdated = 'Just now';

      if (item.mastery >= 75) {
        item.status = 'Mastered';
      } else if (item.mastery >= 50) {
        item.status = 'Developing';
      } else {
        item.status = 'Needs Practice';
      }

      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  },

  // Teacher dashboard
  async getTeacherDashboard() {
    return getOrInit(TEACHER_KEY, INITIAL_TEACHER_DASHBOARD);
  },

  async resolveReviewItem(reviewId, action, notes) {
    const data = await this.getTeacherDashboard();
    data.reviewQueue = data.reviewQueue.filter((r) => r.id !== reviewId);
    data.overview.pendingContentReviews = Math.max(0, data.overview.pendingContentReviews - 1);
    localStorage.setItem(TEACHER_KEY, JSON.stringify(data));
    return { success: true };
  },

  /**
   * Publish new curriculum from syllabus ingestion
   * Persists concepts (with text, diagram, example), quizzes (5+ per topic), and coding assessments
   */
  async publishCurriculum(extractedData) {
    if (!extractedData) return false;

    // 1. Update Courses Store
    const courses = await this.getCourses();
    const targetCourse = courses[0] || {
      id: 'course_dsa',
      code: 'CS201',
      title: extractedData.courseTitle || 'Data Structures & Algorithmic Problem Solving',
      instructor: 'Dr. Priya Nair',
      modules: [],
    };

    // Find or create module
    let targetModule = targetCourse.modules?.find(
      (m) => m.title.toLowerCase() === (extractedData.moduleName || '').toLowerCase()
    );

    if (!targetModule) {
      targetModule = {
        id: `mod_${Date.now()}`,
        title: extractedData.moduleName || 'Module 1: Linear & Key-Value Structures',
        concepts: [],
      };
      targetCourse.modules = [targetModule, ...(targetCourse.modules || [])];
    }

    // Merge concepts
    extractedData.concepts.forEach((newConcept) => {
      const existingIdx = targetModule.concepts.findIndex(
        (c) => c.name.toLowerCase() === newConcept.name.toLowerCase()
      );
      if (existingIdx !== -1) {
        targetModule.concepts[existingIdx] = { ...targetModule.concepts[existingIdx], ...newConcept };
      } else {
        targetModule.concepts.push(newConcept);
      }
    });

    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));

    // 2. Update Quizzes Store (Comprehensive 5-question quizzes for each topic)
    if (extractedData.quizzes && extractedData.quizzes.length > 0) {
      const existingQuizzes = await this.getQuizzes();

      const groupedByConcept = {};
      extractedData.quizzes.forEach((q) => {
        if (!groupedByConcept[q.conceptId]) {
          groupedByConcept[q.conceptId] = {
            id: `quiz_full_${q.conceptId}`,
            title: `${q.conceptName}: Diagnostic Mastery Quiz (5 Questions)`,
            conceptId: q.conceptId,
            conceptName: q.conceptName,
            difficulty: 'Comprehensive',
            timeLimit: '15 mins',
            passingScore: 70,
            status: 'pending',
            questions: [],
          };
        }
        groupedByConcept[q.conceptId].questions.push({
          id: `q_${q.id}`,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        });
      });

      const allMerged = [...Object.values(groupedByConcept), ...existingQuizzes];
      const uniqueQuizzes = Array.from(new Map(allMerged.map((q) => [q.id, q])).values());
      localStorage.setItem(QUIZZES_KEY, JSON.stringify(uniqueQuizzes));
    }

    // 3. Update Coding Assessments Store
    if (extractedData.codingAssessments && extractedData.codingAssessments.length > 0) {
      const existingAssessments = await this.getAssessments();
      const newAssessments = extractedData.codingAssessments.map((ca) => ({
        id: ca.id,
        title: ca.title,
        conceptId: ca.conceptId,
        concept: ca.conceptName,
        difficulty: ca.difficulty,
        timeLimit: '45 mins',
        status: 'pending',
        description: ca.description,
        constraints: ca.constraints,
        starterCode: {
          python: ca.starterCode,
          javascript: `// Implement solution for ${ca.title}\nfunction solve(input) {\n  // TODO\n}`,
        },
        sampleTests: ca.sampleTests || [],
        hiddenTestsCount: ca.hiddenTestsCount || 15,
        vivaPrompt: ca.vivaQuestion,
      }));

      const mergedAssessments = [...newAssessments, ...existingAssessments];
      const uniqueAssessments = Array.from(new Map(mergedAssessments.map((a) => [a.id, a])).values());
      localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(uniqueAssessments));
    }

    return true;
  },
};
