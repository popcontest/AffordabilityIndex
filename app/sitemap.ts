import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { US_STATES } from '@/lib/usStates';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://affordabilityindex.org';

/**
 * Dynamic sitemap for AffordabilityIndex
 *
 * Includes:
 * - Static pages (home, methodology, rankings, etc.)
 * - State pages (all 50 states + DC)
 * - City pages (19,000+ dynamic from database)
 * - ZIP pages (dynamic from database)
 *
 * Note: Google recommends max 50,000 URLs per sitemap.
 * If we exceed this, we should implement a sitemap index with multiple sitemap files.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages - highest priority, change frequently
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/rankings`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/rankings/large-cities`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/rankings/mid-size-cities`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/rankings/small-cities`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/rankings/towns`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/rankings/states`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/methodology`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/data-sources`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // State pages - all 50 states + DC
  const statePages: MetadataRoute.Sitemap = US_STATES.map((state) => ({
    url: `${BASE_URL}/${state.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // City pages - fetch all cities from database
  // Note: This could be 19,000+ entries. Consider pagination if performance becomes an issue.
  const cities = await prisma.geoCity.findMany({
    select: {
      slug: true,
      stateAbbr: true,
    },
    orderBy: [
      { stateAbbr: 'asc' },
      { slug: 'asc' },
    ],
  });

  const cityPages: MetadataRoute.Sitemap = cities.map((city) => {
    const state = US_STATES.find((s) => s.abbr === city.stateAbbr);
    const stateSlug = state?.slug || city.stateAbbr.toLowerCase();

    return {
      url: `${BASE_URL}/${stateSlug}/${city.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  // ZIP pages - fetch all ZCTAs from database
  const zips = await prisma.geoZcta.findMany({
    select: {
      zcta: true,
    },
    orderBy: {
      zcta: 'asc',
    },
  });

  const zipPages: MetadataRoute.Sitemap = zips.map((zip) => ({
    url: `${BASE_URL}/zip/${zip.zcta}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Combine all pages
  const allPages = [
    ...staticPages,
    ...statePages,
    ...cityPages,
    ...zipPages,
  ];

  // Log total count for monitoring
  console.log(`[Sitemap] Generated ${allPages.length} URLs (${staticPages.length} static, ${statePages.length} states, ${cityPages.length} cities, ${zipPages.length} ZIPs)`);

  // Warn if approaching Google's 50k URL limit
  if (allPages.length > 45000) {
    console.warn(`[Sitemap] Warning: Approaching Google's 50k URL limit (${allPages.length} URLs). Consider implementing sitemap index.`);
  }

  return allPages;
}
