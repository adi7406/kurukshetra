/**
 * Enhanced Mock Data & Seed Store for Pathwise
 * Implements comprehensive data for:
 * - Teacher & Student Signup / Login
 * - Available Teacher & Course Directory
 * - Cohort Roster with Individual Mastery Levels
 * - Syllabus Extraction Templates for AI Extraction Pipeline
 * - Full Concept, Quiz, and Coding Assessment sets
 */

export const INITIAL_TEACHERS = [
  {
    id: 'usr_teacher_01',
    name: 'Dr. Priya Nair',
    email: 'teacher@pathwise.edu',
    phone: '+91 98765 43210',
    className: 'Year 2 & 3 B.Tech CSE',
    rollNo: 'EMP-CS-804',
    role: 'teacher',
    courseTaught: 'CS201: Data Structures & Algorithmic Problem Solving',
    department: 'Department of Computing & Information Sciences',
    avatarInitials: 'PN',
    joinedDate: 'Jan 2024',
    studentsCount: 38,
  },
  {
    id: 'usr_teacher_02',
    name: 'Prof. Rajesh Gupta',
    email: 'rajesh.gupta@pathwise.edu',
    phone: '+91 98123 45678',
    className: 'Year 3 B.Tech CSE',
    rollNo: 'EMP-CS-612',
    role: 'teacher',
    courseTaught: 'CS302: Applied Machine Learning & Neural Networks',
    department: 'AI & Data Science Labs',
    avatarInitials: 'RG',
    joinedDate: 'Aug 2023',
    studentsCount: 42,
  },
];

export const INITIAL_STUDENTS = [
  {
    id: 'usr_student_01',
    name: 'Arjun Sharma',
    email: 'student@pathwise.edu',
    phone: '+91 91234 56789',
    className: 'B.Tech CSE - Section A',
    rollNo: '23CS104',
    role: 'student',
    enrolledCourse: 'CS201: Data Structures & Algorithmic Problem Solving',
    teacherName: 'Dr. Priya Nair',
    overallMastery: 78,
    attendance: '19/20',
    homeworkCompleted: '53/56',
    rating: 89,
    status: 'On Track',
    conceptMastery: {
      c_arrays: 94,
      c_linkedlists: 72,
      c_hashtables: 48,
      c_recursion: 86,
      c_dp: 38,
      c_bst: 15,
    },
    quizzesCompleted: 7,
    codingTasksCompleted: 4,
  },
  {
    id: 'usr_student_02',
    name: 'Ananya Verma',
    email: 'ananya.v@pathwise.edu',
    phone: '+91 98345 67890',
    className: 'B.Tech CSE - Section A',
    rollNo: '23CS109',
    role: 'student',
    enrolledCourse: 'CS201: Data Structures & Algorithmic Problem Solving',
    teacherName: 'Dr. Priya Nair',
    overallMastery: 88,
    attendance: '20/20',
    homeworkCompleted: '55/56',
    rating: 94,
    status: 'Excelling',
    conceptMastery: {
      c_arrays: 98,
      c_linkedlists: 89,
      c_hashtables: 84,
      c_recursion: 92,
      c_dp: 74,
      c_bst: 65,
    },
    quizzesCompleted: 9,
    codingTasksCompleted: 6,
  },
  {
    id: 'usr_student_03',
    name: 'Rohan Mehra',
    email: 'rohan.m@pathwise.edu',
    phone: '+91 97456 12389',
    className: 'B.Tech CSE - Section A',
    rollNo: '23CS142',
    role: 'student',
    enrolledCourse: 'CS201: Data Structures & Algorithmic Problem Solving',
    teacherName: 'Dr. Priya Nair',
    overallMastery: 42,
    attendance: '14/20',
    homeworkCompleted: '38/56',
    rating: 68,
    status: 'Needs Support in Hash Tables & DP',
    conceptMastery: {
      c_arrays: 68,
      c_linkedlists: 54,
      c_hashtables: 28,
      c_recursion: 45,
      c_dp: 18,
      c_bst: 0,
    },
    quizzesCompleted: 4,
    codingTasksCompleted: 2,
  },
  {
    id: 'usr_student_04',
    name: 'Sneha Kulkarni',
    email: 'sneha.k@pathwise.edu',
    phone: '+91 99234 88765',
    className: 'B.Tech CSE - Section A',
    rollNo: '23CS165',
    role: 'student',
    enrolledCourse: 'CS201: Data Structures & Algorithmic Problem Solving',
    teacherName: 'Dr. Priya Nair',
    overallMastery: 64,
    attendance: '18/20',
    homeworkCompleted: '48/56',
    rating: 79,
    status: 'Progressing',
    conceptMastery: {
      c_arrays: 85,
      c_linkedlists: 66,
      c_hashtables: 52,
      c_recursion: 70,
      c_dp: 40,
      c_bst: 10,
    },
    quizzesCompleted: 6,
    codingTasksCompleted: 3,
  },
];

