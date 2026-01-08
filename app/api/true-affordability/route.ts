/**
 * True Affordability API Endpoint
 *
 * Calculates true affordability for a location by factoring in:
 * - Income tax
 * - Property tax
 * - Transportation costs
 * - Childcare costs
 * - Healthcare costs
 *
 * GET /api/true-affordability?geoType=CITY&geoId=123456&householdType=family
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTrueAffordability, HouseholdType } from '@/lib/trueAffordability';
import { GeoType } from '@prisma/client';
import { checkRateLimit, getClientIp, rateLimiters } from '@/lib/security/rateLimit';
import { validateQueryParams, TrueAffordabilityApiSchema } from '@/lib/security/validation';
import { logRateLimitExceeded, logInvalidInput, logApiError } from '@/lib/security/logger';

export async function GET(request: NextRequest) {
  // Get client IP for rate limiting and logging
  const ip = getClientIp(request);
  const endpoint = '/api/true-affordability';

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(ip, rateLimiters.calculator);
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

    const searchParams = request.nextUrl.searchParams;

    // Validate query parameters using Zod schema
    const validationResult = validateQueryParams(searchParams, TrueAffordabilityApiSchema);
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

    const { geoType, geoId, householdType, income } = validationResult.data;

    // Set default children based on household type
    let numChildren = 0;
    let childAges: number[] | undefined = undefined;
    if (householdType === 'family') {
      numChildren = 2;
      childAges = [1, 3]; // Infant + toddler (most expensive)
    }

    // Calculate True Affordability
    const result = await calculateTrueAffordability({
      geoType,
      geoId,
      householdType,
      annualIncome: income,
      numChildren,
      childAges,
    });

    // Return result
    return NextResponse.json({
      success: true,
      data: {
        geoType,
        geoId,
        householdType,
        ...result,
      },
    });

  } catch (error: any) {
    logApiError({
      ip,
      endpoint,
      error: error instanceof Error ? error : String(error),
      context: { geoType: request.nextUrl.searchParams.get('geoType'), geoId: request.nextUrl.searchParams.get('geoId') },
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
