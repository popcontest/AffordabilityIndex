import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimiters } from '@/lib/security/rateLimit';

export async function GET(request: Request) {
  // Get client IP for rate limiting
  const ip = getClientIp(request);

  try {
    // Very lenient rate limiting for health checks
    const rateLimitResult = await checkRateLimit(ip, rateLimiters.health);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Health check should never fail
    return NextResponse.json({ ok: true, error: 'Health check with errors' });
  }
}
