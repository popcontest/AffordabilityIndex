/**
 * In-memory caching layer for expensive database queries
 *
 * This provides a simple LRU cache with TTL support to reduce database load.
 * For production, consider upgrading to Redis for distributed caching.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 1000 * 60 * 60; // 1 hour default

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific cache entry
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or compute a value (cache-aside pattern)
   * @param key - Cache key
   * @param fn - Function to compute value if not in cache
   * @param ttl - Time to live in milliseconds
   * @returns Cached or computed value
   */
  async getOrCompute<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match (supports wildcards with *)
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const cache = new Cache();

/**
 * Cache key generators for common patterns
 */
export const CacheKeys = {
  // Latest snapshot for a geography
  latestSnapshot: (geoType: string, geoId: string) =>
    `snapshot:latest:${geoType}:${geoId}`,

  // City by ID
  cityById: (cityId: string) => `city:byId:${cityId}`,

  // City by state and slug
  cityByStateAndSlug: (stateAbbr: string, slug: string) =>
    `city:byStateSlug:${stateAbbr}:${slug}`,

  // ZIP by code
  zipByCode: (zip: string) => `zip:byCode:${zip}`,

  // Place by state and slug
  placeByStateAndSlug: (stateAbbr: string, slug: string) =>
    `place:byStateSlug:${stateAbbr}:${slug}`,

  // State medians
  stateMedians: (stateAbbr: string) => `medians:state:${stateAbbr}`,

  // US medians
  usMedians: () => `medians:us`,

  // City affordability rank
  cityRank: (cityId: string) => `rank:city:${cityId}`,

  // ZCTA affordability rank
  zctaRank: (zcta: string) => `rank:zcta:${zcta}`,

  // State top cities
  stateTopCities: (stateAbbr: string, limit: number, mostAffordable: boolean) =>
    `top:cities:${stateAbbr}:${limit}:${mostAffordable}`,

  // State top ZIPs
  stateTopZips: (stateAbbr: string | null, limit: number, mostAffordable: boolean) =>
    `top:zips:${stateAbbr || 'all'}:${limit}:${mostAffordable}`,

  // All city ratios (for percentile calculations)
  allCityRatiosNational: () => `ratios:cities:national`,
  allCityRatiosState: (stateAbbr: string) => `ratios:cities:state:${stateAbbr}`,

  // Search results
  search: (query: string, limit: number) => `search:${query}:${limit}`,

  // V2 score
  v2Score: (geoType: string, geoId: string) => `v2:score:${geoType}:${geoId}`,
};

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  // Snapshot data - changes monthly, cache for 1 hour
  SNAPSHOT: 1000 * 60 * 60,

  // Rankings - expensive to compute, cache for 1 hour
  RANKING: 1000 * 60 * 60,

  // Geography lookups - rarely change, cache for 24 hours
  GEOGRAPHY: 1000 * 60 * 60 * 24,

  // Medians - expensive to compute, cache for 1 hour
  MEDIAN: 1000 * 60 * 60,

  // Search results - cache for 15 minutes
  SEARCH: 1000 * 60 * 15,

  // Percentile data - expensive, cache for 1 hour
  PERCENTILE: 1000 * 60 * 60,
};
