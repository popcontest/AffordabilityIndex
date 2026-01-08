/**
 * Data access layer for Affordability Index
 *
 * CACHING-READY ARCHITECTURE:
 * - This is the ONLY place that queries the database
 * - All page components must call these functions, never Prisma directly
 * - Functions are designed to be swappable with cached/materialized sources
 *
 * TODO (future): Replace Prisma queries with:
 * - Pre-computed "latest_snapshot" materialized view
 * - Static JSON files generated at build time
 * - Redis/KV cache layer
 * - ISR with revalidate timers
 */

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { slugify } from './seo';
import { stateFromSlug, stateFromAbbr } from './usStates';
import type { BenchmarkRow, NearbyRow } from './viewModels';
import type { ScoreBreakdown } from './scoreTypes';
import { clampScore, scoreToGrade } from './scoring';
import type { V2ScoreData } from './v2-scores';
import {
  NATIONAL_MEDIANS,
  getStateFallbackMedians,
  ensureValidBenchmarkData,
} from './benchmarkConstants';

// ============================================================================
// Population Bucket Filters (Centralized)
// ============================================================================

/**
 * SQL WHERE clause fragments for population-based city buckets.
 * IMPORTANT: These must be used consistently across all ranking queries.
 *
 * Legacy Buckets (original):
 * - Large City: >= 500,000 population
 * - City: 50,000 - 499,999 population
 * - Small City: 10,000 - 49,999 population
 * - Town: 1,000 - 9,999 population
 *
 * New Rankings Buckets (for rankings page):
 * - Large Cities: >= 100,000 population
 * - Mid-Size Cities: 50,000 - 99,999 population
 * - Small Cities: 10,000 - 49,999 population
 * - Towns: 1,000 - 9,999 population
 *
 * All buckets exclude NULL population to ensure data quality.
 */
const BUCKET_WHERE = {
  /** Large cities with 500K+ population (excludes NULL) - LEGACY */
  LARGE_CITY: 'gc.population IS NOT NULL AND gc.population >= 500000',

  /** Cities with 50K-500K population (excludes NULL) - LEGACY */
  CITY: 'gc.population IS NOT NULL AND gc.population >= 50000 AND gc.population < 500000',

  /** Small cities with 10K-50K population (excludes NULL) */
  SMALL_CITY: 'gc.population IS NOT NULL AND gc.population >= 10000 AND gc.population < 50000',

  /** Towns with 1K-10K population (excludes NULL and very small towns <1000) */
  TOWN: 'gc.population IS NOT NULL AND gc.population >= 1000 AND gc.population < 10000',

  /** Large cities with 100K+ population (excludes NULL) - NEW RANKINGS */
  LARGE_CITIES_100K: 'gc.population IS NOT NULL AND gc.population >= 100000',

  /** Mid-size cities with 50K-99K population (excludes NULL) - NEW RANKINGS */
  MID_SIZE_CITIES: 'gc.population IS NOT NULL AND gc.population >= 50000 AND gc.population < 100000',
} as const;

// ============================================================================
// Distance Calculation Utilities
// ============================================================================

/**
 * Calculate distance between two lat/lng coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in miles
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================================================
// Score Utilities
// ============================================================================

/**
 * Build housing-only score breakdown (v1)
 * @param affordabilityPercentile - Housing affordability percentile (0-100)
 * @returns ScoreBreakdown with v1 housing-only data
 */
export function buildHousingOnlyScoreBreakdown(
  affordabilityPercentile: number | null | undefined
): ScoreBreakdown {
  const housingScore = clampScore(affordabilityPercentile ?? null);
  const overallScore = housingScore; // v1: overall = housing
  const grade = scoreToGrade(overallScore);

  return {
    version: 'v1_housing',
    overallScore,
    grade,
    housingScore,
    essentialsScore: null,
    taxesScore: null,
    healthcareScore: null,
    notes: [
      'v1: Housing-only affordability (home value ÷ income percentile)',
      'Future: Will include essentials, taxes, healthcare in weighted blend',
    ],
  };
}

/**
 * Build score breakdown from V2 affordability score data
 * @param v2Score - V2 score data from v2_affordability_score table
 * @returns ScoreBreakdown with v2 composite score as overall score
 */
export function buildV2ScoreBreakdown(v2Score: V2ScoreData | null): ScoreBreakdown {
  if (!v2Score) {
    return buildHousingOnlyScoreBreakdown(null);
  }

  const overallScore = clampScore(v2Score.compositeScore);
  const grade = scoreToGrade(overallScore);

  return {
    version: 'v2_full',
    overallScore,
    grade,
    housingScore: v2Score.housingScore,
    essentialsScore: v2Score.colScore,
    taxesScore: v2Score.taxScore,
    healthcareScore: v2Score.qolScore,
    notes: [
      'v2: Full affordability score (housing + cost of living + taxes)',
      'Composite score represents true affordability across all major expenses',
    ],
  };
}

/**
 * Get cost basket data for a city's county (v2 scoring)
 * @param cityId - City identifier
 * @returns Cost basket data or null if unavailable
 */
async function getCityCostBasket(cityId: string): Promise<{
  countyFips: string;
  source: string;
  version: string;
  householdType: string;
  totalAnnual: number;
} | null> {
  // Hardcoded constants for MVP
  const BASKET_SOURCE = 'basket_stub';
  const BASKET_VERSION = '2025-01';
  const HOUSEHOLD_TYPE = '1_adult_0_kids';

  try {
    // Load city with countyFips
    const city = await prisma.geoCity.findUnique({
      where: { cityId },
      select: { countyFips: true },
    });

    if (!city?.countyFips) {
      return null; // No county mapping
    }

    // Fetch matching cost basket
    const basket = await prisma.costBasket.findUnique({
      where: {
        countyFips_source_version_householdType: {
          countyFips: city.countyFips,
          source: BASKET_SOURCE,
          version: BASKET_VERSION,
          householdType: HOUSEHOLD_TYPE,
        },
      },
      select: {
        countyFips: true,
        source: true,
        version: true,
        householdType: true,
        totalAnnual: true,
      },
    });

    return basket;
  } catch (error) {
    console.error('[getCityCostBasket] Error:', error);
    return null;
  }
}

/**
 * Compute disposable income percentile for a city (v2 essentials score)
 * @param cityId - City identifier
 * @param income - City median household income
 * @param totalAnnual - Annual essentials cost from cost basket
 * @returns Percentile (0-100, higher = more disposable income = more affordable)
 */
async function computeDisposableIncomePercentile(
  cityId: string,
  income: number,
  totalAnnual: number
): Promise<number | null> {
  try {
    // Compute disposable income for this city
    const disposable = income - totalAnnual;

    // SQL: Compute percentile across all cities with valid data
    const result = await prisma.$queryRaw<Array<{ percentile: number | null }>>`
      WITH city_disposable AS (
        SELECT
          gc."cityId",
          s."medianIncome",
          cb."totalAnnual",
          (s."medianIncome" - cb."totalAnnual") AS disposable
        FROM geo_city gc
        INNER JOIN LATERAL (
          SELECT DISTINCT ON ("geoId") "medianIncome"
          FROM affordability_snapshot
          WHERE "geoType" = 'CITY'
            AND "geoId" = gc."cityId"
            AND "medianIncome" IS NOT NULL
          ORDER BY "geoId", "asOfDate" DESC
        ) s ON true
        INNER JOIN cost_basket cb
          ON gc."countyFips" = cb."countyFips"
          AND cb.source = 'basket_stub'
          AND cb.version = '2025-01'
          AND cb."householdType" = '1_adult_0_kids'
        WHERE gc."countyFips" IS NOT NULL
          AND s."medianIncome" IS NOT NULL
      )
      SELECT
        ROUND(
          ((1 - CUME_DIST() OVER (ORDER BY disposable ASC)) * 100)::numeric,
          1
        )::float AS percentile
      FROM city_disposable
      WHERE "cityId" = ${cityId}
    `;

    return result[0]?.percentile ?? null;
  } catch (error) {
    console.error('[computeDisposableIncomePercentile] Error:', error);
    return null;
  }
}

/**
 * Build full-basket score breakdown (v2) with fallback to v1
 * @param cityId - City identifier
 * @param affordabilityPercentile - Housing affordability percentile (0-100)
 * @param income - City median household income (optional, for v2 computation)
 * @returns ScoreBreakdown with v2 full basket data if available, else v1
 */
