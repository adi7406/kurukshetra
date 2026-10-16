/**
 * Dynamic Initial State & Schema Declarations for Pathwise
 * Static mock datasets removed to enable live dynamic data integration with backend + API.
 */

// Live initial empty collections (populated dynamically from live API endpoints)
export const INITIAL_TEACHERS = [];
export const INITIAL_STUDENTS = [];
export const INITIAL_COURSES = [];
export const INITIAL_QUIZZES = [];
export const INITIAL_ASSESSMENTS = [];
export const INITIAL_HOMEWORK_PROGRESS = [];

export const INITIAL_PROGRESS_DATA = {
  overallEstimatedMastery: 0,
  completedConceptsCount: 0,
  developingConceptsCount: 0,
  needsPracticeConceptsCount: 0,
  lockedConceptsCount: 0,
  totalAssessmentsSubmitted: 0,
  averageQuizScore: 0,
  disclaimer: 'Mastery estimates reflect real-time performance across verified quizzes, code execution test suites, and viva explanations.',
  conceptBreakdown: [],
};

export const INITIAL_TEACHER_DASHBOARD = {
  overview: {
    totalEnrolled: 0,
    avgMastery: 0,
    atRiskCount: 0,
    pendingContentReviews: 0,
  },
  reviewQueue: [],
  atRiskStudents: [],
};

/**
 * Pre-populated syllabus text prompt for testing AI extraction in teacher content upload studio
 */
export const SAMPLE_SYLLABUS_TEXT = `Course Code: CS201 - Data Structures & Algorithms (DSA)
Course Title: Data Structures and Algorithmic Problem Solving
Instructor: Department of Computer Science

Module 1: Linear Sequence Structures & Buffers
- Topic 1: Arrays (Contiguous Memory Layout, O(1) Index Arithmetic, Geometric Doubling Amortization, Cache Locality)
- Topic 2: Strings (Byte Buffers, UTF-8 Encoding, In-Place Pointer Manipulation, Sliding Window Paradigms)
- Topic 3: Stack (Last-In-First-Out LIFO Discipline, Activation Call Frames, Monotonic Stacks, Expression Parsing)

Module 2: Key-Value Mapping & Associative Structures
- Topic 4: Hash Tables & Open Addressing Collision Resolution
- Topic 5: Binary Search Trees & Balanced Invariants`;
