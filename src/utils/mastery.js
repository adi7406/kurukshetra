/**
 * Centralized Mastery Design System & Classification Utilities
 * Implements authoritative 3-tier mastery scale:
 * - Below 40%: Restrained red/orange, label "Weak"
 * - 40% through 70%: Amber, label "Developing"
 * - Above 70%: Green, label "Solid"
 * 
 * Boundary Convention:
 * - Internal UI & presentation components strictly operate on integer percentages in [0, 100].
 * - When API or models provide fractional ratios (e.g. 0.92, 0.68, 0.45), normalizeMastery scales by 100.
 * - When API already provides percentages (e.g. 48, 78, 92), normalizeMastery NEVER multiplies by 100.
 * - Clamps strictly between 0 and 100, handling null, undefined, and NaN gracefully.
 */

/**
 * Normalizes any raw mastery score input into an integer percentage [0, 100].
 * @param {number|string|null|undefined} value - Raw input from API or state
 * @returns {number} Normalized integer percentage in the range 0-100
 */
export function normalizeMastery(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  if (isNaN(num)) return 0;

  // If fractional representation (0 < num <= 1), scale to percentage (e.g. 0.92 -> 92, 0.48 -> 48)
  // If already a percentage (num > 1, e.g. 48, 78), do NOT scale.
  const percentage = (num > 0 && num <= 1) ? num * 100 : num;

  // Clamp to [0, 100] and round to nearest integer
  return Math.min(100, Math.max(0, Math.round(percentage)));
}

export function getMasteryLevel(scoreInput) {
  const score = normalizeMastery(scoreInput);

  if (score < 40) {
    return {
      score,
      level: 'weak',
      label: 'Weak',
      color: '#E5484D',
      textLight: '#E5484D',
      bgLight: '#FDE8E8',
      borderLight: '#FBCFD0',
      bg: 'rgba(229, 72, 77, 0.14)',
      border: 'rgba(229, 72, 77, 0.3)',
      badgeClass: 'badge-weak',
      ariaLabel: `${score}% · Weak mastery, requires targeted concept practice`,
      description: 'Foundational gaps identified. Immediate prerequisite practice recommended.',
    };
  }

  if (score <= 70) {
    return {
      score,
      level: 'developing',
      label: 'Developing',
      color: '#F5A524',
      textLight: '#D97706',
      bgLight: '#FEF3E2',
      borderLight: '#FDDCA5',
      bg: 'rgba(245, 165, 36, 0.14)',
      border: 'rgba(245, 165, 36, 0.3)',
      badgeClass: 'badge-developing',
      ariaLabel: `${score}% · Developing mastery, advancing through practice`,
      description: 'Core comprehension established. Additional diagnostic quizzes and code practice needed to consolidate.',
    };
  }

  return {
    score,
    level: 'solid',
    label: 'Solid',
    color: '#17A673',
    textLight: '#17A673',
    bgLight: '#E8F7F0',
    borderLight: '#BDE8D6',
    bg: 'rgba(23, 166, 115, 0.14)',
    border: 'rgba(23, 166, 115, 0.3)',
    badgeClass: 'badge-solid',
    ariaLabel: `${score}% · Solid mastery, ready for advanced synthesis`,
    description: 'High conceptual retention and algorithmic problem-solving proficiency verified.',
  };
}

export function formatMasteryText(scoreInput) {
  const { score, label } = getMasteryLevel(scoreInput);
  return `${score}% · ${label}`;
}
