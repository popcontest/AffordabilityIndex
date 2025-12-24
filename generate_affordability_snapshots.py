"""
Generate AffordabilitySnapshot records for all locations.

This script calculates True Affordability Scores by combining:
- Home values (Zillow ZHVI)
- Median household income (Census ACS)
- Income taxes (state + local)
- Property taxes
- Transportation costs
- Childcare costs
- Healthcare costs

Run: python generate_affordability_snapshots.py
"""

import psycopg2
import psycopg2.extras
from datetime import date
from typing import Dict, Optional, Tuple
import json
import sys
import io
import secrets
import string

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Constants
CURRENT_YEAR = 2024
DEFAULT_MORTGAGE_RATE = 0.07  # 7.0%
DEFAULT_DOWN_PAYMENT = 0.20   # 20%
HOME_INSURANCE_RATE = 0.006   # 0.6% of home value

# National averages (fallbacks)
NATIONAL_AVG_PROPERTY_TAX = 0.011
NATIONAL_AVG_TRANSPORTATION = 11600
NATIONAL_AVG_HEALTHCARE_INDIVIDUAL = 7400
NATIONAL_AVG_HEALTHCARE_FAMILY = 20000


def generate_cuid() -> str:
    """Generate a simple unique ID."""
    chars = string.ascii_lowercase + string.digits
    return 'c' + ''.join(secrets.choice(chars) for _ in range(24))


def calculate_monthly_mortgage(loan_amount: float, annual_rate: float, years: int = 30) -> float:
    """Calculate monthly mortgage payment (P&I only)."""
    monthly_rate = annual_rate / 12
    num_payments = years * 12

    if monthly_rate == 0:
        return loan_amount / num_payments

    payment = loan_amount * \
        (monthly_rate * pow(1 + monthly_rate, num_payments)) / \
        (pow(1 + monthly_rate, num_payments) - 1)

    return payment


def interpolate_income_tax_rate(income: float, tax_rates: Dict) -> float:
    """Interpolate effective tax rate based on income."""
    if income <= 50000:
        return (income / 50000) * tax_rates['rate_50k']
    elif income <= 75000:
        ratio = (income - 50000) / 25000
        return tax_rates['rate_50k'] + ratio * (tax_rates['rate_75k'] - tax_rates['rate_50k'])
    elif income <= 100000:
        ratio = (income - 75000) / 25000
        return tax_rates['rate_75k'] + ratio * (tax_rates['rate_100k'] - tax_rates['rate_75k'])
    elif income <= 150000:
        ratio = (income - 100000) / 50000
        return tax_rates['rate_100k'] + ratio * (tax_rates['rate_150k'] - tax_rates['rate_100k'])
    elif income <= 200000:
        ratio = (income - 150000) / 50000
        return tax_rates['rate_150k'] + ratio * (tax_rates['rate_200k'] - tax_rates['rate_150k'])
    else:
        return tax_rates['rate_200k'] + ((income - 200000) / 1000000) * 0.5


def get_affordability_tier(score: float) -> str:
    """Get affordability tier based on score."""
    if score >= 2.5:
        return 'Extremely Comfortable'
    elif score >= 2.0:
        return 'Very Comfortable'
    elif score >= 1.5:
        return 'Comfortable'
    elif score >= 1.0:
        return 'Tight'
    elif score >= 0.5:
        return 'Very Tight'
    else:
        return 'Unaffordable'


