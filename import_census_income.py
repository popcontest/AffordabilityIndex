"""
Import Census ACS median household income data and update metric_snapshot table.
"""

import requests
import psycopg2
import psycopg2.extras
from datetime import date
from typing import Dict, List, Optional
import time
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Census API (no key required for low volume)
CENSUS_API_BASE = "https://api.census.gov/data/2023/acs/acs5"

# State FIPS codes (all 50 states)
STATE_FIPS = {
    "AL": "01",  # Alabama
    "AK": "02",  # Alaska
    "AZ": "04",  # Arizona
    "AR": "05",  # Arkansas
    "CA": "06",  # California
    "CO": "08",  # Colorado
    "CT": "09",  # Connecticut
    "DE": "10",  # Delaware
    "FL": "12",  # Florida
    "GA": "13",  # Georgia
    "HI": "15",  # Hawaii
    "ID": "16",  # Idaho
    "IL": "17",  # Illinois
    "IN": "18",  # Indiana
    "IA": "19",  # Iowa
    "KS": "20",  # Kansas
    "KY": "21",  # Kentucky
    "LA": "22",  # Louisiana
    "ME": "23",  # Maine
    "MD": "24",  # Maryland
    "MA": "25",  # Massachusetts
    "MI": "26",  # Michigan
    "MN": "27",  # Minnesota
    "MS": "28",  # Mississippi
    "MO": "29",  # Missouri
    "MT": "30",  # Montana
    "NE": "31",  # Nebraska
    "NV": "32",  # Nevada
    "NH": "33",  # New Hampshire
    "NJ": "34",  # New Jersey
    "NM": "35",  # New Mexico
    "NY": "36",  # New York
    "NC": "37",  # North Carolina
    "ND": "38",  # North Dakota
    "OH": "39",  # Ohio
    "OK": "40",  # Oklahoma
    "OR": "41",  # Oregon
    "PA": "42",  # Pennsylvania
    "RI": "44",  # Rhode Island
    "SC": "45",  # South Carolina
    "SD": "46",  # South Dakota
    "TN": "47",  # Tennessee
    "TX": "48",  # Texas
    "UT": "49",  # Utah
    "VT": "50",  # Vermont
    "VA": "51",  # Virginia
    "WA": "53",  # Washington
    "WV": "54",  # West Virginia
    "WI": "55",  # Wisconsin
    "WY": "56",  # Wyoming
}


