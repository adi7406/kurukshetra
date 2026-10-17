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
import { CURATED_QUIZZES } from './curatedQuizzes';
import { CURATED_CODING_PROBLEMS } from './curatedCodingProblems';
import { deriveTimelineIntegritySignals } from './integrityDerivation';
import { notifyCurriculumPublished } from '../utils/liveSync';

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
  async getCourses(options = {}) {
    let backendCourses = [];
    try {
      const endpoint = options.assignedOnly ? '/courses?assignedOnly=true' : '/courses';
      const response = await apiClient.get(endpoint);
      backendCourses = Array.isArray(response) ? response : response?.data || response?.courses || [];
    } catch {
      // Backend route pending or offline
    }
    const cachedCourses = getCached(COURSES_KEY, []);
    if (backendCourses.length > 0) {
      const merged = backendCourses.map((bc) => {
        const cached = cachedCourses.find((c) => c.id === bc.id || c.title === bc.title);
        if (!cached) return bc;
        const hasBackendConcepts = (bc.modules || []).some((m) => (m.concepts || []).length > 0);
        return {
          ...bc,
          modules: hasBackendConcepts ? bc.modules : (cached.modules || bc.modules),
        };
      });
      setCached(COURSES_KEY, merged);
      return merged;
    }
    return cachedCourses;
  },

  async getCourseCurriculum(courseId) {
    if (!courseId) return null;
    const cacheKey = `pathwise_curriculum_${courseId}`;
    try {
      const response = await apiClient.get(`/courses/${courseId}/curriculum`);
      const data = response?.data || response;
      if (data && (data.concepts || data.quizzes || data.codingAssessments)) {
        setCached(cacheKey, data);
        return data;
      }
    } catch (err) {
      console.warn(`[learningService] Failed to fetch curriculum for course ${courseId}:`, err);
    }
    return getCached(cacheKey, null);
  },

  async updateCourseCurriculum(courseId, { type, itemId, updates }) {
    if (!courseId) return null;
    try {
      const response = await apiClient.patch(`/courses/${courseId}/curriculum`, { type, itemId, updates });
      return response?.data || response;
    } catch (err) {
      console.warn(`[learningService] Failed to patch curriculum for course ${courseId}:`, err);
      throw err;
    }
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
    let backendQuizzes = [];
    try {
      const response = await apiClient.get('/quizzes');
      const raw = Array.isArray(response) ? response : response?.data || response?.quizzes || [];
      if (Array.isArray(raw) && raw.length > 0) {
        backendQuizzes = raw.map(normalizeQuiz).filter(Boolean);
      }
    } catch {
      // offline / fallback mode
    }

    const cachedQuizzes = getCached(QUIZZES_KEY, []).map(normalizeQuiz).filter(Boolean);
    const curated = CURATED_QUIZZES.map(normalizeQuiz);

    // Merge: curated diagnostic quizzes first, then instructor-published quizzes from cache & backend
    const all = [...curated, ...cachedQuizzes, ...backendQuizzes];
    const unique = Array.from(new Map(all.map((q) => [q.id, q])).values());
    return unique;
  },

  async getQuizById(quizId) {
    const list = await this.getQuizzes();
    return list.find((q) => q.id === quizId) || null;
  },

  async submitQuizAttempt(quizId, answers = {}) {
    const quiz = CURATED_QUIZZES.find((q) => q.id === quizId) || (await this.getQuizById(quizId));
    if (quiz && Array.isArray(quiz.questions)) {
      let correctCount = 0;
      const details = quiz.questions.map((q, idx) => {
        const userChoice = answers[q.id];
        const isCorrect = userChoice !== undefined && Number(userChoice) === Number(q.correctIndex);
        if (isCorrect) correctCount++;

        const selectedText =
          userChoice !== undefined && q.options?.[userChoice]
            ? q.options[userChoice].text
            : 'No answer selected';
        const correctText = q.options?.[q.correctIndex]?.text || '';

        return {
          questionId: q.id,
          prompt: q.prompt,
          userChoice,
          selectedText,
          correctText,
          isCorrect,
          explanation: q.explanation || 'Review concept mechanics and invariants.',
          points: isCorrect ? (q.points || 10) : 0,
        };
      });

      const totalCount = quiz.questions.length;
      const totalMarks = totalCount * 10;
      const marksEarned = correctCount * 10;
      const score = Math.round((correctCount / totalCount) * 100);
      const passed = score >= (quiz.passingScore || 70);

      // Ingest mastery evidence to calibrate student mastery
      if (quiz.conceptId) {
        this.recordLearningAttempt(quiz.conceptId, passed);
      }

      const attemptResult = {
        attemptId: `att_${quizId}_${Date.now()}`,
        quizId,
        score,
        passed,
        correctCount,
        totalCount,
        marksEarned,
        totalMarks,
        details,
        completedAt: new Date().toISOString(),
      };

      // Best-effort remote submission sync
      try {
        await apiClient.post(`/quizzes/${quizId}/submit`, { answers, score, correctCount, totalCount });
      } catch {
        // Tolerant offline mode
      }

      return attemptResult;
    }

    // Fallback direct endpoint
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
    let backendAssessments = [];
    try {
      const response = await apiClient.get('/assessments');
      const rawList = Array.isArray(response) ? response : response?.data || response?.assessments || [];
      if (Array.isArray(rawList)) {
        backendAssessments = rawList.map(normalizeCodingAssessment).filter(Boolean);
      }
    } catch {
      // Route pending or empty collection
    }

    // LeetCode-style curated assessments: Two Sum, Valid Palindrome, Valid Anagram
    const curated = CURATED_CODING_PROBLEMS.map(normalizeCodingAssessment);
    const cachedAssessments = getCached(ASSESSMENTS_KEY, []).map(normalizeCodingAssessment).filter(Boolean);

    const merged = [
      ...curated,
      ...cachedAssessments.filter((ca) => !curated.some((c) => c.id === ca.id || c.title === ca.title)),
      ...backendAssessments.filter((b) => !curated.some((c) => c.id === b.id || c.title === b.title)),
    ];
    const unique = Array.from(new Map(merged.map((a) => [a.id, a])).values());
    setCached(ASSESSMENTS_KEY, unique);
    return unique;
  },

  async getAssessmentById(id) {
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

    // Persist locally for instant offline and cross-page replay
    try {
      const storageKey = `pathwise_session_${sessionId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{"events":[]}');
      const allEvents = [...(existing.events || []), ...events];
      const uniqueEvents = Array.from(new Map(allEvents.map((e) => [e.sequenceNumber, e])).values());
      const maxTime = Math.max(...uniqueEvents.map((e) => e.time || 0), 60);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          sessionId,
          events: uniqueEvents,
          totalSeconds: maxTime,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Local storage full or unavailable
    }

    try {
      return await apiClient.post(`/coding-sessions/${sessionId}/events`, {
        events,
        isFinal,
      });
    } catch {
      return { recordedCount: events.length };
    }
  },

  async getSessionReplay(sessionId) {
    try {
      const res = await apiClient.get(`/coding-sessions/${sessionId}/replay`);
      const data = res?.data || res;
      if (data && Array.isArray(data.events) && data.events.length > 0) {
        return data;
      }
    } catch {
      // Backend route pending or offline
    }

    // Check local storage session cache
    try {
      const local = localStorage.getItem(`pathwise_session_${sessionId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed.events) && parsed.events.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }

    // Fallback demonstration replay timeline with full keystroke, deletion, paste, run, tab switch
    return {
      sessionId,
      title: 'Valid Palindrome - Invariant Implementation',
      studentName: 'Demo Candidate (Student)',
      totalSeconds: 180,
      events: [
        {
          sequenceNumber: 1,
          time: 5,
          eventType: 'keystroke',
          label: 'Keystroke (+12 chars)',
          occurredAt: new Date(Date.now() - 175000).toISOString(),
          codeSnapshot: 'class Solution:\n    def isPalindrome(self, s: str) -> bool:\n',
        },
        {
          sequenceNumber: 2,
          time: 25,
          eventType: 'keystroke',
          label: 'Keystroke (+34 chars)',
          occurredAt: new Date(Date.now() - 155000).toISOString(),
          codeSnapshot: 'class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        clean = [c.lower() for c in s if c.isalnum()]\n',
        },
        {
          sequenceNumber: 3,
          time: 50,
          eventType: 'paste',
          label: 'Paste (+88 chars)',
          occurredAt: new Date(Date.now() - 130000).toISOString(),
          codeSnapshot: 'class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        clean = [c.lower() for c in s if c.isalnum()]\n        left, right = 0, len(clean) - 1\n        while left < right:\n            if clean[left] != clean[right]: return False\n            left += 1; right -= 1\n        return True\n',
          payload: { charLength: 88, delta: 88 },
        },
        {
          sequenceNumber: 4,
          time: 90,
          eventType: 'tab_switch',
          label: 'Tab Switch (Window focus lost)',
          occurredAt: new Date(Date.now() - 90000).toISOString(),
          codeSnapshot: 'class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        clean = [c.lower() for c in s if c.isalnum()]\n        left, right = 0, len(clean) - 1\n        while left < right:\n            if clean[left] != clean[right]: return False\n            left += 1; right -= 1\n        return True\n',
        },
        {
          sequenceNumber: 5,
          time: 140,
          eventType: 'run',
          label: 'Run Code (Test Suite Executed)',
          occurredAt: new Date(Date.now() - 40000).toISOString(),
          codeSnapshot: 'class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        clean = [c.lower() for c in s if c.isalnum()]\n        left, right = 0, len(clean) - 1\n        while left < right:\n            if clean[left] != clean[right]: return False\n            left += 1; right -= 1\n        return True\n',
        },
      ],
    };
  },

  async getSessionSignals(sessionId) {
    let backendSignals = [];
    try {
      const res = await apiClient.get(`/coding-sessions/${sessionId}/integrity-signals`);
      const data = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(data) && data.length > 0) {
        backendSignals = data;
      }
    } catch {
      // Offline fallback
    }

    // Derive signals from current session replay events
    const replay = await this.getSessionReplay(sessionId);
    const derived = deriveTimelineIntegritySignals(replay?.events || []);

    const allSignals = [...backendSignals, ...derived];
    const unique = Array.from(new Map(allSignals.map((s) => [s.signalType, s])).values());
    return unique;
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

  async publishCurriculum(extractedData, courseId = null) {
    if (!extractedData) return false;
    const courses = await this.getCourses();
    const targetCourseId = courseId || extractedData.courseId || courses[0]?.id;

    // Send to backend API and await database persistence
    let backendData = null;
    if (targetCourseId) {
      try {
        const response = await apiClient.post(`/courses/${targetCourseId}/curriculum/publish`, {
          publishAll: true,
          extractedData,
        });
        backendData = response?.data || response;
      } catch (err) {
        console.error(`[learningService] Backend publish error for course ${targetCourseId}:`, err);
        throw new Error(err.message || 'Failed to publish curriculum to backend database.');
      }
    }

    // 1. Update Courses Store
    const targetCourse = courses.find((c) => c.id === targetCourseId) || courses[0] || {
      id: targetCourseId || `course_${Date.now()}`,
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

    if (Array.isArray(extractedData.concepts)) {
      extractedData.concepts.forEach((newConcept) => {
        const existingIdx = targetModule.concepts?.findIndex(
          (c) => c.name.toLowerCase() === newConcept.name.toLowerCase()
        ) ?? -1;
        if (existingIdx !== -1) {
          targetModule.concepts[existingIdx] = { ...targetModule.concepts[existingIdx], ...newConcept };
        } else {
          targetModule.concepts = targetModule.concepts || [];
          targetModule.concepts.push(newConcept);
        }
      });
    }

    const mergedCourses = courses.length > 0 ? courses : [targetCourse];
    setCached(COURSES_KEY, mergedCourses);

    // 2. Update Quizzes Store (10 diagnostic questions per topic)
    if (extractedData.quizzes && extractedData.quizzes.length > 0) {
      const existingQuizzes = await this.getQuizzes();
      const groupedByConcept = {};

      extractedData.quizzes.forEach((q) => {
        const conceptKey = q.conceptId || q.conceptName || 'default';
        if (!groupedByConcept[conceptKey]) {
          groupedByConcept[conceptKey] = {
            id: `quiz_full_${conceptKey}`,
            title: `${q.conceptName || 'Topic'}: Diagnostic Mastery Quiz`,
            conceptId: q.conceptId,
            conceptName: q.conceptName,
            difficulty: 'Comprehensive',
            timeLimit: '20 mins',
            passingScore: 70,
            status: 'pending',
            questionsCount: 10,
            estimatedMinutes: 20,
            questions: [],
          };
        }
        groupedByConcept[conceptKey].questions.push({
          id: `q_${q.id || Math.random().toString(36).substring(7)}`,
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

    // 3. Update Coding Assessments Store (2 distinct problems per programming topic)
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
        allowedLanguages: ['python', 'javascript', 'java'],
        starterCode: {
          python: typeof ca.starterCode === 'string' ? ca.starterCode : ca.starterCode?.python || '',
          javascript: ca.starterCode?.javascript || `// Implement solution for ${ca.title}\nfunction solve(input) {\n  // TODO\n}`,
          java: ca.starterCode?.java || `// Java Solution for ${ca.title}\nclass Solution {\n    public static void main(String[] args) {\n        // TODO\n    }\n}`,
        },
        sampleTests: ca.sampleTests || [],
        hiddenTestsCount: ca.hiddenTestsCount || 15,
        vivaQuestion: ca.vivaQuestion,
      }));

      const mergedAssessments = [...newAssessments, ...existingAssessments];
      const uniqueAssessments = Array.from(new Map(mergedAssessments.map((a) => [a.id, a])).values());
      setCached(ASSESSMENTS_KEY, uniqueAssessments);
    }

    if (targetCourseId) {
      setCached(`pathwise_curriculum_${targetCourseId}`, {
        ...extractedData,
        status: 'published',
      });
    }

    if (typeof window !== 'undefined') {
      notifyCurriculumPublished({ courseId: targetCourseId, extractedData });
    }

    return true;
  },

  /**
   * Diagnostic Onboarding Methods
   */
  async getDiagnosticStatus() {
    try {
      const res = await apiClient.get('/v1/diagnostic/status');
      return res?.data || res;
    } catch {
      return { completed: false, count: 0 };
    }
  },

  async getDiagnosticAssessment() {
    try {
      const res = await apiClient.get('/v1/diagnostic/assessment');
      return res?.data || res;
    } catch (err) {
      console.error('Failed to get diagnostic assessment:', err);
      return null;
    }
  },

  async submitDiagnosticAssessment(answers) {
    const res = await apiClient.post('/v1/diagnostic/submit', { answers });
    return res?.data || res;
  },

  async getDiagnosticResults() {
    try {
      const res = await apiClient.get('/v1/diagnostic/results');
      return res?.data || res;
    } catch {
      return null;
    }
  },
};

export default learningService;
