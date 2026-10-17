/**
 * Learning and Assessment Service
 * Connects directly to backend REST endpoints via apiClient to fetch live dynamic data:
 * - Courses, Modules, and Concepts
 * - Quizzes and Diagnostic Attempts
 * - Coding Sandbox Assessments, Test Suites & AI Viva
 * - Real-time Bayesian Mastery & Progress Analytics
 * - Instructor Dashboard & Review Queue
 */

import { apiClient } from './apiClient';
import {
  INITIAL_PROGRESS_DATA,
  INITIAL_TEACHER_DASHBOARD,
} from './mockData';
import {
  normalizeConcept,
  normalizeQuiz,
  normalizeCodingAssessment,
} from '../utils/contentContracts';

const CACHE_VERSION_KEY = 'pathwise_cache_version';
const CURRENT_CACHE_VERSION = 'v3_live_api';

const COURSES_KEY = 'pathwise_courses_store';
const QUIZZES_KEY = 'pathwise_quizzes_store';
const ASSESSMENTS_KEY = 'pathwise_assessments_store';
const PROGRESS_KEY = 'pathwise_progress_store';
const TEACHER_KEY = 'pathwise_teacher_store';

// Purge any stale legacy static data from previous runs
function ensureCleanCache() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const version = localStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CURRENT_CACHE_VERSION) {
        localStorage.removeItem(COURSES_KEY);
        localStorage.removeItem(QUIZZES_KEY);
        localStorage.removeItem(ASSESSMENTS_KEY);
        localStorage.removeItem(PROGRESS_KEY);
        localStorage.removeItem(TEACHER_KEY);
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

ensureCleanCache();

function getCached(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore parse error
  }
  return fallback;
}

function setCached(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota error
  }
}

