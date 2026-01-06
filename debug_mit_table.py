#!/usr/bin/env python3
"""
Debug MIT Living Wage table structure
"""

import requests
from bs4 import BeautifulSoup

def debug_table_structure(county_fips):
    url = f"https://livingwage.mit.edu/counties/{county_fips}"

    response = requests.get(url, timeout=15, headers={
        'User-Agent': 'AffordabilityIndex Research Project (non-commercial)'
    })

    soup = BeautifulSoup(response.content, 'html.parser')
    tables = soup.find_all('table')

    print(f"Found {len(tables)} tables total\n")

    for table_idx, table in enumerate(tables):
        all_text = table.get_text()
        if '1 ADULT' not in all_text.upper():
            continue

        print(f"=" * 80)
        print(f"TABLE {table_idx + 1}")
        print("=" * 80)

        rows = table.find_all('tr')
        print(f"Total rows: {len(rows)}\n")

        # Print first 3 rows (headers)
        for row_idx in range(min(3, len(rows))):
            print(f"ROW {row_idx}:")
            cells = rows[row_idx].find_all(['th', 'td'])
            for col_idx, cell in enumerate(cells):
                text = cell.get_text(strip=True)
                colspan = cell.get('colspan', '1')
                rowspan = cell.get('rowspan', '1')
                tag = cell.name
                print(f"  [{col_idx}] <{tag} colspan={colspan} rowspan={rowspan}>")
                print(f"       Text: '{text}'")
            print()

if __name__ == '__main__':
    debug_table_structure('06037')
