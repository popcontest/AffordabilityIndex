#!/usr/bin/env python3
"""Verify Wichita scores with new dynamic burden-based weighting"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Get Wichita's V2 scores
cur.execute("""
SELECT
  "geoType",
  "geoId",
  ROUND("housingScore"::numeric, 2) as housing_score,
  ROUND("colScore"::numeric, 2) as col_score,
  ROUND("taxScore"::numeric, 2) as tax_score,
  ROUND("compositeScore"::numeric, 2) as composite_score,
  ROUND("housingBurdenRatio"::numeric, 4) as housing_burden,
  ROUND("colBurdenRatio"::numeric, 4) as col_burden,
  ROUND("taxBurdenRatio"::numeric, 4) as tax_burden
FROM v2_affordability_score
WHERE "geoType" = 'CITY'
  AND "geoId" IN (
    SELECT "cityId"
    FROM geo_city
    WHERE name = 'Wichita' AND "stateAbbr" = 'KS'
  )
""")

wichita = cur.fetchone()

if not wichita:
    print("ERROR: Wichita not found!")
    exit(1)

print("=" * 70)
print("WICHITA, KANSAS - V2 SCORES (Dynamic Burden-Based Weighting)")
print("=" * 70)
print()
print("Component Scores:")
print(f"  Housing Score:     {wichita['housing_score']}")
print(f"  COL Score:         {wichita['col_score'] or 'N/A'}")
print(f"  Tax Score:         {wichita['tax_score']}")
print(f"  Composite Score:   {wichita['composite_score']}")
print()
print("Burden Ratios (% of income):")
print(f"  Housing Burden:    {wichita['housing_burden']:.2%}")
print(f"  COL Burden:        {wichita['col_burden'] or 'N/A'}")
print(f"  Tax Burden:        {wichita['tax_burden']:.2%}")
print()

# Calculate weights
housing_burden = float(wichita['housing_burden'])
tax_burden = float(wichita['tax_burden'])
col_burden = float(wichita['col_burden']) if wichita['col_burden'] else 0

total_burden = housing_burden + col_burden + tax_burden

print("Dynamic Weights (based on burden proportions):")
if col_burden > 0:
    housing_weight = housing_burden / total_burden
    col_weight = col_burden / total_burden
    tax_weight = tax_burden / total_burden
    print(f"  Housing Weight:    {housing_weight:.2%} (burden: {housing_burden:.4f})")
    print(f"  COL Weight:        {col_weight:.2%} (burden: {col_burden:.4f})")
    print(f"  Tax Weight:        {tax_weight:.2%} (burden: {tax_burden:.4f})")
else:
    housing_weight = housing_burden / total_burden
    tax_weight = tax_burden / total_burden
    print(f"  Housing Weight:    {housing_weight:.2%} (burden: {housing_burden:.4f})")
    print(f"  Tax Weight:        {tax_weight:.2%} (burden: {tax_burden:.4f})")
    print(f"  COL Weight:        N/A (no data)")

print(f"  Total Burden:      {total_burden:.2%}")
print()

# Verify composite calculation
if col_burden > 0:
    expected_composite = (
        float(wichita['housing_score']) * housing_weight +
        float(wichita['col_score']) * col_weight +
        float(wichita['tax_score']) * tax_weight
    )
else:
    expected_composite = (
        float(wichita['housing_score']) * housing_weight +
        float(wichita['tax_score']) * tax_weight
    )

print("Composite Score Verification:")
print(f"  Stored Composite:     {wichita['composite_score']}")
print(f"  Expected Composite:   {expected_composite:.2f}")
print(f"  Match:                {'✓ YES' if abs(float(wichita['composite_score']) - expected_composite) < 0.1 else '✗ NO'}")
print()

# Show calculation
print("Calculation:")
if col_burden > 0:
    print(f"  ({wichita['housing_score']} × {housing_weight:.4f}) + "
          f"({wichita['col_score']} × {col_weight:.4f}) + "
          f"({wichita['tax_score']} × {tax_weight:.4f})")
    print(f"  = {wichita['housing_score'] * housing_weight:.2f} + "
          f"{wichita['col_score'] * col_weight:.2f} + "
          f"{wichita['tax_score'] * tax_weight:.2f}")
else:
    print(f"  ({wichita['housing_score']} × {housing_weight:.4f}) + "
          f"({wichita['tax_score']} × {tax_weight:.4f})")
    print(f"  = {wichita['housing_score'] * housing_weight:.2f} + "
          f"{wichita['tax_score'] * tax_weight:.2f}")
print(f"  = {expected_composite:.2f}")

print()
print("=" * 70)
print("INTERPRETATION:")
print("=" * 70)
print(f"Housing represents {housing_weight:.1%} of total expenses, so it has")
print(f"{housing_weight:.1%} weight in the composite score.")
print(f"Taxes represent {tax_weight:.1%} of total expenses, so it has")
print(f"{tax_weight:.1%} weight in the composite score.")
print()
print("This dynamic weighting ensures that the composite score reflects")
print("the actual relative impact of each expense category on affordability.")
print("=" * 70)

cur.close()
conn.close()