export async function buildFullBasketScoreBreakdown(
  cityId: string,
  affordabilityPercentile: number | null | undefined,
  income?: number | null
): Promise<ScoreBreakdown> {
  try {
    const housingScore = clampScore(affordabilityPercentile ?? null);

    // Try to get v2 cost basket data
    const basket = await getCityCostBasket(cityId);

    // Fallback to v1 if no basket or no income
    if (!basket || !income) {
      return buildHousingOnlyScoreBreakdown(affordabilityPercentile);
    }

    // Compute essentials score (disposable income percentile)
    const essentialsScore = await computeDisposableIncomePercentile(
      cityId,
      income,
      basket.totalAnnual
    );

    // Fallback to v1 if essentials computation fails
    if (essentialsScore === null || housingScore === null) {
      return buildHousingOnlyScoreBreakdown(affordabilityPercentile);
    }

    // v2: Weighted blend (60% housing, 40% essentials)
    const overallScore = Math.round(0.6 * housingScore + 0.4 * essentialsScore);
    const grade = scoreToGrade(overallScore);

    return {
      version: 'v2_full',
      overallScore,
      grade,
      housingScore,
      essentialsScore: clampScore(essentialsScore),
      taxesScore: null, // Future: component breakdown
      healthcareScore: null, // Future: component breakdown
      basket: {
        source: basket.source,
        version: basket.version,
        householdType: basket.householdType,
        totalAnnual: basket.totalAnnual,
      },
      notes: [
        'v2: Full cost-of-living basket (housing + essentials)',
        `Overall = 60% housing + 40% essentials (${basket.householdType})`,
        'Essentials score based on disposable income after annual costs',
      ],
    };
  } catch (error) {
    console.error('[buildFullBasketScoreBreakdown] Error:', error);
    return buildHousingOnlyScoreBreakdown(affordabilityPercentile);
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Geography type enum matching Prisma schema
 */
export type GeoType = 'PLACE' | 'CITY' | 'ZCTA';

/**
 * Metric snapshot with calculated fields
 */
export interface MetricData {
  homeValue: number | null;
  income: number | null;
  ratio: number | null;
  earningPower: number | null; // income / homeValue
  asOfDate: Date;
  sources: string | null;
  affordabilityPercentile?: number | null; // % of peers with worse (higher) ratio
}

/**
 * Place data with location info
 */
export interface PlaceData {
  placeGeoid: string;
  name: string;
  stateAbbr: string;
  stateFips: string;
  countyFips: string | null;
}

/**
 * ZCTA data
 */
export interface ZctaData {
  zcta: string;
  stateAbbr: string | null;
  city: string | null;
  metro: string | null;
  countyName: string | null;
  population: number | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * City data (Zillow geography)
 */
export interface CityData {
  cityId: string;
  name: string;
  stateAbbr: string;
  stateName: string | null;
  countyName: string | null;
  metro: string | null;
  slug: string;
  population: number | null;
}

/**
 * Combined place + latest snapshot
 */
export interface PlaceWithMetrics extends PlaceData {
  metrics: MetricData | null;
}

/**
 * Combined ZCTA + latest snapshot
 */
export interface ZctaWithMetrics extends ZctaData {
  metrics: MetricData | null;
}

/**
 * Combined city + latest snapshot
 */
export interface CityWithMetrics extends CityData {
  metrics: MetricData | null;
}

/**
 * Search result item
 */
export interface SearchResult {
  geoType: GeoType;
  geoId: string;
  name: string;
  stateAbbr: string | null;
  metrics: MetricData | null;
}

/**
 * Get place by state abbreviation and place name slug
 * @param stateAbbr - State abbreviation (e.g., "ME")
 * @param placeSlug - URL slug of place name (e.g., "cape-elizabeth")
 * @returns Place with latest metrics or null if not found
 *
 * TODO: Replace with cached lookup once data is stable
 */
export async function getPlaceByStateAndSlug(
  stateAbbr: string,
  placeSlug: string
): Promise<PlaceWithMetrics | null> {
  // Find all places in the state
  const places = await prisma.geoPlace.findMany({
    where: {
      stateAbbr: stateAbbr.toUpperCase(),
    },
  });

  // Find the one that matches the slug
  const place = places.find((p) => slugify(p.name) === placeSlug);

  if (!place) {
    return null;
  }

  // Fetch latest snapshot
  const snapshot = await getLatestSnapshot('PLACE', place.placeGeoid);

  return {
    placeGeoid: place.placeGeoid,
    name: place.name,
    stateAbbr: place.stateAbbr,
    stateFips: place.stateFips,
    countyFips: place.countyFips,
    metrics: snapshot,
  };
}

/**
 * Get ZCTA by ZIP code
 * @param zip - 5-digit ZIP code
 * @returns ZCTA with latest metrics or null if not found
 *
 * TODO: Replace with cached lookup
 */
export async function getZipByCode(zip: string): Promise<ZctaWithMetrics | null> {
  const zcta = await prisma.geoZcta.findUnique({
    where: { zcta: zip },
  });

  if (!zcta) {
    return null;
  }

  const snapshot = await getLatestSnapshot('ZCTA', zip);

  return {
    zcta: zcta.zcta,
    stateAbbr: zcta.stateAbbr,
    city: zcta.city,
    metro: zcta.metro,
    countyName: zcta.countyName,
    population: zcta.population,
    latitude: zcta.latitude,
    longitude: zcta.longitude,
    metrics: snapshot,
  };
}

/**
 * Get city by exact cityId (Zillow RegionID)
 * @param cityId - Zillow RegionID
 * @returns City with latest metrics or null if not found
 *
 * TODO: Replace with cached lookup
 */
export async function getCityById(cityId: string): Promise<CityWithMetrics | null> {
  const city = await prisma.geoCity.findUnique({
    where: { cityId },
  });

  if (!city) {
    return null;
  }

  const snapshot = await getLatestSnapshot('CITY', cityId);

  return {
    cityId: city.cityId,
    name: city.name,
    stateAbbr: city.stateAbbr,
    stateName: city.stateName,
    countyName: city.countyName,
    metro: city.metro,
    slug: city.slug,
    population: city.population,
    metrics: snapshot,
  };
}

/**
 * Get cities by state abbreviation and slug
 * Returns array to support disambiguation when multiple cities have the same name
 * @param stateAbbr - State abbreviation (e.g., "CA")
 * @param citySlug - URL slug of city name (e.g., "san-francisco")
 * @returns Array of cities with same slug in the state (may be empty, 1, or multiple)
 *
 * TODO: Replace with cached lookup once data is stable
 */
export async function getCityByStateAndSlug(
  stateAbbr: string,
  citySlug: string
): Promise<CityWithMetrics[]> {
  // Find all cities in the state with this slug
  const cities = await prisma.geoCity.findMany({
    where: {
      stateAbbr: stateAbbr.toUpperCase(),
      slug: citySlug,
    },
  });

  // Fetch latest snapshot for each
  const citiesWithMetrics: CityWithMetrics[] = [];
  for (const city of cities) {
    const snapshot = await getLatestSnapshot('CITY', city.cityId);
    citiesWithMetrics.push({
      cityId: city.cityId,
      name: city.name,
      stateAbbr: city.stateAbbr,
      stateName: city.stateName,
      countyName: city.countyName,
      metro: city.metro,
      slug: city.slug,
      population: city.population,
      metrics: snapshot,
    });
  }

  return citiesWithMetrics;
}

/**
 * Get latest metric snapshot for a geography
 * @param geoType - Geography type (PLACE, CITY, or ZCTA)
 * @param geoId - Geography ID (placeGeoid, cityId, or zcta)
 * @returns Latest metrics or null if no snapshots exist
 *
 * TODO: Replace with pre-computed "latest_snapshot" materialized view
 */
export async function getLatestSnapshot(
  geoType: GeoType,
  geoId: string
): Promise<MetricData | null> {
  const snapshot = await prisma.metricSnapshot.findFirst({
    where: {
      geoType,
      geoId,
    },
    orderBy: {
      asOfDate: 'desc',
    },
  });

  if (!snapshot) {
    return null;
  }

  // Fetch V2 composite score if available
  const v2Score = await prisma.v2AffordabilityScore.findUnique({
    where: {
      geoType_geoId: {
        geoType,
        geoId,
      },
    },
    select: {
      compositeScore: true,
    },
  });

  // Calculate earning power (inverse of ratio)
  const earningPower =
    snapshot.homeValue && snapshot.homeValue > 0
      ? (snapshot.income || 0) / snapshot.homeValue
      : null;

  // Calculate affordability percentile: V2 composite if available, else derive from ratio
  const affordabilityPercentile = v2Score?.compositeScore ?? null;

  return {
    homeValue: snapshot.homeValue,
    income: snapshot.income,
    ratio: snapshot.ratio,
    earningPower,
    asOfDate: snapshot.asOfDate,
    sources: snapshot.sources,
    affordabilityPercentile,
  };
}

/**
 * Get latest affordability snapshot for a geography
 * @param geoType - Geography type (PLACE, CITY, or ZCTA)
 * @param geoId - Geography ID (placeGeoid, cityId, or zcta)
 * @returns Latest affordability snapshot or null if none exists
 */
export async function getAffordabilitySnapshot(
  geoType: GeoType,
  geoId: string
) {
  const snapshot = await prisma.affordabilitySnapshot.findFirst({
    where: {
      geoType,
      geoId,
    },
    orderBy: {
      asOfDate: 'desc',
    },
  });

  if (!snapshot) {
    return null;
  }

  // Parse persona scores JSON if present
  const personaScores = snapshot.personaScores
    ? JSON.parse(snapshot.personaScores as string)
    : null;

  return {
    ...snapshot,
    personaScores,
  };
}

/**
 * Get top places by affordability within a state
 * @param stateAbbr - State abbreviation
 * @param limit - Number of results
 * @param mostAffordable - If true, lowest ratio first; if false, highest ratio first
 * @returns Array of places with metrics, ordered by ratio
 *
 * TODO: Replace with pre-computed rankings table
 */
export async function getStateTopPlaces(
  stateAbbr: string,
  limit: number = 20,
  mostAffordable: boolean = true
): Promise<PlaceWithMetrics[]> {
  // Get all places in the state
  const places = await prisma.geoPlace.findMany({
    where: {
      stateAbbr: stateAbbr.toUpperCase(),
    },
  });

  // Fetch latest snapshot for each
  const placesWithMetrics: PlaceWithMetrics[] = [];
  for (const place of places) {
    const snapshot = await getLatestSnapshot('PLACE', place.placeGeoid);
    if (snapshot && snapshot.ratio !== null) {
      placesWithMetrics.push({
        placeGeoid: place.placeGeoid,
        name: place.name,
        stateAbbr: place.stateAbbr,
        stateFips: place.stateFips,
        countyFips: place.countyFips,
        metrics: snapshot,
      });
    }
  }

  // Sort by affordability score (V2 composite if available, else fallback to ratio)
  placesWithMetrics.sort((a, b) => {
    // Use V2 composite score if available, otherwise derive from ratio
    const aScore = a.metrics?.affordabilityPercentile ??
      (a.metrics?.ratio !== null && a.metrics?.ratio !== undefined ?
        (100 - a.metrics.ratio) : -Infinity);
    const bScore = b.metrics?.affordabilityPercentile ??
      (b.metrics?.ratio !== null && b.metrics?.ratio !== undefined ?
        (100 - b.metrics.ratio) : -Infinity);

    // Higher score = more affordable, so DESC for mostAffordable
    return mostAffordable ? bScore - aScore : aScore - bScore;
  });

  return placesWithMetrics.slice(0, limit);
}

/**
 * Get top ZCTAs by affordability within a state
 * @param stateAbbr - State abbreviation (optional, null for nationwide)
 * @param limit - Number of results
 * @param mostAffordable - If true, lowest ratio first; if false, highest ratio first
 * @returns Array of ZCTAs with metrics, ordered by ratio
 *
 * OPTIMIZED: Uses a single query to fetch all snapshots, then joins in memory
 */
export async function getStateTopZips(
  stateAbbr: string | null,
  limit: number = 20,
  mostAffordable: boolean = true
): Promise<ZctaWithMetrics[]> {
  const where = stateAbbr ? { stateAbbr: stateAbbr.toUpperCase() } : {};

  // Get all ZCTAs in the state, their latest snapshots, and V2 scores in parallel
  const [zctas, snapshots, v2Scores] = await Promise.all([
    prisma.geoZcta.findMany({
      where,
    }),
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'ZCTA',
        ratio: {
          not: null,
        },
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: {
        geoType: 'ZCTA',
      },
      select: {
        geoId: true,
        compositeScore: true,
      },
    }),
  ]);

  // Create map of latest snapshot per ZCTA
  const latestByZcta = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    if (!latestByZcta.has(snapshot.geoId)) {
      latestByZcta.set(snapshot.geoId, snapshot);
    }
  }

  // Create map of V2 scores per ZCTA
  const v2ScoreByZcta = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreByZcta.set(score.geoId, score.compositeScore);
  }

  // Combine ZCTA data with metrics (only ZCTAs in this state/area with valid metrics)
  const zctasWithMetrics: ZctaWithMetrics[] = [];
  for (const zcta of zctas) {
    const snapshot = latestByZcta.get(zcta.zcta);
    if (snapshot && snapshot.ratio !== null) {
      const earningPower =
        snapshot.homeValue && snapshot.homeValue > 0
          ? (snapshot.income || 0) / snapshot.homeValue
          : null;

      const affordabilityPercentile = v2ScoreByZcta.get(zcta.zcta) ?? null;

      zctasWithMetrics.push({
        zcta: zcta.zcta,
        stateAbbr: zcta.stateAbbr,
        city: zcta.city,
        metro: zcta.metro,
        countyName: zcta.countyName,
        population: zcta.population,
        latitude: zcta.latitude,
        longitude: zcta.longitude,
        metrics: {
          homeValue: snapshot.homeValue,
          income: snapshot.income,
          ratio: snapshot.ratio,
          earningPower,
          asOfDate: snapshot.asOfDate,
          sources: snapshot.sources,
          affordabilityPercentile,
        },
      });
    }
  }

  // Sort by affordability score (V2 composite if available, else fallback to ratio)
  zctasWithMetrics.sort((a, b) => {
    // Use V2 composite score if available, otherwise derive from ratio
    const aScore = a.metrics?.affordabilityPercentile ??
      (a.metrics?.ratio !== null && a.metrics?.ratio !== undefined ?
        (100 - a.metrics.ratio) : -Infinity);
    const bScore = b.metrics?.affordabilityPercentile ??
      (b.metrics?.ratio !== null && b.metrics?.ratio !== undefined ?
        (100 - b.metrics.ratio) : -Infinity);

    // Higher score = more affordable, so DESC for mostAffordable
    return mostAffordable ? bScore - aScore : aScore - bScore;
  });

  return zctasWithMetrics.slice(0, limit);
}

/**
 * Get top cities by affordability within a state
 * @param stateAbbr - State abbreviation
 * @param limit - Number of results
 * @param mostAffordable - If true, lowest ratio first; if false, highest ratio first
 * @returns Array of cities with metrics, ordered by ratio
 *
 * OPTIMIZED: Uses a single query to fetch all snapshots, then joins in memory
 */
export async function getStateTopCities(
  stateAbbr: string,
  limit: number = 20,
  mostAffordable: boolean = true
): Promise<CityWithMetrics[]> {
  // Get all cities in the state, their latest snapshots, and V2 scores in parallel
  const [cities, snapshots, v2Scores] = await Promise.all([
    prisma.geoCity.findMany({
      where: {
        stateAbbr: stateAbbr.toUpperCase(),
      },
    }),
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: {
          not: null,
        },
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: {
        geoType: 'CITY',
      },
      select: {
        geoId: true,
        compositeScore: true,
      },
    }),
  ]);

  // Create map of latest snapshot per city
  const latestByCityId = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    if (!latestByCityId.has(snapshot.geoId)) {
      latestByCityId.set(snapshot.geoId, snapshot);
    }
  }

  // Create map of V2 scores per city
  const v2ScoreByCityId = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreByCityId.set(score.geoId, score.compositeScore);
  }

  // Combine city data with metrics (only cities in this state with valid metrics)
  const citiesWithMetrics: CityWithMetrics[] = [];
  for (const city of cities) {
    const snapshot = latestByCityId.get(city.cityId);
    if (snapshot && snapshot.ratio !== null) {
      const earningPower =
        snapshot.homeValue && snapshot.homeValue > 0
          ? (snapshot.income || 0) / snapshot.homeValue
          : null;

      const affordabilityPercentile = v2ScoreByCityId.get(city.cityId) ?? null;

      citiesWithMetrics.push({
        cityId: city.cityId,
        name: city.name,
        stateAbbr: city.stateAbbr,
        stateName: city.stateName,
        countyName: city.countyName,
        metro: city.metro,
        slug: city.slug,
        population: city.population,
        metrics: {
          homeValue: snapshot.homeValue,
          income: snapshot.income,
          ratio: snapshot.ratio,
          earningPower,
          asOfDate: snapshot.asOfDate,
          sources: snapshot.sources,
          affordabilityPercentile,
        },
      });
    }
  }

  // Sort by affordability score (V2 composite if available, else fallback to ratio)
  citiesWithMetrics.sort((a, b) => {
    // Use V2 composite score if available, otherwise derive from ratio
    const aScore = a.metrics?.affordabilityPercentile ??
      (a.metrics?.ratio !== null && a.metrics?.ratio !== undefined ?
        (100 - a.metrics.ratio) : -Infinity);
    const bScore = b.metrics?.affordabilityPercentile ??
      (b.metrics?.ratio !== null && b.metrics?.ratio !== undefined ?
        (100 - b.metrics.ratio) : -Infinity);

    // Higher score = more affordable, so DESC for mostAffordable
    return mostAffordable ? bScore - aScore : aScore - bScore;
  });

  return citiesWithMetrics.slice(0, limit);
}

