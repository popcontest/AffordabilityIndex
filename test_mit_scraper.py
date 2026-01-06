#!/usr/bin/env python3
"""
Test the MIT Living Wage scraper on a single county
"""

import sys
import requests
from bs4 import BeautifulSoup
import re

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
            print(f"County {county_fips} not found on MIT Living Wage")
            return []

        if response.status_code != 200:
            print(f"ERROR: HTTP {response.status_code} for county {county_fips}")
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

            print(f"\nColumn mapping: {column_map}")

            if not column_map:
                continue

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

                print(f"\nProcessing row: {row_label} -> {category}")

                # Extract values for mapped columns
                for col_idx, household in column_map.items():
                    if col_idx < len(cells):
                        value_text = cells[col_idx].get_text(strip=True)
                        value = parse_currency(value_text)
                        if value is not None:
                            print(f"  {household} = {value}")
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
        print(f"Network error for county {county_fips}: {e}")
        return []
    except Exception as e:
        print(f"Error parsing county {county_fips}: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == '__main__':
    # Test with Los Angeles County (06037)
    print("Testing MIT Living Wage scraper on Los Angeles County (06037)")
    print("=" * 60)

    results = scrape_county_living_wage('06037')

    print("\n" + "=" * 60)
    print(f"Results: {len(results)} household types")
    print("=" * 60)

    for result in results:
        print(f"\n{result['household_type']}:")
        print(f"  Food:           ${result['food']:,.0f}")
        print(f"  Healthcare:     ${result['healthcare']:,.0f}")
        print(f"  Transportation: ${result['transportation']:,.0f}")
        print(f"  Taxes:          ${result['taxes']:,.0f}")
        print(f"  Housing:        ${result['housing']:,.0f}")
        print(f"  Other:          ${result['other']:,.0f}")
        print(f"  TOTAL:          ${result['total_annual']:,.0f}")
