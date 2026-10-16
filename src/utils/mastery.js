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
      color: '#EF4444',
      textLight: '#F87171',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
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
      color: '#F59E0B',
      textLight: '#FBBF24',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      badgeClass: 'badge-developing',
      ariaLabel: `${score}% · Developing mastery, advancing through practice`,
      description: 'Core comprehension established. Additional diagnostic quizzes and code practice needed to consolidate.',
    };
  }

  return {
    score,
    level: 'solid',
    label: 'Solid',
    color: '#10B981',
    textLight: '#34D399',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    badgeClass: 'badge-solid',
    ariaLabel: `${score}% · Solid mastery, ready for advanced synthesis`,
    description: 'High conceptual retention and algorithmic problem-solving proficiency verified.',
  };
}

export function formatMasteryText(scoreInput) {
  const { score, label } = getMasteryLevel(scoreInput);
  return `${score}% · ${label}`;
}
