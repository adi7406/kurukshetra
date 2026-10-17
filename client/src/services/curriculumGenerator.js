import { OS_TOPICS_DATABASE, OOP_TOPICS_DATABASE } from './subjectCurricula';

/**
 * Comprehensive Curriculum Synthesis Engine for Pathwise
 * Implements authoritative data structure curricula with:
 * 1. Proper Content: Deep Technical Text + Visual/ASCII Diagram + Concrete Executable Example
 * 2. At least 5 Quizzes per Topic with Bloom-aligned rationales
 * 3. Proper Coding Assessment per Topic with constraints, starter code, test suites & viva prompt
 * 
 * Supports user-provided syllabi (e.g. Arrays, Strings, Stack) or custom topic extraction.
 */

export const DSA_TOPICS_DATABASE = {
  arrays: {
    id: 'c_arrays_master',
    name: 'Arrays & Dynamic Resizing',
    module: 'Module 1: Linear & Key-Value Structures',
    prerequisite: 'Foundational Programming & Memory Pointers',
    diagramType: 'array',
    complexities: {
      access: 'O(1)',
      search: 'O(N) un-ordered / O(log N) sorted',
      insertion: 'O(1) amortized append / O(N) arbitrary index',
      deletion: 'O(N) due to leftward compaction shift',
      space: 'O(N) contiguous linear RAM',
    },
    text: `An Array is a contiguous collection of homogeneous elements located in sequential physical memory addresses.

1. Contiguous Memory Layout:
Because memory is sequential, the hardware arithmetic unit directly computes the memory address of element at index i using the constant-time offset formula:
    Address(i) = BaseAddress + (i * ElementSizeInBytes)
This guarantees true O(1) random access without pointer dereferencing overhead.

2. Cache Locality & Hardware Prefetching:
Arrays maximize spatial locality of reference. When the CPU loads an element from RAM, the memory management unit transfers an entire 64-byte cache line into L1/L2 cache, allowing subsequent sequential iterations to execute at sub-nanosecond cache speeds.

3. Dynamic Arrays & Geometric Doubling:
Standard fixed arrays cannot grow beyond their allocated capacity. Dynamic arrays (like Python list, C++ std::vector, Java ArrayList) overcome this by dynamically reallocating memory. When the number of elements reaches capacity:
  - Allocate a new contiguous memory buffer of double the capacity (2 * capacity).
  - Copy all existing elements from the old buffer to the new buffer.
  - Release the old buffer.
Although individual resize events take O(N) copying time, an array resizing across N insertions performs total copy operations equal to:
    1 + 2 + 4 + 8 + ... + N = 2N - 1 = O(N)
Divided over N operations, this yields O(1) amortized time complexity per append.

4. Two-Pointer Invariant Techniques:
In-place array manipulations (such as deduplication, partitioning, or windowing) maintain two indices: a slow write-pointer tracking the compacted valid boundary, and a fast read-pointer scanning elements.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|                      MEMORY BUFFER LAYOUT                     |
+---------------------------------------------------------------+
  Index:       [0]        [1]        [2]        [3]       [Cap]
  Value:     |  12   |  |  24   |  |  36   |  |  48   | |  --   |
  Address:   0x1000     0x1004     0x1008     0x100C    0x1010
             ^                                          ^
             Base Pointer (Size = 4)                    Capacity = 6
`,

    example: `// Dynamic Array Amortized Resizing and Two-Pointer Compaction
class DynamicIntArray {
  constructor(initialCapacity = 2) {
    this.capacity = initialCapacity;
    this.size = 0;
    this.buffer = new Array(this.capacity);
  }

  // O(1) Amortized Append
  append(element) {
    if (this.size === this.capacity) {
      this._resize(this.capacity * 2);
    }
    this.buffer[this.size] = element;
    this.size += 1;
  }

  _resize(newCapacity) {
    const newBuffer = new Array(newCapacity);
    for (let i = 0; i < this.size; i++) {
      newBuffer[i] = this.buffer[i]; // Copy existing elements
    }
    this.buffer = newBuffer;
    this.capacity = newCapacity;
  }

  // Two-Pointer in-place deduplication: O(N) time, O(1) auxiliary space
  deduplicateSorted() {
    if (this.size === 0) return 0;
    let write = 1;
    for (let read = 1; read < this.size; read++) {
      if (this.buffer[read] !== this.buffer[read - 1]) {
        this.buffer[write] = this.buffer[read];
        write++;
      }
    }
    this.size = write;
    return this.size;
  }
}

// Verification Trace
const arr = new DynamicIntArray(2);
arr.append(10);
arr.append(10);
arr.append(20);
arr.append(30);
console.log("Size before deduplication:", arr.size); // 4
arr.deduplicateSorted();
console.log("Compacted unique size:", arr.size); // 3 (values: [10, 20, 30])`,

    objectives: [
      'Derive the mathematical proof for O(1) amortized geometric array doubling',
      'Explain CPU cache line spatial locality benefits in contiguous array buffers',
      'Implement in-place two-pointer traversal avoiding secondary allocations',
      'Analyze index boundary safety and off-by-one prevention invariants',
    ],
    prerequisiteReview: 'Foundational programming, pointer arithmetic, memory indexing, and variable scopes.',
    misconceptions: [
      'Assuming dynamic array resizing takes O(N) on every append (geometric doubling amortizes to O(1)).',
      'Confusing physical memory addresses with abstract array indices.',
      'Assuming deleting an element at index 0 is O(1) like in a linked list (it is O(N) due to leftward compaction shifting).',
    ],
    keyTakeaways: [
      'Contiguous physical memory layout allows O(1) direct address arithmetic: Base + (index * size).',
      'Geometric doubling (factor of 2) achieves O(1) amortized append complexity.',
      'Two-pointer in-place compaction operates in O(N) time without allocating secondary memory.',
    ],

    quizzes: [
      {
        id: 'q_arr_01',
        title: 'Random Access Complexity & Offset Formula',
        prompt: 'Given an array of 64-bit integers starting at base memory address 0x2000, what is the exact physical memory address of the element at index 4?',
        options: [
          '0x2020 (8 bytes per integer * 4 = 32 bytes offset)',
          '0x2004 (4 bytes offset)',
          '0x2010 (16 bytes offset)',
          '0x2040 (64 bytes offset)',
        ],
        correct: 0,
        explanation: 'Each 64-bit integer requires 8 bytes of storage. The offset formula Address(i) = Base + (i * 8) = 0x2000 + (4 * 8) = 0x2000 + 32 (0x20 in hex) = 0x2020. This deterministic computation ensures O(1) time complexity.',
      },
      {
        id: 'q_arr_02',
        title: 'Geometric Resizing vs Linear Increment',
        prompt: 'Why do dynamic array implementations double their capacity (C * 2) rather than incrementing by a fixed constant (C + k) when full?',
        options: [
          'Geometric doubling guarantees O(1) amortized append, whereas constant increments degrade to O(N) per insertion',
          'Operating systems can only allocate memory sizes that are exact powers of two',
          'Doubling the array prevents garbage collection pauses entirely',
          'Constant increments cause stack overflow errors in the runtime engine',
        ],
        correct: 0,
        explanation: 'Doubling capacity spreads out the expensive O(N) copying step so that N elements require only ~2N copies total across their lifecycle (amortized O(1)). Constant additions of k require O(N/k) resizes, resulting in quadratic O(N^2) total work or O(N) per insertion.',
      },
      {
        id: 'q_arr_03',
        title: 'Spatial Locality and Cache Line Efficiency',
        prompt: 'Why does iterating through a 1D contiguous array exhibit faster execution than traversing an equally sized linked list of heap-allocated nodes?',
        options: [
          'Contiguous memory layout allows the CPU prefetcher to load adjacent elements into L1/L2 cache lines simultaneously',
          'Arrays do not require memory address storage in system RAM',
          'Linked list nodes always require 64 bits of arithmetic decoding per traversal step',
          'The CPU instruction pipeline skips cycle branch verification for arrays',
        ],
        correct: 0,
        explanation: 'Modern CPUs read RAM in 64-byte cache lines. Because array elements sit contiguously in memory, accessing arr[0] automatically loads arr[1...7] into high-speed cache. Linked list nodes reside in non-contiguous heap memory, triggering frequent cache misses.',
      },
      {
        id: 'q_arr_04',
        title: 'In-Place Invariant Preservation in Deduplication',
        prompt: 'When using a slow write-pointer and fast read-pointer to deduplicate a sorted array in-place, what critical invariant is maintained?',
        options: [
          'Elements in index range [0 ... write-1] represent the sorted unique prefix at all times',
          'The write-pointer must always remain at least two positions ahead of the read-pointer',
          'Every duplicate element is swapped with a null terminator immediately upon detection',
          'Memory capacity is deallocated on every iteration',
        ],
        correct: 0,
        explanation: 'The two-pointer compaction invariant dictates that the subarray nums[0 ... write-1] always contains the verified distinct elements processed so far, while the read-pointer scans ahead to detect new transitions.',
      },
      {
        id: 'q_arr_05',
        title: 'Arbitrary Insertion Shifting Complexity',
        prompt: 'What is the worst-case time complexity of inserting an element at index 0 of an existing array containing N elements?',
        options: [
          'O(N) because every existing element must be shifted rightward by one index to vacate index 0',
          'O(1) because the base pointer address is simply decremented',
          'O(log N) using binary partition insertion',
          'O(N^2) due to recursive allocation overhead',
        ],
        correct: 0,
        explanation: 'Because array elements must remain contiguous in memory, prepending at index 0 requires copying all N existing elements one position to the right (from index i to i+1) to preserve contiguity, yielding linear O(N) time.',
      },
    ],

    codingAssessment: {
      id: 'ca_arr_01',
      title: 'In-Place Array Deduplication & Compaction',
      difficulty: 'Medium',
      concept: 'Arrays & Dynamic Resizing',
      description: `Given a sorted integer array 'nums', remove duplicates in-place such that each unique element appears only once. The relative order of the elements must be kept the same.

Return 'k', the number of unique elements in 'nums'.
After running your function, the first 'k' elements of 'nums' must contain the unique numbers in sorted order. Elements beyond index 'k - 1' do not matter.

Constraints:
- 1 <= nums.length <= 3 * 10^4
- -100 <= nums[i] <= 100
- 'nums' is sorted in non-decreasing order.
- You must do this by modifying the input array in-place with O(1) extra memory.`,
      constraints: 'O(N) Time Complexity | O(1) Auxiliary Space | In-Place Modification',
      starterCode: `def removeDuplicates(nums: list[int]) -> int:
    """
    Remove duplicates in-place from sorted array nums.
    Returns k, the count of unique elements.
    """
    if not nums:
        return 0
        
    # Write pointer for the next unique position
    write_ptr = 1
    
    # Traverse with read pointer
    for read_ptr in range(1, len(nums)):
        if nums[read_ptr] != nums[read_ptr - 1]:
            nums[write_ptr] = nums[read_ptr]
            write_ptr += 1
            
    return write_ptr
`,
      sampleTests: [
        { input: 'nums = [1, 1, 2]', expected: 'k = 2, nums[:2] = [1, 2]' },
        { input: 'nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]', expected: 'k = 5, nums[:5] = [0, 1, 2, 3, 4]' },
      ],
      hiddenTestsCount: 16,
      vivaQuestion: 'Explain why allocating an auxiliary hash set to filter duplicates violates the memory constraints of an embedded system, and how the two-pointer invariant maintains correctness in a single pass.',
    },
  },

  strings: {
    id: 'c_strings_master',
    name: 'Strings & Substring Pattern Algorithms',
    module: 'Module 1: Linear & Key-Value Structures',
    prerequisite: 'Arrays & Dynamic Resizing',
    diagramType: 'string',
    complexities: {
      access: 'O(1) byte index lookup',
      search: 'O(N) linear / O(N+M) KMP & Rabin-Karp',
      concatenation: 'O(N+M) in immutable runtimes / O(1) amortized with StringBuilder',
      substring: 'O(K) slice copy / O(1) with string views',
      space: 'O(N) character buffer',
    },
    text: `A String is an ordered sequence of characters encoded into consecutive bytes (such as ASCII or UTF-8 code points).

1. String Immutability and Memory Compaction:
In languages such as Python, Java, and JavaScript, strings are immutable primitive objects. Once allocated, their character contents cannot be modified in-place. Concatenating strings in a naive loop creates a new object every time:
    s = s + char // Copies O(N) characters on each iteration, causing O(N^2) runtime!
Using mutable buffers (like Python list.join() or Java StringBuilder) avoids this by buffering characters in an amortized dynamic array.

2. Sliding Window Paradigm:
The sliding window is the foundational algorithmic technique for substring problems. By maintaining two pointer boundaries [left ... right], we expand the right boundary to incorporate new characters and contract the left boundary to restore validity invariants (such as avoiding duplicate characters or maintaining character frequency counts).

3. Two-Pointer Window Invariant:
  - Window state is tracked using an O(1) hash map or frequency array of character occurrences.
  - When the right character creates an invalid state (e.g. duplicate character), increment left until the state is valid again.
  - Total time complexity is O(N) because both left and right pointers traverse the string at most once.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|                 SLIDING WINDOW SUBSTRING SCAN                 |
+---------------------------------------------------------------+
  String:      'p'    'w'    'w'    'k'    'e'    'w'
  Index:       [0]    [1]    [2]    [3]    [4]    [5]
               ^             ^
              left         right (Duplicate 'w' detected!)
                           -> Advance left until valid!
`,

    example: `// Sliding Window Longest Substring Without Repeating Characters
function lengthOfLongestSubstring(s) {
  const charMap = new Map(); // Stores character -> most recent index
  let maxLength = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    
    // If character was seen inside the current window, contract left
    if (charMap.has(char) && charMap.get(char) >= left) {
      left = charMap.get(char) + 1;
    }
    
    charMap.set(char, right);
    const windowLength = right - left + 1;
    maxLength = Math.max(maxLength, windowLength);
  }

  return maxLength;
}

// Verification Trace
console.log(lengthOfLongestSubstring("abcabcbb")); // Returns 3 ("abc")
console.log(lengthOfLongestSubstring("bbbbb"));    // Returns 1 ("b")
console.log(lengthOfLongestSubstring("pwwkew"));   // Returns 3 ("wke")`,

    objectives: [
      'Explain string immutability implications and prevent quadratic concatenation anti-patterns',
      'Implement the sliding window invariant with character frequency trackers in O(N) time',
      'Handle variable-length UTF-8 multi-byte code point offsets and boundary edge cases',
      'Compare linear substring matching with prefix function algorithms',
    ],
    prerequisiteReview: 'Contiguous array buffers, ASCII/Unicode character encoding, and immutable vs mutable reference semantics.',
    misconceptions: [
      'Assuming repeated string concatenation in a loop (s += c) is O(N) (it is O(N^2) due to re-allocating new immutable strings).',
      'Thinking sliding window requires re-scanning every character in the current window from scratch.',
    ],
    keyTakeaways: [
      'Strings are immutable sequences in high-level runtimes; use StringBuilder/join to prevent quadratic copies.',
      'Sliding window with hash lookup achieves optimal O(N) substring exploration.',
    ],

    quizzes: [
      {
        id: 'q_str_01',
        title: 'String Immutability and Memory Reallocation',
        prompt: 'In an immutable string environment (such as Python or JavaScript), what is the time complexity of building a string of length N using repeated concatenation (s += c) inside a loop?',
        options: [
          'O(N^2) because each concatenation reallocates and copies all prior characters',
          'O(N) because characters are appended directly to the end of the existing memory buffer',
          'O(N log N) using divide-and-conquer string optimization',
          'O(1) because modern compilers automatically convert all strings into mutable linked lists',
        ],
        correct: 0,
        explanation: 'Because immutable strings cannot be modified in-place, the i-th concatenation copies i characters into a newly allocated heap buffer. The summation 1 + 2 + 3 + ... + N equals N(N+1)/2, which is quadratic O(N^2) time complexity.',
      },
      {
        id: 'q_str_02',
        title: 'Sliding Window Pointer Traversal Bounds',
        prompt: 'Why is the sliding window algorithm for substring problems guaranteed to run in O(N) linear time, even though it contains an inner while loop?',
        options: [
          'Because both the left and right pointers only move forward and visit each character at most once',
          'Because hash map lookup operates in O(1/N) fractional instruction cycles',
          'Because the inner loop only executes when the string length is an even number',
          'Because string length bounds are capped at the CPU word size',
        ],
        correct: 0,
        explanation: 'Although there is an inner loop contracting the left boundary, the left pointer only advances forward and never resets backward. Consequently, the right pointer advances N times and the left pointer advances at most N times, totaling at most 2N operations = O(N).',
      },
      {
        id: 'q_str_03',
        title: 'ASCII vs UTF-8 Character Representation',
        prompt: 'What distinguishes standard ASCII string encoding from UTF-8 encoding in memory?',
        options: [
          'ASCII uses a fixed 1 byte (7-8 bits) per character, whereas UTF-8 uses a variable 1 to 4 bytes per code point',
          'ASCII supports emojis natively while UTF-8 is restricted to standard English alphabets',
          'UTF-8 characters must always occupy exactly 32 bits in physical RAM',
          'ASCII requires double-null terminators at the conclusion of every memory word',
        ],
        correct: 0,
        explanation: 'Standard ASCII allocates a fixed 1 byte per character representing 128 characters. UTF-8 is a variable-width encoding backward-compatible with ASCII that uses 1 byte for standard ASCII and up to 4 bytes for international scripts and emoji symbols.',
      },
      {
        id: 'q_str_04',
        title: 'Substring Slice Memory Semantics',
        prompt: 'In modern JavaScript engines (V8), why does taking a small slice of a massive 100MB string previously cause potential memory leak concerns?',
        options: [
          'Sliced strings historically retained a reference to the underlying parent string buffer in memory',
          'The V8 engine duplicates all global heap pointers whenever slice() is invoked',
          'Taking a slice locks the CPU garbage collector until the page reloads',
          'Strings cannot be collected by garbage collection if their index is an odd number',
        ],
        correct: 0,
        explanation: 'Older engine optimizations created "sliced strings" as lightweight views pointing to an offset inside the parent buffer without copying characters. This caused the entire 100MB parent buffer to remain retained in RAM even if only a 5-character slice was used.',
      },
      {
        id: 'q_str_05',
        title: 'Rabin-Karp Rolling Hash Principle',
        prompt: 'How does the Rabin-Karp substring search algorithm achieve efficient average-case pattern matching?',
        options: [
          'By calculating a rolling polynomial hash of the window in O(1) time before verifying character matches',
          'By reversing both the pattern and the text and scanning from right to left',
          'By compressing the string into an Huffman binary tree',
          'By converting all characters into their hexadecimal ASCII product values',
        ],
        correct: 0,
        explanation: 'Rabin-Karp computes a rolling hash of the pattern and updates the text window hash in O(1) time by subtracting the outgoing character and adding the incoming character. Full string comparison is only performed when hashes match, mitigating false positives.',
      },
    ],

    codingAssessment: {
      id: 'ca_str_01',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'Medium',
      concept: 'Strings & Substring Pattern Algorithms',
      description: `Given a string 's', find the length of the longest substring without repeating characters.

A substring is a contiguous non-empty sequence of characters within a string.

Constraints:
- 0 <= s.length <= 5 * 10^4
- 's' consists of English letters, digits, symbols and spaces.
- Target Complexity: O(N) Time Complexity and O(min(N, alphabet_size)) Space.`,
      constraints: 'O(N) Time Complexity | O(min(N, M)) Auxiliary Space | Sliding Window',
      starterCode: `def lengthOfLongestSubstring(s: str) -> int:
    """
    Find length of longest contiguous substring without duplicates.
    """
    char_index_map = {}
    max_len = 0
    left = 0
    
    for right, char in enumerate(s):
        # If character is already in current window, advance left pointer
        if char in char_index_map and char_index_map[char] >= left:
            left = char_index_map[char] + 1
            
        char_index_map[char] = right
        max_len = max(max_len, right - left + 1)
        
    return max_len
`,
      sampleTests: [
        { input: 's = "abcabcbb"', expected: '3 (substring "abc")' },
        { input: 's = "bbbbb"', expected: '1 (substring "b")' },
        { input: 's = "pwwkew"', expected: '3 (substring "wke")' },
      ],
      hiddenTestsCount: 20,
      vivaQuestion: 'Explain why updating the left pointer using `left = char_index_map[char] + 1` requires the precondition `char_index_map[char] >= left`, and what bug occurs if that check is omitted.',
    },
  },

  stack: {
    id: 'c_stack_master',
    name: 'Stack & LIFO Evaluation Invariants',
    module: 'Module 1: Linear & Key-Value Structures',
    prerequisite: 'Arrays & Dynamic Resizing',
    diagramType: 'stack',
    complexities: {
      push: 'O(1) constant time insertion',
      pop: 'O(1) constant time removal of top element',
      top_peek: 'O(1) inspect top element',
      search: 'O(N) linear scan',
      space: 'O(N) linear auxiliary storage',
    },
    text: `A Stack is an abstract linear data type that adheres to the strict Last-In, First-Out (LIFO) discipline.

1. LIFO Discipline & Interface Invariants:
Elements can only be inserted (pushed) and removed (popped) from a single designated boundary called the TOP of the stack. Attempting to pop from an empty stack triggers an underflow error, while exceeding fixed memory capacity causes a stack overflow.

2. Hardware & Runtime Call-Stack Mechanics:
The hardware execution stack tracks function execution contexts. When a function is called:
  - An activation record (stack frame) containing return addresses, function parameters, and local variables is pushed onto the call stack.
  - When the function returns, its frame is popped, restoring the CPU instruction pointer to the caller context.
Recursion without a valid terminating base case pushes infinite activation frames until physical stack memory (typically 1-8 MB) is exhausted.

3. Auxiliary Min-Stack Invariant:
A classic interview and engineering problem requires retrieving the minimum element of a stack in O(1) time. This is achieved by maintaining a parallel auxiliary stack:
  - When pushing value x, also push min(x, min_stack.top) onto the min-stack.
  - When popping from the main stack, also pop from the min-stack.
  - The top of the min-stack always reflects the minimum of all currently stored elements in constant time.

4. Monotonic Stack Applications:
A Monotonic Stack maintains elements in strictly increasing or decreasing order. It solves the Next Greater Element problem in optimal O(N) time by popping all smaller elements prior to pushing a new candidate.`,

    asciiDiagram: `
+---------------------------------------------------------------+
|                       LIFO STACK VESSEL                       |
+---------------------------------------------------------------+
                    push(42) --> [  42  ] <-- TOP (Most Recent)
                                 |  18  |
                                 |  07  | <-- BASE (Oldest)
                                 +------+
`,

    example: `// Min-Stack with O(1) Push, Pop, Top, and GetMin
class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }

  push(val) {
    this.stack.push(val);
    if (this.minStack.length === 0 || val <= this.getMin()) {
      this.minStack.push(val);
    }
  }

  pop() {
    if (this.stack.length === 0) return;
    const popped = this.stack.pop();
    if (popped === this.getMin()) {
      this.minStack.pop();
    }
    return popped;
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  getMin() {
    return this.minStack[this.minStack.length - 1];
  }
}

// Verification Trace
const minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
console.log("Current Min:", minStack.getMin()); // Returns -3
minStack.pop();
console.log("Top element:", minStack.top());     // Returns 0
console.log("Min after pop:", minStack.getMin()); // Returns -2`,

    objectives: [
      'Master the LIFO discipline and contrast hardware call stacks with heap memory',
      'Design an auxiliary Min-Stack providing O(1) constant-time minimum retrieval',
      'Apply monotonic stacks to solve Next Greater Element problems in linear O(N) time',
      'Implement nested delimiter validation for compilers and syntax parsers',
    ],
    prerequisiteReview: 'Linear arrays, dynamic buffers, and pointer/index manipulation.',
    misconceptions: [
      'Believing Min-Stack can be achieved in O(1) with a single integer tracking min (it fails when the min element is popped).',
      'Confusing program stack memory (call frames) with abstract stack data structures.',
    ],
    keyTakeaways: [
      'LIFO principle enforces push, pop, and peek operations at the TOP boundary in strict O(1) time.',
      'Parallel auxiliary stack preserves the historical minimum across all push/pop transitions in O(1).',
      'Monotonic stack enables optimal O(N) Next Greater Element discovery.',
    ],

    quizzes: [
      {
        id: 'q_stk_01',
        title: 'LIFO Discipline Invariant',
        prompt: 'If elements [A, B, C, D] are pushed onto an empty stack in that exact sequence, in what order will they be popped?',
        options: [
          'D, C, B, A (Reversed order adhering to Last-In, First-Out)',
          'A, B, C, D (First-In, First-Out)',
          'B, A, D, C (Alternating parity)',
          'A, D, B, C (Random order)',
        ],
        correct: 0,
        explanation: 'Because stacks adhere strictly to Last-In, First-Out (LIFO), the most recently pushed element (D) is at the top of the stack and is popped first, followed by C, B, and finally A.',
      },
      {
        id: 'q_stk_02',
        title: 'Constant Time Minimum Retrieval (Min-Stack)',
        prompt: 'How can a stack support push, pop, top, and getMin all in O(1) constant time without scanning all elements?',
        options: [
          'By maintaining a synchronized auxiliary stack that tracks the current minimum at each stack depth',
          'By sorting the main stack in ascending order after every push operation',
          'By storing elements in a circular doubly-linked binary tree',
          'By utilizing a hash map with random mathematical seed keys',
        ],
        correct: 0,
        explanation: 'An auxiliary min-stack stores the minimum value observed up to each depth level. When an element is pushed or popped, the min-stack is updated simultaneously in O(1) time, ensuring the top of the min-stack always holds the current minimum.',
      },
      {
        id: 'q_stk_03',
        title: 'Function Call Stack vs Heap Space',
        prompt: 'What physical condition causes a "Stack Overflow" error during unbounded recursive execution?',
        options: [
          'The call stack memory region exceeds its allocated capacity because activation frames are pushed faster than they return',
          'The CPU data bus runs out of register address bits',
          'Heap memory garbage collector deallocates the main thread',
          'The operating system network socket becomes saturated',
        ],
        correct: 0,
        explanation: 'Every recursive call pushes a new stack frame (parameters, local variables, return address) onto the execution call stack. Without a terminating base condition, the call stack exceeds its allotted memory limit (typically 1-8MB in modern OS threads), throwing a stack overflow error.',
      },
      {
        id: 'q_stk_04',
        title: 'Monotonic Stack Amortized Analysis',
        prompt: 'In the Next Greater Element problem on an array of length N, what is the total time complexity when using a monotonic decreasing stack?',
        options: [
          'O(N) because each element is pushed once and popped at most once across the entire algorithm',
          'O(N^2) because each element triggers an internal while loop scanning all prior numbers',
          'O(N log N) by sorting elements internally',
          'O(1) using precomputed hash arrays',
        ],
        correct: 0,
        explanation: 'Even though an element may trigger multiple pops in the while loop, an element can only be pushed onto the stack once and popped at most once. Therefore, the total number of stack operations across all iterations is bounded by 2N, yielding amortized O(N) linear time.',
      },
      {
        id: 'q_stk_05',
        title: 'Balanced Bracket Parsing Invariant',
        prompt: 'When parsing nested brackets like "{[()]}", why is a stack the mathematically correct data structure?',
        options: [
          'The most recently opened bracket must be the first bracket closed (LIFO matching property)',
          'Brackets must be evaluated in ascending ASCII order',
          'A queue cannot allocate memory for character elements',
          'Stacks automatically sort opening brackets before closing brackets',
        ],
        correct: 0,
        explanation: 'Nested delimiters require that the innermost (most recently opened) opening bracket must match the very next closing bracket encountered. This symmetry matches the Last-In, First-Out (LIFO) property of a stack precisely.',
      },
    ],

    codingAssessment: {
      id: 'ca_stk_01',
      title: 'Valid Parentheses & Min-Stack Invariant Verification',
      difficulty: 'Medium',
      concept: 'Stack & LIFO Evaluation Invariants',
      description: `Given a string 's' containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Constraints:
- 1 <= s.length <= 10^4
- 's' consists of parentheses only '()[]{}'.
- Time complexity must be O(N) and auxiliary space O(N).`,
      constraints: 'O(N) Time Complexity | O(N) Auxiliary Space | LIFO Bracket Validation',
      starterCode: `def isValid(s: str) -> bool:
    """
    Validate nested bracket sequences using a LIFO stack.
    """
    stack = []
    bracket_map = {')': '(', '}': '{', ']': '['}
    
    for char in s:
        # If it's a closing bracket
        if char in bracket_map:
            # Pop top element or assign dummy value if stack is empty
            top_element = stack.pop() if stack else '#'
            if bracket_map[char] != top_element:
                return False
        else:
            # It's an opening bracket, push to stack
            stack.append(char)
            
    # Valid only if all opened brackets were successfully matched
    return len(stack) == 0
`,
      sampleTests: [
        { input: 's = "()"', expected: 'true' },
        { input: 's = "()[]{}"', expected: 'true' },
        { input: 's = "(]"', expected: 'false' },
        { input: 's = "([)]"', expected: 'false' },
        { input: 's = "{[]}"', expected: 'true' },
      ],
      hiddenTestsCount: 18,
      vivaQuestion: 'Explain how the stack underflow condition occurs during bracket matching, and why encountering a closing bracket with an empty stack immediately proves the sequence is invalid.',
    },
  },
};

