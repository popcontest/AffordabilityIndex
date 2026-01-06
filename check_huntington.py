#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# Find Huntington WV
cur.execute('''
    SELECT "cityId", name, "stateAbbr", "countyFips", "countyName"
    FROM geo_city
    WHERE name = 'Huntington' AND "stateAbbr" = 'WV'
''')
huntington = cur.fetchone()

if huntington:
    print(f'Huntington, WV:')
    print(f'  City ID: {huntington[0]}')
    print(f'  Name: {huntington[1]}')
    print(f'  State: {huntington[2]}')
    print(f'  County FIPS: {huntington[3]}')
    print(f'  County Name: {huntington[4]}')

    # Find Cabell County FIPS
    cur.execute('''
        SELECT DISTINCT "countyFips", "countyName"
        FROM geo_city
        WHERE "countyName" = 'Cabell County' AND "stateAbbr" = 'WV'
    ''')
    cabell = cur.fetchall()

    print(f'\nCabell County FIPS codes found:')
    for row in cabell:
        print(f'  {row[0]}: {row[1]}')

    # Check WV counties in MIT data
    cur.execute('''
        SELECT "countyFips", "countyName"
        FROM cost_basket
        WHERE source = 'mit_living_wage' AND "stateAbbr" = 'WV'
        GROUP BY "countyFips", "countyName"
        ORDER BY "countyName"
    ''')
    wv_counties = cur.fetchall()

    print(f'\nWV Counties in MIT data ({len(wv_counties)} total):')
    for row in wv_counties:
        print(f'  {row[0]}: {row[1]}')
        if 'Cabell' in row[1]:
            # Check household types for Cabell
            cur.execute('''
                SELECT "householdType", "totalAnnual"
                FROM cost_basket
                WHERE "countyFips" = %s AND source = 'mit_living_wage'
            ''', (row[0],))
            households = cur.fetchall()
            print(f'    Household types: {len(households)}')
            for h in households:
                print(f'      {h[0]}: ${h[1]:,.2f}')

cur.close()
conn.close()
