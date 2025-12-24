"""
Import Property Tax Data from Tax Foundation County-Level CSV

This script imports county-level effective property tax rates from the Tax Foundation
and applies them to all cities and ZCTAs in each county.

Data Source: Tax Foundation - Property Taxes by State and County, 2025
"""

import csv
import os
import psycopg2
from psycopg2 import sql
import re

DATABASE_URL = os.environ.get('DATABASE_URL')

# State abbreviation mapping
STATE_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC'
}

def parse_percentage(pct_str):
    """Convert percentage string '0.2850%' to decimal 0.002850"""
    if not pct_str or pct_str == '':
        return None
    # Remove % and convert to decimal
    return float(pct_str.strip('%')) / 100

def get_county_fips_mapping(conn):
    """
    Get mapping of (state_abbr, county_name) -> county_fips
    from cities that have countyFips populated
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT "stateAbbr", "countyName", "countyFips"
        FROM geo_city
        WHERE "countyFips" IS NOT NULL
          AND "countyName" IS NOT NULL
    """)

    mapping = {}
    for state_abbr, county_name, county_fips in cur.fetchall():
        # Normalize county name (remove "County" suffix, lowercase, strip)
        normalized = county_name.replace(' County', '').replace(' Parish', '').strip().lower()
        key = (state_abbr, normalized)
        mapping[key] = county_fips

    cur.close()
    return mapping

def get_cities_by_county(conn):
    """Get all city_ids grouped by county FIPS"""
    cur = conn.cursor()
    cur.execute("""
        SELECT "countyFips", array_agg("cityId") as city_ids
        FROM geo_city
        WHERE "countyFips" IS NOT NULL
        GROUP BY "countyFips"
    """)

    result = {row[0]: row[1] for row in cur.fetchall()}
    cur.close()
    return result

def import_tax_foundation_data(csv_path):
    """Import property tax data from Tax Foundation CSV"""

    print("\nTax Foundation Property Tax Import")
    print("=" * 60)

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get county FIPS mapping
    print("\nBuilding county FIPS mapping...")
    county_fips_map = get_county_fips_mapping(conn)
    print(f"   Found {len(county_fips_map)} county mappings")

    # Get cities by county
    print("\nGetting cities by county...")
    cities_by_county = get_cities_by_county(conn)
    print(f"   Found {len(cities_by_county)} counties with cities")

    # Read and process CSV
    print(f"\nReading CSV: {csv_path}")

    counties_processed = 0
    counties_matched = 0
    cities_updated = 0
    counties_skipped = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            state_name = row['State']
            county_name = row['County'].replace(' County', '').replace(' Parish', '').strip()
            rate_str = row['Effective Property Tax Rate (2023)']

            # Get state abbreviation
            state_abbr = STATE_ABBR.get(state_name)
            if not state_abbr:
                print(f"WARNING: Unknown state: {state_name}")
                continue

            # Parse rate
            rate = parse_percentage(rate_str)
            if rate is None:
                continue

            counties_processed += 1

            # Look up county FIPS
            key = (state_abbr, county_name.lower())
            county_fips = county_fips_map.get(key)

            if not county_fips:
                counties_skipped.append(f"{county_name}, {state_abbr}")
                continue

            counties_matched += 1

            # Get all cities in this county
            city_ids = cities_by_county.get(county_fips, [])

            # Insert property tax rate for each city
            for city_id in city_ids:
                record_id = f"CITY-{city_id}-2024"

                cur.execute("""
                    INSERT INTO property_tax_rate
                    (id, "geoType", "geoId", "effectiveRate", "asOfYear", source, "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (id)
                    DO UPDATE SET
                        "effectiveRate" = EXCLUDED."effectiveRate",
                        "updatedAt" = NOW()
                """, (
                    record_id,
                    'CITY',
                    city_id,
                    rate,
                    2024,
                    'Tax Foundation'
                ))

                cities_updated += 1

            # Progress report every 100 counties
            if counties_processed % 100 == 0:
                print(f"   Progress: {counties_processed} counties, {cities_updated} cities updated")

    # Commit all changes
    conn.commit()
    cur.close()
    conn.close()

    # Summary
    print("\n" + "=" * 60)
    print("Import Complete!")
    print(f"   Counties in CSV: {counties_processed}")
    print(f"   Counties matched: {counties_matched} ({counties_matched/counties_processed*100:.1f}%)")
    print(f"   Cities updated: {cities_updated:,}")
    print(f"   Counties skipped: {len(counties_skipped)}")

    if len(counties_skipped) <= 20:
        print("\n   Skipped counties:")
        for county in counties_skipped:
            print(f"     - {county}")

if __name__ == '__main__':
    csv_file = r"Z:\Downloads\Property Taxes by State and County, 2025  Tax Foundation Maps.csv"
    import_tax_foundation_data(csv_file)
