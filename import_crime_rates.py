#!/usr/bin/env python3
"""
Import Crime Rate Data

This script imports county-level crime statistics from FBI UCR data (via Jacob Kaplan's
concatenated files or other sources) and stores them for use in the affordability index.

Data Source Options:
1. Jacob Kaplan's County-Level UCR Data (openICPSR.org/openicpsr/project/108164)
2. FBI Crime Data Explorer manual exports
3. FBI Crime Data Explorer API (requires API key)

Expected CSV format:
- county_fips or fips: 5-digit FIPS code
- year: Year of data
- violent_crime_rate: Violent crimes per 100k (or violent_crime_total + population)
- property_crime_rate: Property crimes per 100k (or property_crime_total + population)

Usage:
    python import_crime_rates.py
    python import_crime_rates.py fbi_county_crime_data.csv
"""

import os
import sys
import csv
import psycopg2
from psycopg2.extras import execute_batch
import re

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# Default CSV path
DEFAULT_CSV_PATH = "fbi_county_crime_data.csv"

def create_crime_rate_table(conn):
    """Create crime_rate table if it doesn't exist"""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS crime_rate (
            id VARCHAR(255) PRIMARY KEY,
            "geoType" VARCHAR(10) NOT NULL,
            "geoId" VARCHAR(16) NOT NULL,
            "violentCrimeRate" DOUBLE PRECISION,
            "propertyCrimeRate" DOUBLE PRECISION,
            "totalCrimeRate" DOUBLE PRECISION,
            "asOfYear" INTEGER NOT NULL,
            source VARCHAR(255),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE("geoType", "geoId", "asOfYear")
        )
    """)

    # Create indexes
    cur.execute("""
        CREATE INDEX IF NOT EXISTS crime_rate_geo_idx
        ON crime_rate("geoType", "geoId")
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS crime_rate_year_idx
        ON crime_rate("asOfYear")
    """)

    conn.commit()
    cur.close()
    print("OK: crime_rate table ready")

def detect_column_mapping(headers):
    """Auto-detect column names from CSV header"""
    mapping = {
        'fips': None,
        'year': None,
        'violent_rate': None,
        'property_rate': None,
        'violent_total': None,
        'property_total': None,
        'population': None
    }

    headers_lower = [h.lower().strip() for h in headers]

    for i, h in enumerate(headers_lower):
        # FIPS code
        if 'fips' in h or h == 'county_fips' or h == 'geoid':
            mapping['fips'] = i
        # Year
        elif h == 'year' or h == 'data_year':
            mapping['year'] = i
        # Violent crime rate
        elif 'violent' in h and ('rate' in h or 'per' in h):
            mapping['violent_rate'] = i
        # Property crime rate
        elif 'property' in h and ('rate' in h or 'per' in h):
            mapping['property_rate'] = i
        # Violent crime total
        elif 'violent' in h and ('total' in h or 'count' in h):
            mapping['violent_total'] = i
        # Property crime total
        elif 'property' in h and ('total' in h or 'count' in h):
            mapping['property_total'] = i
        # Population
        elif 'population' in h or h == 'pop':
            mapping['population'] = i

    return mapping

def parse_fips(value):
    """Parse and normalize FIPS code"""
    if not value:
        return None

    # Remove any non-digits
    fips = re.sub(r'[^0-9]', '', str(value))

    # Pad to 5 digits if needed
    if len(fips) <= 5:
        fips = fips.zfill(5)

    # Validate
    if len(fips) != 5:
        return None

    return fips

def import_crime_csv(csv_path, conn):
    """Import crime data from CSV file"""

    print(f"\nReading CSV: {csv_path}")

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)

        # Detect column mapping
        mapping = detect_column_mapping(headers)
        print(f"\nColumn mapping detected:")
        print(f"  FIPS: {headers[mapping['fips']] if mapping['fips'] is not None else 'NOT FOUND'}")
        print(f"  Year: {headers[mapping['year']] if mapping['year'] is not None else 'NOT FOUND'}")
        print(f"  Violent Rate: {headers[mapping['violent_rate']] if mapping['violent_rate'] is not None else 'NOT FOUND'}")
        print(f"  Property Rate: {headers[mapping['property_rate']] if mapping['property_rate'] is not None else 'NOT FOUND'}")

        if mapping['fips'] is None or mapping['year'] is None:
            print("\nERROR: Could not detect required columns (FIPS and Year)")
            print("Expected column names like: 'fips', 'county_fips', 'year', etc.")
            return 0

        # Parse rows
        records = []
        skipped = 0

        for row_num, row in enumerate(reader, start=2):
            if len(row) <= max([v for v in mapping.values() if v is not None]):
                skipped += 1
                continue

            # Extract values
            fips = parse_fips(row[mapping['fips']])
            if not fips:
                skipped += 1
                continue

            try:
                year = int(row[mapping['year']])
            except (ValueError, IndexError):
                skipped += 1
                continue

            # Get crime rates (or calculate from totals)
            violent_rate = None
            property_rate = None

            # Try direct rate columns
            if mapping['violent_rate'] is not None:
                try:
                    violent_rate = float(row[mapping['violent_rate']])
                except (ValueError, IndexError):
                    pass

            if mapping['property_rate'] is not None:
                try:
                    property_rate = float(row[mapping['property_rate']])
                except (ValueError, IndexError):
                    pass

            # If no rates, try calculating from totals + population
            if violent_rate is None and mapping['violent_total'] is not None and mapping['population'] is not None:
                try:
                    total = float(row[mapping['violent_total']])
                    pop = float(row[mapping['population']])
                    if pop > 0:
                        violent_rate = (total / pop) * 100000
                except (ValueError, IndexError, ZeroDivisionError):
                    pass

            if property_rate is None and mapping['property_total'] is not None and mapping['population'] is not None:
                try:
                    total = float(row[mapping['property_total']])
                    pop = float(row[mapping['population']])
                    if pop > 0:
                        property_rate = (total / pop) * 100000
                except (ValueError, IndexError, ZeroDivisionError):
                    pass

            # Calculate total rate
            total_rate = None
            if violent_rate is not None and property_rate is not None:
                total_rate = violent_rate + property_rate
            elif violent_rate is not None:
                total_rate = violent_rate
            elif property_rate is not None:
                total_rate = property_rate

            # Skip if no crime data
            if violent_rate is None and property_rate is None:
                skipped += 1
                continue

            # Generate ID
            record_id = f"COUNTY-{fips}-{year}"

            records.append((
                record_id,
                'COUNTY',
                fips,
                violent_rate,
                property_rate,
                total_rate,
                year,
                'FBI UCR'
            ))

        print(f"\nParsed {len(records)} records ({skipped} skipped)")

        if len(records) == 0:
            print("ERROR: No valid records to import")
            return 0

        # Insert into database
        print(f"\nInserting into database...")
        cur = conn.cursor()

        execute_batch(
            cur,
            """
            INSERT INTO crime_rate (
                id, "geoType", "geoId",
                "violentCrimeRate", "propertyCrimeRate", "totalCrimeRate",
                "asOfYear", source, "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("geoType", "geoId", "asOfYear")
            DO UPDATE SET
                "violentCrimeRate" = EXCLUDED."violentCrimeRate",
                "propertyCrimeRate" = EXCLUDED."propertyCrimeRate",
                "totalCrimeRate" = EXCLUDED."totalCrimeRate",
                "updatedAt" = NOW()
            """,
            records,
            page_size=1000
        )

        conn.commit()
        cur.close()

        return len(records)

def main():
    """Main import function"""

    print("=" * 60)
    print("Crime Rate Import - FBI UCR Data")
    print("=" * 60)

    # Get CSV path
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    else:
        csv_path = DEFAULT_CSV_PATH

    if not os.path.exists(csv_path):
        print(f"\nERROR: File not found: {csv_path}")
        print("\nPlease download crime data first:")
        print("  1. Visit: https://www.openicpsr.org/openicpsr/project/108164")
        print("  2. Register (free for research/academic use)")
        print("  3. Download 'County-Level Detailed Arrest and Offense Data' CSV")
        print(f"  4. Save as: {csv_path}")
        print("\nOr provide path as argument:")
        print(f"  python {sys.argv[0]} /path/to/crime_data.csv")
        return 1

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)

    # Create table if needed
    create_crime_rate_table(conn)

    # Import CSV
    count = import_crime_csv(csv_path, conn)

    conn.close()

    print("\n" + "=" * 60)
    print(f"SUCCESS: Import complete - {count} crime records imported")
    print("=" * 60)

    return 0

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
