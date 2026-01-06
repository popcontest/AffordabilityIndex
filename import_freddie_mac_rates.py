#!/usr/bin/env python3
"""
Import Mortgage Rates from Freddie Mac PMMS

This script scrapes current mortgage rates from Freddie Mac's Primary Mortgage
Market Survey (PMMS), the authoritative source for mortgage rate data.

Data Source: Freddie Mac PMMS - https://www.freddiemac.com/pmms
Update Frequency: Weekly (typically Thursday)

Can be run daily via cron/Task Scheduler:
  Daily: 0 9 * * * (9 AM daily)
  Weekly: 0 9 * * 4 (9 AM Thursday)
"""

import os
import sys
import requests
from bs4 import BeautifulSoup
import psycopg2
from datetime import datetime
import re

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

FREDDIE_MAC_URL = "https://www.freddiemac.com/pmms"

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

def scrape_freddie_mac_rates():
    """Scrape current mortgage rates from Freddie Mac PMMS website"""

    print(f"\nFetching mortgage rates from {FREDDIE_MAC_URL}...")

    try:
        response = requests.get(FREDDIE_MAC_URL, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

        if response.status_code != 200:
            print(f"ERROR: HTTP {response.status_code}")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Freddie Mac typically displays rates in a table or prominent section
        # We need to find the current rates display
        # The page structure may vary, so we'll look for common patterns

        rates_data = {}
        as_of_date = None

        # Look for the "as of" date
        # Common patterns: "As of January 2, 2025" or similar
        date_text = soup.get_text()
        date_match = re.search(r'(?:As of|Week of)\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})', date_text, re.IGNORECASE)
        if date_match:
            date_str = date_match.group(1)
            try:
                as_of_date = datetime.strptime(date_str, '%B %d, %Y').date()
            except:
                pass

        if not as_of_date:
            as_of_date = datetime.now().date()

        # Look for rate values in the page
        # Common patterns:
        # - 30-year fixed: 6.5%
        # - 15-year fixed: 5.8%
        # - 5/1 ARM: 6.2%

        # Try to find rates in text
        text = soup.get_text()

        # Pattern for 30-year
        match_30 = re.search(r'30[- ]?year.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if match_30:
            rates_data['30_year_fixed'] = float(match_30.group(1))

        # Pattern for 15-year
        match_15 = re.search(r'15[- ]?year.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if match_15:
            rates_data['15_year_fixed'] = float(match_15.group(1))

        # Pattern for 5/1 ARM
        match_arm = re.search(r'5[/-]1\s+ARM.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if match_arm:
            rates_data['5_1_arm'] = float(match_arm.group(1))

        # Also try finding in meta tags or structured data
        meta_rates = soup.find_all('meta', attrs={'name': re.compile(r'rate', re.I)})
        for meta in meta_rates:
            content = meta.get('content', '')
            if 'content' in meta.attrs:
                # Try to extract rate from meta content
                rate_match = re.search(r'(\d+\.\d+)', content)
                if rate_match:
                    # Determine loan type from meta name
                    name = meta.get('name', '').lower()
                    if '30' in name:
                        rates_data.setdefault('30_year_fixed', float(rate_match.group(1)))
                    elif '15' in name:
                        rates_data.setdefault('15_year_fixed', float(rate_match.group(1)))

        # Try to find the main rate display table or section
        # Look for common class names or IDs
        rate_table = soup.find('table', class_=re.compile(r'rate', re.I))
        if not rate_table:
            rate_table = soup.find('div', class_=re.compile(r'rate', re.I))

        if rate_table:
            # Extract rates from table cells
            cells = rate_table.find_all(['td', 'th', 'div', 'span'])
            for i, cell in enumerate(cells):
                cell_text = cell.get_text(strip=True)

                # Check if this cell mentions a loan type
                if '30' in cell_text.lower() and 'year' in cell_text.lower():
                    # Look for rate in next cells
                    for next_cell in cells[i+1:i+4]:
                        rate_match = re.search(r'(\d+\.\d+)', next_cell.get_text())
                        if rate_match:
                            rates_data.setdefault('30_year_fixed', float(rate_match.group(1)))
                            break

                elif '15' in cell_text.lower() and 'year' in cell_text.lower():
                    for next_cell in cells[i+1:i+4]:
                        rate_match = re.search(r'(\d+\.\d+)', next_cell.get_text())
                        if rate_match:
                            rates_data.setdefault('15_year_fixed', float(rate_match.group(1)))
                            break

        if not rates_data:
            print("WARNING: Could not find rates on page")
            print("Page text sample:")
            print(text[:500])
            return None

        print(f"  Found {len(rates_data)} rate(s)")
        print(f"  As of date: {as_of_date}")

        return {
            'rates': rates_data,
            'as_of_date': as_of_date
        }

    except Exception as e:
        print(f"ERROR scraping Freddie Mac: {e}")
        import traceback
        traceback.print_exc()
        return None

def insert_mortgage_rates(conn, rates_data, as_of_date):
    """Insert mortgage rate data into database"""

    cur = conn.cursor()
    rates_inserted = 0

    for loan_type_key, rate in rates_data.items():
        # Normalize loan type name
        loan_type = loan_type_key.replace('_', ' ').title()

        # Generate ID
        record_id = f"{loan_type_key}-{as_of_date}"

        cur.execute("""
            INSERT INTO mortgage_rate
            (id, "loanType", rate, points, "asOfDate", source, "updatedAt")
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("loanType", "asOfDate")
            DO UPDATE SET
                rate = EXCLUDED.rate,
                "updatedAt" = NOW()
        """, (
            record_id,
            loan_type,
            rate,
            None,  # Points not typically displayed on main page
            as_of_date,
            'Freddie Mac PMMS'
        ))

        rates_inserted += 1
        print(f"  OK: {loan_type}: {rate}%")

    conn.commit()
    cur.close()

    return rates_inserted

def import_freddie_mac_rates():
    """Main import function"""

    print("\n" + "=" * 60)
    print("Mortgage Rate Import - Freddie Mac PMMS")
    print("=" * 60)

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)

    # Create table if needed
    create_mortgage_rate_table(conn)

    # Scrape rates from Freddie Mac
    result = scrape_freddie_mac_rates()

    if not result or not result['rates']:
        print("ERROR: Failed to fetch mortgage rates")
        conn.close()
        return 1

    # Insert into database
    print(f"\nInserting rates (as of {result['as_of_date']})...")
    count = insert_mortgage_rates(conn, result['rates'], result['as_of_date'])

    conn.close()

    print("\n" + "=" * 60)
    print(f"SUCCESS: Import complete - {count} mortgage rates imported")
    print("=" * 60)

    return 0

if __name__ == '__main__':
    exit_code = import_freddie_mac_rates()
    sys.exit(exit_code)
