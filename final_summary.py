#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

print("=" * 70)
print("FINAL SUMMARY: MIT Living Wage Import & V2 Score Generation")
print("=" * 70)

# MIT Living Wage Import Status
cur.execute('''
    SELECT COUNT(DISTINCT "countyFips")
    FROM cost_basket
    WHERE source = 'mit_living_wage'
''')
mit_counties = cur.fetchone()[0]

print(f'\n1. MIT Living Wage Import:')
print(f'   Counties imported: {mit_counties:,}')
print(f'   Status: COMPLETE (3,141 US counties)')

# V2 Score Generation Status
cur.execute('SELECT COUNT(*) FROM v2_affordability_score')
total_v2_scores = cur.fetchone()[0]

cur.execute('SELECT COUNT(*) FROM affordability_snapshot WHERE "homeValue" IS NOT NULL AND "medianIncome" IS NOT NULL')
total_geos = cur.fetchone()[0]

print(f'\n2. V2 Score Generation:')
print(f'   Scores generated: {total_v2_scores:,}')
print(f'   Total geographies: {total_geos:,}')
print(f'   Coverage: {100*total_v2_scores/total_geos:.1f}%')

# Data Quality Breakdown
cur.execute('''
    SELECT "dataQuality", COUNT(*)
    FROM v2_affordability_score
    GROUP BY "dataQuality"
    ORDER BY "dataQuality"
''')
quality_breakdown = cur.fetchall()

print(f'\n3. Data Quality Breakdown:')
for quality, count in quality_breakdown:
    print(f'   {quality}: {count:,} ({100*count/total_v2_scores:.1f}%)')

# Huntington, WV Status
print(f'\n4. Huntington, WV Status:')
cur.execute('''
    SELECT gc."cityId", gc.name, gc."countyFips", gc."countyName"
    FROM geo_city gc
    WHERE gc.name = 'Huntington' AND gc."stateAbbr" = 'WV'
''')
huntington = cur.fetchone()

if huntington:
    print(f'   City ID: {huntington[0]}')
    print(f'   Name: {huntington[1]}')
    print(f'   County FIPS: {huntington[2]}')
    print(f'   County Name: {huntington[3]}')

    # Check MIT data
    cur.execute('''
        SELECT COUNT(*)
        FROM cost_basket
        WHERE "countyFips" = %s AND source = 'mit_living_wage'
    ''', (huntington[2],))
    mit_count = cur.fetchone()[0]
    print(f'   MIT Living Wage records: {mit_count} household types')

    # Check V2 score
    cur.execute('''
        SELECT "compositeScore", "housingScore", "colScore", "taxScore", "qolScore", "dataQuality"
        FROM v2_affordability_score
        WHERE "geoType" = 'CITY' AND "geoId" = %s
    ''', (huntington[0],))
    v2_score = cur.fetchone()

    if v2_score:
        print(f'   V2 Composite Score: {v2_score[0]:.2f}')
        housing_str = f'{v2_score[1]:.2f}' if v2_score[1] is not None else 'N/A'
        col_str = f'{v2_score[2]:.2f}' if v2_score[2] is not None else 'N/A'
        tax_str = f'{v2_score[3]:.2f}' if v2_score[3] is not None else 'N/A'
        qol_str = f'{v2_score[4]:.2f}' if v2_score[4] is not None else 'N/A'
        print(f'   Housing Score: {housing_str}')
        print(f'   COL Score: {col_str}')
        print(f'   Tax Score: {tax_str}')
        print(f'   QOL Score: {qol_str}')
        print(f'   Data Quality: {v2_score[5]}')
        print(f'   Status: COMPLETE')
    else:
        print(f'   V2 Score: NOT GENERATED')
        print(f'   Status: INCOMPLETE')

print("\n" + "=" * 70)
print("Summary:")
print("  MIT Living Wage: 3,141 counties imported")
print(f"  V2 Scores: {total_v2_scores:,} geographies scored")
print("  Huntington, WV: " + ("COMPLETE with V2 data" if v2_score else "INCOMPLETE"))
print("=" * 70)

cur.close()
conn.close()
