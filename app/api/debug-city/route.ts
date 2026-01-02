import { NextResponse } from 'next/server';
import { getCityByStateAndSlug } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'MD';
  const slug = searchParams.get('slug') || 'baltimore';

  try {
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
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
