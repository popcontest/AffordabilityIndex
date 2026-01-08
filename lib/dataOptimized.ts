/**
 * Optimized data access layer with caching and batch loading
 *
 * This module provides optimized versions of critical queries from data.ts:
 * - In-memory caching with TTL
 * - Batch loading to eliminate N+1 queries
 * - Materialized views for expensive aggregates
 * - Query result caching
 */

import { prisma } from './prisma';
import { cache, CacheKeys, CacheTTL } from './cache';
import type { GeoType, MetricData, CityWithMetrics, ZctaWithMetrics } from './data';

// ============================================================================
// Batch Loading Utilities (Eliminates N+1 Queries)
// ============================================================================

/**
 * Batch load latest snapshots for multiple geographies at once
 * This replaces individual getLatestSnapshot() calls in loops
 *
 * @param geoType - Geography type
 * @param geoIds - Array of geography IDs
 * @returns Map of geoId -> MetricData
 */
export async function batchGetLatestSnapshots(
  geoType: GeoType,
  geoIds: string[]
): Promise<Map<string, MetricData>> {
  if (geoIds.length === 0) {
    return new Map();
  }

  // Check cache first for each ID
  const cachedResults = new Map<string, MetricData>();
  const uncachedIds: string[] = [];

  for (const geoId of geoIds) {
    const cached = cache.get<MetricData>(
      CacheKeys.latestSnapshot(geoType, geoId)
    );
    if (cached) {
      cachedResults.set(geoId, cached);
    } else {
      uncachedIds.push(geoId);
    }
  }

  // If all cached, return early
  if (uncachedIds.length === 0) {
    return cachedResults;
  }

  // Batch query for uncached IDs using the materialized view
  const snapshots = await prisma.$queryRaw<Array<{
    geo_id: string;
    as_of_date: Date;
    home_value: number | null;
    income: number | null;
    ratio: number | null;
  }>>`
    SELECT "geoId", "asOfDate", "homeValue", income, ratio
    FROM latest_metric_snapshot
    WHERE "geoType" = ${geoType}
      AND "geoId" = ANY(${uncachedIds})
  `;

  // Batch fetch V2 scores for all uncached IDs
  const v2Scores = await prisma.v2AffordabilityScore.findMany({
    where: {
      geoType,
      geoId: { in: uncachedIds },
    },
    select: {
      geoId: true,
      compositeScore: true,
    },
  });

  // Create V2 score map
  const v2ScoreMap = new Map<string, number>();
  for (const score of v2Scores) {
    v2ScoreMap.set(score.geoId, score.compositeScore);
  }

  // Process results and cache them
  for (const snapshot of snapshots) {
    const earningPower =
      snapshot.home_value && snapshot.home_value > 0
        ? (snapshot.income || 0) / snapshot.home_value
        : null;

    const affordabilityPercentile = v2ScoreMap.get(snapshot.geo_id) ?? null;

    const metricData: MetricData = {
      homeValue: snapshot.home_value,
      income: snapshot.income,
      ratio: snapshot.ratio,
      earningPower,
      asOfDate: snapshot.as_of_date,
      sources: null,
      affordabilityPercentile,
    };

    // Cache individual result
    cache.set(
      CacheKeys.latestSnapshot(geoType, snapshot.geo_id),
      metricData,
      CacheTTL.SNAPSHOT
    );

    cachedResults.set(snapshot.geo_id, metricData);
  }

  // Fill in nulls for IDs with no data
  for (const geoId of uncachedIds) {
    if (!cachedResults.has(geoId)) {
      cachedResults.set(geoId, null as unknown as MetricData);
    }
  }

  return cachedResults;
}

/**
 * Batch load V2 scores for multiple geographies
 * @param geoType - Geography type
 * @param geoIds - Array of geography IDs
 * @returns Map of geoId -> compositeScore
 */
export async function batchGetV2Scores(
  geoType: GeoType,
  geoIds: string[]
): Promise<Map<string, number | null>> {
  if (geoIds.length === 0) {
    return new Map();
  }

  // Check cache first
  const results = new Map<string, number | null>();
  const uncachedIds: string[] = [];

  for (const geoId of geoIds) {
    const cached = cache.get<number>(CacheKeys.v2Score(geoType, geoId));
    if (cached !== undefined) {
      results.set(geoId, cached);
    } else {
      uncachedIds.push(geoId);
    }
  }

  if (uncachedIds.length === 0) {
    return results;
  }

  // Batch query
  const scores = await prisma.v2AffordabilityScore.findMany({
    where: {
      geoType,
      geoId: { in: uncachedIds },
    },
    select: {
      geoId: true,
      compositeScore: true,
    },
  });

  // Process and cache
  const scoreMap = new Map<string, number>();
  for (const score of scores) {
    scoreMap.set(score.geoId, score.compositeScore);
    results.set(score.geoId, score.compositeScore);
    cache.set(
      CacheKeys.v2Score(geoType, score.geoId),
      score.compositeScore,
      CacheTTL.SNAPSHOT
    );
  }

  // Fill in nulls
  for (const geoId of uncachedIds) {
    if (!scoreMap.has(geoId)) {
      results.set(geoId, null);
    }
  }

  return results;
}