/**
 * Search for places, cities, and ZCTAs by query string
 * @param q - Search query
 * @param limit - Number of results
 * @returns Array of search results with metrics
 *
 * Implements fuzzy matching with relevance ranking:
 * 1. Exact matches (highest priority)
 * 2. Starts-with matches
 * 3. Contains matches
 * 4. Partial ZIP code matches (e.g., "041" finds all ZIPs starting with 041)
 */
export async function getSearchResults(
  q: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const results: Array<SearchResult & { _score?: number }> = [];

  // If query is 3-5 digits, search for ZCTAs (partial and exact)
  if (/^\d{3,5}$/.test(q)) {
    const zctas = await prisma.geoZcta.findMany({
      where: {
        zcta: {
          startsWith: q,
        },
      },
      take: 20, // Get more for ranking
    });

    // Process ZCTAs and add to results
    for (const zcta of zctas) {
      const snapshot = await getLatestSnapshot('ZCTA', zcta.zcta);
      const isExact = zcta.zcta === q;
      results.push({
        geoType: 'ZCTA',
        geoId: zcta.zcta,
        name: `ZIP ${zcta.zcta}`,
        stateAbbr: zcta.stateAbbr,
        metrics: snapshot,
        _score: isExact ? 100 : 90, // Exact match gets highest score
      });
    }
  }

  // Search for cities with fuzzy matching
  const [exactCities, startsWithCities, containsCities] = await Promise.all([
    // Exact match
    prisma.geoCity.findMany({
      where: {
        name: {
          equals: q,
          mode: 'insensitive',
        },
      },
      take: 5,
    }),
    // Starts with
    prisma.geoCity.findMany({
      where: {
        name: {
          startsWith: q,
          mode: 'insensitive',
        },
      },
      take: 10,
    }),
    // Contains
    prisma.geoCity.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: 15,
    }),
  ]);

  // Deduplicate and score cities
  const cityMap = new Map<string, { city: typeof exactCities[0]; score: number }>();

  exactCities.forEach((city) => {
    if (!cityMap.has(city.cityId)) {
      cityMap.set(city.cityId, { city, score: 100 });
    }
  });

  startsWithCities.forEach((city) => {
    if (!cityMap.has(city.cityId)) {
      cityMap.set(city.cityId, { city, score: 80 });
    }
  });

  containsCities.forEach((city) => {
    if (!cityMap.has(city.cityId)) {
      cityMap.set(city.cityId, { city, score: 60 });
    }
  });

  // Add cities to results
  for (const { city, score } of cityMap.values()) {
    const snapshot = await getLatestSnapshot('CITY', city.cityId);
    results.push({
      geoType: 'CITY',
      geoId: city.cityId,
      name: `${city.name}, ${city.stateAbbr}`,
      stateAbbr: city.stateAbbr,
      metrics: snapshot,
      _score: score,
    });
  }

  // Search for places with fuzzy matching
  const [exactPlaces, startsWithPlaces, containsPlaces] = await Promise.all([
    // Exact match
    prisma.geoPlace.findMany({
      where: {
        name: {
          equals: q,
          mode: 'insensitive',
        },
      },
      take: 5,
    }),
    // Starts with
    prisma.geoPlace.findMany({
      where: {
        name: {
          startsWith: q,
          mode: 'insensitive',
        },
      },
      take: 10,
    }),
    // Contains
    prisma.geoPlace.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: 15,
    }),
  ]);

  // Deduplicate and score places
  const placeMap = new Map<string, { place: typeof exactPlaces[0]; score: number }>();

  exactPlaces.forEach((place) => {
    if (!placeMap.has(place.placeGeoid)) {
      placeMap.set(place.placeGeoid, { place, score: 100 });
    }
  });

  startsWithPlaces.forEach((place) => {
    if (!placeMap.has(place.placeGeoid)) {
      placeMap.set(place.placeGeoid, { place, score: 80 });
    }
  });

  containsPlaces.forEach((place) => {
    if (!placeMap.has(place.placeGeoid)) {
      placeMap.set(place.placeGeoid, { place, score: 60 });
    }
  });

  // Add places to results
  for (const { place, score } of placeMap.values()) {
    const snapshot = await getLatestSnapshot('PLACE', place.placeGeoid);
    results.push({
      geoType: 'PLACE',
      geoId: place.placeGeoid,
      name: `${place.name}, ${place.stateAbbr}`,
      stateAbbr: place.stateAbbr,
      metrics: snapshot,
      _score: score,
    });
  }

  // Sort by score (highest first), then by name
  results.sort((a, b) => {
    const scoreA = a._score || 0;
    const scoreB = b._score || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  });

  // Remove _score property and return top results
  return results.slice(0, limit).map(({ _score, ...result }) => result);
}

// ============================================================================
// Dashboard Data Functions
// ============================================================================

/**
 * Dashboard data for city pages
 */
export interface CityDashboardData {
  city: CityWithMetrics | null;
  cities: CityWithMetrics[]; // For disambiguation (when multiple cities have same slug)
  benchmarks: BenchmarkRow[];
  nearbyBetter: NearbyRow[];
  nearbyWorse: NearbyRow[];
  affordabilitySnapshot: Awaited<ReturnType<typeof getAffordabilitySnapshot>>;
  rankData: Awaited<ReturnType<typeof getCityAffordabilityRank>> | null;
  score: ScoreBreakdown;
}

/**
 * Dashboard data for ZIP pages
 */
export interface ZipDashboardData {
  zcta: ZctaWithMetrics | null;
  benchmarks: BenchmarkRow[];
  nearbyBetter: NearbyRow[];
  nearbyWorse: NearbyRow[];
  score: ScoreBreakdown;
}

/**
 * Dashboard data for state pages
 */
export interface StateDashboardData {
  state: import('./usStates').USState;
  lastUpdated: Date | null;
  cityMedians: { ratio: number | null; homeValue: number | null; income: number | null };
  zipMedians: { ratio: number | null; homeValue: number | null; income: number | null };
  usCityMedians: { ratio: number | null; homeValue: number | null; income: number | null };
  usZipMedians: { ratio: number | null; homeValue: number | null; income: number | null };
  // Cities (50k+)
  topCitiesAffordable: CityWithMetrics[];
  topCitiesExpensive: CityWithMetrics[];
  // Small Cities (10k-50k)
  topSmallCitiesAffordable: CityWithMetrics[];
  topSmallCitiesExpensive: CityWithMetrics[];
  // Towns (<10k)
  topTownsAffordable: CityWithMetrics[];
  topTownsExpensive: CityWithMetrics[];
  topZipsAffordable: ZctaWithMetrics[];
  topZipsExpensive: ZctaWithMetrics[];
  topCitiesEarningPower: CityWithMetrics[];
}

/**
 * Get comprehensive dashboard data for a city page
 * @param stateSlug - State slug from URL (e.g., "maine")
 * @param placeParam - Place slug or slug-cityId compound (e.g., "portland" or "springfield-12345")
 * @returns Dashboard data with city, benchmarks, and nearby alternatives
 *
 * Benchmarks are computed using Postgres percentile_cont on latest city snapshots
 * TODO: Replace Prisma queries with cached data layer
 */
export async function getCityDashboardData(
  stateSlug: string,
  placeParam: string
): Promise<CityDashboardData> {
  // Resolve state abbreviation from slug
  const state = stateFromSlug(stateSlug);
  if (!state) {
    return {
      city: null,
      cities: [],
      benchmarks: [],
      nearbyBetter: [],
      nearbyWorse: [],
      affordabilitySnapshot: null,
      rankData: null,
      score: buildHousingOnlyScoreBreakdown(null),
    };
  }

  // Check if placeParam has cityId suffix (e.g., "springfield-12345")
  const cityIdMatch = placeParam.match(/^(.+)-(\d+)$/);

  if (cityIdMatch) {
    // Direct cityId lookup
    const [, , cityId] = cityIdMatch;
    const city = await getCityById(cityId).catch(err => {
      console.error('[getCityById] Error:', err);
      return null;
    });

    if (!city || city.stateAbbr !== state.abbr) {
      return {
        city: null,
        cities: [],
        benchmarks: [],
        nearbyBetter: [],
        nearbyWorse: [],
        affordabilitySnapshot: null,
        rankData: null,
        score: buildHousingOnlyScoreBreakdown(null),
      };
    }

    const [benchmarks, nearbyBetter, nearbyWorse, affordabilitySnapshot, rankData] = await Promise.all([
      getCityBenchmarks(city, state.abbr).catch(err => { console.error('[getCityBenchmarks] Error:', err); return []; }),
      getCityNearbyBetter(city, state.abbr).catch(err => { console.error('[getCityNearbyBetter] Error:', err); return []; }),
      getCityNearbyWorse(city, state.abbr).catch(err => { console.error('[getCityNearbyWorse] Error:', err); return []; }),
      getAffordabilitySnapshot('CITY', cityId).catch(err => { console.error('[getAffordabilitySnapshot] Error:', err); return null; }),
      getCityAffordabilityRank(cityId).catch(err => { console.error('[getCityAffordabilityRank] Error:', err); return { stateRank: null, stateCount: null, statePercentMoreAffordable: null, usRank: null, usCount: null, usPercentMoreAffordable: null }; }),
    ]);

    const score = await buildFullBasketScoreBreakdown(
      cityId,
      rankData.usPercentMoreAffordable,
      affordabilitySnapshot?.medianIncome
    ).catch(err => { console.error('[buildFullBasketScoreBreakdown] Error:', err); return buildHousingOnlyScoreBreakdown(null); });

    return {
      city,
      cities: [],
      benchmarks,
      nearbyBetter,
      nearbyWorse,
      affordabilitySnapshot,
      rankData,
      score,
    };
  }

  // Simple slug lookup - may return multiple cities for disambiguation
  const citySlug = placeParam;
  const cities = await getCityByStateAndSlug(state.abbr, citySlug).catch(err => {
    console.error('[getCityByStateAndSlug] ERROR occurred during lookup:', {
      state: state.abbr,
      slug: citySlug,
      error: err?.message || err,
      stack: err?.stack
    });
    return [];
  });

  if (cities.length === 0) {
    return {
      city: null,
      cities: [],
      benchmarks: [],
      nearbyBetter: [],
      nearbyWorse: [],
      affordabilitySnapshot: null,
      rankData: null,
      score: buildHousingOnlyScoreBreakdown(null),
    };
  }

  if (cities.length === 1) {
    // Unique city - fetch full dashboard data
    const city = cities[0];
    const [benchmarks, nearbyBetter, nearbyWorse, affordabilitySnapshot, rankData] = await Promise.all([
      getCityBenchmarks(city, state.abbr).catch(err => { console.error('[getCityBenchmarks] Error:', err); return []; }),
      getCityNearbyBetter(city, state.abbr).catch(err => { console.error('[getCityNearbyBetter] Error:', err); return []; }),
      getCityNearbyWorse(city, state.abbr).catch(err => { console.error('[getCityNearbyWorse] Error:', err); return []; }),
      getAffordabilitySnapshot('CITY', city.cityId).catch(err => { console.error('[getAffordabilitySnapshot] Error:', err); return null; }),
      getCityAffordabilityRank(city.cityId).catch(err => { console.error('[getCityAffordabilityRank] Error:', err); return { stateRank: null, stateCount: null, statePercentMoreAffordable: null, usRank: null, usCount: null, usPercentMoreAffordable: null }; }),
    ]);

    const score = await buildFullBasketScoreBreakdown(
      city.cityId,
      rankData.usPercentMoreAffordable,
      affordabilitySnapshot?.medianIncome
    ).catch(err => { console.error('[buildFullBasketScoreBreakdown] Error:', err); return buildHousingOnlyScoreBreakdown(null); });

    return {
      city,
      cities: [],
      benchmarks,
      nearbyBetter,
      nearbyWorse,
      affordabilitySnapshot,
      rankData,
      score,
    };
  }

  // Multiple cities with same slug - return for disambiguation
  return {
    city: null,
    cities,
    benchmarks: [],
    nearbyBetter: [],
    nearbyWorse: [],
    affordabilitySnapshot: null,
    rankData: null,
    score: buildHousingOnlyScoreBreakdown(null),
  };
}

/**
 * Get comprehensive dashboard data for a ZIP page
 * @param zip - 5-digit ZIP code
 * @returns Dashboard data with ZCTA, benchmarks, and nearby alternatives
 *
 * Benchmarks are computed using Postgres percentile_cont on latest ZCTA snapshots
 * TODO: Replace Prisma queries with cached data layer
 */
export async function getZipDashboardData(zip: string): Promise<ZipDashboardData> {
  const zcta = await getZipByCode(zip);

  if (!zcta) {
    return {
      zcta: null,
      benchmarks: [],
      nearbyBetter: [],
      nearbyWorse: [],
      score: buildHousingOnlyScoreBreakdown(null),
    };
  }

  const [benchmarks, nearbyBetter, nearbyWorse, rankData] = await Promise.all([
    getZipBenchmarks(zcta),
    getZipNearbyBetter(zcta),
    getZipNearbyWorse(zcta),
    getZctaAffordabilityRank(zip),
  ]);

  const score = buildHousingOnlyScoreBreakdown(rankData.usPercentMoreAffordable);

  return {
    zcta,
    benchmarks,
    nearbyBetter,
    nearbyWorse,
    score,
  };
}

