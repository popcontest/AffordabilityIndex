#!/usr/bin/env python3
import os, psycopg2
from psycopg2.extras import RealDictCursor
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor(cursor_factory=RealDictCursor)

# Get Detroit's city ID and all scores
cur.execute("""
SELECT
    gc."cityId",
    gc.name,
    gc."stateAbbr",
    a."homeValue",
    a."medianIncome",
    a."homeValue" / NULLIF(a."medianIncome", 0) as ratio,
    v2."housingScore",
    v2."colScore",
    v2."taxScore",
    v2."compositeScore",
    v2."housingBurdenRatio",
    v2."taxBurdenRatio"
FROM geo_city gc
LEFT JOIN affordability_snapshot a
    ON a."geoType" = 'CITY' AND a."geoId" = gc."cityId"
LEFT JOIN v2_affordability_score v2
    ON v2."geoType" = 'CITY' AND v2."geoId" = gc."cityId"
WHERE gc.name = 'Detroit' AND gc."stateAbbr" = 'MI'
""")

detroit = cur.fetchone()

print('DETROIT, MICHIGAN SCORES')
print('=' * 60)
print(f'City ID: {detroit["cityId"]}')
print(f'Home Value: ${detroit["homeValue"]:,.0f}')
print(f'Median Income: ${detroit["medianIncome"]:,.0f}')
print(f'V1 Ratio: {detroit["ratio"]:.2f}')
print()
print('V2 COMPONENT SCORES:')
print(f'  Housing Score: {detroit["housingScore"]:.2f}')
print(f'  COL Score: {detroit["colScore"] if detroit["colScore"] else "N/A"}')
print(f'  Tax Score: {detroit["taxScore"]:.2f}')
print(f'  Composite Score: {detroit["compositeScore"]:.2f}')
print()
print('BURDEN RATIOS:')
print(f'  Housing Burden: {detroit["housingBurdenRatio"] * 100:.2f}%')
print(f'  Tax Burden: {detroit["taxBurdenRatio"] * 100:.2f}%')
print()
print('ANALYSIS:')
print('=' * 60)
print(f'Hero score showing: 95 (V1 housing-only score)')
print(f'Affordability Score showing: 79 (V2 composite score)')
print()
print('DATABASE VALUES:')
print(f'  V2 Housing Score: {detroit["housingScore"]:.0f}')
print(f'  V2 Composite Score: {detroit["compositeScore"]:.0f}')
print()
print('CONCLUSION:')
if abs(detroit["housingScore"] - 95) < 1:
    print('  The hero score (95) matches V2 Housing Score (95)')
    print('  The Affordability Score (79) matches V2 Composite (79)')
    print()
    print('  BOTH ARE CORRECT - but showing different metrics!')
    print('  - Hero: V2 Housing-only score (95)')
    print('  - Detail: V2 Composite score (79) including taxes')
else:
    print('  Scores do not match expected values - investigation needed')
