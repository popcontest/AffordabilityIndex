"""
Validate cost data quality and coverage.

Checks:
1. How many cities/ZIPs have cost data
2. Data completeness by state
3. Outliers and anomalies
4. Coverage gaps

Run: python validate_cost_data.py
"""

import psycopg2
import psycopg2.extras
from typing import Dict, List
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"


def get_total_locations(conn) -> Dict:
    """Get total number of cities and ZIPs with home value data."""
    cursor = conn.cursor()

    # Cities
    cursor.execute("""
        SELECT COUNT(DISTINCT ms."geoId")
        FROM metric_snapshot ms
        WHERE ms."geoType" = 'CITY' AND ms."homeValue" IS NOT NULL
    """)
    total_cities = cursor.fetchone()[0]

    # ZIPs
    cursor.execute("""
        SELECT COUNT(DISTINCT ms."geoId")
        FROM metric_snapshot ms
        WHERE ms."geoType" = 'ZCTA' AND ms."homeValue" IS NOT NULL
    """)
    total_zips = cursor.fetchone()[0]

    cursor.close()
    return {'cities': total_cities, 'zips': total_zips}


def check_property_tax_coverage(conn) -> Dict:
    """Check property tax data coverage."""
    cursor = conn.cursor()

    # Cities with property tax data
    cursor.execute("""
        SELECT COUNT(*)
        FROM property_tax_rate
        WHERE "geoType" = 'CITY'
    """)
    cities_with_data = cursor.fetchone()[0]

    # ZIPs with property tax data
    cursor.execute("""
        SELECT COUNT(*)
        FROM property_tax_rate
        WHERE "geoType" = 'ZCTA'
    """)
    zips_with_data = cursor.fetchone()[0]

    cursor.close()
    return {'cities': cities_with_data, 'zips': zips_with_data}


def check_income_tax_coverage(conn) -> Dict:
    """Check income tax data coverage."""
    cursor = conn.cursor()

    # State-level records
    cursor.execute("""
        SELECT COUNT(*)
        FROM income_tax_rate
        WHERE "localJurisdiction" IS NULL
    """)
    states = cursor.fetchone()[0]

    # Local jurisdiction records
    cursor.execute("""
        SELECT COUNT(*)
        FROM income_tax_rate
        WHERE "localJurisdiction" IS NOT NULL
    """)
    local_jurisdictions = cursor.fetchone()[0]

    cursor.close()
    return {'states': states, 'local_jurisdictions': local_jurisdictions}


def check_transportation_coverage(conn) -> Dict:
    """Check transportation cost data coverage."""
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM transportation_cost")
    total = cursor.fetchone()[0]

    cursor.close()
    return {'total_entries': total}


def check_childcare_coverage(conn) -> Dict:
    """Check childcare cost data coverage."""
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM childcare_cost
        WHERE "geoLevel" = 'state'
    """)
    states = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM childcare_cost
        WHERE "geoLevel" = 'county'
    """)
    counties = cursor.fetchone()[0]

    cursor.close()
    return {'states': states, 'counties': counties}


def check_healthcare_coverage(conn) -> Dict:
    """Check healthcare cost data coverage."""
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM healthcare_cost")
    total = cursor.fetchone()[0]

    cursor.close()
    return {'total_entries': total}


