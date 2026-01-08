import { NextResponse } from 'next/server';
import { getCityByStateAndSlug } from '@/lib/data';
import { checkRateLimit, getClientIp, rateLimiters } from '@/lib/security/rateLimit';
import { validateQueryParams, DebugCityApiSchema } from '@/lib/security/validation';
import { logRateLimitExceeded, logInvalidInput, logApiError } from '@/lib/security/logger';

export async function GET(request: Request) {
  // Get client IP for rate limiting and logging
  const ip = getClientIp(request);
  const endpoint = '/api/debug-city';

  try {
    // Rate limiting (more lenient for debug endpoint)
    const rateLimitResult = await checkRateLimit(ip, rateLimiters.data);
    if (!rateLimitResult.success) {
      logRateLimitExceeded({
        ip,
        endpoint,
        limit: rateLimitResult.limit,
      });

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
            'Retry-After': '60',
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = validateQueryParams(searchParams, DebugCityApiSchema);
    if (!validationResult.success) {
      logInvalidInput({
        ip,
        endpoint,
        field: 'query',
        value: Object.fromEntries(searchParams.entries()),
        reason: validationResult.error,
      });

      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { state, slug } = validationResult.data;

    const cities = await getCityByStateAndSlug(state, slug);

    return NextResponse.json({
      success: true,
      state,
      slug,
      foundCities: cities.length,
      cities: cities.map(c => ({
        cityId: c.cityId,
        name: c.name,
        stateAbbr: c.stateAbbr,
        slug: c.slug,
        population: c.population,
        hasMetrics: c.metrics !== null,
        metrics: c.metrics ? {
          homeValue: c.metrics.homeValue,
          income: c.metrics.income,
          ratio: c.metrics.ratio
        } : null
      }))
    });
  } catch (error) {
    const { searchParams } = new URL(request.url);
    logApiError({
      ip,
      endpoint,
      error: error instanceof Error ? error : String(error),
      context: { state: searchParams.get('state'), slug: searchParams.get('slug') },
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