/**
 * Extracts and synthesizes a full curriculum for any syllabus text or structured JSON.
 * Automatically identifies subject domain (DSA, Operating Systems, OOP) and topics.
 * Returns authoritative technical content with all 6 required sections:
 * 1. learning_objectives
 * 2. prerequisite_review
 * 3. core_explanation
 * 4. worked_examples
 * 5. common_misconceptions
 * 6. key_takeaways
 * Plus at least 5 Bloom-aligned Quizzes per topic and Monaco-ready Coding Assessments.
 */
export function synthesizeCurriculumFromSyllabus(syllabusInput = '', courseTitle = '') {
  let rawText = '';
  let parsedJson = null;

  if (typeof syllabusInput === 'string') {
    rawText = syllabusInput;
    const trimmed = syllabusInput.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsedJson = JSON.parse(trimmed);
      } catch {
        // Not JSON, continue with text analysis
      }
    }
  } else if (typeof syllabusInput === 'object' && syllabusInput !== null) {
    parsedJson = syllabusInput;
    rawText = JSON.stringify(syllabusInput);
  }

  const combinedSearch = (
    rawText + ' ' + (courseTitle || '') + ' ' + (parsedJson?.subject_name || '') + ' ' + (parsedJson?.subject_id || '')
  ).toLowerCase();

  // Determine subject database
  let subjectMode = 'dsa';
  let defaultCourseTitle = 'Data Structures & Algorithmic Problem Solving (DSA)';
  let defaultModuleName = 'Module 1: Linear & Key-Value Structures';
  let selectedTopics = [];

  if (
    parsedJson?.subject_id === 'os' ||
    combinedSearch.includes('operating system') ||
    combinedSearch.includes('os fundamentals') ||
    combinedSearch.includes('cpu scheduling') ||
    combinedSearch.includes('virtual memory') ||
    combinedSearch.includes('paging') ||
    combinedSearch.includes('kernel architecture')
  ) {
    subjectMode = 'os';
    defaultCourseTitle = parsedJson?.subject_name || 'Operating Systems (OS)';
    defaultModuleName = 'Module 1: Kernel Architecture & Memory Subsystems';
    selectedTopics = Object.values(OS_TOPICS_DATABASE);
  } else if (
    parsedJson?.subject_id === 'oop' ||
    combinedSearch.includes('object-oriented') ||
    combinedSearch.includes('oop') ||
    combinedSearch.includes('classes and objects') ||
    combinedSearch.includes('inheritance') ||
    combinedSearch.includes('polymorphism') ||
    combinedSearch.includes('encapsulation')
  ) {
    subjectMode = 'oop';
    defaultCourseTitle = parsedJson?.subject_name || 'Object-Oriented Programming (OOP)';
    defaultModuleName = 'Module 1: Encapsulation & Polymorphic Architectures';
    selectedTopics = Object.values(OOP_TOPICS_DATABASE);
  } else {
    // Default to DSA
    subjectMode = 'dsa';
    defaultCourseTitle = parsedJson?.subject_name || courseTitle || 'Data Structures & Algorithmic Problem Solving (DSA)';
    defaultModuleName = 'Module 1: Linear & Key-Value Structures';
    
    // Filter DSA topics if specific ones mentioned, else provide all 3
    const dsaSelected = [];
    if (combinedSearch.includes('array')) dsaSelected.push(DSA_TOPICS_DATABASE.arrays);
    if (combinedSearch.includes('string') || combinedSearch.includes('substring')) dsaSelected.push(DSA_TOPICS_DATABASE.strings);
    if (combinedSearch.includes('stack') || combinedSearch.includes('lifo')) dsaSelected.push(DSA_TOPICS_DATABASE.stack);

    selectedTopics = dsaSelected.length > 0
      ? dsaSelected
      : [DSA_TOPICS_DATABASE.arrays, DSA_TOPICS_DATABASE.strings, DSA_TOPICS_DATABASE.stack];
  }

  // Build Concepts containing all 6 required sections
  const concepts = selectedTopics.map((topic, idx) => {
    const objectives = topic.objectives || topic.learningObjectives || [];
    const prereqReview = topic.prerequisiteReview || topic.prerequisite || 'Foundational programming prerequisites.';
    const coreExplanation = topic.text || topic.coreExplanation || '';
    const workedExample = topic.example || topic.workedExamples || '';
    const misconceptionsList = topic.misconceptions || topic.commonMisconceptions || [];
    const takeawaysList = topic.keyTakeaways || topic.takeaways || [];

    const typedSections = [
      {
        id: `sec_${topic.id}_1`,
        title: '1. Learning Objectives',
        type: 'list',
        items: objectives,
      },
      {
        id: `sec_${topic.id}_2`,
        title: '2. Prerequisite Review',
        type: 'text',
        content: prereqReview,
      },
      {
        id: `sec_${topic.id}_3`,
        title: '3. Core Technical Invariant & Mechanics',
        type: 'text',
        content: coreExplanation,
      },
      {
        id: `sec_${topic.id}_4`,
        title: '4. Worked Implementation Example',
        type: 'code',
        content: workedExample,
      },
      {
        id: `sec_${topic.id}_5`,
        title: '5. Common Misconceptions & Pitfalls',
        type: 'callout',
        calloutVariant: 'warning',
        content: misconceptionsList.length > 0 ? misconceptionsList.join('\n\n• ') : 'Always verify boundary conditions.',
      },
      {
        id: `sec_${topic.id}_6`,
        title: '6. Key Takeaways',
        type: 'list',
        items: takeawaysList,
      },
    ];

    return {
      id: topic.id,
      name: topic.name,
      module: topic.module || defaultModuleName,
      prerequisite: topic.prerequisite,
      prerequisiteReview: prereqReview,
      diagramType: topic.diagramType || 'tree',
      description: coreExplanation.split('\n\n')[0] || topic.name,
      theory: coreExplanation,
      coreExplanation,
      asciiDiagram: topic.asciiDiagram,
      example: workedExample,
      workedExamples: workedExample,
      complexities: topic.complexities,
      learningObjectives: objectives,
      misconceptions: misconceptionsList,
      commonMisconceptions: misconceptionsList,
      keyTakeaways: takeawaysList,
      sections: typedSections,
      mastery: 50 + idx * 15,
      status: idx === 0 ? 'developing' : 'needs_practice',
    };
  });

  // Collect all 5+ quizzes per topic (15 total)
  const quizzes = [];
  selectedTopics.forEach((topic) => {
    (topic.quizzes || []).forEach((q) => {
      quizzes.push({
        id: q.id,
        conceptId: topic.id,
        conceptName: topic.name,
        title: q.title,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correct !== undefined ? q.correct : q.correctIndex,
        explanation: q.explanation,
        status: 'pending',
      });
    });
  });

  // Collect coding assessments (1 per topic)
  const codingAssessments = selectedTopics.map((topic) => {
    const ca = topic.codingAssessment || {};
    return {
      id: ca.id || `ca_${topic.id}`,
      conceptId: topic.id,
      conceptName: topic.name,
      title: ca.title || `${topic.name} Implementation Assessment`,
      difficulty: ca.difficulty || 'Medium',
      description: ca.description || `Implement standard solutions and verify invariants for ${topic.name}.`,
      constraints: ca.constraints || 'Optimal Time & Auxiliary Space Bounds',
      starterCode: ca.starterCode || '# Write your solution here\n',
      sampleTests: ca.sampleTests || [],
      hiddenTestsCount: ca.hiddenTestsCount || 15,
      vivaQuestion: ca.vivaQuestion || 'Explain the time complexity and memory overhead of your implementation.',
      status: 'pending',
    };
  });

  return {
    subjectMode,
    courseTitle: courseTitle || defaultCourseTitle,
    moduleName: defaultModuleName,
    topicsCount: selectedTopics.length,
    totalQuizzesCount: quizzes.length,
    totalCodingCount: codingAssessments.length,
    concepts,
    quizzes,
    codingAssessments,
  };
}

