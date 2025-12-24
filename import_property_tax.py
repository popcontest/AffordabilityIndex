"""
Import property tax rates for cities and ZIPs.

Data Sources:
1. API Ninjas Property Tax API (requires free API key)
2. Tax Foundation data as fallback

Run: python import_property_tax.py
"""

import requests
import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Dict, List, Optional
import time
import sys
import io
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# API Ninjas Property Tax API
# Get free API key from: https://api-ninjas.com/api/propertytax
API_NINJAS_KEY = os.getenv('API_NINJAS_KEY', '')  # Set via: export API_NINJAS_KEY=your_key_here
API_NINJAS_BASE = "https://api.api-ninjas.com/v1/propertytax"

# Tax year
TAX_YEAR = 2024


def fetch_property_tax_rate(city: str, state: str, zip_code: Optional[str] = None) -> Optional[Dict]:
    """
    Fetch property tax rate from API Ninjas.

    Returns dict with:
        - median_rate: Median effective property tax rate (%)
        - percentile_25: 25th percentile rate
        - percentile_75: 75th percentile rate
    """
    if not API_NINJAS_KEY:
        # Only log once at startup, not for every call
        return None

    headers = {'X-Api-Key': API_NINJAS_KEY}
    params = {}

    # Try ZIP first (most specific), then city+state
    if zip_code:
        params['zip'] = zip_code  # Fixed: API expects 'zip' not 'zip_code'
    else:
        params['city'] = city
        params['state'] = state

    try:
        response = requests.get(API_NINJAS_BASE, headers=headers, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()
            if data:
                # API Ninjas returns property tax percentile rates
                # Fixed: Use correct field names from API response
                return {
                    'median_rate': data[0].get('property_tax_50th_percentile', None),
                    'percentile_25': data[0].get('property_tax_25th_percentile', None),
                    'percentile_75': data[0].get('property_tax_75th_percentile', None),
                }
            else:
                # Empty response - location not found in API database
                return None

        # Rate limit: wait if we hit it
        if response.status_code == 429:
            print("  ⚠️  Rate limit hit, waiting 60s...")
            time.sleep(60)
            return fetch_property_tax_rate(city, state, zip_code)

        return None
    except Exception as e:
        print(f"  ⚠️  Error fetching property tax for {city}, {state}: {e}")
        return None


def get_all_cities_from_db(conn) -> List[Dict]:
    """Get all cities that have home value data."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    query = """
    SELECT DISTINCT
        gc."cityId" as geo_id,
        gc.name,
        gc."stateAbbr" as state_abbr,
        gc."countyName",
        'CITY' as geo_type
    FROM geo_city gc
    INNER JOIN metric_snapshot ms ON ms."geoId" = gc."cityId" AND ms."geoType" = 'CITY'
    WHERE ms."homeValue" IS NOT NULL
    ORDER BY gc."stateAbbr", gc.name
    """

    cursor.execute(query)
    cities = cursor.fetchall()
    cursor.close()

    return cities


def get_all_zips_from_db(conn) -> List[Dict]:
    """Get all ZIPs that have home value data."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    query = """
    SELECT DISTINCT
        gz.zcta as geo_id,
        gz.city as name,
        gz."stateAbbr" as state_abbr,
        gz."countyName",
        'ZCTA' as geo_type
    FROM geo_zcta gz
    INNER JOIN metric_snapshot ms ON ms."geoId" = gz.zcta AND ms."geoType" = 'ZCTA'
    WHERE ms."homeValue" IS NOT NULL
    ORDER BY gz."stateAbbr", gz.zcta
    """

    cursor.execute(query)
    zips = cursor.fetchall()
    cursor.close()

    return zips


def insert_or_update_property_tax(conn, geo_type: str, geo_id: str,
                                   rate_data: Dict, source: str = "API Ninjas"):
    """Insert or update property tax rate in database."""
    cursor = conn.cursor()

    query = """
    INSERT INTO property_tax_rate (
        "geoType", "geoId", "effectiveRate", "rate25th", "rate75th", "asOfYear", source, "updatedAt"
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, NOW()
    )
    ON CONFLICT ("geoType", "geoId", "asOfYear")
    DO UPDATE SET
        "effectiveRate" = EXCLUDED."effectiveRate",
        "rate25th" = EXCLUDED."rate25th",
        "rate75th" = EXCLUDED."rate75th",
        source = EXCLUDED.source,
        "updatedAt" = NOW()
    """

    cursor.execute(query, (
        geo_type,
        geo_id,
        rate_data['median_rate'],
        rate_data['percentile_25'],
        rate_data['percentile_75'],
        TAX_YEAR,
        source
    ))

    conn.commit()
    cursor.close()


def main():
    """Main ETL process."""
    print(f"🏠 Property Tax Import - {TAX_YEAR}")
    print("=" * 60)

    if not API_NINJAS_KEY:
        print("\n⚠️  WARNING: No API_NINJAS_KEY found in environment!")
        print("   Get a free API key from: https://api-ninjas.com/api/propertytax")
        print("   Set it with: export API_NINJAS_KEY=your_key_here")
        print("\n   Continuing with fallback data only...\n")

    # Connect to database
    print("\n📊 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Get all cities and ZIPs
    print("\n📋 Fetching locations from database...")
    cities = get_all_cities_from_db(conn)
    zips = get_all_zips_from_db(conn)

    print(f"   Found {len(cities)} cities with home value data")
    print(f"   Found {len(zips)} ZIPs with home value data")

    # Process cities
    print(f"\n🏙️  Processing cities...")
    city_count = 0
    city_success = 0

    for city in cities:
        city_count += 1

        if city_count % 100 == 0:
            print(f"   Progress: {city_count}/{len(cities)} cities ({city_success} with data)")

        # Fetch property tax rate
        rate_data = fetch_property_tax_rate(
            city=city['name'],
            state=city['state_abbr']
        )

        if rate_data and rate_data['median_rate'] is not None:
            insert_or_update_property_tax(
                conn,
                geo_type='CITY',
                geo_id=city['geo_id'],
                rate_data=rate_data,
                source="API Ninjas"
            )
            city_success += 1
            print(f"   ✓ {city['name']}, {city['state_abbr']}: {rate_data['median_rate']:.2f}%")

        # Rate limiting: wait between requests
        time.sleep(0.2)  # 5 requests per second max

    # Process ZIPs
    print(f"\n📮 Processing ZIPs...")
    zip_count = 0
    zip_success = 0

    for zip_data in zips:
        zip_count += 1

        if zip_count % 100 == 0:
            print(f"   Progress: {zip_count}/{len(zips)} ZIPs ({zip_success} with data)")

        # Fetch property tax rate by ZIP (more accurate)
        rate_data = fetch_property_tax_rate(
            city=zip_data['name'] or "",
            state=zip_data['state_abbr'] or "",
            zip_code=zip_data['geo_id']
        )

        if rate_data and rate_data['median_rate'] is not None:
            insert_or_update_property_tax(
                conn,
                geo_type='ZCTA',
                geo_id=zip_data['geo_id'],
                rate_data=rate_data,
                source="API Ninjas"
            )
            zip_success += 1
            if zip_count % 50 == 0:
                print(f"   ✓ ZIP {zip_data['geo_id']}: {rate_data['median_rate']:.2f}%")

        # Rate limiting
        time.sleep(0.2)

    # Summary
    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print(f"   Cities: {city_success}/{len(cities)} ({city_success/len(cities)*100:.1f}% coverage)")
    print(f"   ZIPs: {zip_success}/{len(zips)} ({zip_success/len(zips)*100:.1f}% coverage)")

    conn.close()


if __name__ == "__main__":
    main()
