"""
County FIPS lookup for ETL pipeline

Source: US Census Bureau
Format: { state_abbr, county_name, county_fips }

Note: county_fips is 5 digits: 2-digit state FIPS + 3-digit county code
"""

import re

# US Counties data (stub - expand with full list for production)
US_COUNTIES = [
    # Alabama
    {"state_abbr": "AL", "county_name": "Jefferson", "county_fips": "01073"},
    {"state_abbr": "AL", "county_name": "Mobile", "county_fips": "01097"},
    {"state_abbr": "AL", "county_name": "Madison", "county_fips": "01089"},

    # California
    {"state_abbr": "CA", "county_name": "Los Angeles", "county_fips": "06037"},
    {"state_abbr": "CA", "county_name": "San Francisco", "county_fips": "06075"},
    {"state_abbr": "CA", "county_name": "San Diego", "county_fips": "06073"},
    {"state_abbr": "CA", "county_name": "Orange", "county_fips": "06059"},
    {"state_abbr": "CA", "county_name": "Santa Clara", "county_fips": "06085"},
    {"state_abbr": "CA", "county_name": "Alameda", "county_fips": "06001"},

    # Florida
    {"state_abbr": "FL", "county_name": "Miami-Dade", "county_fips": "12086"},
    {"state_abbr": "FL", "county_name": "Broward", "county_fips": "12011"},
    {"state_abbr": "FL", "county_name": "Palm Beach", "county_fips": "12099"},
    {"state_abbr": "FL", "county_name": "Hillsborough", "county_fips": "12057"},
    {"state_abbr": "FL", "county_name": "Orange", "county_fips": "12095"},

    # Massachusetts
    {"state_abbr": "MA", "county_name": "Middlesex", "county_fips": "25017"},
    {"state_abbr": "MA", "county_name": "Suffolk", "county_fips": "25025"},
    {"state_abbr": "MA", "county_name": "Worcester", "county_fips": "25027"},
    {"state_abbr": "MA", "county_name": "Essex", "county_fips": "25009"},
    {"state_abbr": "MA", "county_name": "Norfolk", "county_fips": "25021"},

    # Maine
    {"state_abbr": "ME", "county_name": "Cumberland", "county_fips": "23005"},
    {"state_abbr": "ME", "county_name": "York", "county_fips": "23031"},
    {"state_abbr": "ME", "county_name": "Penobscot", "county_fips": "23019"},

    # New York
    {"state_abbr": "NY", "county_name": "New York", "county_fips": "36061"},
    {"state_abbr": "NY", "county_name": "Kings", "county_fips": "36047"},
    {"state_abbr": "NY", "county_name": "Queens", "county_fips": "36081"},
    {"state_abbr": "NY", "county_name": "Bronx", "county_fips": "36005"},
    {"state_abbr": "NY", "county_name": "Richmond", "county_fips": "36085"},
    {"state_abbr": "NY", "county_name": "Nassau", "county_fips": "36059"},
    {"state_abbr": "NY", "county_name": "Suffolk", "county_fips": "36103"},
    {"state_abbr": "NY", "county_name": "Westchester", "county_fips": "36119"},

    # Texas
    {"state_abbr": "TX", "county_name": "Harris", "county_fips": "48201"},
    {"state_abbr": "TX", "county_name": "Dallas", "county_fips": "48113"},
    {"state_abbr": "TX", "county_name": "Tarrant", "county_fips": "48439"},
    {"state_abbr": "TX", "county_name": "Bexar", "county_fips": "48029"},
    {"state_abbr": "TX", "county_name": "Travis", "county_fips": "48453"},

    # Washington
    {"state_abbr": "WA", "county_name": "King", "county_fips": "53033"},
    {"state_abbr": "WA", "county_name": "Pierce", "county_fips": "53053"},
    {"state_abbr": "WA", "county_name": "Snohomish", "county_fips": "53061"},

    # TODO: Expand with all ~3,000 US counties for production
    # Download from: https://www.census.gov/geographies/reference-files/2023/demo/popest/2023-fips.html
]


def normalize_county_name(name):
    """
    Normalize county name for lookup:
    - Trim whitespace
    - Lowercase
    - Remove suffixes: " county", " parish", " borough", etc.
    - Collapse multiple spaces
    """
    if not name or not isinstance(name, str):
        return ""

    normalized = name.strip().lower()

    # Remove common county suffixes (case-insensitive)
    suffixes = [
        r'\s+county$',
        r'\s+parish$',
        r'\s+borough$',
        r'\s+census area$',
        r'\s+municipality$',
        r'\s+city and borough$',
    ]

    for suffix_pattern in suffixes:
        normalized = re.sub(suffix_pattern, '', normalized, flags=re.IGNORECASE)

    # Collapse multiple spaces
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized


def lookup_county_fips(state_abbr, county_name):
    """
    Lookup county FIPS by state abbreviation and county name.

    Args:
        state_abbr: 2-letter state abbreviation (e.g., "CA")
        county_name: County name (e.g., "Los Angeles County" or "Los Angeles")

    Returns:
        5-digit county FIPS string or None if not found
    """
    if not state_abbr or not county_name:
        return None

    normalized = normalize_county_name(county_name)

    for county in US_COUNTIES:
        if (county["state_abbr"] == state_abbr and
            normalize_county_name(county["county_name"]) == normalized):
            return county["county_fips"]

    return None
