#!/usr/bin/env python3
"""
Match Census places to Zillow cities and backfill county FIPS codes.

Reads the Census Place → County FIPS mapping CSV and matches places
to cities in the geo_city table, then updates county FIPS codes.

Usage:
    python match_and_backfill_county_fips.py --mapping census_place_county_mapping.csv
"""

import os
import sys
import argparse
import logging
import csv
import psycopg2
from typing import Dict, List, Tuple

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def load_place_mapping(csv_path: str) -> Dict[Tuple[str, str], str]:
    """
    Load Census Place → County FIPS mapping from CSV.

    Returns:
        Dictionary mapping (place_name, state_abbr) → county_fips
    """
    mapping = {}

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            place_name = row['name']
            state_abbr = row['state_abbr']
            county_fips = row['county_fips']

            # Store mapping with normalized key
            key = (place_name.upper(), state_abbr.upper())
            mapping[key] = county_fips

    logger.info(f"Loaded {len(mapping):,} Census place mappings from {csv_path}")
    return mapping


def match_and_update_cities(mapping: Dict[Tuple[str, str], str], database_url: str, dry_run: bool = False):
    """
    Match Census places to cities in database and update county FIPS codes.

    Args:
        mapping: Dictionary of (place_name, state_abbr) → county_fips
        database_url: PostgreSQL connection string
        dry_run: If True, don't actually update the database
    """
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    try:
        # Get all cities without county FIPS
        cursor.execute("""
            SELECT "cityId", name, "stateAbbr", "countyFips"
            FROM geo_city
            ORDER BY population DESC NULLS LAST
        """)

        cities = cursor.fetchall()
        logger.info(f"Loaded {len(cities):,} cities from database")

        # Track matching statistics
        matched = 0
        already_had_fips = 0
        no_match = 0
        updates = []

        for city_id, city_name, state_abbr, existing_fips in cities:
            # Skip if already has county FIPS
            if existing_fips:
                already_had_fips += 1
                continue

            # Try exact match first
            key = (city_name.upper(), state_abbr.upper())
            county_fips = mapping.get(key)

            if county_fips:
                matched += 1
                updates.append((county_fips, city_id))

                if matched % 100 == 0:
                    logger.info(f"  Matched {matched} cities...")
            else:
                no_match += 1
                if no_match <= 10:  # Log first 10 unmatched cities
                    logger.debug(f"  No match: {city_name}, {state_abbr}")

        logger.info(f"\n=== MATCHING RESULTS ===")
        logger.info(f"Total cities: {len(cities):,}")
        logger.info(f"Already had county FIPS: {already_had_fips:,}")
        logger.info(f"Matched to Census places: {matched:,}")
        logger.info(f"No match found: {no_match:,}")

        if dry_run:
            logger.info(f"\nDRY RUN: Would update {len(updates):,} cities")
            if updates[:5]:
                logger.info("Sample updates (first 5):")
                for county_fips, city_id in updates[:5]:
                    logger.info(f"  City ID {city_id} → County FIPS {county_fips}")
        else:
            # Perform bulk update
            logger.info(f"\nUpdating {len(updates):,} cities with county FIPS codes...")

            cursor.executemany(
                'UPDATE geo_city SET "countyFips" = %s WHERE "cityId" = %s',
                updates
            )

            conn.commit()
            logger.info(f"Successfully updated {len(updates):,} cities")

            # Verify final coverage
            cursor.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT("countyFips") as with_fips
                FROM geo_city
            """)
            total, with_fips = cursor.fetchone()
            coverage_pct = (with_fips / total * 100) if total > 0 else 0

            logger.info(f"\n=== FINAL COVERAGE ===")
            logger.info(f"Total cities: {total:,}")
            logger.info(f"With county FIPS: {with_fips:,} ({coverage_pct:.1f}%)")
            logger.info(f"Missing county FIPS: {total - with_fips:,} ({100 - coverage_pct:.1f}%)")

    finally:
        cursor.close()
        conn.close()


def main():
    parser = argparse.ArgumentParser(description='Match Census places to cities and backfill county FIPS')
    parser.add_argument('--mapping', required=True, help='Path to Census place-county mapping CSV')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be updated without making changes')
    args = parser.parse_args()

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)

    if not os.path.exists(args.mapping):
        logger.error(f"Mapping file not found: {args.mapping}")
        sys.exit(1)

    logger.info("=== Census Place → City Matching ===")
    logger.info(f"Mapping file: {args.mapping}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info("")

    # Load mapping
    mapping = load_place_mapping(args.mapping)

    # Match and update
    match_and_update_cities(mapping, database_url, dry_run=args.dry_run)

    logger.info("\nComplete!")


if __name__ == '__main__':
    main()
