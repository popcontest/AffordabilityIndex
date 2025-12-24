/**
 * US County FIPS lookup table
 *
 * Source: US Census Bureau
 * Format: { stateAbbr, countyName, countyFips }
 *
 * Note: countyFips is 5 digits: 2-digit state FIPS + 3-digit county code
 *
 * This is a comprehensive list of all US counties for deterministic
 * countyFips mapping in GeoCity records.
 */

export interface CountyRecord {
  stateAbbr: string;
  countyName: string; // Without " County" suffix
  countyFips: string; // 5-digit FIPS
}

/**
 * Normalize county name for lookup:
 * - Trim whitespace
 * - Lowercase
 * - Remove " county" suffix (case-insensitive)
 * - Remove " parish" suffix (Louisiana)
 * - Remove " borough" suffix (Alaska)
 * - Collapse multiple spaces
 */
export function normalizeCountyName(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .trim()
    .toLowerCase()
    .replace(/\s+county$/i, '')
    .replace(/\s+parish$/i, '')
    .replace(/\s+borough$/i, '')
    .replace(/\s+census area$/i, '')
    .replace(/\s+municipality$/i, '')
    .replace(/\s+city and borough$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lookup countyFips by state and normalized county name
 */
export function lookupCountyFips(
  stateAbbr: string | null | undefined,
  countyName: string | null | undefined
): string | null {
  if (!stateAbbr || !countyName) return null;

  const normalized = normalizeCountyName(countyName);
  const record = US_COUNTIES.find(
    (c) => c.stateAbbr === stateAbbr && normalizeCountyName(c.countyName) === normalized
  );

  return record?.countyFips ?? null;
}

/**
 * Full US county list
 *
 * TODO: This is currently a minimal stub. Replace with complete list from:
 * - Census Bureau county list: https://www.census.gov/geographies/reference-files/2023/demo/popest/2023-fips.html
 * - Or use a maintained package like `us-counties`
 *
 * For MVP: Include counties for states you're actively testing
 */
export const US_COUNTIES: CountyRecord[] = [
  // Alabama
  { stateAbbr: 'AL', countyName: 'Jefferson', countyFips: '01073' },
  { stateAbbr: 'AL', countyName: 'Mobile', countyFips: '01097' },
  { stateAbbr: 'AL', countyName: 'Madison', countyFips: '01089' },

  // California
  { stateAbbr: 'CA', countyName: 'Los Angeles', countyFips: '06037' },
  { stateAbbr: 'CA', countyName: 'San Francisco', countyFips: '06075' },
  { stateAbbr: 'CA', countyName: 'San Diego', countyFips: '06073' },
  { stateAbbr: 'CA', countyName: 'Orange', countyFips: '06059' },
  { stateAbbr: 'CA', countyName: 'Santa Clara', countyFips: '06085' },
  { stateAbbr: 'CA', countyName: 'Alameda', countyFips: '06001' },

  // Florida
  { stateAbbr: 'FL', countyName: 'Miami-Dade', countyFips: '12086' },
  { stateAbbr: 'FL', countyName: 'Broward', countyFips: '12011' },
  { stateAbbr: 'FL', countyName: 'Palm Beach', countyFips: '12099' },
  { stateAbbr: 'FL', countyName: 'Hillsborough', countyFips: '12057' },
  { stateAbbr: 'FL', countyName: 'Orange', countyFips: '12095' },

  // Massachusetts
  { stateAbbr: 'MA', countyName: 'Middlesex', countyFips: '25017' },
  { stateAbbr: 'MA', countyName: 'Suffolk', countyFips: '25025' },
  { stateAbbr: 'MA', countyName: 'Worcester', countyFips: '25027' },
  { stateAbbr: 'MA', countyName: 'Essex', countyFips: '25009' },
  { stateAbbr: 'MA', countyName: 'Norfolk', countyFips: '25021' },

  // Maine
  { stateAbbr: 'ME', countyName: 'Cumberland', countyFips: '23005' },
  { stateAbbr: 'ME', countyName: 'York', countyFips: '23031' },
  { stateAbbr: 'ME', countyName: 'Penobscot', countyFips: '23019' },

  // New York
  { stateAbbr: 'NY', countyName: 'New York', countyFips: '36061' },
  { stateAbbr: 'NY', countyName: 'Kings', countyFips: '36047' },
  { stateAbbr: 'NY', countyName: 'Queens', countyFips: '36081' },
  { stateAbbr: 'NY', countyName: 'Bronx', countyFips: '36005' },
  { stateAbbr: 'NY', countyName: 'Richmond', countyFips: '36085' },
  { stateAbbr: 'NY', countyName: 'Nassau', countyFips: '36059' },
  { stateAbbr: 'NY', countyName: 'Suffolk', countyFips: '36103' },
  { stateAbbr: 'NY', countyName: 'Westchester', countyFips: '36119' },

  // Texas
  { stateAbbr: 'TX', countyName: 'Harris', countyFips: '48201' },
  { stateAbbr: 'TX', countyName: 'Dallas', countyFips: '48113' },
  { stateAbbr: 'TX', countyName: 'Tarrant', countyFips: '48439' },
  { stateAbbr: 'TX', countyName: 'Bexar', countyFips: '48029' },
  { stateAbbr: 'TX', countyName: 'Travis', countyFips: '48453' },

  // Washington
  { stateAbbr: 'WA', countyName: 'King', countyFips: '53033' },
  { stateAbbr: 'WA', countyName: 'Pierce', countyFips: '53053' },
  { stateAbbr: 'WA', countyName: 'Snohomish', countyFips: '53061' },

  // Add more counties as needed for your dataset
  // TODO: Expand this list to include all ~3,000 US counties
];
