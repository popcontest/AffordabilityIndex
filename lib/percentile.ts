/**
 * Estimate affordability percentile based on ratio
 * Lower ratio = more affordable = higher percentile
 *
 * Uses typical US housing market distributions:
 * - Ratio < 3.0: Top 10% (most affordable)
 * - Ratio 3.0-3.5: Top 25%
 * - Ratio 3.5-4.5: Top 50%
 * - Ratio 4.5-6.0: Top 75%
 * - Ratio > 6.0: Bottom 25% (least affordable)
 *
 * @param ratio - The affordability ratio (homeValue / income)
 * @returns Estimated percentile (0-100) where higher = more affordable
 */
export function estimateAffordabilityPercentile(ratio: number | null): number | null {
  if (ratio === null) return null;

  // Estimate based on typical distribution
  if (ratio < 2.5) return 95; // Extremely affordable
  if (ratio < 3.0) return 90; // Very affordable
  if (ratio < 3.5) return 80; // Highly affordable
  if (ratio < 4.0) return 65; // Above average
  if (ratio < 4.5) return 50; // Average
  if (ratio < 5.0) return 35; // Below average
  if (ratio < 6.0) return 20; // Less affordable
  if (ratio < 7.0) return 10; // Much less affordable
  return 5; // Least affordable
}

/**
 * Get a human-readable percentile label
 * Makes it explicit that this is about affordability (not price or other metrics)
 */
export function getPercentileLabel(percentile: number | null): string {
  if (percentile === null) return 'N/A';

  if (percentile >= 95) return `Top 5% Most Affordable`;
  if (percentile >= 90) return `Top 10% Most Affordable`;
  if (percentile >= 75) return `Top 25% Most Affordable`;
  if (percentile >= 50) return `Above Average Affordability`;
  if (percentile >= 25) return `Below Average Affordability`;
  if (percentile >= 10) return `Bottom 25% Affordability`;
  return `Bottom 10% Affordability`;
}

/**
 * Get a color class for percentile badge
 */
export function getPercentileColor(percentile: number | null): string {
  if (percentile === null) return 'bg-gray-100 text-gray-700';

  if (percentile >= 75) return 'bg-green-100 text-green-800 border-green-200';
  if (percentile >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (percentile >= 25) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

/**
 * Get a detailed percentile description
 * Specifies that this is comparing US cities with available data
 */
export function getPercentileDescription(percentile: number | null): string {
  if (percentile === null) return 'Percentile data not available';

  return `More affordable than ${percentile}% of US cities`;
}

/**
 * Calculate actual percentile from a sorted array of ratios
 * @param ratio - The ratio to find the percentile for
 * @param allRatios - Sorted array of all ratios (ascending order, lower = more affordable)
 * @returns Percentile (0-100) where higher = more affordable
 */
export function calculatePercentileFromData(
  ratio: number,
  allRatios: number[]
): number {
  if (allRatios.length === 0) return 50; // Default to 50th percentile if no data

  // Count how many ratios are WORSE (higher) than this one
  const worseCount = allRatios.filter((r) => r > ratio).length;

  // Percentile = (count of worse values / total) * 100
  const percentile = Math.round((worseCount / allRatios.length) * 100);

  return Math.max(0, Math.min(100, percentile)); // Clamp between 0-100
}
