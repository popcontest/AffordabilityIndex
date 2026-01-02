/**
 * V2 Affordability Score Data Layer
 *
 * Fetches V2 composite affordability scores (Housing + COL + Taxes)
 */

import { prisma } from './prisma';
import type { GeoType } from '@prisma/client';

export interface V2ScoreData {
  // Component scores (0-100, higher = more affordable)
  housingScore: number | null;
  colScore: number | null;
  taxScore: number | null;
  qolScore: number | null;

  // Composite score (weighted average)
  compositeScore: number;

  // Raw ratios for debugging
  housingBurdenRatio: number | null;
  colBurdenRatio: number | null;
  taxBurdenRatio: number | null;

  // Metadata
  dataQuality: string | null;
  calculatedAt: Date;
}

/**
 * Get V2 affordability score for a geography
 *
 * @param geoType - Geography type (CITY, PLACE, or ZCTA)
 * @param geoId - Geography ID
 * @returns V2 score data or null if not found
 */
export async function getV2Score(
  geoType: GeoType,
  geoId: string
): Promise<V2ScoreData | null> {
  const score = await prisma.v2AffordabilityScore.findUnique({
    where: {
      geoType_geoId: {
        geoType,
        geoId,
      },
    },
  });

  if (!score) {
    return null;
  }

  return {
    housingScore: score.housingScore,
    colScore: score.colScore,
    taxScore: score.taxScore,
    qolScore: score.qolScore,
    compositeScore: score.compositeScore,
    housingBurdenRatio: score.housingBurdenRatio,
    colBurdenRatio: score.colBurdenRatio,
    taxBurdenRatio: score.taxBurdenRatio,
    dataQuality: score.dataQuality,
    calculatedAt: score.calculatedAt,
  };
}

/**
 * Get top N most affordable geographies by V2 composite score
 *
 * @param limit - Number of results to return
 * @param geoType - Optional filter by geography type
 * @returns Array of V2 scores sorted by composite score (descending)
 */
export async function getTopAffordableV2(
  limit: number = 100,
  geoType?: GeoType
): Promise<Array<V2ScoreData & { geoType: GeoType; geoId: string }>> {
  const scores = await prisma.v2AffordabilityScore.findMany({
    where: geoType ? { geoType } : undefined,
    orderBy: {
      compositeScore: 'desc',
    },
    take: limit,
  });

  return scores.map(score => ({
    geoType: score.geoType,
    geoId: score.geoId,
    housingScore: score.housingScore,
    colScore: score.colScore,
    taxScore: score.taxScore,
    qolScore: score.qolScore,
    compositeScore: score.compositeScore,
    housingBurdenRatio: score.housingBurdenRatio,
    colBurdenRatio: score.colBurdenRatio,
    taxBurdenRatio: score.taxBurdenRatio,
    dataQuality: score.dataQuality,
    calculatedAt: score.calculatedAt,
  }));
}

/**
 * Get affordability label based on composite score
 *
 * @param compositeScore - V2 composite score (0-100)
 * @returns Human-readable affordability label
 */
export function getAffordabilityLabel(compositeScore: number): string {
  if (compositeScore >= 80) return 'Very Affordable';
  if (compositeScore >= 60) return 'Affordable';
  if (compositeScore >= 40) return 'Moderate';
  if (compositeScore >= 20) return 'Expensive';
  return 'Very Expensive';
}

/**
 * Get color class for affordability score
 *
 * @param compositeScore - V2 composite score (0-100)
 * @returns Tailwind color class
 */
export function getAffordabilityColor(compositeScore: number): string {
  if (compositeScore >= 80) return 'text-green-600';
  if (compositeScore >= 60) return 'text-lime-600';
  if (compositeScore >= 40) return 'text-yellow-600';
  if (compositeScore >= 20) return 'text-orange-600';
  return 'text-red-600';
}