def check_state_coverage(conn) -> List[Dict]:
    """Check data completeness by state."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    query = """
    WITH state_stats AS (
        SELECT
            gc.stateAbbr,
            COUNT(DISTINCT ms.geoId) as total_cities,
            COUNT(DISTINCT ptr.geoId) as cities_with_property_tax,
            COUNT(DISTINCT itr.stateAbbr) as has_income_tax,
            COUNT(DISTINCT tc.stateAbbr) as has_transportation,
            COUNT(DISTINCT cc.stateFips) as has_childcare,
            COUNT(DISTINCT hc.stateAbbr) as has_healthcare
        FROM geo_city gc
        INNER JOIN metric_snapshot ms ON ms.geoId = gc.cityId AND ms.geoType = 'CITY'
        LEFT JOIN property_tax_rate ptr ON ptr.geoId = gc.cityId AND ptr.geoType = 'CITY'
        LEFT JOIN income_tax_rate itr ON itr.stateAbbr = gc.stateAbbr
        LEFT JOIN transportation_cost tc ON tc.stateAbbr = gc.stateAbbr
        LEFT JOIN childcare_cost cc ON cc.stateFips = (
            SELECT stateFips FROM geo_place WHERE stateAbbr = gc.stateAbbr LIMIT 1
        )
        LEFT JOIN healthcare_cost hc ON hc.stateAbbr = gc.stateAbbr
        WHERE ms.homeValue IS NOT NULL
        GROUP BY gc.stateAbbr
        ORDER BY gc.stateAbbr
    )
    SELECT * FROM state_stats
    """

    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()

    return results


def find_outliers(conn) -> Dict:
    """Find data outliers that might indicate errors."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    outliers = {}

    # Property tax rates > 4% (suspiciously high)
    cursor.execute("""
        SELECT geoId, geoType, effectiveRate
        FROM property_tax_rate
        WHERE effectiveRate > 4.0
        ORDER BY effectiveRate DESC
        LIMIT 10
    """)
    outliers['high_property_tax'] = cursor.fetchall()

    # Income tax effective rates > 12% at $100k (check for errors)
    cursor.execute("""
        SELECT stateAbbr, localJurisdiction, effectiveRateAt100k
        FROM income_tax_rate
        WHERE effectiveRateAt100k > 12.0
        ORDER BY effectiveRateAt100k DESC
    """)
    outliers['high_income_tax'] = cursor.fetchall()

    # Transportation costs > $18k (very high)
    cursor.execute("""
        SELECT metroArea, stateAbbr, annualCarCost
        FROM transportation_cost
        WHERE annualCarCost > 18000
        ORDER BY annualCarCost DESC
    """)
    outliers['high_transportation'] = cursor.fetchall()

    # Childcare > $30k (check for data entry errors)
    cursor.execute("""
        SELECT geoId, stateFips, avgAnnualCost
        FROM childcare_cost
        WHERE avgAnnualCost > 30000
        ORDER BY avgAnnualCost DESC
    """)
    outliers['high_childcare'] = cursor.fetchall()

    cursor.close()
    return outliers


