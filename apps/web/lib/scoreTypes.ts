/**
 * Score version types
 */
export type ScoreVersion = 'v1_housing' | 'v2_full';

/**
 * Affordability score breakdown
 *
 * v1: Housing-only score
 * v2: Full cost-of-living basket (housing + essentials + taxes + healthcare)
 *
 * Score range: 0-100 (higher = more affordable)
 */
export interface ScoreBreakdown {
  /** Version identifier */
  version: ScoreVersion;

  /** Overall affordability score (0-100) */
  overallScore: number | null;

  /** Letter grade (A+ to F) */
  grade: string | null;

  /** Housing affordability component (0-100) */
  housingScore: number | null;

  /** Essentials cost component (0-100, v2 only) */
  essentialsScore: number | null;

  /** Taxes burden component (0-100, v2 only) */
  taxesScore: number | null;

  /** Healthcare cost component (0-100, v2 only) */
  healthcareScore: number | null;

  /** Optional explanatory notes */
  notes?: string[];

  /** Cost basket metadata (v2 only) */
  basket?: {
    source: string;       // "basket_stub", "mit_living_wage", etc.
    version: string;      // "2025-01"
    householdType: string; // "1_adult_0_kids"
    totalAnnual: number;  // Total annual essentials cost
  };
}