// ============================================================================
// Helper Functions for Dashboard Data
// ============================================================================

/**
 * Compute state medians using Postgres percentile_cont on latest snapshots only
 * Includes fallback to hardcoded state medians if database query fails or returns null
 */
async function getStateMedians(stateAbbr: string): Promise<{
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}> {
  try {
    const result = await prisma.$queryRaw<Array<{
      ratio_median: number | null;
      home_value_median: number | null;
      income_median: number | null;
    }>>`
      WITH latest AS (
        SELECT DISTINCT ON ("geoType", "geoId")
          "geoType", "geoId", "asOfDate", ratio, "homeValue", income
        FROM metric_snapshot
        WHERE "geoType" = 'CITY'
          AND ratio IS NOT NULL
          AND "homeValue" IS NOT NULL
          AND income IS NOT NULL
        ORDER BY "geoType", "geoId", "asOfDate" DESC
      ),
      scoped AS (
        SELECT l.*
        FROM latest l
        JOIN geo_city gc ON gc."cityId" = l."geoId"
        WHERE gc."stateAbbr" = ${stateAbbr}
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
      FROM scoped;
    `;

    if (result.length === 0) {
      console.warn(`[Benchmark] No city data for state ${stateAbbr}, using fallback`);
      return getStateFallbackMedians(stateAbbr);
    }

    const row = result[0];
    const data = {
      ratio: row.ratio_median,
      homeValue: row.home_value_median ? Math.round(row.home_value_median) : null,
      income: row.income_median ? Math.round(row.income_median) : null,
    };

    // Use fallback if all metrics are null
    return ensureValidBenchmarkData(data);
  } catch (error) {
    console.error(`[Benchmark] Error computing city medians for ${stateAbbr}:`, error);
    return getStateFallbackMedians(stateAbbr);
  }
}

/**
 * Compute US medians using Postgres percentile_cont on latest snapshots only
 * Includes fallback to hardcoded national medians if database query fails or returns null
 */
async function getUSMedians(): Promise<{
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}> {
  try {
    const result = await prisma.$queryRaw<Array<{
      ratio_median: number | null;
      home_value_median: number | null;
      income_median: number | null;
    }>>`
      WITH latest AS (
        SELECT DISTINCT ON ("geoType", "geoId")
          "geoType", "geoId", "asOfDate", ratio, "homeValue", income
        FROM metric_snapshot
        WHERE "geoType" = 'CITY'
          AND ratio IS NOT NULL
          AND "homeValue" IS NOT NULL
          AND income IS NOT NULL
        ORDER BY "geoType", "geoId", "asOfDate" DESC
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
      FROM latest;
    `;

    if (result.length === 0) {
      console.warn('[Benchmark] No US city data, using national medians');
      return NATIONAL_MEDIANS;
    }

    const row = result[0];
    const data = {
      ratio: row.ratio_median,
      homeValue: row.home_value_median ? Math.round(row.home_value_median) : null,
      income: row.income_median ? Math.round(row.income_median) : null,
    };

    // Use fallback if all metrics are null
    return ensureValidBenchmarkData(data);
  } catch (error) {
    console.error('[Benchmark] Error computing US city medians:', error);
    return NATIONAL_MEDIANS;
  }
}

/**
 * Compute state medians for ZCTAs using Postgres percentile_cont on latest snapshots only
 * Includes fallback to hardcoded state medians if database query fails or returns null
 */
async function getStateMediansZCTA(stateAbbr: string): Promise<{
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}> {
  try {
    const result = await prisma.$queryRaw<Array<{
      ratio_median: number | null;
      home_value_median: number | null;
      income_median: number | null;
    }>>`
      WITH latest AS (
        SELECT DISTINCT ON ("geoType", "geoId")
          "geoType", "geoId", "asOfDate", ratio, "homeValue", income
        FROM metric_snapshot
        WHERE "geoType" = 'ZCTA'
          AND ratio IS NOT NULL
          AND "homeValue" IS NOT NULL
          AND income IS NOT NULL
        ORDER BY "geoType", "geoId", "asOfDate" DESC
      ),
      scoped AS (
        SELECT l.*
        FROM latest l
        JOIN geo_zcta gz ON gz.zcta = l."geoId"
        WHERE gz."stateAbbr" = ${stateAbbr}
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
      FROM scoped;
    `;

    if (result.length === 0) {
      console.warn(`[Benchmark] No ZCTA data for state ${stateAbbr}, using fallback`);
      return getStateFallbackMedians(stateAbbr);
    }

    const row = result[0];
    const data = {
      ratio: row.ratio_median,
      homeValue: row.home_value_median ? Math.round(row.home_value_median) : null,
      income: row.income_median ? Math.round(row.income_median) : null,
    };

    // Use fallback if all metrics are null
    return ensureValidBenchmarkData(data);
  } catch (error) {
    console.error(`[Benchmark] Error computing ZCTA medians for ${stateAbbr}:`, error);
    return getStateFallbackMedians(stateAbbr);
  }
}

/**
 * Compute US medians for ZCTAs using Postgres percentile_cont on latest snapshots only
 * Includes fallback to hardcoded national medians if database query fails or returns null
 */
async function getUSMediansZCTA(): Promise<{
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}> {
  try {
    const result = await prisma.$queryRaw<Array<{
      ratio_median: number | null;
      home_value_median: number | null;
      income_median: number | null;
    }>>`
      WITH latest AS (
        SELECT DISTINCT ON ("geoType", "geoId")
          "geoType", "geoId", "asOfDate", ratio, "homeValue", income
        FROM metric_snapshot
        WHERE "geoType" = 'ZCTA'
          AND ratio IS NOT NULL
          AND "homeValue" IS NOT NULL
          AND income IS NOT NULL
        ORDER BY "geoType", "geoId", "asOfDate" DESC
      )
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
      FROM latest;
    `;

    if (result.length === 0) {
      console.warn('[Benchmark] No US ZCTA data, using national medians');
      return NATIONAL_MEDIANS;
    }

    const row = result[0];
    const data = {
      ratio: row.ratio_median,
      homeValue: row.home_value_median ? Math.round(row.home_value_median) : null,
      income: row.income_median ? Math.round(row.income_median) : null,
    };

    // Use fallback if all metrics are null
    return ensureValidBenchmarkData(data);
  } catch (error) {
    console.error('[Benchmark] Error computing US ZCTA medians:', error);
    return NATIONAL_MEDIANS;
  }
}

/**
 * Compute real affordability ranks and percentiles for a city using SQL window functions
 * Lower ratio = more affordable = better rank (rank 1 is most affordable)
 */
