/**
 * Input validation schemas using Zod
 *
 * Provides centralized validation for all API endpoints
 */

import { z } from 'zod';

// GeoType enum
export const GeoTypeSchema = z.enum(['CITY', 'ZCTA', 'STATE']);

// US State abbreviation validation
export const StateAbbrSchema = z.string().regex(/^[A-Z]{2}$/, {
  message: 'Invalid state abbreviation. Must be 2-letter uppercase state code.',
});

// ZIP code validation (5 digits or 5+4 format)
export const ZipCodeSchema = z.string().regex(/^\d{5}(-\d{4})?$/, {
  message: 'Invalid ZIP code format. Use 5 digits or 5+4 format.',
});

// ZCTA validation (5 digits only)
export const ZctaSchema = z.string().regex(/^\d{5}$/, {
  message: 'Invalid ZCTA. Must be 5 digits.',
});

// Household type validation
export const HouseholdTypeSchema = z.enum([
  'single',
  'couple',
  'family',
  'emptyNester',
  'retiree',
  'remote',
]);

// Search query validation
export const SearchQuerySchema = z.string()
  .min(1, 'Search query cannot be empty')
  .max(100, 'Search query too long (max 100 characters)')
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, {
    message: 'Search query cannot be empty or whitespace only',
  });

// Income validation (positive integer, reasonable range)
export const IncomeSchema = z.number({
  message: 'Income must be a number',
})
  .int('Income must be a whole number')
  .positive('Income must be positive')
  .max(10000000, 'Income value too high (max $10,000,000)');

// ==================== API Route Schemas ====================

// /api/search
export const SearchApiSchema = z.object({
  q: SearchQuerySchema,
});

// /api/true-affordability
export const TrueAffordabilityApiSchema = z.object({
  geoType: z.enum(['CITY', 'ZCTA'], {
    message: 'geoType must be CITY or ZCTA',
  }),
  geoId: z.string()
    .min(1, 'geoId is required')
    .max(20, 'geoId too long'),
  householdType: HouseholdTypeSchema.optional().default('family'),
  income: z.coerce
    .number()
    .int('Income must be a whole number')
    .positive('Income must be positive')
    .max(10000000, 'Income value too high')
    .optional(),
});

// /api/debug-city
export const DebugCityApiSchema = z.object({
  state: StateAbbrSchema.optional().default('MD'),
  slug: z.string()
    .min(1, 'slug is required')
    .max(100, 'slug too long')
    .optional()
    .default('baltimore'),
});

// ==================== Validation Helpers ====================

/**
 * Validate request query parameters against a schema
 *
 * @param searchParams - URLSearchParams from request
 * @param schema - Zod schema to validate against
 * @returns Validated data or error response
 */
export function validateQueryParams<T extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    // Convert URLSearchParams to plain object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result = schema.safeParse(params);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((err: any) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      return { success: false, error: errorMessage };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

/**
 * Sanitize a search query string
 *
 * @param query - Raw query string
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>\"']/g, '') // Remove potential HTML/JS characters
    .slice(0, 100); // Limit length
}

/**
 * Validate and sanitize a ZIP/ZCTA code
 *
 * @param code - ZIP/ZCTA code
 * @returns Validated code or null
 */
export function validateZipCode(code: string): string | null {
  const trimmed = code.trim();

  // Check if it's a 5-digit code
  if (/^\d{5}$/.test(trimmed)) {
    return trimmed;
  }

  // Check if it's a 5+4 format
  if (/^\d{5}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Validate state abbreviation
 *
 * @param stateAbbr - State abbreviation
 * @returns Validated state abbreviation or null
 */
export function validateStateAbbr(stateAbbr: string): string | null {
  const upper = stateAbbr.toUpperCase().trim();

  if (/^[A-Z]{2}$/.test(upper)) {
    return upper;
  }

  return null;
}

/**
 * Detect suspicious patterns in search queries
 *
 * @param query - Search query string
 * @returns Reason if suspicious, null otherwise
 */
export function detectSuspiciousQuery(query: string): string | null {
  const normalized = query.toLowerCase().trim();

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
    /(\bupdate\b.*\bset\b)/i,
    /(--)|(#)|(\/\*)/i,
    /(\bor\b.*=.*)/i,
    /(\band\b.*=.*)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(normalized)) {
      return 'Potential SQL injection';
    }
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onload=, etc.
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(normalized)) {
      return 'Potential XSS attempt';
    }
  }

  // Check for path traversal
  if (/\.\./.test(normalized)) {
    return 'Potential path traversal';
  }

  return null;
}
