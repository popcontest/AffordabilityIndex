#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# Total counties with MIT data
cur.execute('SELECT COUNT(DISTINCT "countyFips") FROM cost_basket WHERE source = \'mit_living_wage\'')
count = cur.fetchone()[0]

# Sample counties
cur.execute('''
    SELECT "countyFips", "countyName", "stateAbbr", COUNT(*) as household_types
    FROM cost_basket
    WHERE source = 'mit_living_wage'
    GROUP BY "countyFips", "countyName", "stateAbbr"
    ORDER BY "stateAbbr", "countyName"
    LIMIT 10
''')
samples = cur.fetchall()

# Check Huntington WV county
cur.execute('''
    SELECT "countyFips", "countyName", "stateAbbr"
    FROM geo_city
    WHERE name = 'Huntington' AND "stateAbbr" = 'WV'
    LIMIT 1
''')
huntington = cur.fetchone()

print(f'MIT Living Wage Data:')
print(f'Total unique counties: {count}')
print(f'\nSample counties:')
for row in samples:
    print(f'  {row[1]}, {row[2]} ({row[0]}): {row[3]} household types')

if huntington:
    county_fips = huntington[0]
    print(f'\nHuntington, WV county: {huntington[1]}, {huntington[2]} ({county_fips})')

    # Check if this county has MIT data
    cur.execute('''
        SELECT COUNT(*)
        FROM cost_basket
        WHERE "countyFips" = %s AND source = 'mit_living_wage'
    ''', (county_fips,))
    hunt_count = cur.fetchone()[0]
    print(f'  MIT data records: {hunt_count}')

cur.close()
conn.close()