export const INITIAL_COURSES = [
  {
    id: 'course_cs201',
    code: 'CS201',
    title: 'Data Structures & Algorithmic Problem Solving',
    description: 'Master core memory structures, recursive divide-and-conquer, graph representations, and complexity bounds.',
    status: 'Published',
    instructor: 'Dr. Priya Nair',
    enrolledCount: 38,
    completionRate: 64,
    currentStudentProgress: 68,
    nextRecommendedAction: {
      conceptId: 'c_hashtables',
      conceptTitle: 'Hash Tables & Collision Resolution',
      activityType: 'quiz',
      activityTitle: 'Collision Resolution & Load Factor Quiz',
      reason: 'Current estimated mastery is at 48% with recent errors in quadratic probing. Complete this practice to unlock Binary Search Trees.',
    },
    modules: [
      {
        id: 'mod_1',
        title: 'Module 1: Linear & Key-Value Structures',
        order: 1,
        concepts: [
          {
            id: 'c_arrays',
            name: 'Dynamic Arrays & Amortized Doubling',
            description: 'Contiguous memory allocation, geometric resizing, and O(1) amortized append bounds.',
            prerequisites: [],
            masteryScore: 0.94,
            status: 'mastered',
            theory: `### Dynamic Arrays & Amortized Doubling
A dynamic array provides random access with $O(1)$ indexing. When capacity is exceeded, resizing allocates a new buffer of size $2N$ and copies elements.

#### Amortized Cost Analysis:
- $N$ appends cost $O(N)$ copies overall: $\\sum_{i=0}^{\\log_2 N} 2^i = 2N - 1$.
- Thus, the amortized cost per insertion is bounded at $O(1)$.`,
            learningObjectives: [
              'Explain cache locality benefits of contiguous memory arrays',
              'Derive the mathematical proof for O(1) amortized append under geometric doubling',
              'Contrast static vs dynamic array memory layouts',
            ],
            quizzesCount: 1,
            codingTasksCount: 1,
          },
          {
            id: 'c_linkedlists',
            name: 'Linked Lists & Pointer Reversals',
            description: 'Non-contiguous node chains, single/doubly-linked variations, and in-place pointer manipulation.',
            prerequisites: ['Dynamic Arrays & Amortized Doubling'],
            masteryScore: 0.72,
            status: 'developing',
            theory: `### Linked Structures & In-Place Reversal
Unlike arrays, linked lists do not guarantee cache locality, but enable $O(1)$ head/tail operations without element shifting.

#### In-place Reversal Invariant:
Maintain three pointers: \`prev\`, \`curr\`, and \`next\`. In each iteration:
\`\`\`python
next_temp = curr.next
curr.next = prev
prev = curr
curr = next_temp
\`\`\``,
            learningObjectives: [
              'Implement iterative and recursive singly linked list reversals',
              'Detect cycles using Floyd\'s Tortoise and Hare algorithm',
              'Analyze space-time trade-offs between array lists and linked nodes',
            ],
            quizzesCount: 1,
            codingTasksCount: 1,
          },
          {
            id: 'c_hashtables',
            name: 'Hash Tables & Collision Resolution',
            description: 'Hash functions, uniform distribution properties, chaining vs open addressing, and load factor thresholds.',
            prerequisites: ['Dynamic Arrays & Amortized Doubling'],
            masteryScore: 0.48,
            status: 'needs_practice',
            theory: `### Hash Tables & Load Factor Management
A hash table maps arbitrary keys to bucket indices using a hash function $h(k) = \\text{hash}(k) \\pmod M$.

#### Collision Strategies:
1. **Separate Chaining:** Each bucket contains a linked list or self-balancing tree.
2. **Open Addressing:** Linear probing, quadratic probing, or double hashing.

When the load factor $\\alpha = N/M$ exceeds threshold $\\tau \\approx 0.75$, the table rehashes into an expanded capacity.`,
            learningObjectives: [
              'Evaluate collision probability and clustering in linear vs quadratic probing',
              'Implement a deterministic hash table with separate chaining',
              'Calculate appropriate load factor thresholds before rehashing',
            ],
            quizzesCount: 1,
            codingTasksCount: 1,
          },
        ],
      },
      {
        id: 'mod_2',
        title: 'Module 2: Hierarchical & Graph Structures',
        order: 2,
        concepts: [
          {
            id: 'c_bst',
            name: 'Binary Search Trees & Self-Balancing AVL',
            description: 'Binary search tree invariant, in-order traversals, and AVL/Red-Black rotation mechanics.',
            prerequisites: ['Hash Tables & Collision Resolution', 'Linked Lists & Pointer Reversals'],
            masteryScore: 0.15,
            status: 'locked',
            lockReason: 'Prerequisite requirement: Complete Hash Tables practice with at least 65% estimated mastery.',
            learningObjectives: [
              'Apply the BST property to perform logarithmic search and insertion',
              'Execute single and double AVL tree rotations to restore height balance',
            ],
            quizzesCount: 1,
            codingTasksCount: 1,
          },
        ],
      },
      {
        id: 'mod_3',
        title: 'Module 3: Algorithmic Paradigms',
        order: 3,
        concepts: [
          {
            id: 'c_recursion',
            name: 'Divide & Conquer and Recurrence Bounds',
            description: 'Call stacks, divide-and-conquer strategy, Master Theorem bounds, and merge-sort implementations.',
            prerequisites: ['Dynamic Arrays & Amortized Doubling'],
            masteryScore: 0.86,
            status: 'mastered',
            learningObjectives: [
              'Formulate recurrence relations of the form T(n) = aT(n/b) + f(n)',
              'Apply Master Theorem cases to derive asymptotic complexity',
            ],
            quizzesCount: 1,
            codingTasksCount: 1,
          },
          {
            id: 'c_dp',
            name: 'Dynamic Programming & Memoization',
            description: 'Overlapping subproblems, optimal substructure, top-down memoization, and bottom-up tabulation.',
            prerequisites: ['Divide & Conquer and Recurrence Bounds'],
            masteryScore: 0.38,
            status: 'needs_practice',
            learningObjectives: [
              'Identify optimal substructure and overlapping subproblems in recurrence patterns',
              'Construct state transition matrices for 1D and 2D dynamic programming',
            ],
            quizzesCount: 1,
            codingTasksCount: 1,
          },
        ],
      },
    ],
  },
];

