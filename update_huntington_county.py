#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# Update Huntington to have the correct county FIPS
cur.execute('''
    UPDATE geo_city
    SET "countyFips" = '54011'
    WHERE name = 'Huntington' AND "stateAbbr" = 'WV' AND "countyName" = 'Cabell County'
''')

rows_updated = cur.rowcount
conn.commit()

print(f"Updated {rows_updated} row(s) - Huntington, WV now mapped to Cabell County (54011)")

# Verify
cur.execute('''
    SELECT "cityId", name, "countyFips", "countyName"
    FROM geo_city
    WHERE name = 'Huntington' AND "stateAbbr" = 'WV'
''')
result = cur.fetchone()

if result:
    print(f"\nVerification:")
    print(f"  City ID: {result[0]}")
    print(f"  Name: {result[1]}")
    print(f"  County FIPS: {result[2]}")
    print(f"  County Name: {result[3]}")

cur.close()
conn.close()
