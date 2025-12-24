"""
Test affordability calculations on sample cities.

This verifies the calculation logic is working correctly before
running on all 47,000+ locations.
"""

import psycopg2
import psycopg2.extras
from generate_affordability_snapshots import (
    calculate_true_affordability,
    calculate_persona_scores
)

DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"


def test_city(conn, city_name: str, state_abbr: str):
    """Test calculation for a specific city."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Find the city
    cursor.execute("""
        SELECT
            gc."cityId",
            gc.name,
            gc."stateAbbr",
            ms."homeValue",
            ms.income as median_income
        FROM geo_city gc
        INNER JOIN metric_snapshot ms ON ms."geoId" = gc."cityId" AND ms."geoType" = 'CITY'
        WHERE LOWER(gc.name) = LOWER(%s)
          AND gc."stateAbbr" = %s
          AND ms."homeValue" IS NOT NULL
          AND ms.income IS NOT NULL
        LIMIT 1
    """, (city_name, state_abbr))

    city = cursor.fetchone()
    cursor.close()

    if not city:
        print(f"❌ City not found: {city_name}, {state_abbr}")
        return

    print(f"\n{'='*70}")
    print(f"📍 {city['name']}, {city['stateAbbr']}")
    print(f"{'='*70}")
    print(f"   Median Home Value: ${city['homeValue']:,.0f}")
    print(f"   Median Household Income: ${city['median_income']:,.0f}")
    print(f"   Simple Ratio: {city['homeValue']/city['median_income']:.2f}")

    # Calculate base affordability
    print(f"\n💰 Base Affordability (Single Person, Median Income):")
    print(f"{'-'*70}")

    breakdown = calculate_true_affordability(
        conn,
        'CITY',
        city['cityId'],
        city['homeValue'],
        city['median_income'],
        city['stateAbbr']
    )

    print(f"   Gross Income:              ${breakdown['gross_income']:>12,.0f}")
    print(f"   └─ State/Local Income Tax: ${breakdown['income_tax']:>12,.0f}")
    print(f"   └─ Property Tax:           ${breakdown['property_tax']:>12,.0f}")
    print(f"   └─ Transportation:         ${breakdown['transportation']:>12,.0f}")
    print(f"   └─ Childcare:              ${breakdown['childcare']:>12,.0f}")
    print(f"   └─ Healthcare:             ${breakdown['healthcare']:>12,.0f}")
    print(f"   {'─'*55}")
    print(f"   Net Disposable Income:     ${breakdown['net_disposable']:>12,.0f}")
    print()
    print(f"   Annual Housing Cost:       ${breakdown['annual_housing']:>12,.0f}")
    print(f"   {'─'*55}")
    print(f"   💸 Money Left Over:        ${breakdown['net_disposable'] - breakdown['annual_housing']:>12,.0f}")
    print(f"                              (${(breakdown['net_disposable'] - breakdown['annual_housing'])/12:,.0f}/month)")
    print()
    print(f"   ⭐ True Affordability:     {breakdown['true_score']:>17.2f}")
    print(f"   📊 Tier:                   {breakdown['tier']:>17}")

    # Calculate persona scores
    print(f"\n👥 Persona-Specific Scores:")
    print(f"{'-'*70}")

    personas = calculate_persona_scores(
        conn,
        'CITY',
        city['cityId'],
        city['homeValue'],
        city['median_income'],
        city['stateAbbr']
    )

    print(f"   👤 Single:                 {personas['single']:>17.2f}")
    print(f"   👥 Couple (DINK):          {personas['couple']:>17.2f}")
    print(f"   👨‍👩‍👧‍👦 Family (2 kids):        {personas['family']:>17.2f}")
    print(f"   🏠 Empty Nester:           {personas['emptyNester']:>17.2f}")
    print(f"   🌴 Retiree:                {personas['retiree']:>17.2f}")
    print(f"   💻 Remote Worker:          {personas['remote']:>17.2f}")


def main():
    """Test on several sample cities."""
    print("🧪 Testing True Affordability Calculations")
    print("=" * 70)

    conn = psycopg2.connect(DATABASE_URL)

    # Test cities with different characteristics
    test_cities = [
        ("Austin", "TX"),        # No income tax, high property tax
        ("Denver", "CO"),        # Flat income tax, moderate property tax
        ("Nashville", "TN"),     # No income tax, low property tax
        ("San Francisco", "CA"), # High income tax, low property tax
        ("Cleveland", "OH"),     # Local income tax
    ]

    for city_name, state_abbr in test_cities:
        try:
            test_city(conn, city_name, state_abbr)
        except Exception as e:
            print(f"\n❌ Error testing {city_name}, {state_abbr}: {e}")

    conn.close()

    print("\n" + "=" * 70)
    print("✅ Test complete!")


if __name__ == "__main__":
    main()