async function getCityAffordabilityRank(cityId: string): Promise<{
  stateRank: number | null;
  stateCount: number | null;
  statePercentMoreAffordable: number | null;
  usRank: number | null;
  usCount: number | null;
  usPercentMoreAffordable: number | null;
}> {
  // First, get the state for this city
  const city = await prisma.geoCity.findUnique({
    where: { cityId },
    select: { stateAbbr: true },
  });

  if (!city) {
    return {
      stateRank: null,
      stateCount: null,
      statePercentMoreAffordable: null,
      usRank: null,
      usCount: null,
      usPercentMoreAffordable: null,
    };
  }

  const stateAbbr = city.stateAbbr;

  // Compute state rank using window functions (V2 composite scores)
  const stateResult = await prisma.$queryRaw<Array<{
    rank: number;
    total_count: number;
    percentile: number;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoType", "geoId", "asOfDate", ratio
      FROM metric_snapshot
      WHERE "geoType" = 'CITY'
        AND ratio IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    state_cities AS (
      SELECT l."geoId", l.ratio, v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = l."geoId"
      WHERE gc."stateAbbr" = ${stateAbbr}
    ),
    with_scores AS (
      SELECT
        "geoId",
        COALESCE("compositeScore", (100 - ratio)) AS affordability_score
      FROM state_cities
    ),
    ranked AS (
      SELECT
        "geoId",
        dense_rank() OVER (ORDER BY affordability_score DESC) AS rank,
        COUNT(*) OVER () AS total_count,
        cume_dist() OVER (ORDER BY affordability_score DESC) * 100 AS percentile
      FROM with_scores
    )
    SELECT rank::int, total_count::int, percentile::float
    FROM ranked
    WHERE "geoId" = ${cityId};
  `;

  // Compute US rank using window functions (V2 composite scores)
  const usResult = await prisma.$queryRaw<Array<{
    rank: number;
    total_count: number;
    percentile: number;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoType", "geoId", "asOfDate", ratio
      FROM metric_snapshot
      WHERE "geoType" = 'CITY'
        AND ratio IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT l.*, v2."compositeScore"
      FROM latest l
      LEFT JOIN v2_scores v2 ON v2."geoId" = l."geoId"
    ),
    with_scores AS (
      SELECT
        "geoId",
        COALESCE("compositeScore", (100 - ratio)) AS affordability_score
      FROM scoped
    ),
    ranked AS (
      SELECT
        "geoId",
        dense_rank() OVER (ORDER BY affordability_score DESC) AS rank,
        COUNT(*) OVER () AS total_count,
        cume_dist() OVER (ORDER BY affordability_score DESC) * 100 AS percentile
      FROM with_scores
    )
    SELECT rank::int, total_count::int, percentile::float
    FROM ranked
    WHERE "geoId" = ${cityId};
  `;

  const stateData = stateResult.length > 0 ? stateResult[0] : null;
  const usData = usResult.length > 0 ? usResult[0] : null;

  return {
    stateRank: stateData?.rank ?? null,
    stateCount: stateData?.total_count ?? null,
    statePercentMoreAffordable: stateData?.percentile ?? null,
    usRank: usData?.rank ?? null,
    usCount: usData?.total_count ?? null,
    usPercentMoreAffordable: usData?.percentile ?? null,
  };
}

/**
 * Get ZCTA affordability rank and percentile (US-wide only, no state scoping)
 * @param zcta - 5-digit ZCTA code
 * @returns US rank, count, and percentile
 */
async function getZctaAffordabilityRank(zcta: string): Promise<{
  usRank: number | null;
  usCount: number | null;
  usPercentMoreAffordable: number | null;
}> {
  // Compute US rank using window functions (V2 composite scores)
  const usResult = await prisma.$queryRaw<Array<{
    rank: number;
    total_count: number;
    percentile: number;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoType", "geoId", "asOfDate", ratio
      FROM metric_snapshot
      WHERE "geoType" = 'ZCTA'
        AND ratio IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'ZCTA'
    ),
    scoped AS (
      SELECT l.*, v2."compositeScore"
      FROM latest l
      LEFT JOIN v2_scores v2 ON v2."geoId" = l."geoId"
    ),
    with_scores AS (
      SELECT
        "geoId",
        COALESCE("compositeScore", (100 - ratio)) AS affordability_score
      FROM scoped
    ),
    ranked AS (
      SELECT
        "geoId",
        dense_rank() OVER (ORDER BY affordability_score DESC) AS rank,
        COUNT(*) OVER () AS total_count,
        cume_dist() OVER (ORDER BY affordability_score DESC) * 100 AS percentile
      FROM with_scores
    )
    SELECT rank::int, total_count::int, percentile::float
    FROM ranked
    WHERE "geoId" = ${zcta};
  `;

  const usData = usResult.length > 0 ? usResult[0] : null;

  return {
    usRank: usData?.rank ?? null,
    usCount: usData?.total_count ?? null,
    usPercentMoreAffordable: usData?.percentile ?? null,
  };
}

/**
 * Get benchmark rows for a city (this geo, state median, US median)
 */
async function getCityBenchmarks(
  city: CityWithMetrics,
  stateAbbr: string
): Promise<BenchmarkRow[]> {
  const benchmarks: BenchmarkRow[] = [];

  // This geography
  benchmarks.push({
    label: city.name,
    ratio: city.metrics?.ratio ?? null,
    homeValue: city.metrics?.homeValue ?? null,
    income: city.metrics?.income ?? null,
  });

  // State median - calculated using Postgres percentile_cont on latest snapshots
  const stateMedians = await getStateMedians(stateAbbr);

  benchmarks.push({
    label: `${stateAbbr} State Median`,
    ratio: stateMedians.ratio,
    homeValue: stateMedians.homeValue,
    income: stateMedians.income,
  });

  // US median - calculated using Postgres percentile_cont on latest snapshots
  const usMedians = await getUSMedians();

  benchmarks.push({
    label: 'US National Median',
    ratio: usMedians.ratio,
    homeValue: usMedians.homeValue,
    income: usMedians.income,
  });

  return benchmarks;
}

/**
 * Get nearby cities with better (lower) affordability ratio
 * Uses V2 composite score for comparison when available, falls back to ratio
 * Prefers same county/metro if available
 */
async function getCityNearbyBetter(
  city: CityWithMetrics,
  stateAbbr: string
): Promise<NearbyRow[]> {
  if (!city.metrics?.ratio) {
    return [];
  }

  const currentScore = city.metrics.affordabilityPercentile ?? (100 - city.metrics.ratio);

  // Get all cities in same state with valid ratio
  const cities = await getStateTopCities(stateAbbr, 200, true); // Get top 200 most affordable

  // Filter for better score (higher) and exclude current city
  const better = cities
    .filter((c) => {
      if (c.cityId === city.cityId || !c.metrics?.ratio) return false;
      const cScore = c.metrics.affordabilityPercentile ?? (100 - c.metrics.ratio);
      return cScore > currentScore;
    })
    .slice(0, 10); // Limit to 10

  return better.map((c) => ({
    label: c.name,
    href: `/${stateFromAbbr(stateAbbr)?.slug || stateAbbr.toLowerCase()}/${c.slug}/`,
    ratio: c.metrics?.ratio ?? null,
    homeValue: c.metrics?.homeValue ?? null,
    income: c.metrics?.income ?? null,
    affordabilityPercentile: c.metrics?.affordabilityPercentile ?? null,
    asOfDate: c.metrics?.asOfDate,
  }));
}

/**
 * Get nearby cities with worse (higher) affordability ratio
 * Uses V2 composite score for comparison when available, falls back to ratio
 */
async function getCityNearbyWorse(
  city: CityWithMetrics,
  stateAbbr: string
): Promise<NearbyRow[]> {
  if (!city.metrics?.ratio) {
    return [];
  }

  const currentScore = city.metrics.affordabilityPercentile ?? (100 - city.metrics.ratio);

  // Get all cities in same state with valid ratio
  const cities = await getStateTopCities(stateAbbr, 200, false); // Get top 200 least affordable

  // Filter for worse score (lower) and exclude current city
  const worse = cities
    .filter((c) => {
      if (c.cityId === city.cityId || !c.metrics?.ratio) return false;
      const cScore = c.metrics.affordabilityPercentile ?? (100 - c.metrics.ratio);
      return cScore < currentScore;
    })
    .slice(0, 10); // Limit to 10

  return worse.map((c) => ({
    label: c.name,
    href: `/${stateFromAbbr(stateAbbr)?.slug || stateAbbr.toLowerCase()}/${c.slug}/`,
    ratio: c.metrics?.ratio ?? null,
    homeValue: c.metrics?.homeValue ?? null,
    income: c.metrics?.income ?? null,
    affordabilityPercentile: c.metrics?.affordabilityPercentile ?? null,
    asOfDate: c.metrics?.asOfDate,
  }));
}

/**
 * Get benchmark rows for a ZIP (this geo, state median, US median)
 */
async function getZipBenchmarks(zcta: ZctaWithMetrics): Promise<BenchmarkRow[]> {
  const benchmarks: BenchmarkRow[] = [];

  // This geography
  benchmarks.push({
    label: `ZIP ${zcta.zcta}`,
    ratio: zcta.metrics?.ratio ?? null,
    homeValue: zcta.metrics?.homeValue ?? null,
    income: zcta.metrics?.income ?? null,
  });

  // State median - calculated using Postgres percentile_cont on latest ZCTA snapshots
  if (zcta.stateAbbr) {
    const stateMedians = await getStateMediansZCTA(zcta.stateAbbr);

    benchmarks.push({
      label: `${zcta.stateAbbr} State Median (ZCTA)`,
      ratio: stateMedians.ratio,
      homeValue: stateMedians.homeValue,
      income: stateMedians.income,
    });
  }

  // US median - calculated using Postgres percentile_cont on latest ZCTA snapshots
  const usMedians = await getUSMediansZCTA();

  benchmarks.push({
    label: 'US National Median (ZCTA)',
    ratio: usMedians.ratio,
    homeValue: usMedians.homeValue,
    income: usMedians.income,
  });

  return benchmarks;
}

/**
 * Get nearby ZIPs with better (lower) affordability ratio
 * Uses V2 composite score for comparison when available, falls back to ratio
 * Filters to ZIPs within 50 miles
 */
async function getZipNearbyBetter(zcta: ZctaWithMetrics): Promise<NearbyRow[]> {
  if (!zcta.metrics?.ratio || !zcta.stateAbbr) {
    return [];
  }

  const currentScore = zcta.metrics.affordabilityPercentile ?? (100 - zcta.metrics.ratio);
  const MAX_DISTANCE_MILES = 50;

  // Get top ZIPs in same state
  const zips = await getStateTopZips(zcta.stateAbbr, 200, true);

  // Filter for better score (higher), exclude current ZIP, and check distance
  const better = zips
    .filter((z) => {
      if (z.zcta === zcta.zcta || !z.metrics?.ratio) {
        return false;
      }

      const zScore = z.metrics.affordabilityPercentile ?? (100 - z.metrics.ratio);
      if (zScore <= currentScore) {
        return false;
      }

      // If either ZIP is missing coordinates, include it anyway (backwards compatibility)
      if (!zcta.latitude || !zcta.longitude || !z.latitude || !z.longitude) {
        return true;
      }

      // Filter by distance
      const distance = calculateDistance(zcta.latitude, zcta.longitude, z.latitude, z.longitude);
      return distance <= MAX_DISTANCE_MILES;
    })
    .slice(0, 10);

  return better.map((z) => ({
    label: z.city && z.stateAbbr ? `${z.city}, ${z.stateAbbr} (ZIP ${z.zcta})` : `ZIP ${z.zcta}`,
    href: `/zip/${z.zcta}/`,
    ratio: z.metrics?.ratio ?? null,
    homeValue: z.metrics?.homeValue ?? null,
    income: z.metrics?.income ?? null,
    affordabilityPercentile: z.metrics?.affordabilityPercentile ?? null,
    asOfDate: z.metrics?.asOfDate,
  }));
}

/**
 * Get nearby ZIPs with worse (higher) affordability ratio
 * Uses V2 composite score for comparison when available, falls back to ratio
 * Filters to ZIPs within 50 miles
 */
async function getZipNearbyWorse(zcta: ZctaWithMetrics): Promise<NearbyRow[]> {
  if (!zcta.metrics?.ratio || !zcta.stateAbbr) {
    return [];
  }

  const currentScore = zcta.metrics.affordabilityPercentile ?? (100 - zcta.metrics.ratio);
  const MAX_DISTANCE_MILES = 50;

  // Get least affordable ZIPs in same state
  const zips = await getStateTopZips(zcta.stateAbbr, 200, false);

  // Filter for worse score (lower), exclude current ZIP, and check distance
  const worse = zips
    .filter((z) => {
      if (z.zcta === zcta.zcta || !z.metrics?.ratio) {
        return false;
      }

      const zScore = z.metrics.affordabilityPercentile ?? (100 - z.metrics.ratio);
      if (zScore >= currentScore) {
        return false;
      }

      // If either ZIP is missing coordinates, include it anyway (backwards compatibility)
      if (!zcta.latitude || !zcta.longitude || !z.latitude || !z.longitude) {
        return true;
      }

      // Filter by distance
      const distance = calculateDistance(zcta.latitude, zcta.longitude, z.latitude, z.longitude);
      return distance <= MAX_DISTANCE_MILES;
    })
    .slice(0, 10);

  return worse.map((z) => ({
    label: z.city && z.stateAbbr ? `${z.city}, ${z.stateAbbr} (ZIP ${z.zcta})` : `ZIP ${z.zcta}`,
    href: `/zip/${z.zcta}/`,
    ratio: z.metrics?.ratio ?? null,
    homeValue: z.metrics?.homeValue ?? null,
    income: z.metrics?.income ?? null,
    affordabilityPercentile: z.metrics?.affordabilityPercentile ?? null,
    asOfDate: z.metrics?.asOfDate,
  }));
}

// ============================================================================
// Percentile Calculation Functions
// ============================================================================

/**
 * Get all ratios for cities nationwide (for percentile calculation)
 * Returns sorted array of composite scores (V2) or ratio-derived scores
 * Higher values = more affordable (inverse of ratio)
 *
 * TODO: Cache this result with short TTL (1 hour) as it's expensive
 */
export async function getAllCityRatiosNational(): Promise<number[]> {
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: {
          not: null,
        },
      },
      select: {
        geoId: true,
        ratio: true,
        asOfDate: true,
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'CITY' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get latest ratio per city and compute scores
  const latestByCityId = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (!latestByCityId.has(snapshot.geoId) && snapshot.ratio !== null) {
      // Use V2 composite score if available, otherwise derive from ratio
      const score = v2ScoreMap.get(snapshot.geoId) ?? (100 - snapshot.ratio);
      latestByCityId.set(snapshot.geoId, score);
    }
  }

  // Return sorted array (ascending - lower score = less affordable)
  return Array.from(latestByCityId.values()).sort((a, b) => a - b);
}

/**
 * Get all ratios for cities in a specific state (for state-level percentile)
 * Returns sorted array of composite scores (V2) or ratio-derived scores
 */
export async function getAllCityRatiosForState(stateAbbr: string): Promise<number[]> {
  const [cities, snapshots, v2Scores] = await Promise.all([
    prisma.geoCity.findMany({
      where: {
        stateAbbr: stateAbbr.toUpperCase(),
      },
      select: {
        cityId: true,
      },
    }),
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: {
          not: null,
        },
      },
      select: {
        geoId: true,
        ratio: true,
        asOfDate: true,
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'CITY' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  const cityIds = new Set(cities.map((c) => c.cityId));

  // Get latest ratio per city (only for cities in this state) and compute scores
  const latestByCityId = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (
      cityIds.has(snapshot.geoId) &&
      !latestByCityId.has(snapshot.geoId) &&
      snapshot.ratio !== null
    ) {
      // Use V2 composite score if available, otherwise derive from ratio
      const score = v2ScoreMap.get(snapshot.geoId) ?? (100 - snapshot.ratio);
      latestByCityId.set(snapshot.geoId, score);
    }
  }

  return Array.from(latestByCityId.values()).sort((a, b) => a - b);
}

/**
 * Get all ratios for ZIPs nationwide
 * Returns sorted array of composite scores (V2) or ratio-derived scores
 */
export async function getAllZipRatiosNational(): Promise<number[]> {
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'ZCTA',
        ratio: {
          not: null,
        },
      },
      select: {
        geoId: true,
        ratio: true,
        asOfDate: true,
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'ZCTA' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get latest ratio per ZIP and compute scores
  const latestByZcta = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (!latestByZcta.has(snapshot.geoId) && snapshot.ratio !== null) {
      // Use V2 composite score if available, otherwise derive from ratio
      const score = v2ScoreMap.get(snapshot.geoId) ?? (100 - snapshot.ratio);
      latestByZcta.set(snapshot.geoId, score);
    }
  }

  return Array.from(latestByZcta.values()).sort((a, b) => a - b);
}

/**
 * Get all ratios for ZIPs in a specific state
 * Returns sorted array of composite scores (V2) or ratio-derived scores
 */
export async function getAllZipRatiosForState(stateAbbr: string): Promise<number[]> {
  const [zctas, snapshots, v2Scores] = await Promise.all([
    prisma.geoZcta.findMany({
      where: {
        stateAbbr: stateAbbr.toUpperCase(),
      },
      select: {
        zcta: true,
      },
    }),
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'ZCTA',
        ratio: {
          not: null,
        },
      },
      select: {
        geoId: true,
        ratio: true,
        asOfDate: true,
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'ZCTA' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  const zctaCodes = new Set(zctas.map((z) => z.zcta));

  // Get latest ratio per ZIP (only for ZIPs in this state) and compute scores
  const latestByZcta = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (
      zctaCodes.has(snapshot.geoId) &&
      !latestByZcta.has(snapshot.geoId) &&
      snapshot.ratio !== null
    ) {
      // Use V2 composite score if available, otherwise derive from ratio
      const score = v2ScoreMap.get(snapshot.geoId) ?? (100 - snapshot.ratio);
      latestByZcta.set(snapshot.geoId, score);
    }
  }

  return Array.from(latestByZcta.values()).sort((a, b) => a - b);
}

// ============================================================================
// National Rankings Functions
// ============================================================================

/**
 * Get top cities nationwide by affordability
 * @param limit - Number of results
 * @param mostAffordable - If true, lowest ratio first; if false, highest ratio first
 * @returns Array of cities with metrics, ordered by ratio
 *
 * TODO: Replace with pre-computed national rankings table
 */
export async function getNationalTopCities(
  limit: number = 25,
  mostAffordable: boolean = true
): Promise<CityWithMetrics[]> {
  // Get recent snapshots for all cities with complete data and V2 scores in parallel
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: {
          not: null,
        },
        homeValue: {
          not: null,
        },
        income: {
          not: null,
        },
      },
      orderBy: {
        asOfDate: 'desc',
      },
      take: 5000, // Get top 5000 to ensure we have enough
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'CITY' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get unique cities (latest snapshot per city)
  const latestByCityId = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    if (!latestByCityId.has(snapshot.geoId)) {
      latestByCityId.set(snapshot.geoId, snapshot);
    }
  }

  // Fetch city details
  const cityIds = Array.from(latestByCityId.keys());
  const cities = await prisma.geoCity.findMany({
    where: {
      cityId: {
        in: cityIds,
      },
    },
  });

  // Combine city data with metrics and V2 scores
  const citiesWithMetrics: CityWithMetrics[] = cities.map((city) => {
    const snapshot = latestByCityId.get(city.cityId)!;
    const earningPower =
      snapshot.homeValue && snapshot.homeValue > 0
        ? (snapshot.income || 0) / snapshot.homeValue
        : null;

    return {
      cityId: city.cityId,
      name: city.name,
      stateAbbr: city.stateAbbr,
      stateName: city.stateName,
      countyName: city.countyName,
      metro: city.metro,
      slug: city.slug,
      population: city.population,
      metrics: {
        homeValue: snapshot.homeValue,
        income: snapshot.income,
        ratio: snapshot.ratio,
        earningPower,
        asOfDate: snapshot.asOfDate,
        sources: snapshot.sources,
        affordabilityPercentile: v2ScoreMap.get(city.cityId) ?? null,
      },
    };
  });

  // Sort by composite score (V2) or fallback to ratio-based score
  citiesWithMetrics.sort((a, b) => {
    const aScore = a.metrics?.affordabilityPercentile ?? (100 - (a.metrics?.ratio ?? Infinity));
    const bScore = b.metrics?.affordabilityPercentile ?? (100 - (b.metrics?.ratio ?? Infinity));
    return mostAffordable ? bScore - aScore : aScore - bScore;
  });

  return citiesWithMetrics.slice(0, limit);
}

/**
 * Get most affordable large cities nationwide (population >= 500k)
 */
export async function getNationalLargeCitiesAffordable(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.LARGE_CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable large cities nationwide (population >= 500k)
 */
export async function getNationalLargeCitiesExpensive(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.LARGE_CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get most affordable cities nationwide (population 50k-500k)
 */
export async function getNationalCitiesAffordable(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable cities nationwide (population 50k-500k)
 */
export async function getNationalCitiesExpensive(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get most affordable small cities nationwide (population 10k-50k)
 */
export async function getNationalSmallCitiesAffordable(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.SMALL_CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable small cities nationwide (population 10k-50k)
 */
export async function getNationalSmallCitiesExpensive(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.SMALL_CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get most affordable towns nationwide (population < 10k)
 */
export async function getNationalTownsAffordable(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.TOWN)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable towns nationwide (population < 10k)
 */
export async function getNationalTownsExpensive(limit: number = 12): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.TOWN)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

// ============================================================================
// NEW RANKINGS PAGE FUNCTIONS (100k+, 50k-99k, 10k-49k, 1k-9k)
// ============================================================================

/**
 * Get most affordable large cities nationwide (population >= 100,000)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by best affordability (lowest ratio)
 */
export async function getLargeCitiesAffordable(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.LARGE_CITIES_100K)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable (most expensive) large cities nationwide (population >= 100,000)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by worst affordability (highest ratio)
 */
export async function getLargeCitiesExpensive(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.LARGE_CITIES_100K)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get most affordable mid-size cities nationwide (population 50,000-99,999)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by best affordability (lowest ratio)
 */
export async function getMidSizeCitiesAffordable(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.MID_SIZE_CITIES)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable (most expensive) mid-size cities nationwide (population 50,000-99,999)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by worst affordability (highest ratio)
 */
export async function getMidSizeCitiesExpensive(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.MID_SIZE_CITIES)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get most affordable small cities nationwide (population 10,000-49,999)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by best affordability (lowest ratio)
 */
export async function getSmallCitiesAffordable(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.SMALL_CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable (most expensive) small cities nationwide (population 10,000-49,999)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by worst affordability (highest ratio)
 */
export async function getSmallCitiesExpensive(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.SMALL_CITY)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get most affordable towns nationwide (population 1,000-9,999)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by best affordability (lowest ratio)
 */
export async function getTownsAffordable(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.TOWN)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get least affordable (most expensive) towns nationwide (population 1,000-9,999)
 * @param limit - Number of results (default 100)
 * @returns Array of cities with metrics, ordered by worst affordability (highest ratio)
 */
export async function getTownsExpensive(limit: number = 100): Promise<CityWithMetrics[]> {
  const data = await prisma.$queryRaw<Array<{
    cityId: string; name: string; stateAbbr: string; stateName: string | null;
    countyName: string | null; metro: string | null; slug: string; population: number | null;
    ratio: number | null; homeValue: number | null; income: number | null;
    asOfDate: Date; sources: string | null; affordabilityPercentile: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    v2_scores AS (
      SELECT "geoId", "compositeScore"
      FROM v2_affordability_score
      WHERE "geoType" = 'CITY'
    ),
    scoped AS (
      SELECT gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
        gc.metro, gc.slug, gc.population, l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
        v2."compositeScore"
      FROM latest l
      JOIN geo_city gc ON gc."cityId" = l."geoId"
      LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
      WHERE ${Prisma.raw(BUCKET_WHERE.TOWN)}
    ),
    with_scores AS (
      SELECT *,
        ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
      FROM scoped
    ),
    ranked AS (
      SELECT *,
        COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
      FROM with_scores
    )
    SELECT * FROM ranked
    ORDER BY COALESCE("compositeScore", v1_percentile) ASC LIMIT ${limit};
  `;

  return data.map((row) => ({
    cityId: row.cityId, name: row.name, stateAbbr: row.stateAbbr, stateName: row.stateName,
    countyName: row.countyName, metro: row.metro, slug: row.slug, population: row.population,
    metrics: {
      ratio: row.ratio, homeValue: row.homeValue, income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate, sources: row.sources,
      affordabilityPercentile: row.affordabilityPercentile,
    },
  }));
}

/**
 * Get affordable small towns nationwide (population < 50k)
 * @param limit - Number of results
 * @returns Array of cities with metrics, ordered by best affordability
 *
 * TODO: Replace with pre-computed rankings table
 */
export async function getAffordableSmallTowns(
  limit: number = 6
): Promise<CityWithMetrics[]> {
  // Get recent snapshots for all cities with complete data and V2 scores in parallel
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: {
          not: null,
        },
        homeValue: {
          not: null,
        },
        income: {
          not: null,
        },
      },
      orderBy: {
        asOfDate: 'desc',
      },
      take: 5000, // Get top 5000 to ensure we have enough
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'CITY' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get unique cities (latest snapshot per city)
  const latestByCityId = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    if (!latestByCityId.has(snapshot.geoId)) {
      latestByCityId.set(snapshot.geoId, snapshot);
    }
  }

  // Fetch city details
  // Note: GeoCity doesn't have population field, so we filter by home value range
  // to target smaller, more affordable communities
  const cityIds = Array.from(latestByCityId.keys());
  const cities = await prisma.geoCity.findMany({
    where: {
      cityId: {
        in: cityIds,
      },
    },
  });

  // Filter to cities with affordable home values (under $250k typically = smaller towns)
  const affordableCities = cities.filter((city) => {
    const snapshot = latestByCityId.get(city.cityId);
    return snapshot && snapshot.homeValue && snapshot.homeValue < 250000;
  });

  // Combine city data with metrics and V2 scores
  const citiesWithMetrics: CityWithMetrics[] = affordableCities.map((city) => {
    const snapshot = latestByCityId.get(city.cityId)!;
    const earningPower =
      snapshot.homeValue && snapshot.homeValue > 0
        ? (snapshot.income || 0) / snapshot.homeValue
        : null;

    return {
      cityId: city.cityId,
      name: city.name,
      stateAbbr: city.stateAbbr,
      stateName: city.stateName,
      countyName: city.countyName,
      metro: city.metro,
      slug: city.slug,
      population: city.population,
      metrics: {
        homeValue: snapshot.homeValue,
        income: snapshot.income,
        ratio: snapshot.ratio,
        earningPower,
        asOfDate: snapshot.asOfDate,
        sources: snapshot.sources,
        affordabilityPercentile: v2ScoreMap.get(city.cityId) ?? null,
      },
    };
  });

  // Sort by best affordability using composite score (V2) or fallback to ratio-based score
  citiesWithMetrics.sort((a, b) => {
    const aScore = a.metrics?.affordabilityPercentile ?? (100 - (a.metrics?.ratio ?? Infinity));
    const bScore = b.metrics?.affordabilityPercentile ?? (100 - (b.metrics?.ratio ?? Infinity));
    return bScore - aScore; // Higher score = more affordable
  });

  return citiesWithMetrics.slice(0, limit);
}

