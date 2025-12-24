import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for canonical URL normalization
 *
 * Examples:
 * - /Maine/ → /maine/
 * - /maine/cape_elizabeth → /maine/cape-elizabeth/
 * - /maine/cape-elizabeth → /maine/cape-elizabeth/
 * - /maine/zip/04043/ → /zip/04043/
 * - /API/search → no redirect (case-sensitive API)
 * - /image.png → no redirect (file-like)
 * - /_next/... → no redirect (Next.js internal)
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip proxy for:
  // - API routes (case-insensitive to catch /api, /API, /Api, etc.)
  // - Next.js internals (_next/*)
  // - Files with extensions (.png, .ico, .xml, .txt, robots.txt, sitemap.xml)
  const lowerPath = pathname.toLowerCase();
  if (
    lowerPath.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // Covers /robots.txt, /sitemap.xml, /image.png, etc.
  ) {
    return NextResponse.next();
  }

  let newPathname = pathname;
  let needsRedirect = false;

  // 1. Convert to lowercase
  if (newPathname !== newPathname.toLowerCase()) {
    newPathname = newPathname.toLowerCase();
    needsRedirect = true;
  }

  // 2. Replace underscores with hyphens
  if (newPathname.includes('_')) {
    newPathname = newPathname.replace(/_/g, '-');
    needsRedirect = true;
  }

  // 3. Add trailing slash for content pages
  // Skip if already has trailing slash or is root
  if (newPathname !== '/' && !newPathname.endsWith('/')) {
    newPathname = `${newPathname}/`;
    needsRedirect = true;
  }

  // 4. Redirect /{state}/zip/{zip}/ to /zip/{zip}/
  // Pattern: /[state-slug]/zip/[5-digits]/
  const stateZipMatch = newPathname.match(/^\/([a-z-]+)\/zip\/(\d{5})\/$/);
  if (stateZipMatch) {
    const zipCode = stateZipMatch[2];
    newPathname = `/zip/${zipCode}/`;
    needsRedirect = true;
  }

  // Perform redirect if needed
  if (needsRedirect) {
    // Build the redirect URL manually to preserve trailing slash
    const redirectUrl = new URL(newPathname + (search || ''), request.nextUrl.origin);

    // Use 308 (permanent redirect preserving method) for consistency
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

// Configure which paths the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (.png, .jpg, .ico, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
