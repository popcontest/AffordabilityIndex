import { NextRequest, NextResponse } from 'next/server';
import { getCityById } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const city = await getCityById(id);

    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    return NextResponse.json(city);
  } catch (error) {
    console.error('Error fetching city by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
