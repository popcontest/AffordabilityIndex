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
 * Granular grading scale with +/- modifiers aligned with percentile ranks:
 * - A+: 95-100  (Excellent - top ~5% of cities)
 * - A:  85-94   (Very Good - top ~15% of cities)
 * - A-: 80-84   (Good+ - top ~20% of cities)
 * - B+: 75-79   (Good - top ~25% of cities)
 * - B:  65-74   (Above Average)
 * - B-: 60-64   (Average+)
 * - C+: 55-59   (Average)
 * - C:  45-54   (Average-)
 * - C-: 40-44   (Below Average)
 * - D+: 35-39   (Challenging)
 * - D:  25-34   (Poor)
 * - D-: 20-24   (Very Poor)
 * - F:  0-19    (Unaffordable)
 *
 * Since scores are percentile ranks, a score of 85 means the location is
 * more affordable than 85% of all US cities (A grade, top 15%).
 */
export function scoreToGrade(score: number | null): string | null {
  if (score === null || score === undefined) return null;

  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 60) return 'B-';
  if (score >= 55) return 'C+';
  if (score >= 45) return 'C';
  if (score >= 40) return 'C-';
  if (score >= 35) return 'D+';
  if (score >= 25) return 'D';
  if (score >= 20) return 'D-';
  return 'F';
}

/**
 * Get descriptive label for score
 */
export function scoreLabel(score: number | null): string {
  if (score === null || score === undefined) return 'Unknown';

  if (score >= 95) return 'Excellent';
  if (score >= 85) return 'Very Good';
  if (score >= 75) return 'Good';
  if (score >= 65) return 'Above Average';
  if (score >= 55) return 'Average';
  if (score >= 45) return 'Moderate';
  if (score >= 35) return 'Below Average';
  if (score >= 25) return 'Challenging';
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

  if (score >= 95) return 'bg-green-100 text-green-800 border-green-300';    // A+
  if (score >= 85) return 'bg-blue-100 text-blue-800 border-blue-300';       // A
  if (score >= 80) return 'bg-cyan-100 text-cyan-800 border-cyan-300';       // A-
  if (score >= 75) return 'bg-teal-100 text-teal-800 border-teal-300';       // B+
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // B, B-
  if (score >= 45) return 'bg-amber-100 text-amber-800 border-amber-300';    // C+, C
  if (score >= 25) return 'bg-orange-100 text-orange-800 border-orange-300'; // C-, D+, D
  if (score >= 20) return 'bg-rose-100 text-rose-800 border-rose-300';       // D-
  return 'bg-red-100 text-red-800 border-red-300';                           // F
}

/**
 * Get score description for user
 */
export function getScoreDescription(score: number | null): string {
  if (score === null || score === undefined) {
    return 'Affordability data not available';
  }

  if (score >= 95) {
    return 'Excellent affordability - local incomes stretch significantly further relative to costs';
  }
  if (score >= 85) {
    return 'Very good affordability - local incomes stretch further relative to costs';
  }
  if (score >= 75) {
    return 'Good affordability - costs are reasonable relative to local incomes';
  }
  if (score >= 65) {
    return 'Above average affordability - costs are manageable relative to local incomes';
  }
  if (score >= 55) {
    return 'Average affordability - costs are moderate relative to local incomes';
  }
  if (score >= 45) {
    return 'Moderate affordability - costs are somewhat elevated relative to local incomes';
  }
  if (score >= 35) {
    return 'Below average affordability - costs are elevated relative to local incomes';
  }
  if (score >= 25) {
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
