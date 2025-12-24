#!/usr/bin/env python3
"""
HUD Fair Market Rents (FMR) ETL Script

Downloads and imports HUD FMR data to measure rental affordability.

Data Source: https://www.huduser.gov/portal/datasets/fmr.html
File: County-level FMRs (Fiscal Year 2026, XLSX format)
Update Frequency: Annual (published each fiscal year)
Coverage: ~90% of US counties

FMR Definition: 40th percentile gross rents (rent + utilities) for standard quality units
Used for Section 8 Housing Choice Voucher program calculations

Usage:
    python etl/phase1_housing/import_hud_fmr.py [--dry-run]

Database Updates:
    - Updates affordability_snapshot.hudFmr1Br field (1-bedroom FMR)
    - Updates affordability_snapshot.hudFmr2Br field (2-bedroom FMR)
    - Updates affordability_snapshot.hudFmr3Br field (3-bedroom FMR)
    - Maps county-level FMR to cities via countyFips
"""

import os
import sys
import argparse
import logging
from io import BytesIO

import pandas as pd
from psycopg2.extras import execute_values
import requests

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import db, parsers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# HUD FMR Data URL (FY 2026)
HUD_FMR_URL = "https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx"


def download_hud_fmr():
    """
    Download HUD FMR XLSX file.

    Returns:
        BytesIO: In-memory buffer containing XLSX file
    """
    logger.info(f"Downloading HUD FMR from {HUD_FMR_URL}")

    try:
        response = requests.get(HUD_FMR_URL, timeout=60)
        response.raise_for_status()

        logger.info(f"Downloaded {len(response.content):,} bytes")
        return BytesIO(response.content)

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download HUD FMR data: {e}")
        raise


def parse_hud_fmr(xlsx_buffer):
    """
    Parse HUD FMR XLSX file.

    Args:
        xlsx_buffer: BytesIO buffer containing XLSX file

    Returns:
        pd.DataFrame with columns: [county_fips, fmr_1br, fmr_2br, fmr_3br]
    """
    logger.info("Parsing HUD FMR XLSX file")

    try:
        # HUD FMR files typically have multiple sheets
        # Try reading all sheets to find the data
        xlsx = pd.ExcelFile(xlsx_buffer, engine='openpyxl')
        logger.info(f"Available sheets: {xlsx.sheet_names}")

        # Usually the data is in the first sheet or a sheet named 'FY26_FMRs' or similar
        # Let's try the first sheet first
        df = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl')

        logger.info(f"Loaded DataFrame with shape: {df.shape}")
        logger.info(f"Columns: {list(df.columns)}")
        logger.info(f"First few rows:\n{df.head()}")

        # HUD FMR files typically have columns like:
        # - fips (county FIPS code)
        # - fmr_0, fmr_1, fmr_2, fmr_3, fmr_4 (0-4 bedroom FMRs)
        # - Or: fips2010, fmr1, fmr2, fmr3
        # - County name, state, metro area (metadata)

        # We'll need to identify the correct columns dynamically
        # Common column name patterns:
        column_map = {}

        # Find FIPS column
        for col in df.columns:
            col_lower = str(col).lower()
            if 'fips' in col_lower or 'fips2010' in col_lower or 'county_code' in col_lower:
                column_map['fips'] = col
                break

        # Find 1BR, 2BR, 3BR columns
        for col in df.columns:
            col_lower = str(col).lower()
            if 'fmr' in col_lower or 'rent' in col_lower:
                if '1' in col_lower or 'one' in col_lower:
                    column_map['fmr_1br'] = col
                elif '2' in col_lower or 'two' in col_lower:
                    column_map['fmr_2br'] = col
                elif '3' in col_lower or 'three' in col_lower:
                    column_map['fmr_3br'] = col

        logger.info(f"Identified columns: {column_map}")

        if 'fips' not in column_map:
            logger.error("Could not identify FIPS column")
            logger.info("Please inspect the file structure manually")
            return df  # Return raw for inspection

        # Extract relevant columns
        result = pd.DataFrame()

        # HUD FIPS codes are 9 digits: first 5 are county FIPS
        # Use common parser to normalize to 5-digit format
        result['county_fips'] = df[column_map['fips']].astype(str).apply(lambda x: parsers.normalize_county_fips(x))

        if 'fmr_1br' in column_map:
            result['fmr_1br'] = pd.to_numeric(df[column_map['fmr_1br']], errors='coerce')
        else:
            logger.warning("Could not find 1BR FMR column")
            result['fmr_1br'] = None

        if 'fmr_2br' in column_map:
            result['fmr_2br'] = pd.to_numeric(df[column_map['fmr_2br']], errors='coerce')
        else:
            logger.warning("Could not find 2BR FMR column")
            result['fmr_2br'] = None

        if 'fmr_3br' in column_map:
            result['fmr_3br'] = pd.to_numeric(df[column_map['fmr_3br']], errors='coerce')
        else:
            logger.warning("Could not find 3BR FMR column")
            result['fmr_3br'] = None

        # Remove rows with no valid FIPS or invalid FMR data
        result = result.dropna(subset=['county_fips'])
        result = result[result['county_fips'].str.len() == 5]

        # Also filter out rows with all null FMR values
        result = result[(result['fmr_1br'].notna()) | (result['fmr_2br'].notna()) | (result['fmr_3br'].notna())]

        logger.info(f"After cleaning: {len(result):,} counties")
        logger.info(f"Sample data:\n{result.head()}")

        return result

    except Exception as e:
        logger.error(f"Failed to parse HUD FMR data: {e}", exc_info=True)
        raise