export const INITIAL_QUIZZES = [
  {
    id: 'quiz_hash_01',
    title: 'Hash Tables Collision Resolution & Load Factor',
    conceptId: 'c_hashtables',
    conceptName: 'Hash Tables & Collision Resolution',
    status: 'available',
    questionsCount: 4,
    estimatedMinutes: 12,
    passingScore: 70,
    lastAttemptScore: null,
    questions: [
      {
        id: 'q1',
        prompt: 'In open addressing with linear probing, what is the primary consequence of primary clustering?',
        options: [
          'Memory overhead increases because each bucket requires an extra pointer',
          'Search times degrade towards O(N) as long contiguous blocks of occupied slots form',
          'The hash table permanently locks against any new insertions',
          'Hash codes must be recalculated on every single read operation',
        ],
        correctIndex: 1,
        explanation: 'Primary clustering occurs when colliding keys group together into adjacent clusters, causing subsequent probes to traverse longer sequences of occupied buckets.',
      },
      {
        id: 'q2',
        prompt: 'If a hash table has N = 150 elements stored across M = 200 buckets, what is its current load factor α?',
        options: [
          'α = 1.33',
          'α = 0.75',
          'α = 0.50',
          'α = 0.25',
        ],
        correctIndex: 1,
        explanation: 'Load factor is defined as α = N / M. Here 150 / 200 = 0.75, which typically triggers dynamic capacity reallocation.',
      },
      {
        id: 'q3',
        prompt: 'Which strategy guarantees worst-case O(log N) lookup in separate chaining when individual bucket sizes grow large?',
        options: [
          'Replacing bucket linked lists with self-balancing red-black trees',
          'Converting the hash table into an array of bitmasks',
          'Applying double hashing inside the same linked list node',
          'Enforcing strict FIFO eviction in each bucket',
        ],
        correctIndex: 0,
        explanation: 'Java\'s HashMap adopts this exact strategy: when a bucket length exceeds 8, the linked list transforms into a balanced red-black tree, guaranteeing O(log N) worst-case time.',
      },
      {
        id: 'q4',
        prompt: 'When rehashing a table after capacity expansion, why can we not simply copy existing bucket indices directly over?',
        options: [
          'The cryptographic salt changes every millisecond',
          'The modulus operand M has changed, so hash(k) mod M yields new bucket indices',
          'All keys are automatically wiped during memory re-allocation',
          'Pointer alignment restricts memory blocks to odd addresses',
        ],
        correctIndex: 1,
        explanation: 'Because index calculation depends on the bucket capacity (index = hash % M), doubling M alters the resulting index for most keys.',
      },
    ],
  },
  {
    id: 'quiz_recur_02',
    title: 'Divide & Conquer and Stack Frames',
    conceptId: 'c_recursion',
    conceptName: 'Divide & Conquer and Recurrence Bounds',
    status: 'completed',
    questionsCount: 3,
    estimatedMinutes: 10,
    passingScore: 70,
    lastAttemptScore: 85,
    lastAttemptDate: 'Yesterday at 3:45 PM',
    questions: [
      {
        id: 'qr1',
        prompt: 'What happens to the call stack during excessive unbounded recursion?',
        options: [
          'Memory is automatically compressed',
          'Stack Overflow Exception is thrown due to exhausted call stack memory',
          'Functions execute faster via hardware caching',
          'Pointers automatically invert',
        ],
        correctIndex: 1,
        explanation: 'Each function invocation allocates a stack frame. Unbounded recursion exhausts stack limit, raising StackOverflowError.',
      },
    ],
  },
  {
    id: 'quiz_ll_03',
    title: 'Linked List In-Place Manipulations',
    conceptId: 'c_linkedlists',
    conceptName: 'Linked Lists & Pointer Reversals',
    status: 'in_progress',
    questionsCount: 4,
    estimatedMinutes: 15,
    passingScore: 75,
    lastAttemptScore: null,
    questions: [],
  },
];