/**
 * Get top ZIPs nationwide by affordability
 * @param limit - Number of results
 * @param mostAffordable - If true, lowest ratio first; if false, highest ratio first
 * @returns Array of ZCTAs with metrics, ordered by ratio
 *
 * TODO: Replace with pre-computed national rankings table
 */
export async function getNationalTopZips(
  limit: number = 25,
  mostAffordable: boolean = true
): Promise<ZctaWithMetrics[]> {
  // Get recent snapshots for all ZIPs with complete data and V2 scores in parallel
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'ZCTA',
        ratio: {
          not: null,
        },
        homeValue: {
          not: null,
        },
        income: {
          not: null,
        },
      },
      orderBy: {
        asOfDate: 'desc',
      },
      take: 5000, // Get top 5000 to ensure we have enough
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'ZCTA' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get unique ZIPs (latest snapshot per ZIP)
  const latestByZcta = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    if (!latestByZcta.has(snapshot.geoId)) {
      latestByZcta.set(snapshot.geoId, snapshot);
    }
  }

  // Fetch ZCTA details
  const zctas = await prisma.geoZcta.findMany({
    where: {
      zcta: {
        in: Array.from(latestByZcta.keys()),
      },
    },
  });

  // Combine ZCTA data with metrics and V2 scores
  const zctasWithMetrics: ZctaWithMetrics[] = zctas.map((zcta) => {
    const snapshot = latestByZcta.get(zcta.zcta)!;
    const earningPower =
      snapshot.homeValue && snapshot.homeValue > 0
        ? (snapshot.income || 0) / snapshot.homeValue
        : null;

    return {
      zcta: zcta.zcta,
      stateAbbr: zcta.stateAbbr,
      city: zcta.city,
      metro: zcta.metro,
      countyName: zcta.countyName,
      population: zcta.population,
      latitude: zcta.latitude,
      longitude: zcta.longitude,
      metrics: {
        homeValue: snapshot.homeValue,
        income: snapshot.income,
        ratio: snapshot.ratio,
        earningPower,
        asOfDate: snapshot.asOfDate,
        sources: snapshot.sources,
        affordabilityPercentile: v2ScoreMap.get(zcta.zcta) ?? null,
      },
    };
  });

  // Sort by composite score (V2) or fallback to ratio-based score
  zctasWithMetrics.sort((a, b) => {
    const aScore = a.metrics?.affordabilityPercentile ?? (100 - (a.metrics?.ratio ?? Infinity));
    const bScore = b.metrics?.affordabilityPercentile ?? (100 - (b.metrics?.ratio ?? Infinity));
    return mostAffordable ? bScore - aScore : aScore - bScore;
  });

  return zctasWithMetrics.slice(0, limit);
}

/**
 * Get state ranking for a specific ZIP
 * Returns the ZIP's rank and total count within its state
 * Uses V2 composite score when available, falls back to ratio-based score
 */
export async function getStateRankingForZip(
  zip: string,
  stateAbbr: string
): Promise<{ rank: number; total: number; percentile: number } | null> {
  // Get all ZIPs in the state with metrics and V2 scores in parallel
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'ZCTA',
        ratio: { not: null },
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'ZCTA' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get latest snapshot per ZIP in this state
  const zctas = await prisma.geoZcta.findMany({
    where: { stateAbbr },
  });

  const zctaIds = new Set(zctas.map((z) => z.zcta));
  const latestByZcta = new Map<string, typeof snapshots[0]>();

  for (const snapshot of snapshots) {
    if (zctaIds.has(snapshot.geoId) && !latestByZcta.has(snapshot.geoId)) {
      latestByZcta.set(snapshot.geoId, snapshot);
    }
  }

  // Get the target ZIP's snapshot
  const targetSnapshot = latestByZcta.get(zip);
  if (!targetSnapshot || !targetSnapshot.ratio) {
    return null;
  }

  // Sort all ZIPs by composite score (V2) or fallback to ratio-based score
  // Higher score = more affordable
  const sortedZips = Array.from(latestByZcta.entries())
    .map(([zcta, snap]) => {
      const v2Score = v2ScoreMap.get(zcta);
      const score = v2Score ?? (100 - snap.ratio!);
      return { zcta, score };
    })
    .sort((a, b) => b.score - a.score); // DESC: higher score = better rank

  // Find rank (1-indexed)
  const rank = sortedZips.findIndex((z) => z.zcta === zip) + 1;
  const total = sortedZips.length;
  const percentile = Math.round((rank / total) * 100);

  return { rank, total, percentile };
}

/**
 * Get state ranking for a specific city
 * Returns the city's rank and total count within its state
 * Uses V2 composite score when available, falls back to ratio-based score
 */