def map_fmr_to_cities(conn, fmr_df, dry_run=False):
    """
    Map county-level FMR to cities and update database.

    Args:
        conn: Database connection
        fmr_df: DataFrame with [county_fips, fmr_1br, fmr_2br, fmr_3br]
        dry_run: If True, don't commit changes

    Returns:
        dict: Statistics about the import
    """
    logger.info("Mapping FMR data to cities")

    cursor = conn.cursor()

    # Get all cities with county FIPS using common utility
    cities = db.get_cities_with_county_fips(cursor)
    logger.info(f"Found {len(cities):,} cities with county FIPS codes")

    # Create county_fips → FMR mapping
    fmr_map = {}
    for _, row in fmr_df.iterrows():
        county_fips = row['county_fips']
        fmr_map[county_fips] = {
            'fmr_1br': row['fmr_1br'],
            'fmr_2br': row['fmr_2br'],
            'fmr_3br': row['fmr_3br']
        }

    logger.info(f"FMR data available for {len(fmr_map):,} counties")

    # Prepare updates for affordability_snapshot
    updates = []
    cities_matched = 0

    for city_id, city_name, state_abbr, county_fips in cities:
        county_fips_str = parsers.normalize_county_fips(county_fips) if county_fips else None

        if county_fips_str and county_fips_str in fmr_map:
            fmr_data = fmr_map[county_fips_str]
            updates.append((
                fmr_data['fmr_1br'],
                fmr_data['fmr_2br'],
                fmr_data['fmr_3br'],
                city_id
            ))
            cities_matched += 1

    logger.info(f"Matched {cities_matched:,} cities to FMR data ({cities_matched/len(cities)*100:.1f}%)")

    if dry_run:
        logger.info("[DRY RUN] Would update affordability_snapshot for matched cities")
        logger.info(f"[DRY RUN] Sample updates: {updates[:5]}")
        return {
            'total_cities': len(cities),
            'cities_matched': cities_matched,
            'match_rate': cities_matched / len(cities) if cities else 0,
            'dry_run': True
        }

    # Ensure affordability snapshots exist for all cities
    city_ids = [city_id for city_id, _, _, _ in cities]
    created = db.ensure_snapshots_exist(cursor, 'CITY', city_ids)

    # Now update FMR fields for all matched cities
    logger.info(f"Updating FMR fields for {len(updates):,} cities")

    execute_values(cursor, """
        UPDATE affordability_snapshot AS a
        SET
            "hudFmr1Br" = v.fmr_1br,
            "hudFmr2Br" = v.fmr_2br,
            "hudFmr3Br" = v.fmr_3br
        FROM (VALUES %s) AS v(fmr_1br, fmr_2br, fmr_3br, city_id)
        WHERE a."geoType" = 'CITY'
          AND a."geoId" = v.city_id
    """, updates, page_size=1000)

    rows_updated = cursor.rowcount
    conn.commit()

    logger.info(f"Successfully updated {rows_updated:,} affordability snapshots")

    return {
        'total_cities': len(cities),
        'cities_matched': cities_matched,
        'match_rate': cities_matched / len(cities) if cities else 0,
        'rows_updated': rows_updated,
        'dry_run': False
    }


def main():
    """Main ETL execution."""
    parser = argparse.ArgumentParser(description='Import HUD Fair Market Rents data')
    parser.add_argument('--dry-run', action='store_true',
                        help='Download and parse data without database writes')
    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("HUD Fair Market Rents (FMR) ETL")
    logger.info("=" * 70)

    if args.dry_run:
        logger.info("[DRY RUN MODE] No database changes will be made")

    try:
        # Step 1: Download HUD FMR data
        xlsx_buffer = download_hud_fmr()

        # Step 2: Parse XLSX file
        fmr_df = parse_hud_fmr(xlsx_buffer)

        # Step 3: Connect to database
        conn = db.get_connection()

        # Step 4: Map to cities and update database
        stats = map_fmr_to_cities(conn, fmr_df, dry_run=args.dry_run)

        # Step 5: Report results
        logger.info("=" * 70)
        logger.info("IMPORT COMPLETE")
        logger.info("=" * 70)
        logger.info(f"Total cities: {stats['total_cities']:,}")
        logger.info(f"Cities matched: {stats['cities_matched']:,}")
        logger.info(f"Match rate: {stats['match_rate']*100:.1f}%")
        if not args.dry_run:
            logger.info(f"Rows updated: {stats['rows_updated']:,}")

        conn.close()

    except Exception as e:
        logger.error(f"ETL failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
