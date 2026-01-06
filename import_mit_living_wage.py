#!/usr/bin/env python3
"""
Import MIT Living Wage data for all US counties

This script:
1. Fetches all US county FIPS codes
2. Scrapes MIT Living Wage Calculator for each county
3. Parses cost breakdown by household type
4. Inserts into cost_basket table

Source: https://livingwage.mit.edu/
Coverage: All 3,143 US counties
License: Check MIT Living Wage terms (generally OK for non-commercial/research)

Example URL: https://livingwage.mit.edu/counties/06037 (Los Angeles County)
"""

import os
import sys
import time
import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_batch
import re
import uuid

# Database connection
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# Configuration
HOUSEHOLD_TYPES = [
    '1_adult_0_kids',
    '1_adult_1_kid',
    '1_adult_2_kids',
    '1_adult_3_kids',
    '2_adults_0_kids',
    '2_adults_1_kid',
    '2_adults_2_kids',
    '2_adults_3_kids',
]

# Mapping MIT column headers to our household types
MIT_TO_HOUSEHOLD = {
    '1 Adult': '1_adult_0_kids',
    '1 Adult 1 Child': '1_adult_1_kid',
    '1 Adult 2 Children': '1_adult_2_kids',
    '1 Adult 3 Children': '1_adult_3_kids',
    '2 Adults (1 Working)': '2_adults_0_kids',  # Fallback
    '2 Adults': '2_adults_0_kids',
    '2 Adults 1 Child': '2_adults_1_kid',
    '2 Adults 2 Children': '2_adults_2_kids',
    '2 Adults 3 Children': '2_adults_3_kids',
}

def fetch_all_counties():
    """Fetch all US county FIPS codes from database or Census"""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get unique county FIPS from geo_city table
    cur.execute('''
        SELECT DISTINCT "countyFips", "countyName", "stateAbbr"
        FROM geo_city
        WHERE "countyFips" IS NOT NULL
        ORDER BY "countyFips"
    ''')

    counties = cur.fetchall()
    cur.close()
    conn.close()

    print(f"Found {len(counties)} counties in database")
    return counties

