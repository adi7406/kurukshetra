/**
 * Traditional LeetCode-Style Algorithmic Coding Problems for MasterPath
 * Includes Two Sum, Valid Palindrome, and Valid Anagram.
 */

export const CURATED_CODING_PROBLEMS = [
  {
    id: 'leetcode_two_sum',
    title: 'Two Sum',
    concept: 'Hash Maps & Two Pointers',
    conceptName: 'Hash Table Lookup & Pair Sum',
    difficulty: 'Easy',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    status: 'published',
    problemStatement: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    inputFormat: 'Line 1: Comma-separated integer array (e.g. 2,7,11,15)\nLine 2: Target integer (e.g. 9)',
    outputFormat: 'Return the indices of the two elements as a list: [index1, index2]',
    constraints: `2 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9
Only one valid answer exists.
Follow-up: Can you devise an algorithm with O(N) runtime complexity?`,
    examples: [
      {
        id: 'ex_1',
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].',
      },
      {
        id: 'ex_2',
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2].',
      },
      {
        id: 'ex_3',
        input: 'nums = [3, 3], target = 6',
        output: '[0, 1]',
        explanation: 'nums[0] + nums[1] == 3 + 3 == 6, returning [0, 1].',
      },
    ],
    sampleTests: [
      {
        id: 'st_1',
        input: '2,7,11,15\n9',
        expectedOutput: '[0, 1]',
        explanation: 'Standard sample test case 1',
      },
      {
        id: 'st_2',
        input: '3,2,4\n6',
        expectedOutput: '[1, 2]',
        explanation: 'Standard sample test case 2',
      },
    ],
    starterCode: {
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Hash map storing complement -> index
        lookup = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in lookup:
                return [lookup[complement], i]
            lookup[num] = i
        return []
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`,
      java: `import java.util.HashMap;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
`,
      cpp: `#include <vector>
#include <unordered_map>

class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        std::unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (map.find(complement) != map.end()) {
                return {map[complement], i};
            }
            map[nums[i]] = i;
        }
        return {};
    }
};
`,
    },
    supportedLanguages: ['python', 'javascript', 'java', 'cpp'],
    vivaQuestion: {
      prompt: 'Explain why single-pass hash map lookup achieves O(N) time complexity compared to the brute force O(N^2) approach, and describe the auxiliary memory trade-off.',
      rubric: 'Evaluates understanding of hash map lookup time O(1) vs nested iteration O(N^2), and auxiliary space overhead O(N).',
    },
    rubric: 'Evaluates algorithm comprehension, runtime invariants, and edge case resilience.',
  },
  {
    id: 'leetcode_valid_palindrome',
    title: 'Valid Palindrome',
    concept: 'Two Pointers & String Invariants',
    conceptName: 'Two-Pointer In-Place Invariant',
    difficulty: 'Easy',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    status: 'published',
    problemStatement: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string s, return true if it is a palindrome, or false otherwise.`,
    inputFormat: 'A single string s representing the candidate phrase.',
    outputFormat: 'Return boolean: true or false.',
    constraints: `1 <= s.length <= 2 * 10^5
s consists only of printable ASCII characters.
Follow-up: Implement an in-place two-pointer solution requiring O(1) extra memory.`,
    examples: [
      {
        id: 'ex_1',
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        id: 'ex_2',
        input: 's = "race a car"',
        output: 'false',
        explanation: '"raceacar" is not a palindrome.',
      },
      {
        id: 'ex_3',
        input: 's = " "',
        output: 'true',
        explanation: 's is an empty string "" after removing non-alphanumeric characters. Since an empty string reads the same forward and backward, it is a palindrome.',
      },
    ],
    sampleTests: [
      {
        id: 'st_1',
        input: 'A man, a plan, a canal: Panama',
        expectedOutput: 'true',
        explanation: 'Classic palindrome with punctuation and spaces',
      },
      {
        id: 'st_2',
        input: 'race a car',
        expectedOutput: 'false',
        explanation: 'Mismatching characters',
      },
    ],
    starterCode: {
      python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        left, right = 0, len(s) - 1
        while left < right:
            while left < right and not s[left].isalnum():
                left += 1
            while left < right and not s[right].isalnum():
                right -= 1
            if s[left].lower() != s[right].lower():
                return False
            left += 1
            right -= 1
        return True
`,
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  let left = 0, right = s.length - 1;
  while (left < right) {
    while (left < right && !/[a-zA-Z0-9]/.test(s[left])) left++;
    while (left < right && !/[a-zA-Z0-9]/.test(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) {
      return false;
    }
    left++;
    right--;
  }
  return true;
}
`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}
`,
      cpp: `#include <string>
