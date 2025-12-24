/**
 * View model types and formatting helpers for dashboard pages
 */

// ============================================================================
// View Model Types
// ============================================================================

/**
 * KPI metrics for a geography page
 */
export interface GeoPageKpis {
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
  earningPower: number | null;
  // State ranking (computed from DB using window functions)
  rankState: number | null; // 1-based rank within state (1 = most affordable)
  stateCount: number | null; // Total cities in state with data
  statePercentile: number | null; // 0-100 percentile within state
  // National ranking (computed from DB using window functions)
  rankNational: number | null; // 1-based rank nationally (1 = most affordable)
  nationalCount: number | null; // Total cities nationally with data
  percentileNational: number | null; // 0-100 percentile nationally
  asOfDate: Date;
}

/**
 * Row in benchmark comparison table
 */
export interface BenchmarkRow {
  label: string;
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}

/**
 * Row in nearby alternatives table
 */
export interface NearbyRow {
  label: string;
  href: string;
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
  asOfDate?: Date;
}

/**
 * Data quality information
 */
export interface DataQuality {
  incomeMatchType: string | null; // 'exact', 'pop_disambiguated', 'ambiguous', 'none'
  candidateCount?: number;
  note?: string;
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Check if a value is a valid number (not null, undefined, or NaN)
 */
function isValidNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
}

/**
 * Format number as currency (USD)
 */
export function formatCurrency(value: number | null): string {
  if (!isValidNumber(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format ratio as decimal with 2 places
 */
export function formatRatio(value: number | null): string {
  if (!isValidNumber(value)) {
    return '—';
  }
  return value.toFixed(2);
}

/**
 * Format date as "Month Year" (e.g., "November 2024")
 */
export function formatDate(date: Date | null): string {
  if (!date) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date as "MMM YYYY" (e.g., "Nov 2024")
 */
export function formatDateShort(date: Date | null): string {
  if (!date) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Derive affordability label from ratio
 * Lower ratio = more affordable
 */
export function deriveAffordabilityLabel(ratio: number | null): string {
  if (!isValidNumber(ratio)) {
    return 'Unknown';
  }

  if (ratio < 3.0) {
    return 'Very affordable';
  } else if (ratio < 4.0) {
    return 'Affordable';
  } else if (ratio < 5.0) {
    return 'Average';
  } else if (ratio < 7.0) {
    return 'Expensive';
  } else {
    return 'Very expensive';
  }
}

/**
 * Parse sources JSON to extract data quality information
 * Safely handles null, invalid JSON, or missing fields
 */
export function parseSourcesForQuality(sourcesJson: string | null): DataQuality {
  if (!sourcesJson) {
    return {
      incomeMatchType: null,
      note: 'No source data available',
    };
  }

  try {
    const sources = JSON.parse(sourcesJson);
    const income = sources?.income;

    if (!income) {
      return {
        incomeMatchType: null,
        note: 'No income source data',
      };
    }

    return {
      incomeMatchType: income.match_type || null,
      candidateCount: income.candidate_count,
      note: income.note,
    };
  } catch (error) {
    console.error('Failed to parse sources JSON:', error);
    return {
      incomeMatchType: null,
      note: 'Invalid source data',
    };
  }
}

/**
 * Format percentage (e.g., for percentile)
 */
export function formatPercentage(value: number | null): string {
  if (!isValidNumber(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Format rank (e.g., "1st", "2nd", "3rd", "4th")
 */
export function formatRank(rank: number | null): string {
  if (!isValidNumber(rank)) {
    return '—';
  }

  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;

  let suffix = 'th';
  if (lastTwoDigits < 11 || lastTwoDigits > 13) {
    if (lastDigit === 1) suffix = 'st';
    else if (lastDigit === 2) suffix = 'nd';
    else if (lastDigit === 3) suffix = 'rd';
  }

  return `${rank}${suffix}`;
}

/**
 * Calculate and format comparison to state average
 * For affordability ratio: lower is better
 * For home value/income: just show the difference
 */
export function formatStateComparison(
  cityValue: number | null,
  stateValue: number | null,
  metric: 'ratio' | 'homeValue' | 'income',
  stateAbbr: string
): string | null {
  if (!isValidNumber(cityValue) || !isValidNumber(stateValue)) {
    return null;
  }

  if (metric === 'ratio') {
    // For ratio, lower is better (more affordable)
    const percentDiff = ((stateValue - cityValue) / stateValue) * 100;
    if (Math.abs(percentDiff) < 2) {
      return `Similar to ${stateAbbr} avg`;
    }
    if (percentDiff > 0) {
      return `${Math.round(percentDiff)}% more affordable than ${stateAbbr}`;
    } else {
      return `${Math.round(Math.abs(percentDiff))}% less affordable than ${stateAbbr}`;
    }
  } else {
    // For home value and income, just show difference
    const diff = cityValue - stateValue;
    const percentDiff = (diff / stateValue) * 100;

    if (Math.abs(percentDiff) < 5) {
      return `Similar to ${stateAbbr} avg`;
    }

    const sign = diff > 0 ? '+' : '';
    const diffFormatted = formatCurrency(Math.abs(diff)).replace('$', '');

    if (diff > 0) {
      return `$${diffFormatted} above ${stateAbbr} avg`;
    } else {
      return `$${diffFormatted} below ${stateAbbr} avg`;
    }
  }
}
