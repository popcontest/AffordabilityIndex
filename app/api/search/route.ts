import { NextRequest, NextResponse } from 'next/server';
import { getSearchResults, getCityByStateAndSlug, getZipByCode, SearchResult } from '@/lib/data';
import { canonical, slugify } from '@/lib/seo';
import { stateFromAbbr, stateFromName, stateFromSlug, US_STATES, USState } from '@/lib/usStates';
import { checkRateLimit, getClientIp, rateLimiters } from '@/lib/security/rateLimit';
import { validateQueryParams, sanitizeSearchQuery, detectSuspiciousQuery } from '@/lib/security/validation';
import { logRateLimitExceeded, logInvalidInput, logSuspiciousQuery, logApiError, getUserAgent } from '@/lib/security/logger';

/**
 * Parse a search query to extract city name and state constraint
 *
 * Examples:
 * - "alfred, maine" -> { cityQuery: "alfred", state: Maine }
 * - "portland ME" -> { cityQuery: "portland", state: Maine }
 * - "new york, NY" -> { cityQuery: "new york", state: New York }
 * - "maine alfred" -> { cityQuery: "alfred", state: Maine }
 * - "portland" -> { cityQuery: "portland", state: null }
 */
function parseQuery(query: string): { cityQuery: string; state: USState | null; isStateOnly: boolean } {
  // Normalize: lowercase, replace commas/multiple spaces with single space
  const normalized = query.toLowerCase().trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const tokens = normalized.split(' ');

  let detectedState: USState | null = null;
  let stateTokenIndices: number[] = [];

  // Check if the entire query is a state name, slug, or abbr
  const fullQueryState = stateFromName(normalized) || stateFromSlug(normalized) || stateFromAbbr(normalized);
  if (fullQueryState) {
    return { cityQuery: '', state: fullQueryState, isStateOnly: true };
  }

  // 1. Try to find state abbreviation (2-letter token)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.length === 2) {
      const state = stateFromAbbr(token);
      if (state) {
        detectedState = state;
        stateTokenIndices.push(i);
        break; // Found state abbr, stop looking
      }
    }
  }

  // 2. If no abbr found, try full state names (including multi-word like "new york")
  if (!detectedState) {
    for (const state of US_STATES) {
      const stateName = state.name.toLowerCase();
      const stateSlug = state.slug;

      // Check if normalized query contains the full state name or slug
      if (normalized.includes(stateName)) {
        detectedState = state;
        // Mark which tokens are part of the state name
        const stateWords = stateName.split(' ');
        for (let i = 0; i <= tokens.length - stateWords.length; i++) {
          const slice = tokens.slice(i, i + stateWords.length).join(' ');
          if (slice === stateName) {
            for (let j = 0; j < stateWords.length; j++) {
              stateTokenIndices.push(i + j);
            }
            break;
          }
        }
        break;
      } else if (normalized.includes(stateSlug)) {
        detectedState = state;
        // Mark which tokens are part of the state slug
        const slugWords = stateSlug.split('-');
        for (let i = 0; i <= tokens.length - slugWords.length; i++) {
          const slice = tokens.slice(i, i + slugWords.length).join(' ');
          if (slice.replace(/\s/g, '-') === stateSlug) {
            for (let j = 0; j < slugWords.length; j++) {
              stateTokenIndices.push(i + j);
            }
            break;
          }
        }
        break;
      }
    }
  }

  // 3. Remove state tokens from the query to get city name
  const cityTokens = tokens.filter((_, i) => !stateTokenIndices.includes(i));
  const cityQuery = cityTokens.join(' ').trim();

  return { cityQuery, state: detectedState, isStateOnly: false };
}

