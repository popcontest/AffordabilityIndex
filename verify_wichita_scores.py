import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Get DATABASE_URL from environment
database_url = os.environ.get('DATABASE_URL')

if not database_url:
    print("ERROR: DATABASE_URL environment variable not set")
    exit(1)

# Connect to database
conn = psycopg2.connect(database_url)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 80)
print("WICHITA, KANSAS AFFORDABILITY SCORE VERIFICATION")
print("=" * 80)

# Query 1: Get V2 scores
print("\n1. V2 AFFORDABILITY SCORES FROM DATABASE:")
print("-" * 80)
cur.execute("""
    SELECT
        gc.name,
        gc."stateAbbr",
        v2."housingScore",
        v2."colScore",
        v2."taxScore",
        v2."qolScore",
        v2."compositeScore",
        v2."housingBurdenRatio",
        v2."colBurdenRatio",
        v2."taxBurdenRatio",
        v2."dataQuality",
        v2."calculatedAt"
    FROM v2_affordability_score v2
    JOIN geo_city gc ON v2."geoId" = gc."cityId" AND v2."geoType" = 'CITY'
    WHERE gc.name = 'Wichita' AND gc."stateAbbr" = 'KS';
""")

v2_scores = cur.fetchone()
if v2_scores:
    for key, value in v2_scores.items():
        print(f"{key:25s}: {value}")
else:
    print("No V2 scores found for Wichita, KS")

# Query 2: Get affordability snapshot (V1) data
print("\n2. AFFORDABILITY SNAPSHOT (V1) DATA:")
print("-" * 80)
cur.execute("""
    SELECT
        gc.name,
        gc."stateAbbr",
        afs."homeValue",
        afs."medianIncome",
        afs."simpleRatio",
        afs."propertyTaxRate",
        afs."propertyTaxCost",
        afs."incomeTaxCost",
        afs."transportationCost",
        afs."childcareCost",
        afs."healthcareCost",
        afs."asOfDate"
    FROM affordability_snapshot afs
    JOIN geo_city gc ON afs."geoId" = gc."cityId" AND afs."geoType" = 'CITY'
    WHERE gc.name = 'Wichita' AND gc."stateAbbr" = 'KS'
    ORDER BY afs."asOfDate" DESC
    LIMIT 1;
""")

snapshot = cur.fetchone()
if snapshot:
    for key, value in snapshot.items():
        print(f"{key:25s}: {value}")
else:
    print("No affordability snapshot found for Wichita, KS")

# Query 3: Check if there's cost basket data
print("\n3. COST BASKET DATA (County-level):")
print("-" * 80)
cur.execute("""
    SELECT
        cb."countyName",
        cb."stateAbbr",
        cb."householdType",
        cb.food,
        cb.healthcare,
        cb.transportation,
        cb.taxes,
        cb.other,
        cb.housing,
        cb."totalAnnual",
        cb.source,
        cb.version
    FROM cost_basket cb
    WHERE cb."stateAbbr" = 'KS'
      AND cb."countyName" ILIKE '%Sedgwick%'
    ORDER BY cb."householdType";
""")

baskets = cur.fetchall()
if baskets:
    for basket in baskets:
        print(f"\nHousehold: {basket['householdType']}")
        for key, value in basket.items():
            if key != 'householdType':
                print(f"  {key:20s}: {value}")
else:
    print("No cost basket data found for Sedgwick County (Wichita)")

# VERIFICATION CALCULATIONS
print("\n" + "=" * 80)
print("VERIFICATION CALCULATIONS")
print("=" * 80)

if v2_scores:
    print("\nV2 Component Scores:")
    housing = v2_scores.get('housingScore')
    col = v2_scores.get('colScore')
    tax = v2_scores.get('taxScore')
    qol = v2_scores.get('qolScore')
    composite = v2_scores.get('compositeScore')

    print(f"  Housing Score: {housing}")
    print(f"  COL Score: {col}")
    print(f"  Tax Score: {tax}")
    print(f"  QOL Score: {qol}")
    print(f"  Stored Composite: {composite}")

    # Calculate expected composite
    # Based on the screenshot showing "V2 Housing Component: 68" and "V2 Taxes Component: 21"
    # Let's check what weights are being used

    print("\nWeight Scenarios:")

    # Scenario 1: Housing 60%, Tax 40% (if only 2 components)
    if housing and tax and not col and not qol:
        expected_2comp = housing * 0.6 + tax * 0.4
        print(f"  2-component (Housing 60%, Tax 40%): {expected_2comp:.1f}")

    # Scenario 2: Housing 60%, COL 20%, Tax 20% (if 3 components)
    if housing and col and tax and not qol:
        expected_3comp = housing * 0.6 + col * 0.2 + tax * 0.2
        print(f"  3-component (60/20/20): {expected_3comp:.1f}")

    # Scenario 3: Housing 50%, COL 25%, Tax 25% (alternative 3-component)
    if housing and col and tax and not qol:
        expected_3comp_alt = housing * 0.5 + col * 0.25 + tax * 0.25
        print(f"  3-component (50/25/25): {expected_3comp_alt:.1f}")

    # Scenario 4: All 4 components
    if housing and col and tax and qol:
        expected_4comp = housing * 0.5 + col * 0.2 + tax * 0.15 + qol * 0.15
        print(f"  4-component (50/20/15/15): {expected_4comp:.1f}")

    print(f"\nDiscrepancy: {abs(composite - expected_2comp) if housing and tax else 'N/A'}")

if snapshot:
    print("\nV1 Score Verification:")
    home_value = snapshot.get('homeValue')
    median_income = snapshot.get('medianIncome')
    stored_ratio = snapshot.get('simpleRatio')

    if home_value and median_income:
        calculated_ratio = home_value / median_income
        print(f"  Home Value: ${home_value:,.0f}")
        print(f"  Median Income: ${median_income:,.0f}")
        print(f"  Calculated Ratio: {calculated_ratio:.2f}")
        print(f"  Stored Ratio: {stored_ratio}")
        if stored_ratio:
            print(f"  Match: {'YES' if abs(calculated_ratio - stored_ratio) < 0.01 else 'NO'}")

cur.close()
conn.close()

print("\n" + "=" * 80)
