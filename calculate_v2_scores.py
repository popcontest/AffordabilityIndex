#!/usr/bin/env python3
"""
Calculate V2 Affordability Scores

This script generates composite affordability scores using a weighted formula
across 3 dimensions (crime data skipped):
1. Housing Burden (40%)
2. Cost of Living (30%)
3. Tax Burden (20%)

Each component is normalized to 0-100 scale where:
- 100 = Most affordable
- 50 = National median
- 0 = Least affordable
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import math

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# Component weights
HOUSING_WEIGHT = 0.40
COL_WEIGHT = 0.30
TAX_WEIGHT = 0.20
QOL_WEIGHT = 0.10  # Will be excluded (returns None)

def percentile_to_score(percentile):
    """
    Convert percentile (0-100) to affordability score (0-100)

    For burden metrics (higher = worse):
    - 0th percentile (lowest burden) -> 100 score (most affordable)
    - 50th percentile (median burden) -> 50 score
    - 100th percentile (highest burden) -> 0 score (least affordable)

    Args:
        percentile: 0-100 percentile rank

    Returns:
        score: 0-100 affordability score
    """
    return 100 - percentile


def get_county_fips(conn, geo_type, geo_id):
    """
    Get county FIPS for a given geography

    Returns:
        county_fips: 5-digit county FIPS string, or None if not found
    """
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if geo_type == 'CITY':
        cur.execute("""
            SELECT "countyFips"
            FROM geo_city
            WHERE "cityId" = %s
        """, (geo_id,))
    elif geo_type == 'PLACE':
        # Place has 7-digit geoid (SSFPPP) - extract state + county
        cur.execute("""
            SELECT "stateFips" || "countyFips" AS "countyFips"
            FROM geo_place
            WHERE "placeGeoid" = %s
        """, (geo_id,))
    elif geo_type == 'ZCTA':
        # ZCTA - need to look up via geo_zcta or use state fallback
        # For now, return None (will need county mapping)
        cur.close()
        return None
    else:
        cur.close()
        return None

    row = cur.fetchone()
    cur.close()

    if row and row['countyFips']:
        return row['countyFips']
    return None


def get_state_abbr(conn, geo_type, geo_id):
    """Get state abbreviation for a given geography"""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if geo_type == 'CITY':
        cur.execute("""
            SELECT "stateAbbr"
            FROM geo_city
            WHERE "cityId" = %s
        """, (geo_id,))
    elif geo_type == 'PLACE':
        cur.execute("""
            SELECT "stateAbbr"
            FROM geo_place
            WHERE "placeGeoid" = %s
        """, (geo_id,))
    elif geo_type == 'ZCTA':
        cur.execute("""
            SELECT "stateAbbr"
            FROM geo_zcta
            WHERE zcta = %s
        """, (geo_id,))
    else:
        cur.close()
        return None

    row = cur.fetchone()
    cur.close()

    if row and row['stateAbbr']:
        return row['stateAbbr']
    return None


def calculate_housing_burden_score(conn, geo_type, geo_id):
    """
    Calculate housing burden score (0-100)

    Formula:
    monthlyPayment = (homeValue * 0.20 * mortgageRate) / 12 + propertyTax/12
    monthlyIncome = medianHouseholdIncome / 12
    housingBurdenRatio = monthlyPayment / monthlyIncome

    Score: Convert ratio to percentile, then to affordability score
    """
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get home value and median income from affordability_snapshot
    cur.execute("""
        SELECT "homeValue", "medianIncome", "propertyTaxRate"
        FROM affordability_snapshot
        WHERE "geoType" = %s AND "geoId" = %s
        ORDER BY "asOfDate" DESC
        LIMIT 1
    """, (geo_type, geo_id))

    snapshot = cur.fetchone()
    if not snapshot or not snapshot['homeValue'] or not snapshot['medianIncome']:
        cur.close()
        return None

    home_value = float(snapshot['homeValue'])
    median_income = float(snapshot['medianIncome'])

    # Get property tax rate from affordability_snapshot or property_tax_rate table
    if snapshot['propertyTaxRate']:
        property_tax_rate = float(snapshot['propertyTaxRate'])
    else:
        # Fallback to property_tax_rate table
        cur.execute("""
            SELECT "effectiveRate"
            FROM property_tax_rate
            WHERE "geoType" = %s AND "geoId" = %s
            ORDER BY "asOfYear" DESC
            LIMIT 1
        """, (geo_type, geo_id))

        tax_row = cur.fetchone()
        property_tax_rate = float(tax_row['effectiveRate']) / 100 if tax_row and tax_row['effectiveRate'] else 0.01

    # Get mortgage rate (default to 6.5% if not available)
    cur.execute("""
        SELECT rate
        FROM mortgage_rate
        WHERE "loanType" = '30 Year Fixed'
        ORDER BY "asOfDate" DESC
        LIMIT 1
    """)

    rate_row = cur.fetchone()
    mortgage_rate = float(rate_row['rate']) / 100 if rate_row else 0.065

    # Calculate monthly housing payment
    # Assume 20% down payment, 30-year mortgage
    loan_amount = home_value * 0.80
    monthly_rate = mortgage_rate / 12
    num_payments = 360  # 30 years

    # Monthly mortgage payment formula
    if monthly_rate > 0:
        monthly_mortgage = loan_amount * (monthly_rate * math.pow(1 + monthly_rate, num_payments)) / \
                          (math.pow(1 + monthly_rate, num_payments) - 1)
    else:
        monthly_mortgage = loan_amount / num_payments

    # Monthly property tax
    annual_property_tax = home_value * property_tax_rate
    monthly_property_tax = annual_property_tax / 12

    # Total monthly housing payment
    monthly_payment = monthly_mortgage + monthly_property_tax

    # Monthly income
    monthly_income = median_income / 12

    # Housing burden ratio
    if monthly_income <= 0:
        cur.close()
        return None

    housing_burden_ratio = monthly_payment / monthly_income

    # Get percentile rank (compare to all other geographies)
    cur.execute("""
        WITH burden_calc AS (
            SELECT
                a."geoType",
                a."geoId",
                COALESCE(a."propertyTaxRate", p."effectiveRate" / 100.0, 0.01) AS prop_tax_rate,
                -- Calculate burden for all locations
                ((a."homeValue" * 0.80 * (%s / 12) * POWER(1 + %s / 12, 360)) /
                 (POWER(1 + %s / 12, 360) - 1) +
                 (a."homeValue" * COALESCE(a."propertyTaxRate", p."effectiveRate" / 100.0, 0.01) / 12)) /
                (a."medianIncome" / 12) AS burden_ratio
            FROM affordability_snapshot a
            LEFT JOIN property_tax_rate p
                ON a."geoType" = p."geoType"
                AND a."geoId" = p."geoId"
            WHERE a."homeValue" IS NOT NULL
                AND a."medianIncome" IS NOT NULL
                AND a."medianIncome" > 0
        ),
        ranked AS (
            SELECT
                "geoType",
                "geoId",
                burden_ratio,
                PERCENT_RANK() OVER (ORDER BY burden_ratio) * 100 AS percentile
            FROM burden_calc
        )
        SELECT percentile
        FROM ranked
        WHERE "geoType" = %s AND "geoId" = %s
    """, (mortgage_rate, mortgage_rate, mortgage_rate, geo_type, geo_id))

    percentile_row = cur.fetchone()
    cur.close()

    if not percentile_row or percentile_row['percentile'] is None:
        return None

    percentile = float(percentile_row['percentile'])
    score = percentile_to_score(percentile)

    return {
        'score': score,
        'percentile': percentile,
        'burden_ratio': housing_burden_ratio,
        'monthly_payment': monthly_payment,
        'monthly_income': monthly_income
    }


def calculate_cost_of_living_score(conn, geo_type, geo_id):
    """
    Calculate cost of living score (0-100)

    Uses MIT Living Wage non-housing costs for 2-adult household:
    food + healthcare + transportation + childcare + other + taxes

    Score: Convert cost basket to percentile, then to affordability score
    """
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get county FIPS for this geography
    county_fips = get_county_fips(conn, geo_type, geo_id)
    if not county_fips:
        cur.close()
        return None

    # Get MIT Living Wage data for 2 adults, 0 kids (baseline household)
    cur.execute("""
        SELECT
            "totalAnnual" - COALESCE(housing, 0) AS non_housing_annual_cost
        FROM cost_basket
        WHERE "countyFips" = %s
            AND "householdType" = '2_adults_0_kids'
        ORDER BY "updatedAt" DESC
        LIMIT 1
    """, (county_fips,))

    cost_row = cur.fetchone()
    if not cost_row or not cost_row['non_housing_annual_cost']:
        cur.close()
        return None

    annual_cost = float(cost_row['non_housing_annual_cost'])

    # Get median household income
    cur.execute("""
        SELECT "medianIncome"
        FROM affordability_snapshot
        WHERE "geoType" = %s AND "geoId" = %s
        ORDER BY "asOfDate" DESC
        LIMIT 1
    """, (geo_type, geo_id))

    income_row = cur.fetchone()
    if not income_row or not income_row['medianIncome']:
        cur.close()
        return None

    median_income = float(income_row['medianIncome'])

    # Calculate COL burden as percentage of income
    col_burden = annual_cost / median_income if median_income > 0 else None

    if col_burden is None:
        cur.close()
        return None

    # Get percentile rank
    cur.execute("""
        WITH col_calc AS (
            SELECT
                a."geoType",
                a."geoId",
                (cb."totalAnnual" - COALESCE(cb.housing, 0)) / a."medianIncome" AS col_ratio
            FROM cost_basket cb
            JOIN affordability_snapshot a
                ON a."geoType" IN ('CITY', 'PLACE')
                AND EXISTS (
                    SELECT 1
                    FROM geo_city gc
                    WHERE gc."cityId" = a."geoId"
                        AND gc."countyFips" = cb."countyFips"
                    UNION
                    SELECT 1
                    FROM geo_place gp
                    WHERE gp."placeGeoid" = a."geoId"
                        AND gp."stateFips" || gp."countyFips" = cb."countyFips"
                )
            WHERE cb."householdType" = '2_adults_0_kids'
                AND a."medianIncome" > 0
        ),
        ranked AS (
            SELECT
                "geoType",
                "geoId",
                col_ratio,
                PERCENT_RANK() OVER (ORDER BY col_ratio) * 100 AS percentile
            FROM col_calc
        )
        SELECT percentile
        FROM ranked
        WHERE "geoType" = %s AND "geoId" = %s
    """, (geo_type, geo_id))

    percentile_row = cur.fetchone()
    cur.close()

    if not percentile_row or percentile_row['percentile'] is None:
        return None

    percentile = float(percentile_row['percentile'])
    score = percentile_to_score(percentile)

    return {
        'score': score,
        'percentile': percentile,
        'col_burden': col_burden,
        'annual_cost': annual_cost
    }


def calculate_tax_burden_score(conn, geo_type, geo_id):
    """
    Calculate tax burden score (0-100)

    Combines:
    - State + local income tax
    - Sales tax
    - Property tax (already in housing burden, but we track effective rate)

    Score: Convert total tax burden to percentile, then to affordability score
    """
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get state abbreviation
    state_abbr = get_state_abbr(conn, geo_type, geo_id)
    if not state_abbr:
        cur.close()
        return None

    # Get median income for tax calculations
    cur.execute("""
        SELECT "medianIncome"
        FROM affordability_snapshot
        WHERE "geoType" = %s AND "geoId" = %s
        ORDER BY "asOfDate" DESC
        LIMIT 1
    """, (geo_type, geo_id))

    income_row = cur.fetchone()
    if not income_row or not income_row['medianIncome']:
        cur.close()
        return None

    median_income = float(income_row['medianIncome'])

    # Get income tax rate for this state (using median income bracket)
    cur.execute("""
        SELECT
            CASE
                WHEN %s < 50000 THEN "effectiveRateAt50k"
                WHEN %s < 75000 THEN "effectiveRateAt75k"
                WHEN %s < 100000 THEN "effectiveRateAt100k"
                WHEN %s < 150000 THEN "effectiveRateAt150k"
                ELSE "effectiveRateAt200k"
            END AS effective_rate
        FROM income_tax_rate
        WHERE "stateAbbr" = %s
            AND "localJurisdiction" IS NULL
        ORDER BY "taxYear" DESC
        LIMIT 1
    """, (median_income, median_income, median_income, median_income, state_abbr))

    income_tax_row = cur.fetchone()
    income_tax_rate = float(income_tax_row['effective_rate']) if income_tax_row else 0.0

    # Get sales tax rate for this state
    cur.execute("""
        SELECT "combinedRate"
        FROM sales_tax_rate
        WHERE "geoType" = 'STATE'
            AND "geoId" = %s
        ORDER BY "asOfYear" DESC
        LIMIT 1
    """, (state_abbr,))

    sales_tax_row = cur.fetchone()
    sales_tax_rate = float(sales_tax_row['combinedRate']) / 100 if sales_tax_row else 0.0

    # Estimate annual tax burden
    # Income tax: direct percentage of income
    income_tax_amount = median_income * income_tax_rate

    # Sales tax: assume 30% of after-tax income is spent on taxable goods
    taxable_spending = (median_income - income_tax_amount) * 0.30
    sales_tax_amount = taxable_spending * sales_tax_rate

    # Total tax burden (excluding property tax which is in housing)
    total_tax_burden = income_tax_amount + sales_tax_amount
    tax_burden_ratio = total_tax_burden / median_income if median_income > 0 else 0

    # Get percentile rank
    # Simplified query - join geo tables separately for each type
    cur.execute("""
        WITH geo_with_state AS (
            SELECT a."geoType", a."geoId", a."medianIncome", gc."stateAbbr"
            FROM affordability_snapshot a
            JOIN geo_city gc ON a."geoId" = gc."cityId"
            WHERE a."geoType" = 'CITY'
            UNION ALL
            SELECT a."geoType", a."geoId", a."medianIncome", gp."stateAbbr"
            FROM affordability_snapshot a
            JOIN geo_place gp ON a."geoId" = gp."placeGeoid"
            WHERE a."geoType" = 'PLACE'
            UNION ALL
            SELECT a."geoType", a."geoId", a."medianIncome", gz."stateAbbr"
            FROM affordability_snapshot a
            JOIN geo_zcta gz ON a."geoId" = gz.zcta
            WHERE a."geoType" = 'ZCTA'
        ),
        tax_calc AS (
            SELECT
                g."geoType",
                g."geoId",
                (
                    g."medianIncome" *
                    COALESCE(
                        CASE
                            WHEN g."medianIncome" < 50000 THEN it."effectiveRateAt50k"
                            WHEN g."medianIncome" < 75000 THEN it."effectiveRateAt75k"
                            WHEN g."medianIncome" < 100000 THEN it."effectiveRateAt100k"
                            WHEN g."medianIncome" < 150000 THEN it."effectiveRateAt150k"
                            ELSE it."effectiveRateAt200k"
                        END, 0
                    ) +
                    (g."medianIncome" - g."medianIncome" * COALESCE(it."effectiveRateAt100k", 0)) * 0.30 *
                    COALESCE(st."combinedRate" / 100.0, 0)
                ) / g."medianIncome" AS tax_ratio
            FROM geo_with_state g
            LEFT JOIN income_tax_rate it
                ON it."stateAbbr" = g."stateAbbr"
                AND it."localJurisdiction" IS NULL
            LEFT JOIN sales_tax_rate st
                ON st."geoId" = g."stateAbbr"
                AND st."geoType" = 'STATE'
            WHERE g."medianIncome" > 0
        ),
        ranked AS (
            SELECT
                "geoType",
                "geoId",
                tax_ratio,
                PERCENT_RANK() OVER (ORDER BY tax_ratio) * 100 AS percentile
            FROM tax_calc
        )
        SELECT percentile
        FROM ranked
        WHERE "geoType" = %s AND "geoId" = %s
    """, (geo_type, geo_id))

    percentile_row = cur.fetchone()
    cur.close()

    if not percentile_row or percentile_row['percentile'] is None:
        return None

    percentile = float(percentile_row['percentile'])
    score = percentile_to_score(percentile)

    return {
        'score': score,
        'percentile': percentile,
        'tax_burden_ratio': tax_burden_ratio,
        'income_tax_rate': income_tax_rate,
        'sales_tax_rate': sales_tax_rate,
        'total_tax_burden': total_tax_burden
    }


def calculate_quality_of_life_score(conn, geo_type, geo_id):
    """
    Calculate quality of life score (0-100)

    Combines:
    - Crime rates (violent + property)
    - School quality (when available)
    - Climate/weather (when available)
    - Walkability (when available)

    Score: Aggregate percentiles, then convert to affordability score
    """
    # Skipped per user request (crime data not available)
    return None


def calculate_composite_score(housing_result, col_result, tax_result, qol_result):
    """
    Calculate weighted composite affordability score

    If a component is missing, redistribute its weight proportionally
    to available components.
    """
    components = []
    weights = []

    if housing_result:
        components.append(housing_result['score'])
        weights.append(HOUSING_WEIGHT)

    if col_result:
        components.append(col_result['score'])
        weights.append(COL_WEIGHT)

    if tax_result:
        components.append(tax_result['score'])
        weights.append(TAX_WEIGHT)

    if qol_result:
        components.append(qol_result['score'])
        weights.append(QOL_WEIGHT)

    if not components:
        return None

    # Normalize weights to sum to 1.0
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]

    # Calculate weighted average
    composite_score = sum(c * w for c, w in zip(components, normalized_weights))

    return composite_score


def generate_v2_score(conn, geo_type, geo_id):
    """
    Generate V2 affordability score for a single geography
    """
    print(f"\nCalculating V2 score for {geo_type} {geo_id}...")

    # Calculate component scores
    housing_result = calculate_housing_burden_score(conn, geo_type, geo_id)
    col_result = calculate_cost_of_living_score(conn, geo_type, geo_id)
    tax_result = calculate_tax_burden_score(conn, geo_type, geo_id)
    qol_result = calculate_quality_of_life_score(conn, geo_type, geo_id)

    # Calculate composite
    composite = calculate_composite_score(housing_result, col_result, tax_result, qol_result)

    if composite is None:
        print("  ERROR: Insufficient data for composite score")
        return None

    # Display results
    print(f"  Housing Burden: {housing_result['score']:.1f}" if housing_result else "  Housing Burden: N/A")
    print(f"  Cost of Living: {col_result['score']:.1f}" if col_result else "  Cost of Living: N/A")
    print(f"  Tax Burden: {tax_result['score']:.1f}" if tax_result else "  Tax Burden: N/A")
    print(f"  Quality of Life: {qol_result['score']:.1f}" if qol_result else "  Quality of Life: N/A (skipped)")
    print(f"  COMPOSITE: {composite:.1f}")

    return {
        'composite_score': composite,
        'housing_score': housing_result['score'] if housing_result else None,
        'col_score': col_result['score'] if col_result else None,
        'tax_score': tax_result['score'] if tax_result else None,
        'qol_score': qol_result['score'] if qol_result else None,
        'housing_burden_ratio': housing_result['burden_ratio'] if housing_result else None,
        'col_burden_ratio': col_result['col_burden'] if col_result else None,
        'tax_burden_ratio': tax_result['tax_burden_ratio'] if tax_result else None,
    }


def main():
    """Test V2 scoring on a sample geography"""

    print("=" * 60)
    print("V2 Affordability Score Calculator")
    print("=" * 60)

    conn = psycopg2.connect(DATABASE_URL)

    # Test on a sample city (Boston, MA - cityId 44269)
    result = generate_v2_score(conn, 'CITY', '44269')

    if result:
        print("\n" + "=" * 60)
        print("SUCCESS: V2 score calculated")
        print("=" * 60)

    conn.close()


if __name__ == '__main__':
    main()
