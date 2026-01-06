#!/usr/bin/env python3
"""
Import MIT Living Wage data for ALL US counties

This script:
1. Fetches the complete list of US counties from Census API
2. Scrapes MIT Living Wage Calculator for each county
3. Inserts into cost_basket table

Source: https://livingwage.mit.edu/
Coverage: All 3,244 US counties
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

def fetch_all_us_counties():
    """Fetch all US counties from Census API"""
    print("Fetching county list from Census API...")

    url = "https://api.census.gov/data/2021/acs/acs5/profile"
    params = {
        'get': 'NAME',
        'for': 'county:*',
    }

    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Skip header row
        counties = []
        for row in data[1:]:
            county_name = row[0]  # e.g. "Los Angeles County, California"
            state_fips = row[1]
            county_fips_3digit = row[2]

            # Build 5-digit county FIPS
            county_fips = f"{state_fips}{county_fips_3digit}"

            # Extract state abbreviation from name
            parts = county_name.split(', ')
            if len(parts) == 2:
                county_part = parts[0].replace(' County', '').replace(' Parish', '').replace(' Borough', '').replace(' Census Area', '').replace(' Municipality', '')
                state_name = parts[1]

                # Map state name to abbreviation (simplified)
                state_abbr = get_state_abbr(state_name)

                counties.append((county_fips, county_part, state_abbr, state_fips))

        print(f"Found {len(counties)} counties from Census API")
        return counties

    except Exception as e:
        print(f"Error fetching from Census API: {e}")
        print("Will try to use existing database counties...")
        return fetch_db_counties()

def get_state_abbr(state_name):
    """Map state name to abbreviation"""
    states = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
        'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
        'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
        'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
        'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
        'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
        'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
        'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
        'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
        'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
        'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
        'Puerto Rico': 'PR'
    }
    return states.get(state_name, 'XX')

def fetch_db_counties():
    """Fallback: Fetch counties from database"""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute('''
        SELECT DISTINCT "countyFips", "countyName", "stateAbbr"
        FROM geo_city
        WHERE "countyFips" IS NOT NULL
        ORDER BY "countyFips"
    ''')

    counties = cur.fetchall()
    cur.close()
    conn.close()

    # Add stateFips from countyFips
    counties = [(c[0], c[1], c[2], c[0][:2]) for c in counties]

    print(f"Found {len(counties)} counties in database")
    return counties

def scrape_county_living_wage(county_fips):
    """Scrape MIT Living Wage data for a county"""
    url = f"https://livingwage.mit.edu/counties/{county_fips}"

    try:
        response = requests.get(url, timeout=15, headers={
            'User-Agent': 'AffordabilityIndex Research Project (non-commercial)'
        })

        if response.status_code == 404:
            return []

        if response.status_code != 200:
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        tables = soup.find_all('table')

        for table in tables:
            all_text = table.get_text()
            if '1 ADULT' not in all_text.upper():
                continue

            rows = table.find_all('tr')
            if len(rows) < 3:
                continue

            # Fixed column mapping based on MIT structure
            column_map = {
                1: '1_adult_0_kids',
                2: '1_adult_1_kid',
                3: '1_adult_2_kids',
                4: '1_adult_3_kids',
                9: '2_adults_0_kids',
                10: '2_adults_1_kid',
                11: '2_adults_2_kids',
                12: '2_adults_3_kids',
            }

            cost_data = {ht: {} for ht in HOUSEHOLD_TYPES}

            for row in rows[2:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 2:
                    continue

                row_label = cells[0].get_text(strip=True)

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
                elif row_label in ['Other', 'Civic', 'Internet & Mobile', 'Broadband', 'Child Care']:
                    category = 'other'

                if not category:
                    continue

                for col_idx, household in column_map.items():
                    if col_idx < len(cells):
                        value_text = cells[col_idx].get_text(strip=True)
                        value = parse_currency(value_text)
                        if value is not None:
                            if category == 'other' and category in cost_data[household]:
                                cost_data[household][category] += value
                            else:
                                cost_data[household][category] = value

            results = []
            for household, costs in cost_data.items():
                if costs:
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
                return results

        return []

    except Exception:
        return []

def parse_currency(text):
    """Parse currency string to float"""
    if not text:
        return None
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

    state_fips = county_fips[:2]

    records = []
    for basket in baskets:
        record_id = str(uuid.uuid4()).replace('-', '')[:25]

        records.append((
            record_id,
            county_fips,
            state_fips,
            state_abbr,
            county_name,
            'mit_living_wage',
            '2024',
            basket['household_type'],
            basket['food'],
            basket['healthcare'],
            basket['transportation'],
            basket['taxes'],
            basket['other'],
            basket['housing'],
            basket['total_annual']
        ))

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
    print("MIT Living Wage Data Import - ALL US COUNTIES")
    print("=" * 60)
    print("\nNOTE: This script scrapes data from livingwage.mit.edu")
    print("Rate limit: 1 request every 2 seconds")
    print("=" * 60)

    # Fetch all US counties
    counties = fetch_all_us_counties()

    if not counties:
        print("No counties found!")
        return

    response = input(f"\nProceed with scraping {len(counties)} counties? (yes/no): ")
    if response.lower() != 'yes':
        print("Aborted.")
        return

    # Process each county
    total_success = 0
    total_failed = 0

    for idx, (county_fips, county_name, state_abbr, state_fips) in enumerate(counties):
        print(f"\n[{idx+1}/{len(counties)}] {county_name}, {state_abbr} ({county_fips})")

        baskets = scrape_county_living_wage(county_fips)

        if baskets:
            insert_cost_baskets(county_fips, county_name, state_abbr, baskets)
            total_success += 1
        else:
            total_failed += 1

        # Rate limiting
        if idx < len(counties) - 1:
            time.sleep(2)

    print("\n" + "=" * 60)
    print(f"COMPLETE:")
    print(f"  Success: {total_success} counties")
    print(f"  Failed:  {total_failed} counties")
    print("=" * 60)

if __name__ == '__main__':
    main()
