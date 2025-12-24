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
 * Grade scale:
 * - A+: 95-100
 * - A:  90-94
 * - A-: 85-89
 * - B+: 80-84
 * - B:  75-79
 * - B-: 70-74
 * - C+: 65-69
 * - C:  60-64
 * - C-: 55-59
 * - D:  50-54
 * - F:  0-49
 */
export function scoreToGrade(score: number | null): string | null {
  if (score === null || score === undefined) return null;

  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * Get descriptive label for score
 */
export function scoreLabel(score: number | null): string {
  if (score === null || score === undefined) return 'Unknown';

  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Mixed';
  if (score >= 45) return 'Challenging';
  return 'Very hard';
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

  if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';
  if (score >= 75) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (score >= 45) return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

/**
 * Get score description for user
 */
export function getScoreDescription(score: number | null): string {
  if (score === null || score === undefined) {
    return 'Affordability data not available';
  }

  if (score >= 90) {
    return 'Local incomes stretch significantly further relative to housing costs';
  }
  if (score >= 75) {
    return 'Local incomes stretch further relative to housing costs';
  }
  if (score >= 60) {
    return 'Housing costs are moderate relative to local incomes';
  }
  if (score >= 45) {
    return 'Housing costs are challenging relative to local incomes';
  }
  return 'Housing costs are very high relative to local incomes';
}
