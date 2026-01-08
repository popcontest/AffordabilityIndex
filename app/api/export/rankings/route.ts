/**
 * API Route: Export rankings as CSV
 * GET /api/export/rankings?geoType=ZCTA&state=CA&limit=1000
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCsv } from '@/lib/export';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const geoType = searchParams.get('geoType') as 'ZCTA' | 'CITY' | 'PLACE' || 'ZCTA';
    const stateAbbr = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate geoType
    if (!['ZCTA', 'CITY', 'PLACE'].includes(geoType)) {
      return NextResponse.json(
        { error: 'Invalid geoType. Must be ZCTA, CITY, or PLACE' },
        { status: 400 }
      );
    }

    // Build query
    let whereClause = '';
    const params: any[] = [];

    if (geoType === 'ZCTA') {
      whereClause = 'ms.geoType = $1';
      params.push('ZCTA');

      if (stateAbbr) {
        whereClause += ' AND gz.stateAbbr = $2';
        params.push(stateAbbr);
      }
    } else if (geoType === 'CITY') {
      whereClause = 'ms.geoType = $1';
      params.push('CITY');

      if (stateAbbr) {
        whereClause += ' AND gc.stateAbbr = $2';
        params.push(stateAbbr);
      }
    } else if (geoType === 'PLACE') {
      whereClause = 'ms.geoType = $1';
      params.push('PLACE');

      if (stateAbbr) {
        whereClause += ' AND gp.stateAbbr = $2';
        params.push(stateAbbr);
      }
    }

    params.push(limit, offset);

    // Build JOIN clause based on geoType
    let joinClause = '';
    if (geoType === 'ZCTA') {
      joinClause = `
        JOIN geo_zcta gz ON ms.geoId = gz.zcta
      `;
    } else if (geoType === 'CITY') {
      joinClause = `
        JOIN geo_city gc ON ms.geoId = gc.cityId
      `;
    } else if (geoType === 'PLACE') {
      joinClause = `
        JOIN geo_place gp ON ms.geoId = gp.placeGeoid
      `;
    }

    // Query rankings with pagination
    const query = `
      SELECT
        ms.geoId,
        ms.geoType,
        ${geoType === 'ZCTA' ? 'gz.zcta as name, gz.stateAbbr, gz.city as cityName' : ''}
        ${geoType === 'CITY' ? 'gc.name, gc.stateAbbr, gc.name as cityName' : ''}
        ${geoType === 'PLACE' ? 'gp.name, gp.stateAbbr, gp.name as cityName' : ''}
        ms.homeValue,
        ms.income,
        ms.ratio,
        ms.asOfDate
      FROM metric_snapshot ms
      ${joinClause}
      WHERE ${whereClause}
      AND ms.asOfDate = (
        SELECT MAX(asOfDate)
        FROM metric_snapshot ms2
        WHERE ms2.geoType = ms.geoType AND ms2.geoId = ms.geoId
      )
      ORDER BY ms.ratio ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const rankings = await prisma.$queryRawUnsafe(query, ...params);

    // Format data for CSV
    const csvData = (rankings as any[]).map(row => ({
      'Geo ID': row.geoid,
      'Name': row.name,
      'City Name': row.cityname || '',
      'State': row.stateabbr,
      'Median Home Value': row.homevalue,
      'Median Income': row.income,
      'Affordability Ratio': row.ratio,
      'Data Date': row.asdate,
    }));

    const csv = generateCsv(csvData, 'rankings');

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${geoType.toLowerCase()}-rankings-${stateAbbr || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export rankings' },
      { status: 500 }
    );
  }
}