def calculate_true_affordability(
    conn,
    geo_type: str,
    geo_id: str,
    home_value: float,
    median_income: float,
    state_abbr: str,
    income: Optional[float] = None,
    num_children: int = 0,
    work_from_home: bool = False
) -> Dict:
    """Calculate True Affordability Score for a location."""
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Use provided income or default to median
    actual_income = income or median_income

    # 1. Get income tax rate
    cursor.execute("""
        SELECT "effectiveRateAt50k", "effectiveRateAt75k", "effectiveRateAt100k",
               "effectiveRateAt150k", "effectiveRateAt200k"
        FROM income_tax_rate
        WHERE "stateAbbr" = %s AND "localJurisdiction" IS NULL
        ORDER BY "taxYear" DESC
        LIMIT 1
    """, (state_abbr,))
    tax_data = cursor.fetchone()

    if tax_data:
        tax_rate_pct = interpolate_income_tax_rate(actual_income, {
            'rate_50k': tax_data['effectiveRateAt50k'],
            'rate_75k': tax_data['effectiveRateAt75k'],
            'rate_100k': tax_data['effectiveRateAt100k'],
            'rate_150k': tax_data['effectiveRateAt150k'],
            'rate_200k': tax_data['effectiveRateAt200k'],
        })
        income_tax = (actual_income * tax_rate_pct) / 100
    else:
        income_tax = 0

    # 2. Get property tax rate
    cursor.execute("""
        SELECT "effectiveRate"
        FROM property_tax_rate
        WHERE "geoType" = %s AND "geoId" = %s
        ORDER BY "asOfYear" DESC
        LIMIT 1
    """, (geo_type, geo_id))
    prop_tax_data = cursor.fetchone()

    prop_tax_rate = (prop_tax_data['effectiveRate'] / 100) if prop_tax_data else NATIONAL_AVG_PROPERTY_TAX
    property_tax = home_value * prop_tax_rate

    # 3. Get transportation costs
    cursor.execute("""
        SELECT "estimatedAvgCost"
        FROM transportation_cost
        WHERE "stateAbbr" = %s
        ORDER BY "asOfYear" DESC
        LIMIT 1
    """, (state_abbr,))
    transport_data = cursor.fetchone()

    base_transport = transport_data['estimatedAvgCost'] if transport_data else NATIONAL_AVG_TRANSPORTATION
    transportation = base_transport * 0.6 if work_from_home else base_transport

    # 4. Get childcare costs
    childcare = 0
    if num_children > 0:
        cursor.execute("""
            SELECT "avgAnnualCost"
            FROM childcare_cost
            WHERE "geoLevel" = 'state' AND "geoId" = %s
            ORDER BY "asOfYear" DESC
            LIMIT 1
        """, (state_abbr,))
        childcare_data = cursor.fetchone()

        if childcare_data:
            childcare = num_children * childcare_data['avgAnnualCost']

    # 5. Get healthcare costs
    cursor.execute("""
        SELECT "individualPremium", "familyPremium"
        FROM healthcare_cost
        WHERE "stateAbbr" = %s AND region IS NULL
        ORDER BY "asOfYear" DESC
        LIMIT 1
    """, (state_abbr,))
    health_data = cursor.fetchone()

    is_family = num_children > 0
    healthcare = health_data['familyPremium'] if (is_family and health_data) else \
                 (health_data['individualPremium'] if health_data else NATIONAL_AVG_HEALTHCARE_INDIVIDUAL)

    # 6. Calculate net disposable income
    net_disposable = actual_income - income_tax - property_tax - transportation - childcare - healthcare

    # 7. Calculate annual housing cost
    down_payment = home_value * DEFAULT_DOWN_PAYMENT
    loan_amount = home_value - down_payment
    monthly_pi = calculate_monthly_mortgage(loan_amount, DEFAULT_MORTGAGE_RATE)
    monthly_prop_tax = property_tax / 12
    monthly_insurance = (home_value * HOME_INSURANCE_RATE) / 12
    monthly_housing = monthly_pi + monthly_prop_tax + monthly_insurance
    annual_housing = monthly_housing * 12

    # 8. Calculate True Affordability Score
    if annual_housing > 0:
        true_score = net_disposable / annual_housing
    else:
        true_score = 0

    cursor.close()

    return {
        'gross_income': actual_income,
        'income_tax': income_tax,
        'property_tax': property_tax,
        'transportation': transportation,
        'childcare': childcare,
        'healthcare': healthcare,
        'net_disposable': net_disposable,
        'annual_housing': annual_housing,
        'true_score': true_score,
        'tier': get_affordability_tier(true_score),
    }


def calculate_persona_scores(conn, geo_type: str, geo_id: str, home_value: float,
                             median_income: float, state_abbr: str) -> Dict:
    """Calculate True Affordability Scores for different personas."""

    # Single person
    single = calculate_true_affordability(
        conn, geo_type, geo_id, home_value, median_income, state_abbr,
        income=None, num_children=0, work_from_home=False
    )

    # Couple (dual income, no kids)
    couple = calculate_true_affordability(
        conn, geo_type, geo_id, home_value, median_income, state_abbr,
        income=median_income * 1.8, num_children=0, work_from_home=False
    )

    # Family with 2 young kids
    family = calculate_true_affordability(
        conn, geo_type, geo_id, home_value, median_income, state_abbr,
        income=None, num_children=2, work_from_home=False
    )

    # Empty nester (higher income, no kids)
    empty_nester = calculate_true_affordability(
        conn, geo_type, geo_id, home_value, median_income, state_abbr,
        income=median_income * 1.3, num_children=0, work_from_home=False
    )

    # Retiree
    retiree = calculate_true_affordability(
        conn, geo_type, geo_id, home_value, median_income, state_abbr,
        income=50000, num_children=0, work_from_home=True
    )

    # Remote worker
    remote = calculate_true_affordability(
        conn, geo_type, geo_id, home_value, median_income, state_abbr,
        income=95000, num_children=0, work_from_home=True
    )

    return {
        'single': round(single['true_score'], 2),
        'couple': round(couple['true_score'], 2),
        'family': round(family['true_score'], 2),
        'emptyNester': round(empty_nester['true_score'], 2),
        'retiree': round(retiree['true_score'], 2),
        'remote': round(remote['true_score'], 2),
    }


