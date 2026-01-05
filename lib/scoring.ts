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
 * Traditional grading scale with +/- modifiers aligned with percentile ranks:
 * - A+: 90-100  (Excellent - top ~10% of cities)
 * - A:  80-89   (Very Good - top ~20% of cities)
 * - A-: 70-79   (Good - top ~30% of cities)
 * - B+: 60-69   (Above Average)
 * - B:  50-59   (Average - around median)
 * - B-: 40-49   (Below Average)
 * - C+: 30-39   (Challenging)
 * - C:  20-29   (Poor)
 * - F:  0-19    (Unaffordable)
 *
 * Since scores are percentile ranks, a score of 85 means the location is
 * more affordable than 85% of all US cities (A grade, top 15%).
 */
export function scoreToGrade(score: number | null): string | null {
  if (score === null || score === undefined) return null;

  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'A-';
  if (score >= 60) return 'B+';
  if (score >= 50) return 'B';
  if (score >= 40) return 'B-';
  if (score >= 30) return 'C+';
  if (score >= 20) return 'C';
  return 'F';
}

/**
 * Get descriptive label for score
 */
export function scoreLabel(score: number | null): string {
  if (score === null || score === undefined) return 'Unknown';

  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Above Average';
  if (score >= 50) return 'Average';
  if (score >= 40) return 'Below Average';
  if (score >= 30) return 'Challenging';
  if (score >= 20) return 'Poor';
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

  if (score >= 90) return 'bg-green-100 text-green-800 border-green-300';    // A+
  if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-300';       // A
  if (score >= 70) return 'bg-cyan-100 text-cyan-800 border-cyan-300';       // A-
  if (score >= 60) return 'bg-teal-100 text-teal-800 border-teal-300';       // B+
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // B, B-
  if (score >= 20) return 'bg-orange-100 text-orange-800 border-orange-300'; // C+, C
  return 'bg-red-100 text-red-800 border-red-300';                           // F
}

/**
 * Get score description for user
 */
export function getScoreDescription(score: number | null): string {
  if (score === null || score === undefined) {
    return 'Affordability data not available';
  }

  if (score >= 90) {
    return 'Excellent affordability - local incomes stretch significantly further relative to costs';
  }
  if (score >= 80) {
    return 'Very good affordability - local incomes stretch further relative to costs';
  }
  if (score >= 70) {
    return 'Good affordability - costs are reasonable relative to local incomes';
  }
  if (score >= 60) {
    return 'Above average affordability - costs are manageable relative to local incomes';
  }
  if (score >= 50) {
    return 'Average affordability - costs are moderate relative to local incomes';
  }
  if (score >= 40) {
    return 'Below average affordability - costs are elevated relative to local incomes';
  }
  if (score >= 30) {
    return 'Challenging affordability - costs are high relative to local incomes';
  }
  if (score >= 20) {
    return 'Poor affordability - costs are very high relative to local incomes';
  }
  return 'Unaffordable - costs are extremely high relative to local incomes';
}

/**
 * Get affordability score from metrics with consistent fallback logic
 *
 * Prioritizes V2 composite score when available, falls back to V1 percentile
 * derived from ratio. This ensures consistent scoring across all components.
 *
 * @param metrics - Object containing affordabilityPercentile (V2) and/or ratio (V1)
 * @returns Affordability score (0-100, higher = more affordable) or -Infinity if no data
 */
export function getAffordabilityScore(metrics: {
  affordabilityPercentile?: number | null;
  ratio?: number | null;
} | null | undefined): number {
  if (!metrics) return -Infinity;

  // Use V2 composite score if available
  if (metrics.affordabilityPercentile !== null &&
      metrics.affordabilityPercentile !== undefined) {
    return metrics.affordabilityPercentile;
  }

  // Fallback: derive from V1 ratio (lower ratio = higher affordability)
  // Convert ratio to percentile-like score: ratio of 20 → score of 80
  if (metrics.ratio !== null && metrics.ratio !== undefined) {
    return 100 - metrics.ratio;
  }

  // No data available
  return -Infinity;
}