export const INITIAL_ASSESSMENTS = [
  {
    id: 'code_01',
    title: 'LRU Cache Design via Hash Map & Doubly Linked List',
    conceptId: 'c_hashtables',
    conceptName: 'Hash Tables & Collision Resolution',
    difficulty: 'Medium',
    status: 'available',
    timeLimitMinutes: 45,
    allowedLanguages: ['python', 'javascript'],
    problemStatement: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) Cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(int capacity)\`: Initialize the LRU cache with positive size \`capacity\`.
- \`get(key)\`: Return the value of the \`key\` if the key exists, otherwise return \`-1\`.
- \`put(key, value)\`: Update the value of the \`key\` if the key exists. Otherwise, add the \`key-value\` pair to the cache. If the number of keys exceeds the \`capacity\` from this operation, evict the least recently used key.

The functions \`get\` and \`put\` must each run in **$O(1)$ average time complexity**.`,
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls will be made to get and put',
    ],
    sampleTests: [
      {
        input: 'LRUCache cache = new LRUCache(2);\ncache.put(1, 1);\ncache.put(2, 2);\ncache.get(1); // returns 1\ncache.put(3, 3); // evicts key 2\ncache.get(2); // returns -1',
        expectedOutput: '[null, null, null, 1, null, -1]',
        explanation: 'Key 2 was evicted because key 1 was accessed via get(1), making key 2 the least recently used.',
      },
    ],
    starterCode: {
      python: `class Node:
    def __init__(self, key, val):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {} # Map key -> Node
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add(node)
            return node.val
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self._add(node)
        self.cache[key] = node
        if len(self.cache) > self.cap:
            lru = self.head.next
            self._remove(lru)
            del self.cache[lru.key]

    def _remove(self, node):
        p = node.prev
        n = node.next
        p.next = n
        n.prev = p

    def _add(self, node):
        p = self.tail.prev
        p.next = node
        node.prev = p
        node.next = self.tail
        self.tail.prev = node
`,
      javascript: `class Node {
  constructor(key, val) {
    this.key = key;
    this.val = val;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(0, 0);
    this.tail = new Node(0, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this.remove(node);
    this.insert(node);
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this.remove(this.map.get(key));
    }
    const newNode = new Node(key, value);
    this.insert(newNode);
    this.map.set(key, newNode);

    if (this.map.size > this.capacity) {
      const lru = this.head.next;
      this.remove(lru);
      this.map.delete(lru.key);
    }
  }

  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  insert(node) {
    const prev = this.tail.prev;
    prev.next = node;
    node.prev = prev;
    node.next = this.tail;
    this.tail.prev = node;
  }
}`,
    },
    vivaQuestions: [
      {
        id: 'viva_1',
        question: 'Why did you select sentinel (dummy) head and tail nodes in your doubly-linked list implementation?',
        evaluationCriteria: 'Explains that sentinel nodes eliminate boundary edge-case checks when inserting at head or deleting at tail.',
      },
      {
        id: 'viva_2',
        question: 'What is the time complexity of the eviction step when the cache exceeds capacity, and why?',
        evaluationCriteria: 'Correctly identifies that eviction is O(1) because the least-recently used node is directly adjacent to the head sentinel and hash table deletion is O(1).',
      },
    ],
  },
  {
    id: 'code_02',
    title: 'Valid Balanced Parentheses & Brackets Validator',
    conceptId: 'c_linkedlists',
    conceptName: 'Stacks & Queues',
    difficulty: 'Easy',
    status: 'completed',
    timeLimitMinutes: 30,
    allowedLanguages: ['python', 'javascript'],
    problemStatement: 'Given a string containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
    constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only'],
    sampleTests: [
      { input: 's = "()[]{}"', expectedOutput: 'true', explanation: 'Matching bracket order preserved.' },
    ],
    starterCode: {
      python: `def isValid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return not stack`,
      javascript: `function isValid(s) {\n  const stack = [];\n  const pairs = { ')': '(', '}': '{', ']': '[' };\n  for (let ch of s) {\n    if (pairs[ch]) {\n      if (stack.pop() !== pairs[ch]) return false;\n    } else {\n      stack.push(ch);\n    }\n  }\n  return stack.length === 0;\n}`,
    },
    vivaQuestions: [],
  },
];

