#!/usr/bin/env python3
"""
Backfill County FIPS Codes for Cities

Uses Census Geocoding API to find county FIPS codes for cities that are missing them.

This is CRITICAL for data coverage - only 5.5% of cities currently have county FIPS codes,
which prevents matching to county-level data sources (HUD FMR, FHFA HPI, childcare, etc.)

Usage:
    python backfill_county_fips.py [--limit N] [--dry-run]

    --limit N: Only backfill first N cities (for testing)
    --dry-run: Don't commit to database
"""

import sys
import os
import argparse
import logging
from datetime import datetime

# Add etl directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'etl'))

from common.db import get_connection, transaction, get_cities_without_county_fips
from common.geocoding import CensusGeocoder
from psycopg2.extras import execute_values

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def backfill_county_fips(limit: int = None, dry_run: bool = False):
    """
    Backfill missing county FIPS codes.

    Args:
        limit: Maximum number of cities to process (None for all)
        dry_run: If True, don't commit changes to database
    """
    logger.info("="*70)
    logger.info("COUNTY FIPS BACKFILL")
    logger.info("="*70)

    if dry_run:
        logger.info("[DRY RUN MODE] No database changes will be made")

    # Connect to database
    conn = get_connection()
    cursor = conn.cursor()

    # Get cities missing county FIPS
    logger.info("Fetching cities missing county FIPS codes...")
    cities = get_cities_without_county_fips(cursor, limit=limit)

    if not cities:
        logger.info("No cities missing county FIPS codes!")
        return

    logger.info(f"Found {len(cities):,} cities missing county FIPS codes")

    if limit:
        logger.info(f"Processing first {limit:,} cities (--limit flag)")

    # Initialize geocoder
    geocoder = CensusGeocoder()

    # Track results
    successful = []
    failed = []
    start_time = datetime.now()

    # Process cities
    for i, (city_id, name, state_abbr) in enumerate(cities, 1):
        try:
            # Geocode using city name and state
            county_fips = geocoder.geocode_address(name, state_abbr, retry_count=2)

            if county_fips:
                successful.append((county_fips, city_id))
                logger.debug(f"✓ {name}, {state_abbr} -> {county_fips}")
            else:
                failed.append((city_id, name, state_abbr))
                logger.debug(f"✗ {name}, {state_abbr} -> NO MATCH")

            # Progress reporting every 100 cities
            if i % 100 == 0:
                elapsed = (datetime.now() - start_time).total_seconds()
                rate = i / elapsed if elapsed > 0 else 0
                success_rate = len(successful) / i * 100
                remaining = len(cities) - i
                eta_seconds = remaining / rate if rate > 0 else 0

                logger.info(
                    f"Progress: {i:,}/{len(cities):,} ({i/len(cities)*100:.1f}%) | "
                    f"Success: {success_rate:.1f}% | "
                    f"Rate: {rate:.1f} cities/sec | "
                    f"ETA: {eta_seconds/60:.1f} min"
                )

        except KeyboardInterrupt:
            logger.warning("Interrupted by user!")
            break

        except Exception as e:
            logger.error(f"Unexpected error processing {name}, {state_abbr}: {e}")
            failed.append((city_id, name, state_abbr))

    # Summary
    total_processed = len(successful) + len(failed)
    success_rate = len(successful) / total_processed * 100 if total_processed > 0 else 0

    logger.info("="*70)
    logger.info("BACKFILL COMPLETE")
    logger.info("="*70)
    logger.info(f"Cities processed: {total_processed:,}")
    logger.info(f"Successfully geocoded: {len(successful):,} ({success_rate:.1f}%)")
    logger.info(f"Failed to geocode: {len(failed):,}")

    if dry_run:
        logger.info("[DRY RUN] Would update database with successful matches")
        if successful:
            logger.info(f"Sample matches: {successful[:10]}")
        conn.close()
        return

    # Update database
    if successful:
        logger.info(f"Updating database with {len(successful):,} county FIPS codes...")

        update_query = """
            UPDATE geo_city
            SET "countyFips" = v.county_fips
            FROM (VALUES %s) AS v(county_fips, city_id)
            WHERE geo_city."cityId" = v.city_id
        """

        execute_values(cursor, update_query, successful, page_size=1000)
        rows_updated = cursor.rowcount

        conn.commit()
        logger.info(f"Successfully updated {rows_updated:,} cities")

    # Save failed cities for manual review
    if failed:
        failed_file = "failed_geocoding.csv"
        logger.info(f"Saving {len(failed):,} failed cities to {failed_file}")

        with open(failed_file, 'w') as f:
            f.write("cityId,name,stateAbbr\n")
            for city_id, name, state_abbr in failed:
                f.write(f"{city_id},{name},{state_abbr}\n")

    conn.close()

    # Final stats
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"Total time: {elapsed/60:.1f} minutes")
    logger.info(f"Average rate: {total_processed/elapsed:.1f} cities/second")

    # Calculate new coverage
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM geo_city')
    total_cities = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM geo_city WHERE "countyFips" IS NOT NULL')
    cities_with_fips = cursor.fetchone()[0]

    new_coverage = cities_with_fips / total_cities * 100
    logger.info(f"New county FIPS coverage: {cities_with_fips:,}/{total_cities:,} ({new_coverage:.1f}%)")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Backfill missing county FIPS codes using Census Geocoding API'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Maximum number of cities to process (for testing)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview results without database updates'
    )

    args = parser.parse_args()

    try:
        backfill_county_fips(limit=args.limit, dry_run=args.dry_run)
    except KeyboardInterrupt:
        logger.warning("Interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Backfill failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
