#!/usr/bin/env python3
"""
Import Sales Tax Data from Tax Foundation LOST Excel

This script imports state and local sales tax rates from the Tax Foundation's
Local Option Sales Tax (LOST) Excel file and applies them to cities and ZCTAs.

Data Source: Tax Foundation - LOST (Local Option Sales Tax) Data
File: LOST_July_2025_Table_Data.xlsx
"""

import os
import sys
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_batch
import pandas as pd

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

EXCEL_PATH = r"Z:\Downloads\LOST_July_2025_Table_Data.xlsx"

def create_sales_tax_table(conn):
    """Create sales_tax_rate table if it doesn't exist"""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS sales_tax_rate (
            id VARCHAR(255) PRIMARY KEY,
            "geoType" VARCHAR(10) NOT NULL,
            "geoId" VARCHAR(16) NOT NULL,
            "stateRate" DOUBLE PRECISION NOT NULL,
            "localRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "combinedRate" DOUBLE PRECISION NOT NULL,
            "asOfYear" INTEGER NOT NULL,
            source VARCHAR(255),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE("geoType", "geoId", "asOfYear")
        )
    """)

    # Create indexes
    cur.execute("""
        CREATE INDEX IF NOT EXISTS sales_tax_rate_geo_idx
        ON sales_tax_rate("geoType", "geoId")
    """)

    conn.commit()
    cur.close()
    print("OK: sales_tax_rate table ready")

def parse_sales_tax_excel(excel_path):
    """Parse Tax Foundation LOST Excel file"""
    print(f"\nReading Excel file: {excel_path}")

    # Read the Excel file - skip first row (header), use row 1 as column names
    df = pd.read_excel(excel_path, sheet_name='Table', header=1)

    # Filter out footnote rows (rows where State column is NaN or contains notes)
    df = df[df['State'].notna()]
    df = df[~df['State'].str.contains('sources', case=False, na=False)]
    df = df[~df['State'].str.contains('sales taxes in', case=False, na=False)]
    df = df[~df['State'].str.contains('special taxes', case=False, na=False)]
    df = df[~df['State'].str.contains('Salem County', case=False, na=False)]

    print(f"  States found: {len(df)}")
    print(f"  Columns: {list(df.columns)}")

    return df

def import_sales_tax_data(excel_path):
    """Import sales tax data from Excel file"""

    print("\n" + "=" * 60)
    print("Sales Tax Import - Tax Foundation LOST Data")
    print("=" * 60)

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)

    # Create table if needed
    create_sales_tax_table(conn)

    # Parse Excel file
    df = parse_sales_tax_excel(excel_path)

    # Map state names to abbreviations
    us_states = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
        'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
        'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
        'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
        'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
        'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
        'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
        'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
        'District of Columbia': 'DC'
    }

    # Import state-level sales tax rates
    print(f"\nInserting {len(df)} state sales tax rates...")
    cur = conn.cursor()
    records = []

    for _, row in df.iterrows():
        state_name = row['State']
        state_abbr = us_states.get(state_name)

        if not state_abbr:
            print(f"  WARNING: Unknown state: {state_name}")
            continue

        state_rate = float(row['State Tax Rate']) if pd.notna(row['State Tax Rate']) else 0.0
        avg_local_rate = float(row['Avg. Local Tax Rate']) if pd.notna(row['Avg. Local Tax Rate']) else 0.0
        combined_rate = float(row['Combined Tax Rate']) if pd.notna(row['Combined Tax Rate']) else state_rate

        # Insert state-level record
        record_id = f"STATE-{state_abbr}-2025"
        records.append((
            record_id,
            'STATE',
            state_abbr,
            state_rate,
            avg_local_rate,
            combined_rate,
            2025,
            'Tax Foundation LOST'
        ))

    execute_batch(cur, """
        INSERT INTO sales_tax_rate (
            id, "geoType", "geoId",
            "stateRate", "localRate", "combinedRate",
            "asOfYear", source, "updatedAt"
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
            "stateRate" = EXCLUDED."stateRate",
            "localRate" = EXCLUDED."localRate",
            "combinedRate" = EXCLUDED."combinedRate",
            "updatedAt" = NOW()
    """, records, page_size=100)

    conn.commit()
    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print(f"SUCCESS: Import complete - {len(records)} state sales tax rates imported")
    print("=" * 60)

    return len(records)

if __name__ == '__main__':
    import_sales_tax_data(EXCEL_PATH)