export const INITIAL_HOMEWORK_PROGRESS = [
  {
    id: 'hw_1',
    title: 'Hash Tables Collision Analysis. AI Diagnostic #4',
    category: 'quiz',
    deadline: 'Tomorrow, 5:00 PM',
    status: 'todo',
    tag: 'Quiz',
  },
  {
    id: 'hw_2',
    title: 'LRU Cache Design & Doubly Linked List',
    category: 'coding',
    deadline: '24 Oct, 2026',
    status: 'todo',
    tag: 'Coding IDE',
  },
  {
    id: 'hw_3',
    title: 'Divide & Conquer Recurrence Derivation',
    category: 'theory',
    deadline: '28 Oct, 2026',
    status: 'on_review',
    tag: 'In Review',
  },
  {
    id: 'hw_4',
    title: 'Valid Parentheses & Stack Invariants',
    category: 'coding',
    deadline: '14 Oct, 2026',
    status: 'completed',
    tag: 'Verified',
  },
];

/**
 * Pre-populated syllabus text for testing AI extraction in teacher content upload
 */
export const SAMPLE_SYLLABUS_TEXT = `Course Code: CS201
Course Title: Data Structures and Algorithmic Problem Solving
Instructor: Dr. Priya Nair

Module 1: Linear Data Structures and Hash Tables
- Topic 1: Dynamic Arrays, Amortized Doubling Analysis, O(1) bounds
- Topic 2: Singly and Doubly Linked Lists, Pointer Reversals, Floyd's Tortoise-Hare Cycle Detection
- Topic 3: Hash Tables, Division Method, Open Addressing (Linear & Quadratic Probing), Load Factor alpha

Module 2: Hierarchical Tree & Graph Structures
- Topic 4: Binary Search Tree Property, AVL Rotations, Balance Factors
- Topic 5: Graph Representations (Adjacency Matrix vs List), Breadth First Search (BFS), Depth First Search (DFS)

Module 3: Advanced Algorithmic Paradigms
- Topic 6: Divide and Conquer, Recurrence Relations, Master Theorem Bounds
- Topic 7: Dynamic Programming, Optimal Substructure, Memoization vs Bottom-up Tabulation`;
export const INITIAL_PROGRESS_DATA = {
  overallEstimatedMastery: 78,
  completedConceptsCount: 3,
  developingConceptsCount: 2,
  needsPracticeConceptsCount: 2,
  lockedConceptsCount: 1,
  totalAssessmentsSubmitted: 9,
  averageQuizScore: 89,
  disclaimer: 'Mastery estimates reflect performance across verified quizzes, code execution test suites, and viva explanations. This metric indicates prerequisite readiness and is not an assessment of personal potential.',
  conceptBreakdown: [
    {
      conceptId: 'c_arrays',
      name: 'Dynamic Arrays & Amortized Doubling',
      module: 'Module 1: Linear & Key-Value Structures',
      mastery: 94,
      status: 'Mastered',
      evidenceCount: 14,
      lastUpdated: 'Oct 14, 2026',
    },
    {
      conceptId: 'c_recursion',
      name: 'Divide & Conquer and Recurrence Bounds',
      module: 'Module 3: Algorithmic Paradigms',
      mastery: 86,
      status: 'Mastered',
      evidenceCount: 11,
      lastUpdated: 'Yesterday',
    },
    {
      conceptId: 'c_linkedlists',
      name: 'Linked Lists & Pointer Reversals',
      module: 'Module 1: Linear & Key-Value Structures',
      mastery: 72,
      status: 'Developing',
      evidenceCount: 8,
      lastUpdated: 'Oct 12, 2026',
    },
    {
      conceptId: 'c_hashtables',
      name: 'Hash Tables & Collision Resolution',
      module: 'Module 1: Linear & Key-Value Structures',
      mastery: 48,
      status: 'Needs Practice',
      evidenceCount: 6,
      lastUpdated: 'Today at 2:15 PM',
    },
    {
      conceptId: 'c_dp',
      name: 'Dynamic Programming & Memoization',
      module: 'Module 3: Algorithmic Paradigms',
      mastery: 38,
      status: 'Needs Practice',
      evidenceCount: 5,
      lastUpdated: 'Oct 10, 2026',
    },
    {
      conceptId: 'c_bst',
      name: 'Binary Search Trees & Self-Balancing AVL',
      module: 'Module 2: Hierarchical Tree & Graph Structures',
      mastery: 15,
      status: 'Locked (Prerequisite Gap)',
      evidenceCount: 0,
      lastUpdated: 'Unattempted',
    },
  ],
};

