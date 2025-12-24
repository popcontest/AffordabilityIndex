/**
 * US States lookup data and helpers
 * Used for slug/abbr/fips resolution in URLs and data
 */

export interface USState {
  name: string;
  abbr: string;
  slug: string;
  fips: string;
}

/**
 * All US states (50 states + DC)
 * Ordered alphabetically by name
 */
export const US_STATES: USState[] = [
  { name: 'Alabama', abbr: 'AL', slug: 'alabama', fips: '01' },
  { name: 'Alaska', abbr: 'AK', slug: 'alaska', fips: '02' },
  { name: 'Arizona', abbr: 'AZ', slug: 'arizona', fips: '04' },
  { name: 'Arkansas', abbr: 'AR', slug: 'arkansas', fips: '05' },
  { name: 'California', abbr: 'CA', slug: 'california', fips: '06' },
  { name: 'Colorado', abbr: 'CO', slug: 'colorado', fips: '08' },
  { name: 'Connecticut', abbr: 'CT', slug: 'connecticut', fips: '09' },
  { name: 'Delaware', abbr: 'DE', slug: 'delaware', fips: '10' },
  { name: 'District of Columbia', abbr: 'DC', slug: 'district-of-columbia', fips: '11' },
  { name: 'Florida', abbr: 'FL', slug: 'florida', fips: '12' },
  { name: 'Georgia', abbr: 'GA', slug: 'georgia', fips: '13' },
  { name: 'Hawaii', abbr: 'HI', slug: 'hawaii', fips: '15' },
  { name: 'Idaho', abbr: 'ID', slug: 'idaho', fips: '16' },
  { name: 'Illinois', abbr: 'IL', slug: 'illinois', fips: '17' },
  { name: 'Indiana', abbr: 'IN', slug: 'indiana', fips: '18' },
  { name: 'Iowa', abbr: 'IA', slug: 'iowa', fips: '19' },
  { name: 'Kansas', abbr: 'KS', slug: 'kansas', fips: '20' },
  { name: 'Kentucky', abbr: 'KY', slug: 'kentucky', fips: '21' },
  { name: 'Louisiana', abbr: 'LA', slug: 'louisiana', fips: '22' },
  { name: 'Maine', abbr: 'ME', slug: 'maine', fips: '23' },
  { name: 'Maryland', abbr: 'MD', slug: 'maryland', fips: '24' },
  { name: 'Massachusetts', abbr: 'MA', slug: 'massachusetts', fips: '25' },
  { name: 'Michigan', abbr: 'MI', slug: 'michigan', fips: '26' },
  { name: 'Minnesota', abbr: 'MN', slug: 'minnesota', fips: '27' },
  { name: 'Mississippi', abbr: 'MS', slug: 'mississippi', fips: '28' },
  { name: 'Missouri', abbr: 'MO', slug: 'missouri', fips: '29' },
  { name: 'Montana', abbr: 'MT', slug: 'montana', fips: '30' },
  { name: 'Nebraska', abbr: 'NE', slug: 'nebraska', fips: '31' },
  { name: 'Nevada', abbr: 'NV', slug: 'nevada', fips: '32' },
  { name: 'New Hampshire', abbr: 'NH', slug: 'new-hampshire', fips: '33' },
  { name: 'New Jersey', abbr: 'NJ', slug: 'new-jersey', fips: '34' },
  { name: 'New Mexico', abbr: 'NM', slug: 'new-mexico', fips: '35' },
  { name: 'New York', abbr: 'NY', slug: 'new-york', fips: '36' },
  { name: 'North Carolina', abbr: 'NC', slug: 'north-carolina', fips: '37' },
  { name: 'North Dakota', abbr: 'ND', slug: 'north-dakota', fips: '38' },
  { name: 'Ohio', abbr: 'OH', slug: 'ohio', fips: '39' },
  { name: 'Oklahoma', abbr: 'OK', slug: 'oklahoma', fips: '40' },
  { name: 'Oregon', abbr: 'OR', slug: 'oregon', fips: '41' },
  { name: 'Pennsylvania', abbr: 'PA', slug: 'pennsylvania', fips: '42' },
  { name: 'Rhode Island', abbr: 'RI', slug: 'rhode-island', fips: '44' },
  { name: 'South Carolina', abbr: 'SC', slug: 'south-carolina', fips: '45' },
  { name: 'South Dakota', abbr: 'SD', slug: 'south-dakota', fips: '46' },
  { name: 'Tennessee', abbr: 'TN', slug: 'tennessee', fips: '47' },
  { name: 'Texas', abbr: 'TX', slug: 'texas', fips: '48' },
  { name: 'Utah', abbr: 'UT', slug: 'utah', fips: '49' },
  { name: 'Vermont', abbr: 'VT', slug: 'vermont', fips: '50' },
  { name: 'Virginia', abbr: 'VA', slug: 'virginia', fips: '51' },
  { name: 'Washington', abbr: 'WA', slug: 'washington', fips: '53' },
  { name: 'West Virginia', abbr: 'WV', slug: 'west-virginia', fips: '54' },
  { name: 'Wisconsin', abbr: 'WI', slug: 'wisconsin', fips: '55' },
  { name: 'Wyoming', abbr: 'WY', slug: 'wyoming', fips: '56' },
];

/**
 * Find state by URL slug
 * @param slug - State slug (e.g., "maine", "new-york")
 * @returns USState object or null if not found
 */
export function stateFromSlug(slug: string): USState | null {
  const normalized = slug.toLowerCase().trim();
  return US_STATES.find((state) => state.slug === normalized) || null;
}

/**
 * Find state by abbreviation
 * @param abbr - State abbreviation (e.g., "ME", "NY")
 * @returns USState object or null if not found
 */
export function stateFromAbbr(abbr: string): USState | null {
  const normalized = abbr.toUpperCase().trim();
  return US_STATES.find((state) => state.abbr === normalized) || null;
}

/**
 * Find state by FIPS code
 * @param fips - State FIPS code (e.g., "23", "36")
 * @returns USState object or null if not found
 */
export function stateFromFips(fips: string): USState | null {
  const normalized = fips.padStart(2, '0');
  return US_STATES.find((state) => state.fips === normalized) || null;
}

/**
 * Find state by full name (case-insensitive)
 * @param name - State name (e.g., "Maine", "new york", "NEW HAMPSHIRE")
 * @returns USState object or null if not found
 */
export function stateFromName(name: string): USState | null {
  const normalized = name.toLowerCase().trim();
  return US_STATES.find((state) => state.name.toLowerCase() === normalized) || null;
}
