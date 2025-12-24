"""
CLI script to populate countyFips for cities in GeoCity table

Usage:
    python etl/populate_county_fips_cli.py [--dry-run]
"""

import sys
import os
import argparse
import psycopg2

# Add etl directory to path
sys.path.insert(0, os.path.dirname(__file__))

from county_lookup import lookup_county_fips


def populate_county_fips(database_url: str, dry_run: bool = False):
    """
    Populate countyFips for cities based on countyName lookup.

    Args:
        database_url: PostgreSQL connection string
        dry_run: If True, print actions without executing
    """
    print("\n[Populating County FIPS]")
    print(f"  Mode: {'DRY-RUN' if dry_run else 'LIVE'}")

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    # Get cities with county names but no FIPS
    cursor.execute("""
        SELECT "cityId", "stateAbbr", "countyName"
        FROM geo_city
        WHERE "countyName" IS NOT NULL
          AND "countyFips" IS NULL
        ORDER BY "stateAbbr", "countyName"
    """)

    cities = cursor.fetchall()
    print(f"  Found {len(cities)} cities with countyName but no countyFips")

    if len(cities) == 0:
        print("  Nothing to update")
        cursor.close()
        conn.close()
        return

    # Lookup county FIPS for each city
    updates = []
    not_found = []

    for city_id, state_abbr, county_name in cities:
        county_fips = lookup_county_fips(state_abbr, county_name)

        if county_fips:
            updates.append((county_fips, city_id))
        else:
            not_found.append((city_id, state_abbr, county_name))

    print(f"  Matched: {len(updates)} cities")
    print(f"  Not found: {len(not_found)} cities")

    if not_found and len(not_found) <= 20:
        print("\n  Counties not found in lookup table:")
        for city_id, state_abbr, county_name in not_found[:20]:
            print(f"    - {county_name}, {state_abbr}")

    if dry_run:
        print(f"\n  [DRY-RUN] Would update {len(updates)} cities")
        if updates:
            print(f"  Sample: cityId={updates[0][1]} -> countyFips={updates[0][0]}")
        cursor.close()
        conn.close()
        return

    # Perform updates
    if updates:
        from psycopg2.extras import execute_values

        execute_values(
            cursor,
            """
            UPDATE geo_city AS gc
            SET "countyFips" = data.fips
            FROM (VALUES %s) AS data(fips, id)
            WHERE gc."cityId" = data.id
            """,
            updates
        )

        conn.commit()
        print(f"\n  Successfully updated {len(updates)} cities with countyFips")

    cursor.close()
    conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Populate countyFips for cities in GeoCity table"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Print actions without executing'
    )

    args = parser.parse_args()

    # Get DATABASE_URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    populate_county_fips(database_url, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