export const INITIAL_TEACHER_DASHBOARD = {
  overview: {
    activeCourses: 2,
    totalLearners: 38,
    pendingContentReviews: 3,
    integritySignalsFlagged: 2,
  },
  courses: [
    {
      id: 'course_cs201',
      code: 'CS201',
      title: 'Data Structures & Algorithmic Problem Solving',
      status: 'Published',
      modulesCount: 3,
      conceptsCount: 6,
      enrolledCount: 38,
      commonStruggles: 'Hash Tables Collision Probing (42% average accuracy)',
    },
  ],
  reviewQueue: [
    {
      id: 'rev_01',
      type: 'Generated Questions',
      concept: 'Dynamic Programming & Memoization',
      source: 'AI-assisted generation (LLM Pipeline)',
      description: '3 MCQs on memoization table structure awaiting faculty validation before publishing.',
      date: 'Today at 11:30 AM',
    },
    {
      id: 'rev_02',
      type: 'Integrity Signal',
      studentName: 'Rohan Mehra (CS201)',
      assessment: 'LRU Cache Design',
      signalType: 'Sudden Large Insertion (340 characters pasted within 1.2s)',
      evidenceRef: 'Event #84 - Editor Paste Action',
      date: 'Today at 1:14 PM',
      status: 'Pending Review',
    },
  ],
};

