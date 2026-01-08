/**
 * Rate limiting utilities for API routes
 *
 * Uses in-memory storage for development/testing.
 * For production, configure Upstash Redis or similar distributed cache.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Type for rate limit result
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Duration type for Upstash rate limiter
type Duration = `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d`;

// Create a rate limiter instance
// For production: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
function createRateLimiter(
  tokens: number,
  window: Duration
): Ratelimit {
  // Check if Upstash Redis is configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      analytics: true,
      prefix: 'affordability-index',
    });
  }

  // Fallback to in-memory for development (not production-ready)
  console.warn('Using in-memory rate limiter. Configure UPSTASH_REDIS_REST_URL for production.');
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    ephemeralCache: new Map(), // In-memory fallback
    prefix: 'affordability-index',
  });
}

// Predefined rate limiters for different endpoint types
export const rateLimiters = {
  // Strict rate limit for search endpoints (prevents scraping)
  search: createRateLimiter(10, '10 s'), // 10 requests per 10 seconds

  // Moderate rate limit for data endpoints
  data: createRateLimiter(30, '1 m'), // 30 requests per minute

  // Lenient rate limit for calculator endpoints
  calculator: createRateLimiter(20, '1 m'), // 20 requests per minute

  // Very lenient for health checks
  health: createRateLimiter(100, '1 m'), // 100 requests per minute
};

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param limiter - Rate limiter instance to use
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<RateLimitResult> {
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If rate limiting fails, log but allow request (fail-open)
    console.error('Rate limiting error:', error);
    return {
      success: true,
      limit: 100,
      remaining: 100,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Extract client IP address from request headers
 *
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIp(request: Request): string {
  // Check various headers for IP address (in order of preference)
  const headers = request.headers;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, use the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}
