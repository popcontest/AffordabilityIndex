#!/usr/bin/env python3
"""
Debug the composite score calculation for Wichita
by stepping through the actual calculation logic
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Import the actual calculation functions
from calculate_v2_scores import (
    calculate_housing_burden_score,
    calculate_cost_of_living_score,
    calculate_tax_burden_score,
    calculate_quality_of_life_score,
    calculate_composite_score
)

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

print("=" * 80)
print("DEBUGGING WICHITA COMPOSITE SCORE CALCULATION")
print("=" * 80)

# Connect to database
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Get Wichita's city ID
cur.execute("""
    SELECT "cityId", name, "stateAbbr"
    FROM geo_city
    WHERE name = 'Wichita' AND "stateAbbr" = 'KS'
""")

wichita = cur.fetchone()
if not wichita:
    print("ERROR: Wichita not found in geo_city")
    sys.exit(1)

city_id = wichita['cityId']
print(f"\nWichita City ID: {city_id}")
print(f"Name: {wichita['name']}, {wichita['stateAbbr']}")

# Calculate component scores using the actual functions
print("\n" + "=" * 80)
print("CALCULATING COMPONENT SCORES")
print("=" * 80)

print("\n1. Housing Burden Score:")
housing_result = calculate_housing_burden_score(conn, 'CITY', city_id)
if housing_result:
    print(f"   Score: {housing_result['score']:.10f}")
    print(f"   Burden Ratio: {housing_result['burden_ratio']:.10f}")
    print(f"   Monthly Payment: ${housing_result['monthly_payment']:.2f}")
    print(f"   Monthly Income: ${housing_result['monthly_income']:.2f}")
else:
    print("   Result: None")

print("\n2. Cost of Living Score:")
col_result = calculate_cost_of_living_score(conn, 'CITY', city_id)
if col_result:
    print(f"   Score: {col_result['score']:.10f}")
    print(f"   COL Burden: {col_result['col_burden']:.10f}")
    print(f"   Annual Cost: ${col_result['annual_cost']:.2f}")
else:
    print("   Result: None")

print("\n3. Tax Burden Score:")
tax_result = calculate_tax_burden_score(conn, 'CITY', city_id)
if tax_result:
    print(f"   Score: {tax_result['score']:.10f}")
    print(f"   Tax Burden Ratio: {tax_result['tax_burden_ratio']:.10f}")
    print(f"   Income Tax Rate: {tax_result['income_tax_rate']:.4f}")
    print(f"   Sales Tax Rate: {tax_result['sales_tax_rate']:.4f}")
    print(f"   Total Tax Burden: ${tax_result['total_tax_burden']:.2f}")
else:
    print("   Result: None")

print("\n4. Quality of Life Score:")
qol_result = calculate_quality_of_life_score(conn, 'CITY', city_id)
if qol_result:
    print(f"   Score: {qol_result['score']:.10f}")
else:
    print("   Result: None (skipped)")

# Calculate composite using the actual function
print("\n" + "=" * 80)
print("CALCULATING COMPOSITE SCORE")
print("=" * 80)

composite = calculate_composite_score(housing_result, col_result, tax_result, qol_result)

print(f"\nComposite Score: {composite:.10f}" if composite else "\nComposite Score: None")

# Compare with database
print("\n" + "=" * 80)
print("COMPARING WITH DATABASE")
print("=" * 80)

cur.execute("""
    SELECT
        "housingScore",
        "colScore",
        "taxScore",
        "qolScore",
        "compositeScore",
        "dataQuality"
    FROM v2_affordability_score
    WHERE "geoType" = 'CITY' AND "geoId" = %s
""", (city_id,))

db_score = cur.fetchone()

if db_score:
    print("\nDatabase values:")
    print(f"   Housing Score: {db_score['housingScore']}")
    print(f"   COL Score: {db_score['colScore']}")
    print(f"   Tax Score: {db_score['taxScore']}")
    print(f"   QOL Score: {db_score['qolScore']}")
    print(f"   Composite Score: {db_score['compositeScore']}")
    print(f"   Data Quality: {db_score['dataQuality']}")

    print("\nCalculated values:")
    print(f"   Housing Score: {housing_result['score'] if housing_result else None}")
    print(f"   COL Score: {col_result['score'] if col_result else None}")
    print(f"   Tax Score: {tax_result['score'] if tax_result else None}")
    print(f"   QOL Score: {qol_result['score'] if qol_result else None}")
    print(f"   Composite Score: {composite}")

    print("\n" + "=" * 80)
    print("MATCH VERIFICATION")
    print("=" * 80)

    if composite is not None:
        diff = abs(composite - db_score['compositeScore'])
        print(f"\nCalculated: {composite:.10f}")
        print(f"Database:   {db_score['compositeScore']:.10f}")
        print(f"Difference: {diff:.10f}")
        print(f"Match: {'YES' if diff < 0.0001 else 'NO - DISCREPANCY FOUND!'}")
    else:
        print("\nERROR: Composite could not be calculated")

else:
    print("\nERROR: No database record found for Wichita")

cur.close()
conn.close()

print("\n" + "=" * 80)
