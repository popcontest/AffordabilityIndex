#!/usr/bin/env python3
"""
Audit county FIPS coverage in geo_city table
"""
import psycopg2
import os

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

# Get totals
cursor.execute('SELECT COUNT(*) FROM geo_city')
total = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM geo_city WHERE "countyFips" IS NOT NULL')
has_fips = cursor.fetchone()[0]

cursor.execute('SELECT COUNT(*) FROM geo_city WHERE "countyFips" IS NULL')
no_fips = cursor.fetchone()[0]

print('=' * 70)
print('COUNTY FIPS COVERAGE AUDIT')
print('=' * 70)
print(f'Total cities: {total:,}')
print(f'With county FIPS: {has_fips:,} ({has_fips/total*100:.1f}%)')
print(f'Missing county FIPS: {no_fips:,} ({no_fips/total*100:.1f}%)')
print()

# Get top 20 cities missing FIPS by population
cursor.execute('''
    SELECT name, "stateAbbr", population
    FROM geo_city
    WHERE "countyFips" IS NULL
    ORDER BY population DESC NULLS LAST
    LIMIT 20
''')

print('Top 20 cities missing county FIPS (by population):')
for row in cursor.fetchall():
    pop_str = f"{row[2]:,}" if row[2] else "unknown"
    print(f'  - {row[0]}, {row[1]} (pop: {pop_str})')

print()

# Get distribution by state
cursor.execute('''
    SELECT
        "stateAbbr",
        COUNT(*) as total,
        COUNT("countyFips") as with_fips,
        COUNT(*) - COUNT("countyFips") as missing
    FROM geo_city
    GROUP BY "stateAbbr"
    HAVING COUNT(*) - COUNT("countyFips") > 0
    ORDER BY (COUNT(*) - COUNT("countyFips")) DESC
    LIMIT 10
''')

print('Top 10 states with most missing county FIPS:')
print(f'{"State":<8} {"Total":<8} {"With FIPS":<10} {"Missing":<10}')
print('-' * 40)
for row in cursor.fetchall():
    print(f'{row[0]:<8} {row[1]:<8} {row[2]:<10} {row[3]:<10}')

conn.close()
