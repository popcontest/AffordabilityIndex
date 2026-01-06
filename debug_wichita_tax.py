#!/usr/bin/env python3
import os, psycopg2
from psycopg2.extras import RealDictCursor
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor(cursor_factory=RealDictCursor)

# Test the tax calculation for Wichita directly
cur.execute('''
WITH geo_with_state AS (
    SELECT a."geoType", a."geoId", a."medianIncome", gc."stateAbbr"
    FROM affordability_snapshot a
    JOIN geo_city gc ON a."geoId" = gc."cityId"
    WHERE a."geoType" = 'CITY' AND gc.name = 'Wichita' AND gc."stateAbbr" = 'KS'
)
SELECT
    g."medianIncome",
    g."stateAbbr",
    it."effectiveRateAt100k" as income_tax,
    st."combinedRate" as sales_tax
FROM geo_with_state g
LEFT JOIN income_tax_rate it
    ON it."stateAbbr" = g."stateAbbr"
    AND it."localJurisdiction" IS NULL
LEFT JOIN sales_tax_rate st
    ON st."geoId" = g."stateAbbr"
    AND st."geoType" = 'STATE'
''')

result = cur.fetchone()
print(f'Wichita Income: ${result["medianIncome"]:,}')
print(f'State: {result["stateAbbr"]}')
print(f'Income Tax Rate: {result["income_tax"]}')
print(f'Sales Tax Rate: {result["sales_tax"]}')

# Now check what tax_ratio is being calculated
cur.execute('''
SELECT "taxBurdenRatio"
FROM v2_affordability_score
WHERE "geoType" = 'CITY'
AND "geoId" IN (
    SELECT "cityId"
    FROM geo_city
    WHERE name = 'Wichita' AND "stateAbbr" = 'KS'
)
''')

tax_burden = cur.fetchone()
print(f'\nStored Tax Burden Ratio: {tax_burden["taxBurdenRatio"]}')
print(f'As percentage: {tax_burden["taxBurdenRatio"] * 100:.2f}%')

print('\nThis is clearly wrong - Kansas has no tax data, so the ratio should be 0!')
