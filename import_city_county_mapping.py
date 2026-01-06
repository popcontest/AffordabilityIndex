#!/usr/bin/env python3
"""
Import County FIPS mapping for all cities using Census Geocoding API

This script:
1. Fetches all cities from geo_city that are missing countyFips
2. Uses Census Geocoding API (batch mode) to get county FIPS
3. Updates geo_city table with countyFips

API: https://geocoding.geo.census.gov/geocoder/
Batch endpoint: https://geocoding.geo.census.gov/geocoder/locations/addressbatch
Limit: 10,000 addresses per batch
"""

import os
import sys
import time
import requests
import psycopg2
from psycopg2.extras import execute_batch
from io import StringIO

# Database connection
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

def fetch_cities_without_county():
    """Fetch all cities missing countyFips"""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute('''
        SELECT "cityId", name, "stateAbbr", "stateName"
        FROM geo_city
        WHERE "countyFips" IS NULL
        ORDER BY "stateAbbr", name
    ''')

    cities = cur.fetchall()
    cur.close()
    conn.close()

    print(f"Found {len(cities)} cities without county FIPS mapping")
    return cities

def geocode_batch(cities_batch):
    """
    Geocode a batch of cities using Census Geocoding API

    Args:
        cities_batch: List of (cityId, name, stateAbbr, stateName) tuples

    Returns:
        Dict mapping cityId to countyFips
    """
    # Format batch CSV
    # Format: Unique ID, Street address, City, State, ZIP
    # We'll use: cityId, "", name, stateAbbr, ""
    csv_lines = []
    for city in cities_batch:
        city_id, name, state_abbr, state_name = city
        # Escape commas in city names
        name_escaped = name.replace('"', '""')
        csv_lines.append(f'{city_id},"","{name_escaped}",{state_abbr},')

    csv_data = '\n'.join(csv_lines)

    # Call batch geocoding API
    url = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch"

    files = {
        'addressFile': ('addresses.csv', StringIO(csv_data), 'text/csv')
    }

    data = {
        'benchmark': 'Public_AR_Current',
        'vintage': 'Current_Current'
    }

    print(f"  Geocoding batch of {len(cities_batch)} cities...")
    response = requests.post(url, files=files, data=data)

    if response.status_code != 200:
        print(f"  ERROR: API returned {response.status_code}")
        return {}

    # Parse response
    # Format: "ID","Input Address","Match","Match Type","Matched Address","Coordinates","TIGER/Line ID","Side"
    # County FIPS is in the matched address components
    results = {}

    for line in response.text.strip().split('\n'):
        if not line:
            continue

        parts = line.split(',')
        if len(parts) < 3:
            continue

        city_id = parts[0].strip('"')
        match_status = parts[2].strip('"')

        if match_status == 'Match' and len(parts) >= 6:
            # Extract county FIPS from matched address components
            # The format includes state + county FIPS in components
            # We need to parse the geocoding result more carefully
            try:
                # County FIPS is typically in parts[6] or parts[7]
                # Format: "STATE_FIPS,COUNTY_FIPS,TRACT,BLOCK"
                for part in parts:
                    if len(part.strip('"')) == 5 and part.strip('"').isdigit():
                        county_fips = part.strip('"')
                        results[city_id] = county_fips
                        break
            except:
                pass

    print(f"  Successfully geocoded {len(results)} cities")
    return results

def geocode_single(city_name, state_abbr):
    """
    Geocode a single city using one-line address endpoint
    Fallback for batch failures
    """
    url = "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress"

    params = {
        'address': f"{city_name}, {state_abbr}",
        'benchmark': 'Public_AR_Current',
        'vintage': 'Current_Current',
        'layers': 'all',
        'format': 'json'
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()

            # Extract county FIPS from result
            if 'result' in data and 'addressMatches' in data['result']:
                matches = data['result']['addressMatches']
                if matches:
                    geographies = matches[0].get('geographies', {})
                    counties = geographies.get('Counties', [])
                    if counties:
                        county_fips = counties[0].get('GEOID')
                        if county_fips and len(county_fips) == 5:
                            return county_fips
    except Exception as e:
        print(f"    Error geocoding {city_name}, {state_abbr}: {e}")

    return None

def update_cities_with_county(city_county_map):
    """Update geo_city table with county FIPS"""
    if not city_county_map:
        print("No cities to update")
        return

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    updates = [(county_fips, city_id) for city_id, county_fips in city_county_map.items()]

    execute_batch(
        cur,
        '''UPDATE geo_city SET "countyFips" = %s WHERE "cityId" = %s''',
        updates,
        page_size=1000
    )

    conn.commit()
    print(f"Updated {len(updates)} cities with county FIPS")

    cur.close()
    conn.close()

def main():
    """Main execution"""
    print("=" * 60)
    print("Census Geocoding: City to County FIPS Mapping")
    print("=" * 60)

    # Fetch cities without county
    cities = fetch_cities_without_county()

    if not cities:
        print("All cities already have county FIPS!")
        return

    # Process in batches of 1000 (well under 10k limit, for reliability)
    BATCH_SIZE = 1000
    total_mapped = 0

    for i in range(0, len(cities), BATCH_SIZE):
        batch = cities[i:i+BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(cities) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"\nBatch {batch_num}/{total_batches} ({len(batch)} cities)")

        # Try batch geocoding first
        results = geocode_batch(batch)

        # For any failures, try individual geocoding
        failed = [c for c in batch if c[0] not in results]
        if failed:
            print(f"  Retrying {len(failed)} failed cities individually...")
            for city in failed:
                city_id, name, state_abbr, _ = city
                county_fips = geocode_single(name, state_abbr)
                if county_fips:
                    results[city_id] = county_fips
                time.sleep(0.2)  # Rate limiting

        # Update database
        if results:
            update_cities_with_county(results)
            total_mapped += len(results)

        # Rate limiting between batches
        if i + BATCH_SIZE < len(cities):
            print("  Waiting 2 seconds before next batch...")
            time.sleep(2)

    print("\n" + "=" * 60)
    print(f"COMPLETE: Mapped {total_mapped} cities to counties")
    print("=" * 60)

if __name__ == '__main__':
    main()
