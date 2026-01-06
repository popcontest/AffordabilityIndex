#!/usr/bin/env python3
"""
Import Current Mortgage Rates from API Ninjas

This script fetches current mortgage rates (30-year fixed, 15-year fixed, etc.)
from the API Ninjas Mortgage Rate API and stores them for affordability calculations.

Data Source: API Ninjas - Mortgage Rate API
API: https://api-ninjas.com/api/mortgagerate
"""

import os
import sys
import requests
import psycopg2
from datetime import datetime

DATABASE_URL = os.environ.get('DATABASE_URL')
API_NINJAS_KEY = os.environ.get('API_NINJAS_KEY')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

if not API_NINJAS_KEY:
    print("ERROR: API_NINJAS_KEY environment variable not set")
    sys.exit(1)

def create_mortgage_rate_table(conn):
    """Create mortgage_rate table if it doesn't exist"""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS mortgage_rate (
            id VARCHAR(255) PRIMARY KEY,
            "loanType" VARCHAR(50) NOT NULL,
            rate DOUBLE PRECISION NOT NULL,
            points DOUBLE PRECISION,
            "asOfDate" DATE NOT NULL,
            source VARCHAR(255),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE("loanType", "asOfDate")
        )
    """)

    # Create indexes
    cur.execute("""
        CREATE INDEX IF NOT EXISTS mortgage_rate_loan_type_idx
        ON mortgage_rate("loanType")
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS mortgage_rate_date_idx
        ON mortgage_rate("asOfDate")
    """)

    conn.commit()
    cur.close()
    print("OK: mortgage_rate table ready")

def fetch_mortgage_rates():
    """Fetch current mortgage rates from API Ninjas"""

    url = "https://api.api-ninjas.com/v1/mortgagerate"

    headers = {
        'X-Api-Key': API_NINJAS_KEY
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            print(f"ERROR: API returned status {response.status_code}")
            print(response.text)
            return None

        data = response.json()
        return data

    except Exception as e:
        print(f"ERROR fetching mortgage rates: {e}")
        return None

def insert_mortgage_rates(conn, rates_data, as_of_date):
    """Insert mortgage rate data into database"""

    cur = conn.cursor()

    # Map API response fields to our loan types
    # The API Ninjas response typically includes:
    # - 30_year_fixed
    # - 15_year_fixed
    # - 5_1_arm (5-year ARM)

    rates_inserted = 0

    for loan_type_key, rate_data in rates_data.items():
        # Normalize loan type name
        loan_type = loan_type_key.replace('_', ' ').title()

        # Extract rate (API may return rate as percentage or decimal)
        rate = None
        points = None

        if isinstance(rate_data, dict):
            rate = rate_data.get('rate')
            points = rate_data.get('points')
        elif isinstance(rate_data, (int, float)):
            rate = rate_data

        if rate is None:
            continue

        # Generate ID
        record_id = f"{loan_type_key}-{as_of_date}"

        cur.execute("""
            INSERT INTO mortgage_rate
            (id, "loanType", rate, points, "asOfDate", source, "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("loanType", "asOfDate")
            DO UPDATE SET
                rate = EXCLUDED.rate,
                points = EXCLUDED.points,
                "updatedAt" = NOW()
        """, (
            record_id,
            loan_type,
            rate,
            points,
            as_of_date,
            'API Ninjas'
        ))

        rates_inserted += 1
        print(f"  OK: {loan_type}: {rate}%")

    conn.commit()
    cur.close()

    return rates_inserted

def import_mortgage_rates():
    """Main import function"""

    print("\n" + "=" * 60)
    print("Mortgage Rate Import - API Ninjas")
    print("=" * 60)

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)

    # Create table if needed
    create_mortgage_rate_table(conn)

    # Fetch rates from API
    print("\nFetching current mortgage rates from API Ninjas...")
    rates_data = fetch_mortgage_rates()

    if not rates_data:
        print("ERROR: Failed to fetch mortgage rates")
        conn.close()
        return

    print(f"\nReceived data from API")
    print(f"  Raw response: {rates_data}")

    # Insert into database
    as_of_date = datetime.now().date()
    print(f"\nInserting rates (as of {as_of_date})...")

    count = insert_mortgage_rates(conn, rates_data, as_of_date)

    conn.close()

    print("\n" + "=" * 60)
    print(f"SUCCESS: Import complete - {count} mortgage rates imported")
    print("=" * 60)

if __name__ == '__main__':
    import_mortgage_rates()