export async function getStateRankingForCity(
  cityId: string,
  stateAbbr: string
): Promise<{ rank: number; total: number; percentile: number } | null> {
  // Get all cities in the state with metrics and V2 scores in parallel
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: { not: null },
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'CITY' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get latest snapshot per city in this state
  const cities = await prisma.geoCity.findMany({
    where: { stateAbbr },
  });

  const cityIds = new Set(cities.map((c) => c.cityId));
  const latestByCity = new Map<string, typeof snapshots[0]>();

  for (const snapshot of snapshots) {
    if (cityIds.has(snapshot.geoId) && !latestByCity.has(snapshot.geoId)) {
      latestByCity.set(snapshot.geoId, snapshot);
    }
  }

  // Get the target city's snapshot
  const targetSnapshot = latestByCity.get(cityId);
  if (!targetSnapshot || !targetSnapshot.ratio) {
    return null;
  }

  // Sort all cities by composite score (V2) or fallback to ratio-based score
  // Higher score = more affordable
  const sortedCities = Array.from(latestByCity.entries())
    .map(([id, snap]) => {
      const v2Score = v2ScoreMap.get(id);
      const score = v2Score ?? (100 - snap.ratio!);
      return { cityId: id, score };
    })
    .sort((a, b) => b.score - a.score); // DESC: higher score = better rank

  // Find rank (1-indexed)
  const rank = sortedCities.findIndex((c) => c.cityId === cityId) + 1;
  const total = sortedCities.length;
  const percentile = Math.round((rank / total) * 100);

  return { rank, total, percentile };
}

// ============================================================================
// State Rankings
// ============================================================================

export interface StateRanking {
  stateAbbr: string;
  stateName: string;
  medianRatio: number;
  medianIncome: number;
  medianHomeValue: number;
  cityCount: number;
  slug: string;
}

/**
 * Get all states ranked by median affordability score
 * Uses V2 composite score when available, falls back to ratio-based score
 * @returns Array of states ranked from most to least affordable (by median score)
 */
export async function getAllStatesRanked(): Promise<StateRanking[]> {
  // Get all latest snapshots for cities and V2 scores in parallel
  const [snapshots, v2Scores] = await Promise.all([
    prisma.metricSnapshot.findMany({
      where: {
        geoType: 'CITY',
        ratio: { not: null },
        income: { not: null },
        homeValue: { not: null },
      },
      orderBy: {
        asOfDate: 'desc',
      },
    }),
    prisma.v2AffordabilityScore.findMany({
      where: { geoType: 'CITY' },
      select: { geoId: true, compositeScore: true },
    }),
  ]);

  // Create V2 score lookup map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Get all cities
  const cities = await prisma.geoCity.findMany({
    select: {
      cityId: true,
      stateAbbr: true,
    },
  });

  // Get latest snapshot per city
  const cityIdSet = new Set(cities.map((c) => c.cityId));
  const latestByCity = new Map<string, typeof snapshots[0]>();

  for (const snapshot of snapshots) {
    if (cityIdSet.has(snapshot.geoId) && !latestByCity.has(snapshot.geoId)) {
      latestByCity.set(snapshot.geoId, snapshot);
    }
  }

  // Group metrics by state, calculating composite score for each city
  const metricsByState = new Map<string, { scores: number[], incomes: number[], homeValues: number[], ratios: number[] }>();
  for (const city of cities) {
    const snapshot = latestByCity.get(city.cityId);
    if (snapshot?.ratio && snapshot?.income && snapshot?.homeValue) {
      if (!metricsByState.has(city.stateAbbr)) {
        metricsByState.set(city.stateAbbr, { scores: [], incomes: [], homeValues: [], ratios: [] });
      }
      const metrics = metricsByState.get(city.stateAbbr)!;

      // Use V2 composite score if available, otherwise use ratio-based score
      const v2Score = v2ScoreMap.get(city.cityId);
      const affordabilityScore = v2Score ?? (100 - snapshot.ratio);

      metrics.scores.push(affordabilityScore);
      metrics.incomes.push(snapshot.income);
      metrics.homeValues.push(snapshot.homeValue);
      metrics.ratios.push(snapshot.ratio);
    }
  }

  // Helper function to calculate median
  const calculateMedian = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  // Calculate median values for each state
  const stateRankingsWithScore: Array<StateRanking & { medianScore: number }> = [];

  for (const [stateAbbr, metrics] of metricsByState.entries()) {
    if (metrics.scores.length === 0) continue;

    const medianScore = calculateMedian(metrics.scores);
    const medianIncome = calculateMedian(metrics.incomes);
    const medianHomeValue = calculateMedian(metrics.homeValues);
    const medianRatio = calculateMedian(metrics.ratios);

    // Get state info
    const state = stateFromAbbr(stateAbbr);
    if (!state) continue;

    stateRankingsWithScore.push({
      stateAbbr,
      stateName: state.name,
      medianRatio, // Keep for backward compatibility
      medianIncome,
      medianHomeValue,
      cityCount: metrics.scores.length,
      slug: state.slug,
      medianScore, // Temporary field for sorting
    });
  }

  // Sort by median composite score (higher score = more affordable)
  stateRankingsWithScore.sort((a, b) => b.medianScore - a.medianScore);

  // Remove the temporary medianScore field
  return stateRankingsWithScore.map(({ medianScore, ...ranking }) => ranking);
}

/**
 * Get comprehensive dashboard data for a state page
 * @param stateSlug - State slug from URL (e.g., "maine")
 * @returns Dashboard data with state medians, US medians, and top/bottom rankings
 *
 * Uses Postgres window/CTE logic on latest snapshots (no in-memory sorting)
 */