def save_affordability_snapshot(conn, geo_type: str, geo_id: str, breakdown: Dict,
                                persona_scores: Dict, as_of_date: date):
    """Save affordability snapshot to database."""
    cursor = conn.cursor()

    assumptions = {
        'downPayment': DEFAULT_DOWN_PAYMENT,
        'mortgageRate': DEFAULT_MORTGAGE_RATE,
        'homeInsuranceRate': HOME_INSURANCE_RATE,
    }

    query = """
    INSERT INTO affordability_snapshot (
        id, "geoType", "geoId", "asOfDate",
        "homeValue", "medianIncome", "simpleRatio",
        "propertyTaxCost", "incomeTaxCost", "transportationCost",
        "childcareCost", "healthcareCost",
        "netDisposableIncome", "annualHousingCost", "trueAffordabilityScore",
        "personaScores", assumptions, "createdAt"
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
    )
    ON CONFLICT ("geoType", "geoId", "asOfDate")
    DO UPDATE SET
        "homeValue" = EXCLUDED."homeValue",
        "medianIncome" = EXCLUDED."medianIncome",
        "simpleRatio" = EXCLUDED."simpleRatio",
        "propertyTaxCost" = EXCLUDED."propertyTaxCost",
        "incomeTaxCost" = EXCLUDED."incomeTaxCost",
        "transportationCost" = EXCLUDED."transportationCost",
        "childcareCost" = EXCLUDED."childcareCost",
        "healthcareCost" = EXCLUDED."healthcareCost",
        "netDisposableIncome" = EXCLUDED."netDisposableIncome",
        "annualHousingCost" = EXCLUDED."annualHousingCost",
        "trueAffordabilityScore" = EXCLUDED."trueAffordabilityScore",
        "personaScores" = EXCLUDED."personaScores",
        assumptions = EXCLUDED.assumptions
    """

    # Get home value and income from breakdown context
    # (These should be passed separately, but for now calculate from reverse)
    home_value = breakdown.get('home_value', 0)
    median_income = breakdown['gross_income']
    simple_ratio = home_value / median_income if median_income > 0 else 0

    cursor.execute(query, (
        generate_cuid(),
        geo_type,
        geo_id,
        as_of_date,
        home_value,
        median_income,
        simple_ratio,
        breakdown['property_tax'],
        breakdown['income_tax'],
        breakdown['transportation'],
        breakdown['childcare'],
        breakdown['healthcare'],
        breakdown['net_disposable'],
        breakdown['annual_housing'],
        breakdown['true_score'],
        json.dumps(persona_scores),
        json.dumps(assumptions),
    ))

    conn.commit()
    cursor.close()


def main():
    """Main snapshot generation process."""
    print("🔄 Generating Affordability Snapshots")
    print("=" * 70)

    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get all locations with home value + income data
    print("\n📊 Fetching locations with complete data...")
    cursor.execute("""
        SELECT
            ms."geoType",
            ms."geoId",
            ms."homeValue",
            ms.income as median_income,
            CASE
                WHEN ms."geoType" = 'CITY' THEN gc."stateAbbr"
                WHEN ms."geoType" = 'ZCTA' THEN gz."stateAbbr"
                ELSE gp."stateAbbr"
            END as state_abbr
        FROM metric_snapshot ms
        LEFT JOIN geo_city gc ON ms."geoType" = 'CITY' AND ms."geoId" = gc."cityId"
        LEFT JOIN geo_zcta gz ON ms."geoType" = 'ZCTA' AND ms."geoId" = gz.zcta
        LEFT JOIN geo_place gp ON ms."geoType" = 'PLACE' AND ms."geoId" = gp."placeGeoid"
        WHERE ms."homeValue" IS NOT NULL
          AND ms.income IS NOT NULL
        ORDER BY ms."geoType", ms."geoId"
    """)

    locations = cursor.fetchall()
    total = len(locations)
    print(f"   Found {total:,} locations")

    # Process each location
    print(f"\n🏙️  Calculating True Affordability Scores...")
    processed = 0
    skipped = 0

    for loc in locations:
        processed += 1

        if processed % 1000 == 0:
            print(f"   Progress: {processed:,}/{total:,} ({processed/total*100:.1f}%)")

        # Skip if no state abbreviation
        if not loc['state_abbr']:
            skipped += 1
            continue

        try:
            # Calculate base affordability (single person, median income)
            breakdown = calculate_true_affordability(
                conn,
                loc['geoType'],
                loc['geoId'],
                loc['homeValue'],
                loc['median_income'],
                loc['state_abbr']
            )

            # Add home value to breakdown for save function
            breakdown['home_value'] = loc['homeValue']

            # Calculate persona scores
            persona_scores = calculate_persona_scores(
                conn,
                loc['geoType'],
                loc['geoId'],
                loc['homeValue'],
                loc['median_income'],
                loc['state_abbr']
            )

            # Save snapshot
            save_affordability_snapshot(
                conn,
                loc['geoType'],
                loc['geoId'],
                breakdown,
                persona_scores,
                date.today()
            )

        except Exception as e:
            print(f"\n   ⚠️  Error processing {loc['geoType']} {loc['geoId']}: {e}")
            skipped += 1

    # Summary
    print("\n" + "=" * 70)
    print("✅ Snapshot generation complete!")
    print(f"   Processed: {processed:,}")
    print(f"   Saved: {processed - skipped:,}")
    print(f"   Skipped: {skipped}")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
