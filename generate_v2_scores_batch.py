#!/usr/bin/env python3
"""
Generate V2 Affordability Scores - Batch Optimized Version

This script calculates all percentiles in a single pass for maximum performance.
Instead of calculating percentiles one-by-one, it:
1. Calculates all burden ratios in one query
2. Computes PERCENT_RANK() across all geographies at once
3. Inserts all scores in a single batch operation

This is 100x+ faster than the individual approach.
"""

import os
import sys
import psycopg2
from psycopg2.extras import execute_batch, RealDictCursor
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# Component weights (must match calculate_v2_scores.py)
HOUSING_WEIGHT = 0.60  # Updated from 0.40
COL_WEIGHT = 0.40      # Updated from 0.30
TAX_WEIGHT = 0.0       # Disabled until data complete
QOL_WEIGHT = 0.0       # Disabled (no crime data yet)


def create_v2_scores_table(conn):
    """Create v2_affordability_score table if it doesn't exist"""
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS v2_affordability_score (
            id SERIAL PRIMARY KEY,
            "geoType" VARCHAR(10) NOT NULL,
            "geoId" VARCHAR(16) NOT NULL,

            -- Component scores (0-100, higher = more affordable)
            "housingScore" DOUBLE PRECISION,
            "colScore" DOUBLE PRECISION,
            "taxScore" DOUBLE PRECISION,
            "qolScore" DOUBLE PRECISION,

            -- Composite score (weighted average)
            "compositeScore" DOUBLE PRECISION NOT NULL,

            -- Raw ratios for debugging/analysis
            "housingBurdenRatio" DOUBLE PRECISION,
            "colBurdenRatio" DOUBLE PRECISION,
            "taxBurdenRatio" DOUBLE PRECISION,

            -- Metadata
            "calculatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "dataQuality" VARCHAR(50),

            UNIQUE("geoType", "geoId")
        )
    """)

    # Create indexes
    cur.execute("""
        CREATE INDEX IF NOT EXISTS v2_score_geo_idx
        ON v2_affordability_score("geoType", "geoId")
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS v2_score_composite_idx
        ON v2_affordability_score("compositeScore" DESC)
    """)

    conn.commit()
    cur.close()
    print("OK: v2_affordability_score table ready\n")


def calculate_all_housing_scores(conn):
    """
    Calculate housing burden scores for ALL geographies in a single query

    Returns: dict mapping (geoType, geoId) -> {score, percentile, burden_ratio}
    """
    print("Calculating housing burden scores...")
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Get latest mortgage rate
    cur.execute("""
        SELECT rate
        FROM mortgage_rate
        WHERE "loanType" = '30 Year Fixed'
        ORDER BY "asOfDate" DESC
        LIMIT 1
    """)
    rate_row = cur.fetchone()
    mortgage_rate = float(rate_row['rate']) / 100 if rate_row else 0.065

    # Calculate burden ratios and percentiles for ALL geographies at once
    cur.execute("""
        WITH burden_calc AS (
            SELECT
                a."geoType",
                a."geoId",
                a."homeValue",
                a."medianIncome",
                COALESCE(a."propertyTaxRate", p."effectiveRate" / 100.0, 0.01) AS prop_tax_rate,
                -- Monthly mortgage payment + property tax
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
        SELECT
            "geoType",
            "geoId",
            burden_ratio,
            percentile,
            100 - percentile AS score
        FROM ranked
    """, (mortgage_rate, mortgage_rate, mortgage_rate))

    results = cur.fetchall()
    cur.close()

    # Convert to dict for easy lookup
    scores_map = {}
    for row in results:
        key = (row['geoType'], row['geoId'])
        scores_map[key] = {
            'score': float(row['score']),
            'percentile': float(row['percentile']),
            'burden_ratio': float(row['burden_ratio'])
        }

    print(f"  Calculated {len(scores_map):,} housing scores\n")
    return scores_map


def calculate_all_col_scores(conn):
    """
    Calculate COL scores for ALL geographies in a single query

    Returns: dict mapping (geoType, geoId) -> {score, percentile, col_burden}
    """
    print("Calculating cost of living scores...")
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Increase statement timeout for this complex query
    cur.execute("SET statement_timeout = '300000'")  # 5 minutes

    cur.execute("""
        WITH city_county AS (
            -- Pre-join cities with counties for better performance
            SELECT
                'CITY'::"GeoType" AS "geoType",
                gc."cityId" AS "geoId",
                gc."countyFips"
            FROM geo_city gc
            WHERE gc."countyFips" IS NOT NULL
            UNION ALL
            SELECT
                'PLACE'::"GeoType" AS "geoType",
                gp."placeGeoid" AS "geoId",
                gp."stateFips" || gp."countyFips" AS "countyFips"
            FROM geo_place gp
            WHERE gp."countyFips" IS NOT NULL
        ),
        col_calc AS (
            SELECT
                a."geoType",
                a."geoId",
                (cb."totalAnnual" - COALESCE(cb.housing, 0)) / a."medianIncome" AS col_ratio
            FROM cost_basket cb
            JOIN city_county cc
                ON cc."countyFips" = cb."countyFips"
            JOIN affordability_snapshot a
                ON a."geoType" = cc."geoType"
                AND a."geoId" = cc."geoId"
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
        SELECT
            "geoType",
            "geoId",
            col_ratio,
            percentile,
            100 - percentile AS score
        FROM ranked
    """)

    results = cur.fetchall()
    cur.close()

    scores_map = {}
    for row in results:
        key = (row['geoType'], row['geoId'])
        scores_map[key] = {
            'score': float(row['score']),
            'percentile': float(row['percentile']),
            'col_burden': float(row['col_ratio'])
        }

    print(f"  Calculated {len(scores_map):,} COL scores\n")
    return scores_map


def calculate_all_tax_scores(conn):
    """
    Calculate tax burden scores for ALL geographies in a single query

    Returns: dict mapping (geoType, geoId) -> {score, percentile, tax_burden_ratio}
    """
    print("Calculating tax burden scores...")
    cur = conn.cursor(cursor_factory=RealDictCursor)

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
        SELECT
            "geoType",
            "geoId",
            tax_ratio,
            percentile,
            100 - percentile AS score
        FROM ranked
    """)

    results = cur.fetchall()
    cur.close()

    scores_map = {}
    for row in results:
        key = (row['geoType'], row['geoId'])
        scores_map[key] = {
            'score': float(row['score']),
            'percentile': float(row['percentile']),
            'tax_burden_ratio': float(row['tax_ratio'])
        }

    print(f"  Calculated {len(scores_map):,} tax scores\n")
    return scores_map


def calculate_composite_scores(housing_map, col_map, tax_map):
    """
    Calculate composite scores from component scores

    Returns: list of score records ready for database insertion
    """
    print("Calculating composite scores...")

    # Get all unique geographies
    all_geos = set(housing_map.keys()) | set(col_map.keys()) | set(tax_map.keys())

    records = []
    skipped_count = 0

    for geo_key in all_geos:
        geo_type, geo_id = geo_key

        # Get component scores
        housing = housing_map.get(geo_key)
        col = col_map.get(geo_key)
        tax = tax_map.get(geo_key)

        # Calculate weighted composite
        components = []
        weights = []

        if housing:
            components.append(housing['score'])
            weights.append(HOUSING_WEIGHT)

        if col:
            components.append(col['score'])
            weights.append(COL_WEIGHT)

        if tax and TAX_WEIGHT > 0:
            components.append(tax['score'])
            weights.append(TAX_WEIGHT)

        # Skip if insufficient data
        if not components:
            skipped_count += 1
            continue

        # Normalize weights to sum to 1.0
        total_weight = sum(weights)
        normalized_weights = [w / total_weight for w in weights]

        # Calculate weighted average
        composite_score = sum(c * w for c, w in zip(components, normalized_weights))

        # Assess data quality
        components_available = sum([housing is not None, col is not None, tax is not None])
        if components_available >= 2:
            data_quality = 'complete'
        elif components_available >= 1:
            data_quality = 'partial'
        else:
            data_quality = 'minimal'

        records.append({
            'geoType': geo_type,
            'geoId': geo_id,
            'housingScore': housing['score'] if housing else None,
            'colScore': col['score'] if col else None,
            'taxScore': tax['score'] if tax else None,
            'qolScore': None,
            'compositeScore': composite_score,
            'housingBurdenRatio': housing['burden_ratio'] if housing else None,
            'colBurdenRatio': col['col_burden'] if col else None,
            'taxBurdenRatio': tax['tax_burden_ratio'] if tax else None,
            'dataQuality': data_quality
        })

    print(f"  Generated {len(records):,} composite scores ({skipped_count:,} skipped)\n")
    return records


def store_v2_scores(conn, records):
    """Store all V2 scores in database"""
    print(f"Storing {len(records):,} scores to database...")

    cur = conn.cursor()

    batch_data = [
        (
            r['geoType'],
            r['geoId'],
            r['housingScore'],
            r['colScore'],
            r['taxScore'],
            r['qolScore'],
            r['compositeScore'],
            r['housingBurdenRatio'],
            r['colBurdenRatio'],
            r['taxBurdenRatio'],
            r['dataQuality']
        )
        for r in records
    ]

    execute_batch(cur, """
        INSERT INTO v2_affordability_score (
            "geoType", "geoId",
            "housingScore", "colScore", "taxScore", "qolScore",
            "compositeScore",
            "housingBurdenRatio", "colBurdenRatio", "taxBurdenRatio",
            "dataQuality", "calculatedAt"
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT ("geoType", "geoId")
        DO UPDATE SET
            "housingScore" = EXCLUDED."housingScore",
            "colScore" = EXCLUDED."colScore",
            "taxScore" = EXCLUDED."taxScore",
            "qolScore" = EXCLUDED."qolScore",
            "compositeScore" = EXCLUDED."compositeScore",
            "housingBurdenRatio" = EXCLUDED."housingBurdenRatio",
            "colBurdenRatio" = EXCLUDED."colBurdenRatio",
            "taxBurdenRatio" = EXCLUDED."taxBurdenRatio",
            "dataQuality" = EXCLUDED."dataQuality",
            "calculatedAt" = NOW()
    """, batch_data, page_size=500)

    conn.commit()
    cur.close()
    print(f"  Successfully stored {len(records):,} scores\n")


def main():
    """Main execution"""

    print("=" * 70)
    print("V2 Affordability Score Generation (Batch Optimized)")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    conn = psycopg2.connect(DATABASE_URL)

    # Create table
    create_v2_scores_table(conn)

    # Calculate all component scores in batch
    housing_map = calculate_all_housing_scores(conn)
    col_map = calculate_all_col_scores(conn)
    tax_map = calculate_all_tax_scores(conn)

    # Calculate composite scores
    records = calculate_composite_scores(housing_map, col_map, tax_map)

    # Store to database
    store_v2_scores(conn, records)

    conn.close()

    # Final summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Housing scores:        {len(housing_map):,}")
    print(f"COL scores:            {len(col_map):,}")
    print(f"Tax scores:            {len(tax_map):,}")
    print(f"Composite scores:      {len(records):,}")
    print()
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


if __name__ == '__main__':
    main()