// ============================================================================
// Optimized Geography Lookups (with Caching)
// ============================================================================

/**
 * Get city by ID with caching
 */
export async function getCityByIdOptimized(cityId: string): Promise<CityWithMetrics | null> {
  return cache.getOrCompute(
    CacheKeys.cityById(cityId),
    async () => {
      const city = await prisma.geoCity.findUnique({
        where: { cityId },
      });

      if (!city) {
        return null;
      }

      // Use batch loader (single item)
      const snapshotMap = await batchGetLatestSnapshots('CITY', [cityId]);
      const snapshot = snapshotMap.get(cityId);

      return {
        cityId: city.cityId,
        name: city.name,
        stateAbbr: city.stateAbbr,
        stateName: city.stateName,
        countyName: city.countyName,
        metro: city.metro,
        slug: city.slug,
        population: city.population,
        metrics: snapshot ?? null,
      };
    },
    CacheTTL.GEOGRAPHY
  );
}

/**
 * Get cities by state and slug with caching
 */
export async function getCitiesByStateAndSlugOptimized(
  stateAbbr: string,
  citySlug: string
): Promise<CityWithMetrics[]> {
  return cache.getOrCompute(
    CacheKeys.cityByStateAndSlug(stateAbbr, citySlug),
    async () => {
      const cities = await prisma.geoCity.findMany({
        where: {
          stateAbbr: stateAbbr.toUpperCase(),
          slug: citySlug,
        },
      });

      if (cities.length === 0) {
        return [];
      }

      // Batch load all snapshots at once
      const cityIds = cities.map((c) => c.cityId);
      const snapshotMap = await batchGetLatestSnapshots('CITY', cityIds);

      return cities.map((city) => ({
        cityId: city.cityId,
        name: city.name,
        stateAbbr: city.stateAbbr,
        stateName: city.stateName,
        countyName: city.countyName,
        metro: city.metro,
        slug: city.slug,
        population: city.population,
        metrics: snapshotMap.get(city.cityId) ?? null,
      }));
    },
    CacheTTL.GEOGRAPHY
  );
}

/**
 * Get ZIP by code with caching
 */
export async function getZipByCodeOptimized(zip: string): Promise<ZctaWithMetrics | null> {
  return cache.getOrCompute(
    CacheKeys.zipByCode(zip),
    async () => {
      const zcta = await prisma.geoZcta.findUnique({
        where: { zcta: zip },
      });

      if (!zcta) {
        return null;
      }

      // Use batch loader
      const snapshotMap = await batchGetLatestSnapshots('ZCTA', [zip]);
      const snapshot = snapshotMap.get(zip);

      return {
        zcta: zcta.zcta,
        stateAbbr: zcta.stateAbbr,
        city: zcta.city,
        metro: zcta.metro,
        countyName: zcta.countyName,
        population: zcta.population,
        latitude: zcta.latitude,
        longitude: zcta.longitude,
        metrics: snapshot ?? null,
      };
    },
    CacheTTL.GEOGRAPHY
  );
}

// ============================================================================
// Optimized Ranking Queries (with Materialized Views)
// ============================================================================

/**
 * Get top cities by affordability using materialized view
 * This is much faster than the original query
 */