export async function GET(request: NextRequest) {
  // Get client IP for rate limiting and logging
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const endpoint = '/api/search';

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(ip, rateLimiters.search);
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
            'Retry-After': '10',
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      logInvalidInput({
        ip,
        endpoint,
        field: 'q',
        value: query,
        reason: 'Missing or empty query parameter',
      });

      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Validate and sanitize query
    const sanitizedQuery = sanitizeSearchQuery(query);

    // Check for suspicious patterns
    const suspiciousReason = detectSuspiciousQuery(sanitizedQuery);
    if (suspiciousReason) {
      logSuspiciousQuery({
        ip,
        userAgent,
        endpoint,
        query: sanitizedQuery,
        reason: suspiciousReason,
      });

      return NextResponse.json(
        { error: 'Invalid search query' },
        { status: 400 }
      );
    }

    const q = sanitizedQuery;

    // Check if query is a 5-digit ZIP code
    if (/^\d{5}$/.test(q)) {
      const zcta = await getZipByCode(q);
      if (zcta && zcta.metrics) {
        return NextResponse.json({
          query: q,
          results: [
            {
              geoType: 'ZCTA',
              geoId: zcta.zcta,
              label: `ZIP ${zcta.zcta}`,
              state: null,
              canonicalUrl: canonical(`/zip/${zcta.zcta}/`),
              ratio: zcta.metrics.ratio ?? null,
              homeValue: zcta.metrics.homeValue ?? null,
              income: zcta.metrics.income ?? null,
              asOfDate: zcta.metrics.asOfDate ?? null,
            },
          ],
          count: 1,
        });
      }
    }

    // Parse query to extract city and state
    const { cityQuery, state, isStateOnly } = parseQuery(q);

    // If it's a state-only query, return the state page as the first result
    const results: any[] = [];
    if (isStateOnly && state) {
      results.push({
        geoType: 'STATE',
        geoId: state.abbr,
        label: `${state.name} (State page)`,
        state: state.abbr,
        canonicalUrl: canonical(`/${state.slug}/`),
        ratio: null,
        homeValue: null,
        income: null,
        asOfDate: null,
      });
    }

    // Search for cities
    let searchResults: SearchResult[];
    if (cityQuery) {
      // Get all city results, then filter by state if needed
      const allResults = await getSearchResults(cityQuery, state ? 50 : 10);

      if (state) {
        // Filter results to only include the detected state, then limit to 10
        searchResults = allResults
          .filter((result) => result.stateAbbr === state.abbr)
          .slice(0, 10);
      } else {
        searchResults = allResults;
      }
    } else {
      // No city query (state-only), just return state page result
      searchResults = [];
    }

    // Transform city search results to include canonicalUrl
    const cityResults = await Promise.all(
      searchResults.map(async (result) => {
        let canonicalUrl: string;

        if (result.geoType === 'ZCTA') {
          // ZIP canonical: /zip/{zcta}/
          canonicalUrl = canonical(`/zip/${result.geoId}/`);
        } else if (result.geoType === 'CITY') {
          // CITY canonical: determine if slug is unique in state
          const cityState = result.stateAbbr ? stateFromAbbr(result.stateAbbr) : null;
          if (cityState && result.stateAbbr) {
            const cityName = result.name.replace(`, ${result.stateAbbr}`, '');
            const citySlug = slugify(cityName);

            // Check if this slug is unique in the state
            const citiesInState = await getCityByStateAndSlug(
              result.stateAbbr,
              citySlug
            );

            if (citiesInState.length === 1) {
              // Unique slug: /{state-slug}/{slug}/
              canonicalUrl = canonical(`/${cityState.slug}/${citySlug}/`);
            } else {
              // Not unique: /{state-slug}/{slug}-{cityId}/
              canonicalUrl = canonical(`/${cityState.slug}/${citySlug}-${result.geoId}/`);
            }
          } else {
            // Fallback if state lookup fails
            canonicalUrl = canonical('/');
          }
        } else {
          // PLACE canonical: /{state-slug}/{place-slug}/
          const cityState = result.stateAbbr ? stateFromAbbr(result.stateAbbr) : null;
          if (cityState) {
            // Extract just the place name without state suffix
            const placeName = result.name.replace(`, ${result.stateAbbr}`, '');
            const placeSlug = slugify(placeName);
            canonicalUrl = canonical(`/${cityState.slug}/${placeSlug}/`);
          } else {
            // Fallback if state lookup fails (shouldn't happen)
            canonicalUrl = canonical('/');
          }
        }

        return {
          geoType: result.geoType,
          geoId: result.geoId,
          label: result.name,
          state: result.stateAbbr,
          canonicalUrl,
          ratio: result.metrics?.ratio ?? null,
          homeValue: result.metrics?.homeValue ?? null,
          income: result.metrics?.income ?? null,
          asOfDate: result.metrics?.asOfDate ?? null,
        };
      })
    );

    // Combine state page result (if any) with city results
    const allResults = [...results, ...cityResults];

    return NextResponse.json({
      query: q,
      results: allResults,
      count: allResults.length,
    });
  } catch (error) {
    logApiError({
      ip,
      endpoint,
      error: error instanceof Error ? error : String(error),
      context: { query: request.nextUrl.searchParams.get('q') },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
