/**
 * SEO and canonical URL utilities
 */

/**
 * Get the canonical URL for a given path
 * @param urlPath - Path starting with / (e.g., "/maine/cape-elizabeth/")
 * @returns Full canonical URL
 */
export function canonical(urlPath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://affordabilityindex.org';

  // Ensure path starts with /
  const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  // Remove trailing slash from base, ensure single / between base and path
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

/**
 * Convert input string to URL-safe slug
 * - Lowercase
 * - Trim whitespace
 * - Replace underscores and spaces with hyphens
 * - Remove non-URL-safe characters
 * - Collapse multiple hyphens
 * @param input - String to slugify
 * @returns URL-safe slug
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Replace underscores and spaces with hyphens
    .replace(/[_\s]+/g, '-')
    // Remove any characters that aren't alphanumeric or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a string is a 5-digit ZIP code
 * @param s - String to check
 * @returns True if exactly 5 digits
 */
export function isZip(s: string): boolean {
  return /^\d{5}$/.test(s);
}

/**
 * Get state slug from state name or abbreviation
 * @param state - State name or abbreviation
 * @returns Slugified state name
 */
export function getStateSlug(state: string): string {
  return slugify(state);
}

/**
 * Get place slug from place name
 * @param placeName - Place name (e.g., "Cape Elizabeth")
 * @returns Slugified place name
 */
export function getPlaceSlug(placeName: string): string {
  return slugify(placeName);
}

/**
 * Get county slug from county name
 * @param countyName - County name (e.g., "York County")
 * @returns Slugified county name
 */
export function getCountySlug(countyName: string): string {
  return slugify(countyName);
}

/**
 * Build canonical URL for a state page
 * @param stateSlug - State slug (e.g., "maine")
 * @returns Canonical URL with trailing slash
 */
export function getStateUrl(stateSlug: string): string {
  return canonical(`/${stateSlug}/`);
}

/**
 * Build canonical URL for a county page
 * @param stateSlug - State slug (e.g., "maine")
 * @param countySlug - County slug (e.g., "york-county")
 * @returns Canonical URL with trailing slash
 */
export function getCountyUrl(stateSlug: string, countySlug: string): string {
  return canonical(`/${stateSlug}/county/${countySlug}/`);
}

/**
 * Build canonical URL for a place page
 * @param stateSlug - State slug (e.g., "maine")
 * @param placeSlug - Place slug (e.g., "cape-elizabeth")
 * @returns Canonical URL with trailing slash
 */
export function getPlaceUrl(stateSlug: string, placeSlug: string): string {
  return canonical(`/${stateSlug}/${placeSlug}/`);
}

/**
 * Build canonical URL for a ZIP page
 * @param zip - 5-digit ZIP code
 * @returns Canonical URL with trailing slash
 */
export function getZipUrl(zip: string): string {
  return canonical(`/zip/${zip}/`);
}