export async function getStateTopCitiesOptimized(
  stateAbbr: string,
  limit: number = 20,
  mostAffordable: boolean = true
): Promise<CityWithMetrics[]> {
  return cache.getOrCompute(
    CacheKeys.stateTopCities(stateAbbr, limit, mostAffordable),
    async () => {
      // Use materialized view directly
      const cities = await prisma.$queryRaw<Array<{
        city_id: string;
        name: string;
        state_abbr: string;
        state_name: string | null;
        county_name: string | null;
        metro: string | null;
        slug: string;
        population: number | null;
        as_of_date: Date;
        home_value: number | null;
        income: number | null;
        ratio: number;
      }>>`
        WITH ranked_cities AS (
          SELECT
            lc.*,
            DENSE_RANK() OVER (
              ORDER BY ratio ${mostAffordable ? 'ASC' : 'DESC'}
            ) AS rank
          FROM latest_city_snapshot lc
          WHERE "stateAbbr" = ${stateAbbr}
        )
        SELECT *
        FROM ranked_cities
        ORDER BY rank
        LIMIT ${limit * 2}
      `;

      // Batch load V2 scores
      const cityIds = cities.map((c) => c.city_id);
      const v2ScoreMap = await batchGetV2Scores('CITY', cityIds);

      // Transform to CityWithMetrics
      const results: CityWithMetrics[] = cities.map((city) => {
        const earningPower =
          city.home_value && city.home_value > 0
            ? (city.income || 0) / city.home_value
            : null;

        const affordabilityPercentile =
          v2ScoreMap.get(city.city_id) ?? null;

        return {
          cityId: city.city_id,
          name: city.name,
          stateAbbr: city.state_abbr,
          stateName: city.state_name,
          countyName: city.county_name,
          metro: city.metro,
          slug: city.slug,
          population: city.population,
          metrics: {
            homeValue: city.home_value,
            income: city.income,
            ratio: city.ratio,
            earningPower,
            asOfDate: city.as_of_date,
            sources: null,
            affordabilityPercentile,
          },
        };
      });

      // Sort by V2 score if available
      results.sort((a, b) => {
        const aScore = a.metrics?.affordabilityPercentile ??
          (a.metrics?.ratio !== null && a.metrics?.ratio !== undefined ? (100 - a.metrics.ratio) : -Infinity);
        const bScore = b.metrics?.affordabilityPercentile ??
          (b.metrics?.ratio !== null && b.metrics?.ratio !== undefined ? (100 - b.metrics.ratio) : -Infinity);

        return mostAffordable ? bScore - aScore : aScore - bScore;
      });

      return results.slice(0, limit);
    },
    CacheTTL.RANKING
  );
}

// ============================================================================
// Optimized Median Calculations (with Caching)
// ============================================================================>

/**
 * Compute state medians using materialized view (cached)
 */
export async function getStateMediansOptimized(stateAbbr: string): Promise<{
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}> {
  return cache.getOrCompute(
    CacheKeys.stateMedians(stateAbbr),
    async () => {
      const result = await prisma.$queryRaw<Array<{
        ratio_median: number | null;
        home_value_median: number | null;
        income_median: number | null;
      }>>`
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
        FROM latest_city_snapshot
        WHERE "stateAbbr" = ${stateAbbr}
      `;

      if (result.length === 0) {
        return { ratio: null, homeValue: null, income: null };
      }

      const row = result[0];
      return {
        ratio: row.ratio_median,
        homeValue: row.home_value_median ? Math.round(row.home_value_median) : null,
        income: row.income_median ? Math.round(row.income_median) : null,
      };
    },
    CacheTTL.MEDIAN
  );
}

/**
 * Compute US medians using materialized view (cached)
 */
export async function getUSMediansOptimized(): Promise<{
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}> {
  return cache.getOrCompute(
    CacheKeys.usMedians(),
    async () => {
      const result = await prisma.$queryRaw<Array<{
        ratio_median: number | null;
        home_value_median: number | null;
        income_median: number | null;
      }>>`
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY ratio) AS ratio_median,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "homeValue") AS home_value_median,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY income) AS income_median
        FROM latest_city_snapshot
      `;

      if (result.length === 0) {
        return { ratio: null, homeValue: null, income: null };
      }

      const row = result[0];
      return {
        ratio: row.ratio_median,
        homeValue: row.home_value_median ? Math.round(row.home_value_median) : null,
        income: row.income_median ? Math.round(row.income_median) : null,
      };
    },
    CacheTTL.MEDIAN
  );
}

// ============================================================================
// Cache Invalidation Utilities
// ============================================================================

/**
 * Invalidate all caches for a specific geography
 * Call this after updating data for a city/ZIP/place
 */
export function invalidateGeographyCache(geoType: GeoType, geoId: string): void {
  cache.delete(CacheKeys.latestSnapshot(geoType, geoId));
  cache.delete(CacheKeys.v2Score(geoType, geoId));

  // Invalidate rankings that might include this geography
  if (geoType === 'CITY') {
    // We'd need to look up the state to invalidate state-specific rankings
    // For now, invalidate all city rankings
    cache.invalidatePattern('top:cities:*');
  } else if (geoType === 'ZCTA') {
    cache.invalidatePattern('top:zips:*');
  }
}

/**
 * Invalidate all caches
 * Call this after bulk data imports
 */
export function invalidateAllCaches(): void {
  cache.clear();
}

/**
 * Refresh materialized views
 * Call this after updating metric_snapshot data
 */
export async function refreshMaterializedViews(): Promise<void> {
  await prisma.$executeRawUnsafe(`SELECT refresh_materialized_views()`);
}