def scrape_county_living_wage(county_fips):
    """
    Scrape MIT Living Wage data for a county

    Args:
        county_fips: 5-digit county FIPS code

    Returns:
        List of dicts with cost breakdown by household type
    """
    url = f"https://livingwage.mit.edu/counties/{county_fips}"

    try:
        response = requests.get(url, timeout=15, headers={
            'User-Agent': 'AffordabilityIndex Research Project (non-commercial)'
        })

        if response.status_code == 404:
            print(f"    County {county_fips} not found on MIT Living Wage")
            return []

        if response.status_code != 200:
            print(f"    ERROR: HTTP {response.status_code} for county {county_fips}")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find all tables and look for "Typical Expenses"
        tables = soup.find_all('table')

        for table in tables:
            # Look for table containing "Typical Expenses" in caption or nearby heading
            # Check if any cell contains key MIT headers
            all_text = table.get_text()
            if '1 ADULT' not in all_text.upper():
                continue

            # Parse the nested header structure
            # First row has adult types, second row has child counts
            rows = table.find_all('tr')
            if len(rows) < 3:  # Need headers + at least one data row
                continue

            # Build column mapping based on MIT's fixed structure
            # ROW 0: Has 3 adult-type headers (1 ADULT, 2 ADULTS 1 WORKING, 2 ADULTS BOTH WORKING)
            # ROW 1: Has 12 child-count headers (0-3 children for each adult type)
            # Data rows: 13 cells total (1 label + 12 values)
            #
            # Column mapping in data rows:
            # 1-4:   1 ADULT (0, 1, 2, 3 children)
            # 5-8:   2 ADULTS (1 WORKING) - skip these
            # 9-12:  2 ADULTS (BOTH WORKING) (0, 1, 2, 3 children)

            column_map = {
                # 1 ADULT columns
                1: '1_adult_0_kids',
                2: '1_adult_1_kid',
                3: '1_adult_2_kids',
                4: '1_adult_3_kids',
                # Skip 2 ADULTS (1 WORKING) - columns 5-8
                # 2 ADULTS (BOTH WORKING) columns
                9: '2_adults_0_kids',
                10: '2_adults_1_kid',
                11: '2_adults_2_kids',
                12: '2_adults_3_kids',
            }

            # Parse data rows
            cost_data = {ht: {} for ht in HOUSEHOLD_TYPES}

            # Start from row 2 (skip headers)
            for row in rows[2:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue

                row_label = cells[0].get_text(strip=True)

                # Map row labels to cost categories
                category = None
                if row_label == 'Food':
                    category = 'food'
                elif row_label == 'Medical':
                    category = 'healthcare'
                elif row_label == 'Transportation':
                    category = 'transportation'
                elif 'Annual taxes' in row_label or row_label == 'Taxes':
                    category = 'taxes'
                elif row_label == 'Housing':
                    category = 'housing'
                elif row_label in ['Other', 'Civic', 'Internet & Mobile', 'Broadband']:
                    # Combine these into 'other'
                    category = 'other'
                elif 'Child Care' in row_label:
                    # Add to other (not a separate category in our schema)
                    category = 'other'

                if not category:
                    continue

                # Extract values for mapped columns
                for col_idx, household in column_map.items():
                    if col_idx < len(cells):
                        value_text = cells[col_idx].get_text(strip=True)
                        value = parse_currency(value_text)
                        if value is not None:
                            # Sum multiple 'other' category items
                            if category == 'other' and category in cost_data[household]:
                                cost_data[household][category] += value
                            else:
                                cost_data[household][category] = value

            # Build results
            results = []
            for household, costs in cost_data.items():
                if costs:  # Only if we have data
                    total = sum(costs.values())
                    results.append({
                        'household_type': household,
                        'food': costs.get('food'),
                        'healthcare': costs.get('healthcare'),
                        'transportation': costs.get('transportation'),
                        'taxes': costs.get('taxes'),
                        'housing': costs.get('housing'),
                        'other': costs.get('other'),
                        'total_annual': total
                    })

            if results:
                return results  # Found and parsed the table

        return []

    except requests.RequestException as e:
        print(f"    Network error for county {county_fips}: {e}")
        return []
    except Exception as e:
        print(f"    Error parsing county {county_fips}: {e}")
        import traceback
        traceback.print_exc()
        return []

def parse_currency(text):
    """Parse currency string to float: '$12,345.67' -> 12345.67"""
    if not text:
        return None

    # Remove $, commas, spaces
    clean = re.sub(r'[$,\s]', '', text)

    try:
        return float(clean)
    except ValueError:
        return None

def insert_cost_baskets(county_fips, county_name, state_abbr, baskets):
    """Insert cost basket records into database"""
    if not baskets:
        return

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Get state FIPS (first 2 digits of county FIPS)
    state_fips = county_fips[:2]

    records = []
    for basket in baskets:
        # Generate a unique ID (UUID as string)
        record_id = str(uuid.uuid4()).replace('-', '')[:25]  # Shorten to fit typical CUID length

        records.append((
            record_id,
            county_fips,
            state_fips,
            state_abbr,
            county_name,
            'mit_living_wage',  # source
            '2024',  # version (update this to current year)
            basket['household_type'],
            basket['food'],
            basket['healthcare'],
            basket['transportation'],
            basket['taxes'],
            basket['other'],
            basket['housing'],
            basket['total_annual']
        ))

    # Upsert (insert or update on conflict)
    execute_batch(
        cur,
        '''
        INSERT INTO cost_basket (
            id, "countyFips", "stateFips", "stateAbbr", "countyName",
            source, version, "householdType",
            food, healthcare, transportation, taxes, other, housing, "totalAnnual",
            "createdAt", "updatedAt"
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT ("countyFips", source, version, "householdType")
        DO UPDATE SET
            food = EXCLUDED.food,
            healthcare = EXCLUDED.healthcare,
            transportation = EXCLUDED.transportation,
            taxes = EXCLUDED.taxes,
            other = EXCLUDED.other,
            housing = EXCLUDED.housing,
            "totalAnnual" = EXCLUDED."totalAnnual",
            "updatedAt" = NOW()
        ''',
        records,
        page_size=100
    )

    conn.commit()
    cur.close()
    conn.close()

    print(f"    Inserted {len(records)} household types")

def main():
    """Main execution"""
    print("=" * 60)
    print("MIT Living Wage Data Import")
    print("=" * 60)
    print("\nNOTE: This script scrapes data from livingwage.mit.edu")
    print("Please ensure compliance with their terms of service.")
    print("Consider contacting MIT for bulk data access: livingwage@mit.edu")
    print("\nRate limit: 1 request every 2 seconds")
    print("=" * 60)

    # Fetch counties
    counties = fetch_all_counties()

    if not counties:
        print("No counties found in database!")
        return

    # Check if we should continue
    response = input(f"\nProceed with scraping {len(counties)} counties? (yes/no): ")
    if response.lower() != 'yes':
        print("Aborted.")
        return

    # Process each county
    total_success = 0
    total_failed = 0

    for idx, (county_fips, county_name, state_abbr) in enumerate(counties):
        print(f"\n[{idx+1}/{len(counties)}] {county_name}, {state_abbr} ({county_fips})")

        baskets = scrape_county_living_wage(county_fips)

        if baskets:
            insert_cost_baskets(county_fips, county_name, state_abbr, baskets)
            total_success += 1
        else:
            total_failed += 1

        # Rate limiting - be respectful to MIT servers
        if idx < len(counties) - 1:
            time.sleep(2)  # 2 seconds between requests

    print("\n" + "=" * 60)
    print(f"COMPLETE:")
    print(f"  Success: {total_success} counties")
    print(f"  Failed:  {total_failed} counties")
    print("=" * 60)

if __name__ == '__main__':
    main()
