/**
 * Scoring utilities for Affordability Index
 *
 * Score range: 0-100 (higher = more affordable)
 * Based on percentile ranking where affordabilityPercentile represents
 * the percentage of peer locations with worse (higher) affordability ratios.
 */

/**
 * Clamp a score to valid range (0-99)
 *
 * Caps at 99 instead of 100 to avoid "Score: 100 everywhere" problem
 * when many highly affordable cities cluster at the top percentiles.
 * This creates better visual differentiation in the top tier.
 */
export function clampScore(score: number | null): number | null {
  if (score === null || score === undefined) return null;
  const rounded = Math.round(score);
  // Cap at 99 to prevent too many "100" scores
  return Math.max(0, Math.min(99, rounded));
}

/**
 * Convert score to letter grade
 *
 * Hybrid grading scale (adjusted for real affordability distribution):
 * - A+: 80-100  (Excellent - top ~16% of cities)
 * - A:  70-79   (Very Good - top ~30% of cities)
 * - B+: 60-69   (Good - above average)
 * - B:  50-59   (Above Average - median ~43)
 * - C+: 40-49   (Average)
 * - C:  30-39   (Below Average)
 * - D:  20-29   (Challenging)
 * - F:  0-19    (Unaffordable - bottom ~8%)
 *
 * This scale ensures ~92% of cities pass (grade C+ or better)
 * and aligns letter grades with actual percentile performance.
 */
export function scoreToGrade(score: number | null): string | null {
  if (score === null || score === undefined) return null;

  if (score >= 80) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 60) return 'B+';
  if (score >= 50) return 'B';
  if (score >= 40) return 'C+';
  if (score >= 30) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

/**
 * Get descriptive label for score
 */
export function scoreLabel(score: number | null): string {
  if (score === null || score === undefined) return 'Unknown';

  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Above Average';
  if (score >= 40) return 'Average';
  if (score >= 30) return 'Below Average';
  if (score >= 20) return 'Challenging';
  return 'Unaffordable';
}

/**
 * Format score for display
 */
export function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—';
  return Math.round(score).toString();
}

/**
 * Format grade for display
 */
export function formatGrade(grade: string | null): string {
  if (!grade) return '—';
  return grade;
}

/**
 * Get color class for score/grade
 */
export function getScoreColor(score: number | null): string {
  if (score === null || score === undefined) {
    return 'bg-gray-100 text-gray-700 border-gray-300';
  }

  if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';    // A+
  if (score >= 70) return 'bg-blue-100 text-blue-800 border-blue-300';      // A
  if (score >= 60) return 'bg-cyan-100 text-cyan-800 border-cyan-300';      // B+
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // B, C+
  if (score >= 20) return 'bg-orange-100 text-orange-800 border-orange-300'; // C, D
  return 'bg-red-100 text-red-800 border-red-300';                          // F
}

/**
 * Get score description for user
 */
export function getScoreDescription(score: number | null): string {
  if (score === null || score === undefined) {
    return 'Affordability data not available';
  }

  if (score >= 80) {
    return 'Excellent affordability - local incomes stretch significantly further relative to costs';
  }
  if (score >= 70) {
    return 'Very good affordability - local incomes stretch further relative to costs';
  }
  if (score >= 60) {
    return 'Good affordability - costs are reasonable relative to local incomes';
  }
  if (score >= 50) {
    return 'Above average affordability - costs are manageable relative to local incomes';
  }
  if (score >= 40) {
    return 'Average affordability - costs are moderate relative to local incomes';
  }
  if (score >= 30) {
    return 'Below average affordability - costs are elevated relative to local incomes';
  }
  if (score >= 20) {
    return 'Challenging affordability - costs are high relative to local incomes';
  }
  return 'Poor affordability - costs are very high relative to local incomes';
}
