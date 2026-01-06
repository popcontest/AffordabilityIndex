#!/usr/bin/env python3
"""
Generate V2 Affordability Scores for All Geographies

This script processes all geographies in the affordability_snapshot table
and calculates V2 composite scores, storing results in the v2_affordability_score table.

Usage:
    python generate_v2_scores.py
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import scoring functions from calculate_v2_scores
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
            "dataQuality" VARCHAR(50), -- 'complete', 'partial', 'minimal'

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
    print("OK: v2_affordability_score table ready")


def get_all_geographies(conn):
    """Get all geographies from affordability_snapshot"""
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT DISTINCT "geoType", "geoId"
        FROM affordability_snapshot
        WHERE "homeValue" IS NOT NULL
          AND "medianIncome" IS NOT NULL
        ORDER BY "geoType", "geoId"
    """)

    geographies = cur.fetchall()
    cur.close()

    return geographies


def assess_data_quality(housing_result, col_result, tax_result, qol_result):
    """Assess data quality based on available components"""
    components_available = sum([
        housing_result is not None,
        col_result is not None,
        tax_result is not None,
        qol_result is not None
    ])

    if components_available >= 3:
        return 'complete'
    elif components_available >= 2:
        return 'partial'
    else:
        return 'minimal'


def generate_v2_score_for_geography(conn, geo_type, geo_id):
    """
    Generate V2 score for a single geography

    Returns:
        dict with score data, or None if insufficient data
    """
    try:
        # Calculate component scores
        housing_result = calculate_housing_burden_score(conn, geo_type, geo_id)
        col_result = calculate_cost_of_living_score(conn, geo_type, geo_id)
        tax_result = calculate_tax_burden_score(conn, geo_type, geo_id)
        qol_result = calculate_quality_of_life_score(conn, geo_type, geo_id)

        # Calculate composite
        composite = calculate_composite_score(housing_result, col_result, tax_result, qol_result)

        if composite is None:
            return None

        # Assess data quality
        data_quality = assess_data_quality(housing_result, col_result, tax_result, qol_result)

        return {
            'geoType': geo_type,
            'geoId': geo_id,
            'housingScore': housing_result['score'] if housing_result else None,
            'colScore': col_result['score'] if col_result else None,
            'taxScore': tax_result['score'] if tax_result else None,
            'qolScore': qol_result['score'] if qol_result else None,
            'compositeScore': composite,
            'housingBurdenRatio': housing_result['burden_ratio'] if housing_result else None,
            'colBurdenRatio': col_result['col_burden'] if col_result else None,
            'taxBurdenRatio': tax_result['tax_burden_ratio'] if tax_result else None,
            'dataQuality': data_quality
        }

    except Exception as e:
        print(f"  ERROR processing {geo_type} {geo_id}: {str(e)}")
        return None


def store_v2_scores(conn, scores_batch):
    """Store batch of V2 scores in database"""
    if not scores_batch:
        return

    cur = conn.cursor()

    records = [
        (
            s['geoType'],
            s['geoId'],
            s['housingScore'],
            s['colScore'],
            s['taxScore'],
            s['qolScore'],
            s['compositeScore'],
            s['housingBurdenRatio'],
            s['colBurdenRatio'],
            s['taxBurdenRatio'],
            s['dataQuality']
        )
        for s in scores_batch
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
    """, records, page_size=100)

    conn.commit()
    cur.close()


def main():
    """Main execution"""

    print("=" * 70)
    print("V2 Affordability Score Generation")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    conn = psycopg2.connect(DATABASE_URL)

    # Create table
    create_v2_scores_table(conn)

    # Get all geographies
    print("\nQuerying geographies...")
    geographies = get_all_geographies(conn)
    total_count = len(geographies)
    print(f"OK: Found {total_count:,} geographies to process")
    print()

    # Process in batches
    batch_size = 100
    scores_batch = []
    successful_count = 0
    skipped_count = 0

    print("Processing geographies...")
    print("-" * 70)

    for i, geo in enumerate(geographies, 1):
        geo_type = geo['geoType']
        geo_id = geo['geoId']

        # Calculate V2 score
        score_data = generate_v2_score_for_geography(conn, geo_type, geo_id)

        if score_data:
            scores_batch.append(score_data)
            successful_count += 1
        else:
            skipped_count += 1

        # Store batch when full
        if len(scores_batch) >= batch_size:
            store_v2_scores(conn, scores_batch)
            scores_batch = []

        # Progress update every 500 records
        if i % 500 == 0:
            pct = (i / total_count) * 100
            print(f"  Progress: {i:,}/{total_count:,} ({pct:.1f}%) | "
                  f"Successful: {successful_count:,} | Skipped: {skipped_count:,}")

    # Store remaining batch
    if scores_batch:
        store_v2_scores(conn, scores_batch)

    conn.close()

    # Final summary
    print("-" * 70)
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total geographies:     {total_count:,}")
    print(f"Successfully scored:   {successful_count:,} ({100*successful_count/total_count:.1f}%)")
    print(f"Skipped (no data):     {skipped_count:,} ({100*skipped_count/total_count:.1f}%)")
    print()
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


if __name__ == '__main__':
    main()
