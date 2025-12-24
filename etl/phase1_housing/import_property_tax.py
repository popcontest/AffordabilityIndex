#!/usr/bin/env python3
"""
Property Tax Rates ETL Script

Imports effective property tax rates for cities.

Data Source: State-level averages from Tax Foundation / Census data
Update Frequency: Annual
Coverage: 100% of US states

Note: This initial version uses state-level averages. Future enhancement:
import county-specific rates from Tax Foundation interactive map or
Census Bureau's Annual Survey of State and Local Government Finances.

Usage:
    python etl/phase1_housing/import_property_tax.py [--dry-run]

Database Updates:
    - Updates affordability_snapshot.propertyTaxRate field
    - Uses state-level effective tax rates
"""

import sys
import os
import argparse
import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# State-level effective property tax rates (2024 data)
# Source: Tax Foundation, WalletHub, Census Bureau
# Effective rate = median property tax paid / median home value
STATE_PROPERTY_TAX_RATES = {
    'AL': 0.0041,  # Alabama
    'AK': 0.0098,  # Alaska
    'AZ': 0.0062,  # Arizona
    'AR': 0.0061,  # Arkansas
    'CA': 0.0073,  # California
    'CO': 0.0051,  # Colorado
    'CT': 0.0211,  # Connecticut
    'DE': 0.0057,  # Delaware
    'FL': 0.0083,  # Florida
    'GA': 0.0083,  # Georgia
    'HI': 0.0028,  # Hawaii (lowest)
    'ID': 0.0063,  # Idaho
    'IL': 0.0215,  # Illinois
    'IN': 0.0085,  # Indiana
    'IA': 0.0154,  # Iowa
    'KS': 0.0135,  # Kansas
    'KY': 0.0086,  # Kentucky
    'LA': 0.0055,  # Louisiana
    'ME': 0.0132,  # Maine
    'MD': 0.0109,  # Maryland
    'MA': 0.0118,  # Massachusetts
    'MI': 0.0143,  # Michigan
    'MN': 0.0107,  # Minnesota
    'MS': 0.0061,  # Mississippi
    'MO': 0.0097,  # Missouri
    'MT': 0.0084,  # Montana
    'NE': 0.0176,  # Nebraska
    'NV': 0.0053,  # Nevada
    'NH': 0.0218,  # New Hampshire
    'NJ': 0.0249,  # New Jersey (highest)
    'NM': 0.0079,  # New Mexico
    'NY': 0.0169,  # New York
    'NC': 0.0084,  # North Carolina
    'ND': 0.0098,  # North Dakota
    'OH': 0.0153,  # Ohio
    'OK': 0.0087,  # Oklahoma
    'OR': 0.0087,  # Oregon
    'PA': 0.0153,  # Pennsylvania
    'RI': 0.0172,  # Rhode Island
    'SC': 0.0057,  # South Carolina
    'SD': 0.0128,  # South Dakota
    'TN': 0.0067,  # Tennessee
    'TX': 0.0180,  # Texas
    'UT': 0.0058,  # Utah
    'VT': 0.0186,  # Vermont
    'VA': 0.0081,  # Virginia
    'WA': 0.0092,  # Washington
    'WV': 0.0061,  # West Virginia
    'WI': 0.0176,  # Wisconsin
    'WY': 0.0061,  # Wyoming
    'DC': 0.0046,  # District of Columbia
}


def import_property_tax(dry_run=False):
    """
    Import state-level property tax rates to cities.

    Args:
        dry_run: If True, don't commit changes

    Returns:
        dict: Statistics about the import
    """
    logger.info("Starting property tax import")

    try:
        # Get database connection
        conn = db.get_connection()
        cursor = conn.cursor()

        # Get all cities
        cities = db.get_all_cities(cursor)
        logger.info(f"Found {len(cities):,} cities")

        # Prepare updates: map state tax rate to each city
        city_ids = []
        updates = []
        cities_matched = 0

        for city_id, city_name, state_abbr in cities:
            city_ids.append(city_id)

            if state_abbr in STATE_PROPERTY_TAX_RATES:
                tax_rate = STATE_PROPERTY_TAX_RATES[state_abbr]
                updates.append((tax_rate, city_id))
                cities_matched += 1
            else:
                logger.warning(f"No property tax rate for state: {state_abbr}")

        logger.info(f"Matched {cities_matched:,} cities to property tax data ({cities_matched/len(cities)*100:.1f}%)")

        if dry_run:
            logger.info("[DRY RUN] Would create/update snapshots for matched cities")
            logger.info(f"[DRY RUN] Sample updates: {updates[:5]}")
            conn.close()
            return {
                'total_cities': len(cities),
                'cities_matched': cities_matched,
                'match_rate': cities_matched / len(cities) if cities else 0,
                'dry_run': True
            }

        # Ensure affordability snapshots exist for all cities
        logger.info("Ensuring affordability snapshots exist")
        created = db.ensure_snapshots_exist(cursor, 'CITY', city_ids)

        # Bulk update propertyTaxRate
        logger.info(f"Updating propertyTaxRate for {len(updates):,} cities")
        rows_updated = db.bulk_update(
            cursor,
            table='affordability_snapshot',
            update_columns=['propertyTaxRate'],
            values=updates,
            where_column='geoId'
        )

        # Also need to filter by geoType - use custom query for this specific case
        cursor.execute("""
            UPDATE affordability_snapshot AS a
            SET "propertyTaxRate" = v.tax_rate
            FROM (VALUES %s) AS v(tax_rate, city_id)
            WHERE a."geoType" = 'CITY'
              AND a."geoId" = v.city_id
        """, [(rate, cid) for rate, cid in updates])

        rows_updated = cursor.rowcount
        conn.commit()

        logger.info(f"Successfully updated {rows_updated:,} affordability snapshots")

        conn.close()

        return {
            'total_cities': len(cities),
            'cities_matched': cities_matched,
            'match_rate': cities_matched / len(cities) if cities else 0,
            'snapshots_created': created,
            'rows_updated': rows_updated,
            'dry_run': False
        }

    except Exception as e:
        logger.error(f"Property tax import failed: {e}", exc_info=True)
        raise


def main():
    """Main ETL execution."""
    parser = argparse.ArgumentParser(description='Import Property Tax Rate data')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview data without database writes')
    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("Property Tax Rates ETL")
    logger.info("=" * 70)

    if args.dry_run:
        logger.info("[DRY RUN MODE] No database changes will be made")

    logger.info(f"Using state-level property tax rates for {len(STATE_PROPERTY_TAX_RATES)} states/territories")
    logger.info(f"Highest rate: New Jersey ({STATE_PROPERTY_TAX_RATES['NJ']*100:.2f}%)")
    logger.info(f"Lowest rate: Hawaii ({STATE_PROPERTY_TAX_RATES['HI']*100:.2f}%)")

    try:
        stats = import_property_tax(dry_run=args.dry_run)

        # Report results
        logger.info("=" * 70)
        logger.info("IMPORT COMPLETE")
        logger.info("=" * 70)
        logger.info(f"Total cities: {stats['total_cities']:,}")
        logger.info(f"Cities matched: {stats['cities_matched']:,}")
        logger.info(f"Match rate: {stats['match_rate']*100:.1f}%")

        if not args.dry_run:
            logger.info(f"Snapshots created: {stats['snapshots_created']:,}")
            logger.info(f"Rows updated: {stats['rows_updated']:,}")

    except Exception as e:
        logger.error(f"ETL failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
