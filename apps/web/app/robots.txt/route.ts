import { NextResponse } from 'next/server';

export function GET() {
  const robotsTxt = `# Affordability Index - Robots.txt

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://affordabilityindex.org'}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
