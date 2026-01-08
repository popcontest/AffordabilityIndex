/**
 * Data quality utilities for checking data freshness and completeness
 */

export interface DataQualityInfo {
  isStale: boolean;
  daysSinceUpdate: number;
  severity: 'good' | 'warning' | 'critical';
  message?: string;
}

/**
 * Check if data is stale based on the date
 * @param asOfDate - Date string (ISO format or Date object)
 * @param thresholdDays - Number of days before data is considered stale (default: 90)
 */
export function checkDataFreshness(
  asOfDate: string | Date | null | undefined,
  thresholdDays: number = 90
): DataQualityInfo | null {
  if (!asOfDate) {
    return null;
  }

  const date = typeof asOfDate === 'string' ? new Date(asOfDate) : asOfDate;
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  let severity: DataQualityInfo['severity'] = 'good';
  let message: string | undefined;

  if (daysSinceUpdate > 180) {
    severity = 'critical';
    message = `Data is over 6 months old. Current market conditions may differ significantly.`;
  } else if (daysSinceUpdate > thresholdDays) {
    severity = 'warning';
    message = `Data is ${Math.floor(daysSinceUpdate / 30)} months old. More recent data may be available.`;
  }

  return {
    isStale: severity !== 'good',
    daysSinceUpdate,
    severity,
    message,
  };
}

/**
 * Validate ZIP code format
 */
export function isValidZip(zip: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

/**
 * Sanitize and normalize ZIP code
 */
export function normalizeZip(zip: string): string {
  // Remove any non-digit characters
  const digits = zip.replace(/\D/g, '');

  // Return first 5 digits (ZIP-5 format)
  return digits.substring(0, 5);
}

/**
 * Check if required data fields are present
 */
export function checkDataCompleteness(data: {
  metrics?: {
    homeValue?: number | null;
    income?: number | null;
    ratio?: number | null;
  } | null;
  acsData?: {
    medianRent?: number | null;
    povertyRatePct?: number | null;
  } | null;
}): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!data.metrics?.homeValue) missingFields.push('Median Home Value');
  if (!data.metrics?.income) missingFields.push('Median Income');
  if (!data.metrics?.ratio) missingFields.push('Affordability Ratio');

  // Optional fields
  if (data.acsData && !data.acsData.medianRent) {
    missingFields.push('Median Rent (ACS)');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get appropriate error message for different failure scenarios
 */
export function getErrorMessage(
  errorType: 'network' | 'timeout' | 'invalid' | 'not_found' | 'unknown',
  context?: string
): string {
  const messages = {
    network: `Unable to load data due to a network error. Please check your connection and try again.`,
    timeout: `Request timed out. The server took too long to respond. Please try again.`,
    invalid: context
      ? `Invalid ${context} provided. Please check your input and try again.`
      : `Invalid input provided. Please check your input and try again.`,
    not_found: context
      ? `${context} not found. It may not exist or may not be supported yet.`
      : `Data not found. The requested information may not be available.`,
    unknown: `An unexpected error occurred. Please try again later.`,
  };

  return messages[errorType];
}
