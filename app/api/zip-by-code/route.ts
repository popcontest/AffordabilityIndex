import { NextRequest, NextResponse } from 'next/server';
import { getZipByCode } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zip = searchParams.get('zip');

  if (!zip) {
    return NextResponse.json({ error: 'Missing zip parameter' }, { status: 400 });
  }

  try {
    const zcta = await getZipByCode(zip);

    if (!zcta) {
      return NextResponse.json({ error: 'ZIP not found' }, { status: 404 });
    }

    return NextResponse.json(zcta);
  } catch (error) {
    console.error('Error fetching ZIP by code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
