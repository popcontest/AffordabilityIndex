"""
Test population import for a single state
"""
import requests
import psycopg2
import psycopg2.extras
from datetime import date
from typing import Dict, List
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Census API
CENSUS_API_BASE = "https://api.census.gov/data/2022/acs/acs5"

def fetch_state_data(state_abbr: str, state_fips: str):
    """Fetch income and population for places in a state."""
    print(f"Fetching data for {state_abbr}...")

    params = {
        "get": "NAME,B19013_001E,B01003_001E",
        "for": "place:*",
        "in": f"state:{state_fips}",
    }

    response = requests.get(CENSUS_API_BASE, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    headers = data[0]
    rows = data[1:]

    results = []
    for row in rows:
        place_name_raw = row[0]
        income_str = row[1]
        population_str = row[2]

        # Parse income
        income = None
        if income_str and income_str not in ['-666666666', 'null', None]:
            try:
                income = int(income_str)
            except:
                pass

        # Parse population
        population = None
        if population_str and population_str not in ['-666666666', 'null', None]:
            try:
                population = int(population_str)
            except:
                pass

        place_name = place_name_raw.split(',')[0].strip()
        for suffix in [' city', ' town', ' CDP', ' village', ' borough', ' municipality']:
            if place_name.endswith(suffix):
                place_name = place_name[:-len(suffix)].strip()
                break

        results.append({
            "place_name": place_name,
            "income": income,
            "population": population,
            "state_abbr": state_abbr,
        })

    print(f"  Found {len(results)} places")
    print(f"  {sum(1 for r in results if r['income'] is not None)} with income")
    print(f"  {sum(1 for r in results if r['population'] is not None)} with population")

    return results

def update_database(data: List[Dict]):
    """Update geo_city table with population data."""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    updated = 0
    not_found = 0

    for record in data:
        place_name = record['place_name']
        state_abbr = record['state_abbr']
        population = record['population']

        if population is None:
            continue

        # Find city
        cursor.execute(
            '''SELECT "cityId" FROM geo_city
               WHERE name = %s AND "stateAbbr" = %s
               LIMIT 1''',
            (place_name, state_abbr)
        )
        city_row = cursor.fetchone()

        if city_row:
            cursor.execute(
                '''UPDATE geo_city
                   SET population = %s
                   WHERE "cityId" = %s''',
                (population, city_row['cityId'])
            )
            updated += 1
        else:
            not_found += 1

    conn.commit()
    print(f"\nUpdated {updated} cities with population")
    print(f"Not found in database: {not_found}")

    # Show some examples
    cursor.execute(
        '''SELECT name, "stateAbbr", population
           FROM geo_city
           WHERE "stateAbbr" = %s AND population IS NOT NULL
           LIMIT 5''',
        (data[0]['state_abbr'],)
    )
    print("\nSample cities with population:")
    for row in cursor.fetchall():
        print(f"  {row['name']}, {row['stateAbbr']}: {row['population']:,}")

    cursor.close()
    conn.close()

# Test with Maine
print("Testing population import with Maine (ME)...")
data = fetch_state_data("ME", "23")
update_database(data)
print("\nTest complete!")