def main():
    """Main validation process."""
    print("🔍 Cost Data Validation Report")
    print("=" * 70)

    # Connect to database
    print("\n📊 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Get baseline counts
    print("\n📈 Baseline: Locations with home value data")
    print("-" * 70)
    totals = get_total_locations(conn)
    print(f"   Cities: {totals['cities']:,}")
    print(f"   ZIPs: {totals['zips']:,}")

    # Check each cost type
    print("\n" + "=" * 70)
    print("📋 Data Coverage by Cost Type")
    print("=" * 70)

    # Property Tax
    print("\n1. 🏡 Property Tax")
    print("-" * 70)
    prop_tax = check_property_tax_coverage(conn)
    print(f"   Cities with data: {prop_tax['cities']:,} / {totals['cities']:,} "
          f"({prop_tax['cities']/max(totals['cities'],1)*100:.1f}%)")
    print(f"   ZIPs with data: {prop_tax['zips']:,} / {totals['zips']:,} "
          f"({prop_tax['zips']/max(totals['zips'],1)*100:.1f}%)")

    # Income Tax
    print("\n2. 💵 Income Tax")
    print("-" * 70)
    income_tax = check_income_tax_coverage(conn)
    print(f"   States with data: {income_tax['states']}/51 (target: 51)")
    print(f"   Local jurisdictions: {income_tax['local_jurisdictions']}")
    if income_tax['states'] >= 51:
        print("   ✅ Complete coverage!")
    else:
        print(f"   ⚠️  Missing {51 - income_tax['states']} states")

    # Transportation
    print("\n3. 🚗 Transportation Costs")
    print("-" * 70)
    transport = check_transportation_coverage(conn)
    print(f"   Total entries: {transport['total_entries']}")
    print(f"   Expected: ~70 (major metros + state defaults)")
    if transport['total_entries'] >= 60:
        print("   ✅ Good coverage!")
    else:
        print("   ⚠️  Below expected coverage")

    # Childcare
    print("\n4. 👶 Childcare Costs")
    print("-" * 70)
    childcare = check_childcare_coverage(conn)
    print(f"   States with data: {childcare['states']}/51")
    print(f"   Counties with data: {childcare['counties']}")
    if childcare['states'] >= 51:
        print("   ✅ Complete state coverage!")
    else:
        print(f"   ⚠️  Missing {51 - childcare['states']} states")

    # Healthcare
    print("\n5. 🏥 Healthcare Costs")
    print("-" * 70)
    healthcare = check_healthcare_coverage(conn)
    print(f"   States with data: {healthcare['total_entries']}/51")
    if healthcare['total_entries'] >= 51:
        print("   ✅ Complete coverage!")
    else:
        print(f"   ⚠️  Missing {51 - healthcare['total_entries']} states")

    # State-by-state breakdown
    print("\n" + "=" * 70)
    print("🗺️  State-by-State Coverage Summary")
    print("=" * 70)
    print(f"{'State':<6} {'Cities':<8} {'PropTax':<9} {'IncomeTax':<10} "
          f"{'Transport':<10} {'Childcare':<10} {'Healthcare':<10}")
    print("-" * 70)

    state_stats = check_state_coverage(conn)
    for row in state_stats:
        prop_pct = (row['cities_with_property_tax'] / max(row['total_cities'], 1)) * 100
        income = "✓" if row['has_income_tax'] > 0 else "✗"
        transport = "✓" if row['has_transportation'] > 0 else "✗"
        childcare = "✓" if row['has_childcare'] > 0 else "✗"
        healthcare = "✓" if row['has_healthcare'] > 0 else "✗"

        print(f"{row['stateabbr']:<6} {row['total_cities']:<8} "
              f"{prop_pct:>6.1f}%   {income:^10} {transport:^10} "
              f"{childcare:^10} {healthcare:^10}")

    # Check for outliers
    print("\n" + "=" * 70)
    print("⚠️  Potential Data Issues (Outliers)")
    print("=" * 70)

    outliers = find_outliers(conn)

    if outliers['high_property_tax']:
        print("\nUnusually high property tax rates (>4%):")
        for row in outliers['high_property_tax']:
            print(f"   {row['geotype']} {row['geoid']}: {row['effectiverate']:.2f}%")
    else:
        print("\n✅ No suspicious property tax rates")

    if outliers['high_income_tax']:
        print("\nUnusually high income tax rates (>12% at $100k):")
        for row in outliers['high_income_tax']:
            jurisdiction = row['localjurisdiction'] or "statewide"
            print(f"   {row['stateabbr']} ({jurisdiction}): {row['effectiverateat100k']:.2f}%")
    else:
        print("✅ No suspicious income tax rates")

    if outliers['high_transportation']:
        print("\nUnusually high transportation costs (>$18k):")
        for row in outliers['high_transportation']:
            print(f"   {row['metroarea']}: ${row['annualcarcost']:,}")
    else:
        print("✅ No suspicious transportation costs")

    if outliers['high_childcare']:
        print("\nUnusually high childcare costs (>$30k):")
        for row in outliers['high_childcare']:
            print(f"   {row['geoid']}: ${row['avgannualcost']:,}")
    else:
        print("✅ No suspicious childcare costs")

    # Final summary
    print("\n" + "=" * 70)
    print("📊 VALIDATION SUMMARY")
    print("=" * 70)

    issues = []
    if prop_tax['cities'] / max(totals['cities'], 1) < 0.50:
        issues.append("⚠️  Property tax coverage < 50% for cities")
    if income_tax['states'] < 51:
        issues.append(f"⚠️  Income tax missing {51 - income_tax['states']} states")
    if transport['total_entries'] < 60:
        issues.append("⚠️  Transportation data below expected coverage")
    if childcare['states'] < 51:
        issues.append(f"⚠️  Childcare missing {51 - childcare['states']} states")
    if healthcare['total_entries'] < 51:
        issues.append(f"⚠️  Healthcare missing {51 - healthcare['total_entries']} states")

    if issues:
        print("\n❌ Issues found:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("\n✅ All data quality checks passed!")

    print(f"\n💡 Next steps:")
    if prop_tax['cities'] == 0:
        print("   1. Run: python import_property_tax.py")
    if income_tax['states'] == 0:
        print("   2. Run: python import_income_tax.py")
    if transport['total_entries'] == 0:
        print("   3. Run: python import_transportation.py")
    if childcare['states'] == 0:
        print("   4. Run: python import_childcare.py")
    if healthcare['total_entries'] == 0:
        print("   5. Run: python import_healthcare.py")

    if prop_tax['cities'] > 0 and income_tax['states'] > 0:
        print("   ✓ Ready to calculate True Affordability Scores!")

    conn.close()


if __name__ == "__main__":
    main()
