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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Required parameters
    const geoType = searchParams.get('geoType') as GeoType | null;
    const geoId = searchParams.get('geoId');

    // Optional parameters
    const householdType = (searchParams.get('householdType') || 'family') as HouseholdType;
    const income = searchParams.get('income') ? parseInt(searchParams.get('income')!) : undefined;

    // Set default children based on household type
    let numChildren = 0;
    let childAges: number[] | undefined = undefined;
    if (householdType === 'family') {
      numChildren = 2;
      childAges = [1, 3]; // Infant + toddler (most expensive)
    }

    // Validation
    if (!geoType || !geoId) {
      return NextResponse.json(
        { error: 'Missing required parameters: geoType and geoId' },
        { status: 400 }
      );
    }

    if (!['CITY', 'ZCTA'].includes(geoType)) {
      return NextResponse.json(
        { error: 'Invalid geoType. Must be CITY or ZCTA' },
        { status: 400 }
      );
    }

    if (!['single', 'couple', 'family', 'emptyNester', 'retiree', 'remoteWorker'].includes(householdType)) {
      return NextResponse.json(
        { error: 'Invalid householdType' },
        { status: 400 }
      );
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
    console.error('True Affordability API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
