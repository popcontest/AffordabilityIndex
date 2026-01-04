#!/usr/bin/env python3
"""Verify V2 Score Distribution"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Overall statistics
cur.execute("""
SELECT
  COUNT(*) as total,
  ROUND(MIN("compositeScore")::numeric, 2) as min_score,
  ROUND(AVG("compositeScore")::numeric, 2) as avg_score,
  ROUND(MAX("compositeScore")::numeric, 2) as max_score,
  ROUND(STDDEV("compositeScore")::numeric, 2) as std_dev,
  COUNT(CASE WHEN "compositeScore" = 100 THEN 1 END) as scores_at_100,
  COUNT(CASE WHEN "compositeScore" < 25 THEN 1 END) as scores_below_25,
  COUNT(CASE WHEN "compositeScore" >= 25 AND "compositeScore" < 50 THEN 1 END) as scores_25_to_50,
  COUNT(CASE WHEN "compositeScore" >= 50 AND "compositeScore" < 75 THEN 1 END) as scores_50_to_75,
  COUNT(CASE WHEN "compositeScore" >= 75 THEN 1 END) as scores_above_75
FROM v2_affordability_score
""")

stats = cur.fetchone()

print("=" * 70)
print("V2 SCORE DISTRIBUTION ANALYSIS")
print("=" * 70)
print(f"\nTotal Scores:          {stats['total']:,}")
print(f"Min Score:             {stats['min_score']}")
print(f"Average Score:         {stats['avg_score']}")
print(f"Max Score:             {stats['max_score']}")
print(f"Standard Deviation:    {stats['std_dev']}")
print()
print("Score Distribution:")
print(f"  Scores at 100:       {stats['scores_at_100']:,} ({100*stats['scores_at_100']/stats['total']:.1f}%)")
print(f"  Scores 0-25:         {stats['scores_below_25']:,} ({100*stats['scores_below_25']/stats['total']:.1f}%)")
print(f"  Scores 25-50:        {stats['scores_25_to_50']:,} ({100*stats['scores_25_to_50']/stats['total']:.1f}%)")
print(f"  Scores 50-75:        {stats['scores_50_to_75']:,} ({100*stats['scores_50_to_75']/stats['total']:.1f}%)")
print(f"  Scores 75-100:       {stats['scores_above_75']:,} ({100*stats['scores_above_75']/stats['total']:.1f}%)")
print()

# Sample scores - 10 best and 10 worst
print("-" * 70)
print("TOP 10 MOST AFFORDABLE (Highest Scores)")
print("-" * 70)

cur.execute("""
SELECT
  "geoType",
  "geoId",
  ROUND("compositeScore"::numeric, 2) as composite,
  ROUND("housingScore"::numeric, 2) as housing,
  ROUND("colScore"::numeric, 2) as col,
  ROUND("taxScore"::numeric, 2) as tax
FROM v2_affordability_score
ORDER BY "compositeScore" DESC
LIMIT 10
""")

for i, row in enumerate(cur.fetchall(), 1):
    housing_str = f"{row['housing']:6.2f}" if row['housing'] else "  N/A"
    col_str = f"{row['col']:6.2f}" if row['col'] else "  N/A"
    tax_str = f"{row['tax']:6.2f}" if row['tax'] else "  N/A"
    print(f"{i:2d}. {row['geoType']:5s} {row['geoId']:15s} | "
          f"Composite: {row['composite']:6.2f} | "
          f"Housing: {housing_str} | "
          f"COL: {col_str} | "
          f"Tax: {tax_str}")

print()
print("-" * 70)
print("TOP 10 LEAST AFFORDABLE (Lowest Scores)")
print("-" * 70)

cur.execute("""
SELECT
  "geoType",
  "geoId",
  ROUND("compositeScore"::numeric, 2) as composite,
  ROUND("housingScore"::numeric, 2) as housing,
  ROUND("colScore"::numeric, 2) as col,
  ROUND("taxScore"::numeric, 2) as tax
FROM v2_affordability_score
ORDER BY "compositeScore" ASC
LIMIT 10
""")

for i, row in enumerate(cur.fetchall(), 1):
    housing_str = f"{row['housing']:6.2f}" if row['housing'] else "  N/A"
    col_str = f"{row['col']:6.2f}" if row['col'] else "  N/A"
    tax_str = f"{row['tax']:6.2f}" if row['tax'] else "  N/A"
    print(f"{i:2d}. {row['geoType']:5s} {row['geoId']:15s} | "
          f"Composite: {row['composite']:6.2f} | "
          f"Housing: {housing_str} | "
          f"COL: {col_str} | "
          f"Tax: {tax_str}")

print()
print("=" * 70)
print("VERDICT: ", end="")

if stats['scores_at_100'] == stats['total']:
    print("❌ BROKEN - All scores are 100!")
elif stats['std_dev'] < 5:
    print("⚠️  WARNING - Very low variance in scores")
elif stats['min_score'] == 0 and stats['max_score'] == 100:
    print("✅ WORKING - Full 0-100 range with proper distribution")
else:
    print(f"✅ WORKING - Scores range from {stats['min_score']} to {stats['max_score']}")

print("=" * 70)

cur.close()
conn.close()