def fetch_state_income_data(state_abbr: str, state_fips: str) -> List[Dict]:
    """Fetch median household income and population for all places in a state from Census API."""
    print(f"\nFetching income and population data for {state_abbr} (FIPS {state_fips})...")

    params = {
        "get": "NAME,B19013_001E,B01003_001E",  # B19013_001E = Median Household Income, B01003_001E = Total Population
        "for": "place:*",
        "in": f"state:{state_fips}",
    }

    try:
        response = requests.get(CENSUS_API_BASE, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        # First row is headers
        headers = data[0]
        rows = data[1:]

        results = []
        for row in rows:
            place_name_raw = row[0]
            income_str = row[1]
            population_str = row[2]
            state_code = row[3]
            place_code = row[4]

            # Parse income (-666666666 means no data)
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

            # Extract city name (remove state suffix)
            # e.g., "Portland city, Maine" -> "Portland"
            place_name = place_name_raw.split(',')[0].strip()
            # Remove " city", " town", " CDP", etc.
            for suffix in [' city', ' town', ' CDP', ' village', ' borough', ' municipality']:
                if place_name.endswith(suffix):
                    place_name = place_name[:-len(suffix)].strip()
                    break

            # Create 7-digit cityId (state FIPS + place FIPS)
            city_id = f"{state_code}{place_code}"

            results.append({
                "city_id": city_id,
                "place_name": place_name,
                "place_name_raw": place_name_raw,
                "income": income,
                "population": population,
                "state_abbr": state_abbr,
            })

        print(f"  Fetched {len(results)} places ({sum(1 for r in results if r['income'] is not None)} with income data)")
        return results

    except Exception as e:
        print(f"  ERROR fetching data: {e}")
        return []


def update_metric_snapshots(conn, census_data: List[Dict], as_of_date: date):
    """Update metric_snapshot table with income data."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    updated_count = 0
    inserted_count = 0
    skipped_count = 0
    not_found_count = 0

    for record in census_data:
        census_fips_id = record['city_id']
        income = record['income']
        population = record['population']
        place_name = record['place_name']
        state_abbr = record['state_abbr']

        # Skip if both income and population are missing
        if income is None and population is None:
            skipped_count += 1
            continue

        try:
            # Match by city name and state (Zillow uses different IDs than Census FIPS)
            cursor.execute(
                '''SELECT "cityId", name FROM geo_city
                   WHERE name = %s AND "stateAbbr" = %s
                   LIMIT 1''',
                (place_name, state_abbr)
            )
            city_row = cursor.fetchone()

            if not city_row:
                not_found_count += 1
                if not_found_count <= 5:  # Only print first 5
                    pass  # Silent skip for cleaner output
                continue

            city_id = city_row['cityId']

            # Update population in geo_city table
            if population is not None:
                cursor.execute(
                    '''
                    UPDATE geo_city
                    SET population = %s
                    WHERE "cityId" = %s
                    ''',
                    (population, city_id)
                )

            # Find existing snapshot for this city
            cursor.execute(
                '''
                SELECT id, "homeValue", income, ratio
                FROM metric_snapshot
                WHERE "geoType" = 'CITY' AND "geoId" = %s
                ORDER BY "asOfDate" DESC
                LIMIT 1
                ''',
                (city_id,)
            )
            snapshot = cursor.fetchone()

            if snapshot:
                # Update existing snapshot
                snapshot_id = snapshot['id']
                home_value = snapshot['homeValue']

                # Calculate ratio if we have home value
                ratio = None
                if home_value and income and income > 0:
                    ratio = home_value / income

                # Update the snapshot
                cursor.execute(
                    '''
                    UPDATE metric_snapshot
                    SET income = %s,
                        ratio = %s,
                        sources = %s
                    WHERE id = %s
                    ''',
                    (income, ratio, '{"income_source": "census_acs5_2023", "income_match": "exact"}', snapshot_id)
                )
                updated_count += 1

                if updated_count % 100 == 0:
                    print(f"    Updated {updated_count} snapshots...")
            else:
                # No existing snapshot - create new one (income only)
                cursor.execute(
                    '''
                    INSERT INTO metric_snapshot (
                        "geoType", "geoId", "asOfDate", income, "homeValue", ratio,
                        sources
                    )
                    VALUES (
                        'CITY', %s, %s, %s, NULL, NULL,
                        %s
                    )
                    ''',
                    (city_id, as_of_date, income, '{"income_source": "census_acs5_2023", "income_match": "exact"}')
                )
                inserted_count += 1

        except Exception as e:
            print(f"  ERROR updating city: {e}")
            continue

    conn.commit()
    cursor.close()

    print(f"    Not found in geo_city: {not_found_count}")
    return updated_count, inserted_count, skipped_count


def main():
    print("=" * 60)
    print("Census ACS Income Data Import")
    print("=" * 60)

    # Connect to database
    print("\nConnecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Use 2023 data with a recent as_of_date
    as_of_date = date(2023, 12, 31)

    total_updated = 0
    total_inserted = 0
    total_skipped = 0

    # Fetch and load data for each state
    for state_abbr, state_fips in STATE_FIPS.items():
        print(f"\nFetching {state_abbr}...", flush=True)
        census_data = fetch_state_income_data(state_abbr, state_fips)

        if census_data:
            print(f"  Updating database for {state_abbr}...", flush=True)
            updated, inserted, skipped = update_metric_snapshots(conn, census_data, as_of_date)

            total_updated += updated
            total_inserted += inserted
            total_skipped += skipped

            print(f"  ✓ {state_abbr}: Updated: {updated}, Inserted: {inserted}, Skipped: {skipped}", flush=True)
        else:
            print(f"  ✗ {state_abbr}: No data returned", flush=True)

        # Be nice to Census API
        time.sleep(1)

    conn.close()

    print("\n" + "=" * 60)
    print("Import Complete!")
    print(f"  Total snapshots updated: {total_updated}")
    print(f"  Total snapshots inserted: {total_inserted}")
    print(f"  Total skipped (no income): {total_skipped}")
    print("=" * 60)


if __name__ == "__main__":
    main()