export const learningService = {
  // =========================================================================
  // COURSES & CONCEPTS
  // =========================================================================
  async getCourses() {
    try {
      const response = await apiClient.get('/courses');
      const courses = Array.isArray(response) ? response : response?.data || response?.courses || [];
      if (Array.isArray(courses) && courses.length > 0) {
        setCached(COURSES_KEY, courses);
        return courses;
      }
    } catch {
      // Backend not yet running or route pending
    }
    return getCached(COURSES_KEY, []);
  },

  async getCourseById(courseId) {
    try {
      const response = await apiClient.get(`/courses/${courseId}`);
      const course = response?.data || response;
      if (course && course.id) return course;
    } catch {
      // Backend not yet running or route pending
    }
    const courses = await this.getCourses();
    return courses.find((c) => c.id === courseId) || null;
  },

  async getAllConcepts() {
    try {
      const response = await apiClient.get('/concepts');
      const concepts = Array.isArray(response) ? response : response?.data || response?.concepts || [];
      if (Array.isArray(concepts) && concepts.length > 0) {
        return concepts.map(normalizeConcept).filter(Boolean);
      }
    } catch {
      // Backend not yet running or route pending
    }

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
    try {
      const response = await apiClient.patch(`/concepts/${conceptId}`, updates);
      if (response?.data) return response.data;
    } catch {
      // Fallback to updating local cache
    }

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
    setCached(COURSES_KEY, courses);
    return updated;
  },

  // =========================================================================
  // QUIZZES & DIAGNOSTIC ATTEMPTS
  // =========================================================================
  async getQuizzes() {
    try {
      const response = await apiClient.get('/quizzes');
      const rawList = Array.isArray(response) ? response : response?.data || response?.quizzes || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const quizzes = rawList.map(normalizeQuiz).filter(Boolean);
        setCached(QUIZZES_KEY, quizzes);
        return quizzes;
      }
    } catch {
      // Backend not yet running or route pending
    }
    const cached = getCached(QUIZZES_KEY, []);
    return cached.map(normalizeQuiz).filter(Boolean);
  },

  async getQuizById(quizId) {
    try {
      const response = await apiClient.get(`/quizzes/${quizId}`);
      const raw = response?.data || response;
      if (raw && raw.id) return normalizeQuiz(raw);
    } catch {
      // Backend not yet running or route pending
    }
    const quizzes = await this.getQuizzes();
    return quizzes.find((q) => q.id === quizId) || null;
  },

  async submitQuizAttempt(quizId, answers) {
    try {
      const response = await apiClient.post(`/quizzes/${quizId}/submit`, { answers });
      return response?.data || response;
    } catch {
      const response = await apiClient.post(`/quizzes/${quizId}/attempts`, { answers });
      return response?.data || response;
    }
  },

  // =========================================================================
  // CODING ASSESSMENTS & JUDGE0 EXECUTION
  // =========================================================================
  async getAssessments() {
    try {
      const response = await apiClient.get('/assessments');
      const rawList = Array.isArray(response) ? response : response?.data || response?.assessments || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const assessments = rawList.map(normalizeCodingAssessment).filter(Boolean);
        setCached(ASSESSMENTS_KEY, assessments);
        return assessments;
      }
    } catch {
      // Route pending or empty collection
    }
    const cached = getCached(ASSESSMENTS_KEY, []);
    return cached.map(normalizeCodingAssessment).filter(Boolean);
  },

  async getAssessmentById(id) {
    try {
      const response = await apiClient.get(`/assessments/${id}`);
      const item = response?.data || response;
      if (item && item.id) return normalizeCodingAssessment(item);
    } catch {
      // Route pending or empty collection
    }
    const list = await this.getAssessments();
    return list.find((a) => a.id === id) || null;
  },

  async getSupportedLanguages() {
    try {
      const response = await apiClient.get('/coding/languages');
      const data = response?.data || response;
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback to standard verified languages
    }
    return [
      { id: 'python', label: 'Python (3.10)', extension: '.py', monacoLanguage: 'python' },
      { id: 'javascript', label: 'JavaScript (Node.js)', extension: '.js', monacoLanguage: 'javascript' },
      { id: 'cpp', label: 'C++ (GCC 10.2)', extension: '.cpp', monacoLanguage: 'cpp' },
      { id: 'java', label: 'Java (OpenJDK 15)', extension: '.java', monacoLanguage: 'java' },
    ];
  },

  async getPistonHealth() {
    try {
      const response = await apiClient.get('/health/piston');
      return response?.data || response;
    } catch {
      return { healthy: false, runtimesCount: 0 };
    }
  },

  async getSubmissions(assessmentId) {
    try {
      const response = await apiClient.get(`/coding/assessments/${assessmentId}/submissions`);
      return response?.data || response || [];
    } catch {
      return [];
    }
  },

  async runCode(assessmentId, code, language, customInput = null) {
    const response = await apiClient.post(`/assessments/${assessmentId}/run`, {
      code,
      language,
      customInput,
    });
    return response?.data || response;
  },

  async submitSolution(assessmentId, code, language) {
    const response = await apiClient.post(`/assessments/${assessmentId}/submit`, { code, language });
    const result = response?.data || response;
    return {
      ...result,
      submissionId: result.submissionId || result.id || `sub_${Date.now()}`,
      status: result.status || (result.success ? 'Accepted' : 'Tests Failed'),
      testsPassed: result.testsPassed !== undefined ? result.testsPassed : (result.passedCount || 0),
      totalTests: result.totalTests !== undefined ? result.totalTests : (result.totalCount || 0),
      runtimeMs: result.runtimeMs || result.executionTimeMs || 0,
      memoryMb: result.memoryMb || (result.memoryBytes ? Math.round((result.memoryBytes / (1024 * 1024)) * 10) / 10 : 0),
      vivaQuestions: result.vivaQuestions || [
        { prompt: 'Explain the invariant guarantees and computational time complexity of your approach.' },
      ],
    };
  },

  async evaluateVivaAnswer(questionId, answer, submissionId = null) {
    const response = await apiClient.post('/assessments/viva/evaluate', {
      questionId,
      answer,
      submissionId,
    });
    return response?.data || response;
  },

  // =========================================================================
  // TELEMETRY RECORDING & SESSION REPLAY
  // =========================================================================
  async recordSessionEvents(sessionId, events, isFinal = false) {
    if (!sessionId || !events || events.length === 0) return { recordedCount: 0 };
    return await apiClient.post(`/coding-sessions/${sessionId}/events`, {
      events,
      isFinal,
    });
  },

  async getSessionReplay(sessionId) {
    const res = await apiClient.get(`/coding-sessions/${sessionId}/replay`);
    return res?.data || res || { sessionId, events: [], totalSeconds: 0 };
  },

  async getSessionSignals(sessionId) {
    const res = await apiClient.get(`/coding-sessions/${sessionId}/integrity-signals`);
    return res?.data || (Array.isArray(res) ? res : []);
  },

  async resolveIntegrityReview(reviewId, status = 'reviewed', notes = '') {
    return await apiClient.patch(`/integrity-reviews/${reviewId}`, {
      reviewStatus: status,
      reviewerNotes: notes,
    });
  },

  // =========================================================================
  // PROGRESS & MASTERY EVIDENCE
  // =========================================================================
  async getProgress() {
    try {
      const response = await apiClient.get('/me/progress');
      const progress = response?.data || response;
      if (progress && progress.conceptBreakdown) {
        setCached(PROGRESS_KEY, progress);
        return progress;
      }
    } catch {
      // Backend not yet running or route pending
    }
    return getCached(PROGRESS_KEY, INITIAL_PROGRESS_DATA);
  },

  async recordLearningAttempt(conceptId, isSuccess) {
    try {
      await apiClient.post('/me/attempts', { conceptId, isSuccess });
    } catch {
      // Record in local cache
    }

    const progress = await this.getProgress();
    const breakdown = progress.conceptBreakdown || [];
    const item = breakdown.find((c) => c.conceptId === conceptId);
    if (item) {
      const alpha = 0.15;
      const observed = isSuccess ? 100 : 0;
      item.mastery = Math.min(100, Math.max(0, Math.round((item.mastery || 0) + alpha * (observed - (item.mastery || 0)))));
      item.evidenceCount = (item.evidenceCount || 0) + 1;
      item.lastUpdated = 'Just now';

      if (item.mastery >= 75) {
        item.status = 'Mastered';
      } else if (item.mastery >= 50) {
        item.status = 'Developing';
      } else {
        item.status = 'Needs Practice';
      }

      setCached(PROGRESS_KEY, progress);
    }
  },

  // =========================================================================
  // TEACHER DASHBOARD & CURRICULUM PUBLICATION
  // =========================================================================
  async getTeacherDashboard() {
    try {
      const response = await apiClient.get('/teacher/dashboard');
      const dashboard = response?.data || response;
      if (dashboard && dashboard.overview) {
        setCached(TEACHER_KEY, dashboard);
        return dashboard;
      }
    } catch {
      // Backend not yet running or route pending
    }
    return getCached(TEACHER_KEY, INITIAL_TEACHER_DASHBOARD);
  },

  async resolveReviewItem(reviewId) {
    try {
      await apiClient.post(`/teacher/reviews/${reviewId}/resolve`);
    } catch {
      // Fallback to cache update
    }

    const data = await this.getTeacherDashboard();
    data.reviewQueue = (data.reviewQueue || []).filter((r) => r.id !== reviewId);
    if (data.overview) {
      data.overview.pendingContentReviews = Math.max(0, (data.overview.pendingContentReviews || 0) - 1);
    }
    setCached(TEACHER_KEY, data);
    return { success: true };
  },

  async publishCurriculum(extractedData) {
    if (!extractedData) return false;

    // Send to backend API if available
    try {
      await apiClient.post('/courses/curriculum', extractedData);
    } catch {
      // Route pending in backend
    }

    // 1. Update Courses Store
    const courses = await this.getCourses();
    const targetCourse = courses[0] || {
      id: `course_${Date.now()}`,
      code: 'CS201',
      title: extractedData.courseTitle || 'Data Structures & Algorithmic Problem Solving (DSA)',
      instructor: 'Department Faculty',
      modules: [],
    };

    let targetModule = targetCourse.modules?.find(
      (m) => m.title.toLowerCase() === (extractedData.moduleName || '').toLowerCase()
    );

    if (!targetModule) {
      targetModule = {
        id: `mod_${Date.now()}`,
        title: extractedData.moduleName || 'Module 1: Linear Sequence Structures & Buffers',
        concepts: [],
      };
      targetCourse.modules = [targetModule, ...(targetCourse.modules || [])];
    }

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

    const mergedCourses = courses.length > 0 ? courses : [targetCourse];
    setCached(COURSES_KEY, mergedCourses);

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
            questionsCount: 5,
            estimatedMinutes: 12,
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
      setCached(QUIZZES_KEY, uniqueQuizzes);
    }

    // 3. Update Coding Assessments Store
    if (extractedData.codingAssessments && extractedData.codingAssessments.length > 0) {
      const existingAssessments = await this.getAssessments();
      const newAssessments = extractedData.codingAssessments.map((ca) => ({
        id: ca.id,
        title: ca.title,
        conceptId: ca.conceptId,
        concept: ca.conceptName,
        difficulty: ca.difficulty || 'Medium',
        timeLimit: '45 mins',
        status: 'pending',
        description: ca.description,
        constraints: ca.constraints,
        allowedLanguages: ['python', 'javascript'],
        starterCode: {
          python: ca.starterCode,
          javascript: `// Implement solution for ${ca.title}\nfunction solve(input) {\n  // TODO\n}`,
        },
        sampleTests: ca.sampleTests || [],
        hiddenTestsCount: ca.hiddenTestsCount || 15,
        vivaQuestion: ca.vivaQuestion,
      }));

      const mergedAssessments = [...newAssessments, ...existingAssessments];
      const uniqueAssessments = Array.from(new Map(mergedAssessments.map((a) => [a.id, a])).values());
      setCached(ASSESSMENTS_KEY, uniqueAssessments);
    }

    return true;
  },
};

export default learningService;