#include <cctype>

class Solution {
public:
    bool isPalindrome(std::string s) {
        int left = 0, right = s.size() - 1;
        while (left < right) {
            while (left < right && !isalnum(s[left])) left++;
            while (left < right && !isalnum(s[right])) right--;
            if (tolower(s[left]) != tolower(s[right])) return false;
            left++;
            right--;
        }
        return true;
    }
};
`,
    },
    supportedLanguages: ['python', 'javascript', 'java', 'cpp'],
    vivaQuestion: {
      prompt: 'Explain the invariant guarantees of the two-pointer approach for palindrome verification and why checking characters in-place achieves O(1) space complexity without allocating an auxiliary string.',
      rubric: 'Evaluates understanding of inward two-pointer convergence, non-alphanumeric skipping boundary invariants, and auxiliary memory conservation.',
    },
    rubric: 'Evaluates algorithm comprehension, runtime invariants, and edge case resilience.',
  },
  {
    id: 'leetcode_valid_anagram',
    title: 'Valid Anagram',
    concept: 'Hash Tables & Character Frequency',
    conceptName: 'Frequency Map & Sorting Invariants',
    difficulty: 'Easy',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    status: 'published',
    problemStatement: `Given two strings s and t, return true if t is an anagram of s, and false otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    inputFormat: 'Line 1: string s\nLine 2: string t',
    outputFormat: 'Return boolean: true or false.',
    constraints: `1 <= s.length, t.length <= 5 * 10^4
s and t consist of lowercase English letters.
Follow-up: What if the inputs contain Unicode characters? How would you adapt your solution?`,
    examples: [
      {
        id: 'ex_1',
        input: 's = "anagram", t = "nagaram"',
        output: 'true',
        explanation: 'All letters match in exact frequency count.',
      },
      {
        id: 'ex_2',
        input: 's = "rat", t = "car"',
        output: 'false',
        explanation: 'Letter frequency mismatch.',
      },
    ],
    sampleTests: [
      {
        id: 'st_1',
        input: 'anagram\nnagaram',
        expectedOutput: 'true',
        explanation: 'Identical letter counts',
      },
      {
        id: 'st_2',
        input: 'rat\ncar',
        expectedOutput: 'false',
        explanation: 'Mismatched letters',
      },
    ],
    starterCode: {
      python: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False
        counts = {}
        for c in s:
            counts[c] = counts.get(c, 0) + 1
        for c in t:
            if c not in counts or counts[c] == 0:
                return False
            counts[c] -= 1
        return True
`,
      javascript: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}
`,
      java: `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (char c : s.toCharArray()) counts[c - 'a']++;
        for (char c : t.toCharArray()) {
            if (--counts[c - 'a'] < 0) return false;
        }
        return true;
    }
}
`,
      cpp: `#include <string>
#include <vector>

class Solution {
public:
    bool isAnagram(std::string s, std::string t) {
        if (s.size() != t.size()) return false;
        std::vector<int> counts(26, 0);
        for (char c : s) counts[c - 'a']++;
        for (char c : t) {
            if (--counts[c - 'a'] < 0) return false;
        }
        return true;
    }
};
`,
    },
    supportedLanguages: ['python', 'javascript', 'java', 'cpp'],
    vivaQuestion: {
      prompt: 'Compare the time and space complexity of sorting the two strings O(N log N) versus using a fixed 26-element integer frequency array O(N), and explain why the 26-element array requires O(1) auxiliary space.',
      rubric: 'Evaluates algorithmic optimality: O(N) frequency counting vs O(N log N) sorting, and constant O(1) space guarantees for bounded alphabets.',
    },
    rubric: 'Evaluates algorithm comprehension, runtime invariants, and edge case resilience.',
  },
];
