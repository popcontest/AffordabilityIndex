#!/usr/bin/env python3
"""
Import Zillow Observed Rent Index (ZORI) Data

This script imports typical rent data from Zillow's ZORI datasets for cities and counties.

Usage:
    python import_zori.py
"""

import os
import sys
import csv
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# ZORI CSV files (from Zillow Research)
CITY_ZORI_PATH = r"Z:\Downloads\City_zori_uc_sfrcondomfr_sm_month.csv"
COUNTY_ZORI_PATH = r"Z:\Downloads\County_zori_uc_sfrcondomfr_sm_month.csv"


def create_zori_table(conn):
    """Create zori table if it doesn't exist"""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS zori (
            id SERIAL PRIMARY KEY,
            "regionId" INTEGER NOT NULL,
            "regionName" VARCHAR(255) NOT NULL,
            "regionType" VARCHAR(50) NOT NULL,
            "stateName" VARCHAR(255),
            "state" VARCHAR(2),
            metro VARCHAR(255),
            "countyName" VARCHAR(255),
            "asOfDate" DATE NOT NULL,
            rent DOUBLE PRECISION NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE("regionId", "asOfDate")
        )
    """)

    # Create indexes
    cur.execute("""
        CREATE INDEX IF NOT EXISTS zori_region_idx
        ON zori("regionId", "asOfDate")
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS zori_name_state_idx
        ON zori("regionName", "state")
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS zori_type_idx
        ON zori("regionType")
    """)

    conn.commit()
    cur.close()
    print("OK: zori table ready")


def import_zori_file(conn, csv_path, region_type):
    """Import ZORI data from a CSV file"""
    print(f"\nImporting {region_type} ZORI data from {csv_path}...")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        # Date columns start after metadata columns
        metadata_cols = ['RegionID', 'SizeRank', 'RegionName', 'RegionType', 'StateName', 'State', 'Metro', 'CountyName']
        date_columns = [col for col in headers if col not in metadata_cols]

        print(f"  Found {len(date_columns)} monthly data points per region")
        print(f"  Date range: {date_columns[0]} to {date_columns[-1]}")

        records = []
        region_count = 0

        for row in reader:
            region_id = int(row['RegionID'])
            region_name = row['RegionName']
            state = row.get('State', '')
            state_name = row.get('StateName', '')
            metro = row.get('Metro', '')
            county_name = row.get('CountyName', '')

            # Process most recent 12 months only (to keep dataset manageable)
            recent_dates = date_columns[-12:]

            for date_str in recent_dates:
                rent_value = row.get(date_str, '').strip()

                if rent_value and rent_value != '':
                    try:
                        rent = float(rent_value)

                        # Parse date (format: YYYY-MM-DD)
                        as_of_date = datetime.strptime(date_str, '%Y-%m-%d').date()

                        records.append((
                            region_id,
                            region_name,
                            region_type,
                            state_name,
                            state,
                            metro,
                            county_name,
                            as_of_date,
                            rent
                        ))

                    except (ValueError, TypeError):
                        # Skip invalid values
                        pass

            region_count += 1

            # Batch insert every 100 regions
            if region_count % 100 == 0:
                if records:
                    insert_zori_records(conn, records)
                    print(f"    Processed {region_count} regions ({len(records)} records)...")
                    records = []

        # Insert remaining records
        if records:
            insert_zori_records(conn, records)
            print(f"    Processed {region_count} regions ({len(records)} records)...")

    print(f"  COMPLETE: Imported {region_count} {region_type} regions")
    return region_count


def insert_zori_records(conn, records):
    """Insert batch of ZORI records"""
    if not records:
        return

    cur = conn.cursor()

    execute_batch(cur, """
        INSERT INTO zori (
            "regionId", "regionName", "regionType",
            "stateName", "state", metro, "countyName",
            "asOfDate", rent, "updatedAt"
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT ("regionId", "asOfDate")
        DO UPDATE SET
            rent = EXCLUDED.rent,
            "updatedAt" = NOW()
    """, records, page_size=500)

    conn.commit()
    cur.close()


def main():
    """Main execution"""
    print("=" * 70)
    print("Zillow ZORI (Rent Index) Import")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    conn = psycopg2.connect(DATABASE_URL)

    # Create table
    create_zori_table(conn)

    # Import city ZORI
    city_count = 0
    if os.path.exists(CITY_ZORI_PATH):
        city_count = import_zori_file(conn, CITY_ZORI_PATH, 'city')
    else:
        print(f"WARNING: City ZORI file not found: {CITY_ZORI_PATH}")

    # Import county ZORI
    county_count = 0
    if os.path.exists(COUNTY_ZORI_PATH):
        county_count = import_zori_file(conn, COUNTY_ZORI_PATH, 'county')
    else:
        print(f"WARNING: County ZORI file not found: {COUNTY_ZORI_PATH}")

    conn.close()

    # Summary
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Cities imported:   {city_count:,}")
    print(f"Counties imported: {county_count:,}")
    print(f"Total regions:     {city_count + county_count:,}")
    print()
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


if __name__ == '__main__':
    main()
