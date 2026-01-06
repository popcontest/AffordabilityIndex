#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# Check if table exists and has data
cur.execute('''
    SELECT COUNT(*)
    FROM v2_affordability_score
''')
count = cur.fetchone()[0]

print(f'V2 scores generated so far: {count}')

# Check if Huntington has a score
if count > 0:
    cur.execute('''
        SELECT v2."compositeScore", v2."housingScore", v2."colScore", v2."taxScore", v2."qolScore", v2."dataQuality"
        FROM v2_affordability_score v2
        JOIN geo_city gc ON v2."geoId" = gc."cityId"
        WHERE gc.name = 'Huntington' AND gc."stateAbbr" = 'WV' AND v2."geoType" = 'CITY'
    ''')
    result = cur.fetchone()

    if result:
        print(f'\nHuntington, WV V2 Score:')
        print(f'  Composite Score: {result[0]:.2f}')
        housing_str = f'{result[1]:.2f}' if result[1] is not None else 'N/A'
        col_str = f'{result[2]:.2f}' if result[2] is not None else 'N/A'
        tax_str = f'{result[3]:.2f}' if result[3] is not None else 'N/A'
        qol_str = f'{result[4]:.2f}' if result[4] is not None else 'N/A'
        print(f'  Housing Score: {housing_str}')
        print(f'  COL Score: {col_str}')
        print(f'  Tax Score: {tax_str}')
        print(f'  QOL Score: {qol_str}')
        print(f'  Data Quality: {result[5]}')
    else:
        print('\nHuntington, WV: No V2 score yet')

cur.close()
conn.close()