export async function getStateDashboardData(stateSlug: string): Promise<StateDashboardData | null> {
  // Resolve state from slug
  const state = stateFromSlug(stateSlug);
  if (!state) {
    return null;
  }

  // Get state medians for cities using existing helper
  const cityMedians = await getStateMedians(state.abbr);

  // Get state medians for ZIPs using SQL percentile_cont
  const zipMediansResult = await prisma.$queryRaw<Array<{
    ratio_median: number | null;
    home_value_median: number | null;
    income_median: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate"
      FROM metric_snapshot
      WHERE "geoType" = 'ZCTA'
        AND ratio IS NOT NULL
        AND "homeValue" IS NOT NULL
        AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    ),
    scoped AS (
      SELECT l.*
      FROM latest l
      JOIN geo_zcta gz ON gz.zcta = l."geoId"
      WHERE gz."stateAbbr" = ${state.abbr}
    )
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
    FROM scoped;
  `;

  const zipMedians = {
    ratio: zipMediansResult[0]?.ratio_median ? Math.round(zipMediansResult[0].ratio_median * 100) / 100 : null,
    homeValue: zipMediansResult[0]?.home_value_median ? Math.round(zipMediansResult[0].home_value_median) : null,
    income: zipMediansResult[0]?.income_median ? Math.round(zipMediansResult[0].income_median) : null,
  };

  // Get US medians for cities and ZIPs
  const usCityMedians = await getUSMedians();

  const usZipMediansResult = await prisma.$queryRaw<Array<{
    ratio_median: number | null;
    home_value_median: number | null;
    income_median: number | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate"
      FROM metric_snapshot
      WHERE "geoType" = 'ZCTA'
        AND ratio IS NOT NULL
        AND "homeValue" IS NOT NULL
        AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
    FROM latest;
  `;

  const usZipMedians = {
    ratio: usZipMediansResult[0]?.ratio_median ? Math.round(usZipMediansResult[0].ratio_median * 100) / 100 : null,
    homeValue: usZipMediansResult[0]?.home_value_median ? Math.round(usZipMediansResult[0].home_value_median) : null,
    income: usZipMediansResult[0]?.income_median ? Math.round(usZipMediansResult[0].income_median) : null,
  };

  // Get last updated date (max asOfDate among state snapshots)
  const lastUpdatedResult = await prisma.$queryRaw<Array<{ max_date: Date | null }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", "asOfDate"
      FROM metric_snapshot
      WHERE ("geoType" = 'CITY' OR "geoType" = 'ZCTA')
        AND ratio IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT MAX(l."asOfDate") as max_date
    FROM latest l
    LEFT JOIN geo_city gc ON gc."cityId" = l."geoId"
    LEFT JOIN geo_zcta gz ON gz.zcta = l."geoId"
    WHERE gc."stateAbbr" = ${state.abbr} OR gz."stateAbbr" = ${state.abbr};
  `;

  const lastUpdated = lastUpdatedResult[0]?.max_date || null;

  // Use getStateTopCities for consistent V2 score handling
  // Get more cities than needed, then filter by population buckets
  const [allAffordable, allExpensive] = await Promise.all([
    getStateTopCities(state.abbr, 500, true),  // most affordable
    getStateTopCities(state.abbr, 500, false), // least affordable
  ]);

  // Filter by population buckets and take top 12 from each
  const topCitiesAffordable = allAffordable
    .filter(c => (c.population ?? 0) >= 50000)
    .slice(0, 12);

  const topSmallCitiesAffordable = allAffordable
    .filter(c => (c.population ?? 0) >= 10000 && (c.population ?? 0) < 50000)
    .slice(0, 12);

  const topTownsAffordable = allAffordable
    .filter(c => (c.population ?? 0) < 10000)
    .slice(0, 12);

  const topCitiesExpensive = allExpensive
    .filter(c => (c.population ?? 0) >= 50000)
    .slice(0, 12);

  const topSmallCitiesExpensive = allExpensive
    .filter(c => (c.population ?? 0) >= 10000 && (c.population ?? 0) < 50000)
    .slice(0, 12);

  const topTownsExpensive = allExpensive
    .filter(c => (c.population ?? 0) < 10000)
    .slice(0, 12);

  // Get top 20 cities by earning power (income/homeValue)
  const topCitiesEarningPowerData = await prisma.$queryRaw<Array<{
    cityId: string;
    name: string;
    stateAbbr: string;
    stateName: string | null;
    countyName: string | null;
    metro: string | null;
    slug: string;
    population: number | null;
    ratio: number | null;
    homeValue: number | null;
    income: number | null;
    asOfDate: Date;
    sources: string | null;
    earningPower: number;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY'
        AND ratio IS NOT NULL
        AND "homeValue" IS NOT NULL
        AND "homeValue" > 0
        AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT
      gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
      gc.metro, gc.slug, gc.population,
      l.ratio, l."homeValue", l.income, l."asOfDate", l.sources,
      (l.income::float / l."homeValue"::float) as "earningPower"
    FROM latest l
    JOIN geo_city gc ON gc."cityId" = l."geoId"
    WHERE gc."stateAbbr" = ${state.abbr}
    ORDER BY "earningPower" DESC
    LIMIT 20;
  `;

  const topCitiesEarningPower: CityWithMetrics[] = topCitiesEarningPowerData.map((row) => ({
    cityId: row.cityId,
    name: row.name,
    stateAbbr: row.stateAbbr,
    stateName: row.stateName,
    countyName: row.countyName,
    metro: row.metro,
    slug: row.slug,
    population: row.population,
    metrics: {
      ratio: row.ratio,
      homeValue: row.homeValue,
      income: row.income,
      earningPower: row.earningPower,
      asOfDate: row.asOfDate,
      sources: row.sources,
    },
  }));

  // Get top 20 most affordable ZIPs
  const topZipsAffordableData = await prisma.$queryRaw<Array<{
    zcta: string;
    stateAbbr: string | null;
    city: string | null;
    metro: string | null;
    countyName: string | null;
    population: number | null;
    ratio: number | null;
    homeValue: number | null;
    income: number | null;
    asOfDate: Date;
    sources: string | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'ZCTA'
        AND ratio IS NOT NULL
        AND "homeValue" IS NOT NULL
        AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT
      gz.zcta, gz."stateAbbr", gz.city, gz.metro, gz."countyName", gz.population,
      l.ratio, l."homeValue", l.income, l."asOfDate", l.sources
    FROM latest l
    JOIN geo_zcta gz ON gz.zcta = l."geoId"
    WHERE gz."stateAbbr" = ${state.abbr}
    ORDER BY l.ratio ASC
    LIMIT 20;
  `;

  const topZipsAffordable: ZctaWithMetrics[] = topZipsAffordableData.map((row) => ({
    zcta: row.zcta,
    stateAbbr: row.stateAbbr,
    city: row.city,
    metro: row.metro,
    countyName: row.countyName,
    population: row.population,
    latitude: null,
    longitude: null,
    metrics: {
      ratio: row.ratio,
      homeValue: row.homeValue,
      income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate,
      sources: row.sources,
    },
  }));

  // Get top 20 least affordable ZIPs
  const topZipsExpensiveData = await prisma.$queryRaw<Array<{
    zcta: string;
    stateAbbr: string | null;
    city: string | null;
    metro: string | null;
    countyName: string | null;
    population: number | null;
    ratio: number | null;
    homeValue: number | null;
    income: number | null;
    asOfDate: Date;
    sources: string | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'ZCTA'
        AND ratio IS NOT NULL
        AND "homeValue" IS NOT NULL
        AND income IS NOT NULL
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT
      gz.zcta, gz."stateAbbr", gz.city, gz.metro, gz."countyName", gz.population,
      l.ratio, l."homeValue", l.income, l."asOfDate", l.sources
    FROM latest l
    JOIN geo_zcta gz ON gz.zcta = l."geoId"
    WHERE gz."stateAbbr" = ${state.abbr}
    ORDER BY l.ratio DESC
    LIMIT 20;
  `;

  const topZipsExpensive: ZctaWithMetrics[] = topZipsExpensiveData.map((row) => ({
    zcta: row.zcta,
    stateAbbr: row.stateAbbr,
    city: row.city,
    metro: row.metro,
    countyName: row.countyName,
    population: row.population,
    latitude: null,
    longitude: null,
    metrics: {
      ratio: row.ratio,
      homeValue: row.homeValue,
      income: row.income,
      earningPower: row.homeValue && row.homeValue > 0 ? (row.income || 0) / row.homeValue : null,
      asOfDate: row.asOfDate,
      sources: row.sources,
    },
  }));

  return {
    state,
    lastUpdated,
    cityMedians,
    zipMedians,
    usCityMedians,
    usZipMedians,
    topCitiesAffordable,
    topCitiesExpensive,
    topSmallCitiesAffordable,
    topSmallCitiesExpensive,
    topTownsAffordable,
    topTownsExpensive,
    topZipsAffordable,
    topZipsExpensive,
    topCitiesEarningPower,
  };
}

// ============================================================================
// ACS (American Community Survey) Data Access
// ============================================================================

/**
 * Fetch ACS demographic snapshot for a geography
 *
 * @param geoType - Geography type (CITY, ZCTA)
 * @param geoId - Geography identifier
 * @returns ACS snapshot data or null if not available
 */
export async function getAcsSnapshot(
  geoType: 'CITY' | 'ZCTA',
  geoId: string
) {
  const snapshot = await prisma.acsSnapshot.findFirst({
    where: {
      geoType,
      geoId,
    },
    orderBy: {
      asOfYear: 'desc', // Get most recent data
    },
  });

  return snapshot;
}

/**
 * Calculate coefficient of variation (CV) for an ACS estimate
 * CV = (MOE / 1.645) / estimate
 *
 * @param estimate - The estimate value
 * @param moe - Margin of error
 * @returns CV as a decimal (e.g., 0.15 = 15% CV), or Infinity if estimate is 0
 */
export function calculateCv(estimate: number | null, moe: number | null): number {
  if (estimate === null || moe === null || estimate === 0) {
    return Infinity;
  }
  return (moe / 1.645) / Math.abs(estimate);
}

/**
 * Determine if demographics section should be shown based on data quality
 * Uses CV (coefficient of variation) thresholds to filter unreliable data
 *
 * @param acsData - ACS snapshot data
 * @returns true if at least 2 of 3 metrics pass CV < 30% threshold
 */
export function shouldShowDemographics(
  acsData: {
    medianRent: number | null;
    medianRentMoe: number | null;
    housingBurdenPct: number | null;
    housingBurdenPctMoe: number | null;
    povertyRatePct: number | null;
    povertyRatePctMoe: number | null;
  } | null
): boolean {
  if (!acsData) return false;

  // Calculate CVs
  const rentCv = calculateCv(acsData.medianRent, acsData.medianRentMoe);
  const burdenCv = calculateCv(acsData.housingBurdenPct, acsData.housingBurdenPctMoe);
  const povertyCv = calculateCv(acsData.povertyRatePct, acsData.povertyRatePctMoe);

  // Count how many metrics pass the 30% CV threshold
  const passingMetrics = [
    rentCv < 0.30,
    burdenCv < 0.30,
    povertyCv < 0.30,
  ].filter(Boolean).length;

  // Show if at least 2 of 3 metrics are reliable
  return passingMetrics >= 2;
}

// ============================================================================
// County Data Functions
// ============================================================================

/**
 * County data interface
 */
export interface CountyData {
  countyName: string;
  stateAbbr: string;
  stateFips: string;
  countyFips: string | null;
  population: number | null;
}

/**
 * County with metrics interface
 */
export interface CountyWithMetrics extends CountyData {
  metrics: MetricData | null;
}

/**
 * County dashboard data - aggregates all data needed for county page
 */
export interface CountyDashboardData {
  county: CountyWithMetrics | null;
  cities: CityWithMetrics[];
  zips: ZctaWithMetrics[];
  benchmarks: BenchmarkRow[];
  topCitiesAffordable: CityWithMetrics[];
  topCitiesExpensive: CityWithMetrics[];
  snapshot: {
    propertyTaxRate: number | null;
  } | null;
}

/**
 * Get all unique counties in a state
 */
export async function getCountiesByState(stateAbbr: string): Promise<CountyData[]> {
  const counties = await prisma.$queryRaw<Array<{
    countyName: string;
    stateAbbr: string;
    stateFips: string;
    countyFips: string | null;
    population: number | null;
  }>>`
    SELECT DISTINCT
      gc."countyName",
      gc."stateAbbr",
      gp."stateFips",
      gc."countyFips",
      SUM(gc.population) as population
    FROM geo_city gc
    LEFT JOIN geo_place gp ON gp."stateAbbr" = gc."stateAbbr"
    WHERE gc."stateAbbr" = ${stateAbbr.toUpperCase()}
      AND gc."countyName" IS NOT NULL
    GROUP BY gc."countyName", gc."stateAbbr", gp."stateFips", gc."countyFips"
    ORDER BY gc."countyName"
  `;

  return counties;
}

/**
 * Get county by state slug and county name slug
 */
export async function getCountyByStateAndSlug(
  stateSlug: string,
  countySlug: string
): Promise<CountyWithMetrics | null> {
  const state = stateFromSlug(stateSlug);
  if (!state) {
    return null;
  }

  // Get all counties in the state
  const counties = await getCountiesByState(state.abbr);

  // Find matching county by slug
  const county = counties.find((c) => slugify(c.countyName) === countySlug);

  if (!county) {
    return null;
  }

  // County pages don't have direct metrics in the database yet
  // Return county with null metrics
  return {
    ...county,
    metrics: null,
  };
}

/**
 * Get cities within a county
 */
export async function getCitiesByCounty(
  stateAbbr: string,
  countyName: string
): Promise<CityWithMetrics[]> {
  const citiesData = await prisma.$queryRaw<Array<{
    cityId: string;
    name: string;
    stateAbbr: string;
    stateName: string | null;
    countyName: string | null;
    metro: string | null;
    slug: string;
    population: number | null;
    ratio: number | null;
    homeValue: number | null;
    income: number | null;
    earningPower: number | null;
    asOfDate: Date | null;
    sources: string | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "earningPower", "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'CITY'
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT
      gc."cityId", gc.name, gc."stateAbbr", gc."stateName", gc."countyName",
      gc.metro, gc.slug, gc.population,
      l.ratio, l."homeValue", l.income, l."earningPower", l."asOfDate", l.sources
    FROM geo_city gc
    LEFT JOIN latest l ON l."geoId" = gc."cityId"
    WHERE gc."stateAbbr" = ${stateAbbr.toUpperCase()}
      AND gc."countyName" = ${countyName}
    ORDER BY gc.population DESC NULLS LAST, gc.name
  `;

  return citiesData.map((row) => ({
    cityId: row.cityId,
    name: row.name,
    stateAbbr: row.stateAbbr,
    stateName: row.stateName,
    countyName: row.countyName,
    metro: row.metro,
    slug: row.slug,
    population: row.population,
    metrics: row.ratio !== null ? {
      ratio: row.ratio,
      homeValue: row.homeValue,
      income: row.income,
      earningPower: row.earningPower,
      asOfDate: row.asOfDate ?? new Date(),
      sources: row.sources,
    } : null,
  }));
}

/**
 * Get ZIP codes within a county
 */
export async function getZipsByCounty(
  stateAbbr: string,
  countyName: string
): Promise<ZctaWithMetrics[]> {
  const zipsData = await prisma.$queryRaw<Array<{
    zcta: string;
    stateAbbr: string | null;
    city: string | null;
    metro: string | null;
    countyName: string | null;
    population: number | null;
    ratio: number | null;
    homeValue: number | null;
    income: number | null;
    earningPower: number | null;
    asOfDate: Date | null;
    sources: string | null;
  }>>`
    WITH latest AS (
      SELECT DISTINCT ON ("geoType", "geoId")
        "geoId", ratio, "homeValue", income, "earningPower", "asOfDate", sources
      FROM metric_snapshot
      WHERE "geoType" = 'ZCTA'
      ORDER BY "geoType", "geoId", "asOfDate" DESC
    )
    SELECT
      gz.zcta, gz."stateAbbr", gz.city, gz.metro, gz."countyName", gz.population,
      l.ratio, l."homeValue", l.income, l."earningPower", l."asOfDate", l.sources
    FROM geo_zcta gz
    LEFT JOIN latest l ON l."geoId" = gz.zcta
    WHERE gz."stateAbbr" = ${stateAbbr.toUpperCase()}
      AND gz."countyName" = ${countyName}
    ORDER BY gz.population DESC NULLS LAST, gz.zcta
  `;

  return zipsData.map((row) => ({
    zcta: row.zcta,
    stateAbbr: row.stateAbbr,
    city: row.city,
    metro: row.metro,
    countyName: row.countyName,
    population: row.population,
    latitude: null,
    longitude: null,
    metrics: row.ratio !== null ? {
      ratio: row.ratio,
      homeValue: row.homeValue,
      income: row.income,
      earningPower: row.earningPower,
      asOfDate: row.asOfDate ?? new Date(),
      sources: row.sources,
    } : null,
  }));
}

/**
 * Get county dashboard data - aggregates all data needed for county page
 */
export async function getCountyDashboardData(
  stateSlug: string,
  countySlug: string
): Promise<CountyDashboardData> {
  const state = stateFromSlug(stateSlug);
  if (!state) {
    return {
      county: null,
      cities: [],
      zips: [],
      benchmarks: [],
      topCitiesAffordable: [],
      topCitiesExpensive: [],
      snapshot: null,
    };
  }

  // Get county data
  const county = await getCountyByStateAndSlug(stateSlug, countySlug);

  if (!county) {
    return {
      county: null,
      cities: [],
      zips: [],
      benchmarks: [],
      topCitiesAffordable: [],
      topCitiesExpensive: [],
      snapshot: null,
    };
  }

  // Get cities and ZIPs in the county
  const [cities, zips] = await Promise.all([
    getCitiesByCounty(state.abbr, county.countyName),
    getZipsByCounty(state.abbr, county.countyName),
  ]);

  // Calculate county-level aggregates from cities
  const citiesWithMetrics = cities.filter((c) => c.metrics !== null);
  const countyMetrics = citiesWithMetrics.length > 0 ? {
    // Weighted average by population
    ratio: citiesWithMetrics.reduce((sum, c) => sum + (c.metrics?.ratio || 0) * (c.population || 1), 0) /
           citiesWithMetrics.reduce((sum, c) => sum + (c.population || 1), 0),
    homeValue: citiesWithMetrics.reduce((sum, c) => sum + (c.metrics?.homeValue || 0) * (c.population || 1), 0) /
               citiesWithMetrics.reduce((sum, c) => sum + (c.population || 1), 0),
    income: citiesWithMetrics.reduce((sum, c) => sum + (c.metrics?.income || 0) * (c.population || 1), 0) /
            citiesWithMetrics.reduce((sum, c) => sum + (c.population || 1), 0),
    earningPower: null,
    asOfDate: citiesWithMetrics[0]?.metrics?.asOfDate ?? new Date(),
    sources: citiesWithMetrics[0]?.metrics?.sources || null,
  } : null;

  // Build benchmarks
  const benchmarks: BenchmarkRow[] = [];

  // Add county average if available
  if (countyMetrics) {
    benchmarks.push({
      label: `${county.countyName} County Avg`,
      ratio: countyMetrics.ratio,
      homeValue: countyMetrics.homeValue,
      income: countyMetrics.income,
    });
  }

  // Add state average
  const stateMedians = getStateFallbackMedians(state.abbr);
  if (stateMedians && stateMedians.homeValue && stateMedians.income) {
    benchmarks.push({
      label: `${state.name} Average`,
      ratio: stateMedians.homeValue / stateMedians.income,
      homeValue: stateMedians.homeValue,
      income: stateMedians.income,
    });
  }

  // Add national average
  if (NATIONAL_MEDIANS.homeValue && NATIONAL_MEDIANS.income) {
    benchmarks.push({
      label: 'National Average',
      ratio: NATIONAL_MEDIANS.homeValue / NATIONAL_MEDIANS.income,
      homeValue: NATIONAL_MEDIANS.homeValue,
      income: NATIONAL_MEDIANS.income,
    });
  }

  // Get top affordable/expensive cities in the county
  const topCitiesAffordable = cities
    .filter((c) => c.metrics !== null && c.metrics.ratio !== null)
    .sort((a, b) => (a.metrics?.ratio || 0) - (b.metrics?.ratio || 0))
    .slice(0, 10);

  const topCitiesExpensive = cities
    .filter((c) => c.metrics !== null && c.metrics.ratio !== null)
    .sort((a, b) => (b.metrics?.ratio || 0) - (a.metrics?.ratio || 0))
    .slice(0, 10);

  // Get property tax rate snapshot (if available for any city in county)
  let propertyTaxRate = null;
  if (cities.length > 0) {
    try {
      const taxData = await prisma.propertyTaxRate.findFirst({
        where: {
          geoType: 'CITY',
          geoId: cities[0].cityId,
        },
        orderBy: {
          asOfYear: 'desc',
        },
      });
      propertyTaxRate = taxData?.effectiveRate ?? null;
    } catch (error) {
      console.error('Failed to fetch property tax rate:', error);
    }
  }

  return {
    county: {
      ...county,
      metrics: countyMetrics,
    },
    cities,
    zips,
    benchmarks,
    topCitiesAffordable,
    topCitiesExpensive,
    snapshot: {
      propertyTaxRate,
    },
  };
}
