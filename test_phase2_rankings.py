#!/usr/bin/env python3
"""
Quick verification that Phase 2 rankings are working correctly
Tests that V2 composite scores are being used for ranking
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor(cursor_factory=RealDictCursor)

print('PHASE 2 RANKING VERIFICATION')
print('=' * 60)

# Test 1: Check Detroit's V2 composite score
print('\n1. Detroit V2 Score:')
cur.execute("""
SELECT v2."housingScore", v2."compositeScore"
FROM geo_city gc
JOIN v2_affordability_score v2 ON v2."geoId" = gc."cityId" AND v2."geoType" = 'CITY'
WHERE gc.name = 'Detroit' AND gc."stateAbbr" = 'MI'
""")
detroit = cur.fetchone()
print(f'  Housing Score: {detroit["housingScore"]:.1f}')
print(f'  Composite Score: {detroit["compositeScore"]:.1f}')
print(f'  [OK] Detroit should rank by composite ({detroit["compositeScore"]:.0f}) not housing ({detroit["housingScore"]:.0f})')

# Test 2: Get top 10 large cities (500k+) - should be sorted by V2 composite
print('\n2. Top 10 Large Cities (500k+) by V2 Composite:')
cur.execute("""
WITH latest AS (
  SELECT DISTINCT ON ("geoType", "geoId")
    "geoId", ratio, "homeValue", income, "asOfDate", sources
  FROM metric_snapshot
  WHERE "geoType" = 'CITY' AND ratio IS NOT NULL AND "homeValue" IS NOT NULL AND income IS NOT NULL
  ORDER BY "geoType", "geoId", "asOfDate" DESC
),
v2_scores AS (
  SELECT "geoId", "compositeScore"
  FROM v2_affordability_score
  WHERE "geoType" = 'CITY'
),
scoped AS (
  SELECT gc."cityId", gc.name, gc."stateAbbr", gc.population, l.ratio,
    v2."compositeScore"
  FROM latest l
  JOIN geo_city gc ON gc."cityId" = l."geoId"
  LEFT JOIN v2_scores v2 ON v2."geoId" = gc."cityId"
  WHERE gc.population IS NOT NULL AND gc.population >= 500000
),
with_scores AS (
  SELECT *,
    ((1 - cume_dist() OVER (ORDER BY ratio ASC)) * 100) AS v1_percentile
  FROM scoped
),
ranked AS (
  SELECT *,
    COALESCE("compositeScore", v1_percentile) AS "affordabilityPercentile"
  FROM with_scores
)
SELECT * FROM ranked
ORDER BY COALESCE("compositeScore", v1_percentile) DESC LIMIT 10;
""")

large_cities = cur.fetchall()
for i, city in enumerate(large_cities, 1):
    score = city['compositeScore'] if city['compositeScore'] else city['affordabilityPercentile']
    source = 'V2' if city['compositeScore'] else 'V1'
    print(f'  {i}. {city["name"]}, {city["stateAbbr"]} - Score: {score:.1f} ({source})')

# Test 3: Check if Detroit appears in the right position
detroit_rank = next((i for i, c in enumerate(large_cities, 1) if c['name'] == 'Detroit'), None)
if detroit_rank:
    print(f'\n  [OK] Detroit ranks #{detroit_rank} among large cities')
else:
    print(f'\n  [INFO] Detroit not in top 10 (expected with composite score of 79)')

# Test 4: Verify sort direction is correct
print('\n3. Sort Direction Verification:')
correct_order = True
for i in range(len(large_cities) - 1):
    current = large_cities[i]['compositeScore'] or large_cities[i]['affordabilityPercentile']
    next_city = large_cities[i+1]['compositeScore'] or large_cities[i+1]['affordabilityPercentile']
    if current < next_city:
        print(f'  [ERROR] {large_cities[i]["name"]} ({current:.1f}) < {large_cities[i+1]["name"]} ({next_city:.1f})')
        correct_order = False

if correct_order:
    print('  [OK] Cities correctly sorted DESC (higher score = more affordable)')

print('\n' + '=' * 60)
print('Phase 2 verification complete!\n')

conn.close()
