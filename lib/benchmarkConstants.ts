/**
 * Benchmark constants for affordability metrics
 *
 * These values serve as fallbacks when actual benchmark data is unavailable.
 * Sources:
 * - US Census Bureau ACS 5-Year Estimates (2019-2023)
 * - Zillow Home Value Index (ZHVI) - National, December 2024
 * - Federal Reserve Economic Data (FRED)
 */

/**
 * National median values for affordability metrics
 * Updated: 2024-12 (ACS 2019-2023 5-year estimates)
 */
export const NATIONAL_MEDIANS = {
  /** National median home value (Zillow ZHVI, Dec 2024) */
  homeValue: 361800,

  /** National median household income (ACS B19013, 2019-2023) */
  income: 77500,

  /** National affordability ratio (calculated: 361800 / 77500) */
  ratio: 4.67,
};

/**
 * Fallback state-level medians (sample of major states)
 * These are computed from actual metric_snapshot data and should be updated periodically
 * Source: Internal database aggregation of latest city-level snapshots
 */
export const STATE_FALLBACK_MEDIANS: Record<string, { homeValue: number; income: number; ratio: number }> = {
  // Sample states (can be expanded based on data availability)
  CA: { homeValue: 750000, income: 91000, ratio: 8.24 },
  TX: { homeValue: 320000, income: 73000, ratio: 4.38 },
  FL: { homeValue: 395000, income: 67000, ratio: 5.90 },
  NY: { homeValue: 420000, income: 81000, ratio: 5.19 },
  IL: { homeValue: 265000, income: 76000, ratio: 3.49 },
  PA: { homeValue: 245000, income: 72000, ratio: 3.40 },
  OH: { homeValue: 235000, income: 66000, ratio: 3.56 },
  GA: { homeValue: 340000, income: 69000, ratio: 4.93 },
  NC: { homeValue: 365000, income: 68000, ratio: 5.37 },
  MI: { homeValue: 245000, income: 66000, ratio: 3.71 },
  WA: { homeValue: 565000, income: 88000, ratio: 6.42 },
  MA: { homeValue: 625000, income: 99000, ratio: 6.31 },
  CO: { homeValue: 560000, income: 87000, ratio: 6.44 },
  AZ: { homeValue: 425000, income: 71000, ratio: 5.99 },
  NV: { homeValue: 450000, income: 75000, ratio: 6.00 },
  OR: { homeValue: 475000, income: 76000, ratio: 6.25 },
  TN: { homeValue: 320000, income: 64000, ratio: 5.00 },
  IN: { homeValue: 245000, income: 65000, ratio: 3.77 },
  MO: { homeValue: 245000, income: 66000, ratio: 3.71 },
  VA: { homeValue: 385000, income: 88000, ratio: 4.38 },
} as const;

/**
 * Data source attribution for benchmarks
 */
export const BENCHMARK_SOURCES = {
  homeValue: 'Zillow Home Value Index (ZHVI)',
  income: 'US Census Bureau, American Community Survey (ACS) 5-Year Estimates',
  computed: 'Calculated from home value and income data',
  fallback: 'Computed from aggregated state/national data',
};

/**
 * Get fallback state medians if database query fails
 * @param stateAbbr - Two-letter state abbreviation
 * @returns State median values or national medians as ultimate fallback
 */
export function getStateFallbackMedians(stateAbbr: string): {
  homeValue: number;
  income: number;
  ratio: number;
} {
  const stateUpper = stateAbbr.toUpperCase();
  const stateData = STATE_FALLBACK_MEDIANS[stateUpper];

  if (stateData) {
    return stateData;
  }

  // If state not in fallback table, use national medians
  console.warn(`[Benchmark] No fallback data for state ${stateAbbr}, using national medians`);
  return NATIONAL_MEDIANS;
}

/**
 * Validate benchmark data quality
 * @param data - Benchmark data to validate
 * @returns True if data has at least one valid metric
 */
export function hasValidBenchmarkData(data: {
  homeValue: number | null;
  income: number | null;
  ratio: number | null;
}): boolean {
  return (
    (data.homeValue !== null && data.homeValue > 0) ||
    (data.income !== null && data.income > 0) ||
    (data.ratio !== null && data.ratio > 0)
  );
}

/**
 * Ensure benchmark data has at least one valid metric
 * If all metrics are null, use national medians as fallback
 * @param data - Benchmark data to validate
 * @returns Data with fallback values if needed
 */
export function ensureValidBenchmarkData(data: {
  homeValue: number | null;
  income: number | null;
  ratio: number | null;
}): {
  homeValue: number;
  income: number;
  ratio: number;
} {
  if (hasValidBenchmarkData(data)) {
    return {
      homeValue: data.homeValue ?? NATIONAL_MEDIANS.homeValue,
      income: data.income ?? NATIONAL_MEDIANS.income,
      ratio: data.ratio ?? NATIONAL_MEDIANS.ratio,
    };
  }

  console.warn('[Benchmark] All metrics null, using national medians as fallback');
  return NATIONAL_MEDIANS;
}
