#!/usr/bin/env python3
import os
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor(cursor_factory=RealDictCursor)

# Get distribution of composite scores
cur.execute("""
SELECT
    COUNT(*) as total_cities,
    CAST(ROUND(CAST(AVG("compositeScore") AS NUMERIC), 2) AS FLOAT) as avg_score,
    CAST(ROUND(CAST(MIN("compositeScore") AS NUMERIC), 2) AS FLOAT) as min_score,
    CAST(ROUND(CAST(MAX("compositeScore") AS NUMERIC), 2) AS FLOAT) as max_score,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "compositeScore") as p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "compositeScore") as median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "compositeScore") as p75,
    PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY "compositeScore") as p90,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "compositeScore") as p95
FROM v2_affordability_score
WHERE "geoType" = 'CITY';
""")

stats = cur.fetchone()

print('COMPOSITE SCORE DISTRIBUTION ANALYSIS')
print('=' * 80)
print(f'Total cities: {stats["total_cities"]}')
print(f'Average score: {stats["avg_score"]:.2f}')
print(f'Min score: {stats["min_score"]:.2f}')
print(f'Max score: {stats["max_score"]:.2f}')
print()
print('Percentiles:')
print(f'  25th percentile: {stats["p25"]:.2f}')
print(f'  50th percentile (median): {stats["median"]:.2f}')
print(f'  75th percentile: {stats["p75"]:.2f}')
print(f'  90th percentile: {stats["p90"]:.2f}')
print(f'  95th percentile: {stats["p95"]:.2f}')
print()

# Grade distribution with current scale
cur.execute("""
WITH graded AS (
    SELECT
        CASE
            WHEN "compositeScore" >= 95 THEN 'A+'
            WHEN "compositeScore" >= 90 THEN 'A'
            WHEN "compositeScore" >= 85 THEN 'A-'
            WHEN "compositeScore" >= 80 THEN 'B+'
            WHEN "compositeScore" >= 75 THEN 'B'
            WHEN "compositeScore" >= 70 THEN 'B-'
            WHEN "compositeScore" >= 65 THEN 'C+'
            WHEN "compositeScore" >= 60 THEN 'C'
            WHEN "compositeScore" >= 55 THEN 'C-'
            WHEN "compositeScore" >= 50 THEN 'D'
            ELSE 'F'
        END as grade
    FROM v2_affordability_score
    WHERE "geoType" = 'CITY'
)
SELECT
    grade,
    COUNT(*) as count,
    CAST(ROUND(CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS NUMERIC), 2) AS FLOAT) as percentage
FROM graded
GROUP BY grade
ORDER BY
    CASE grade
        WHEN 'A+' THEN 1 WHEN 'A' THEN 2 WHEN 'A-' THEN 3
        WHEN 'B+' THEN 4 WHEN 'B' THEN 5 WHEN 'B-' THEN 6
        WHEN 'C+' THEN 7 WHEN 'C' THEN 8 WHEN 'C-' THEN 9
        WHEN 'D' THEN 10 ELSE 11
    END;
""")

print('GRADE DISTRIBUTION (Current Scale):')
print('-' * 80)
print(f"{'Grade':<6} {'Count':>8} {'Percentage':>12}")
print('-' * 80)

total = 0
for row in cur.fetchall():
    print(f"{row['grade']:<6} {row['count']:>8} {row['percentage']:>11}%")
    total += row['count']

print('-' * 80)
print(f"{'TOTAL':<6} {total:>8} {'100.00':>11}%")
print()

# Sample cities at different score levels
print('SAMPLE CITIES AT DIFFERENT SCORE LEVELS:')
print('-' * 80)

score_ranges = [
    (95, 100, 'A+ (95-100)'),
    (90, 94.99, 'A (90-94)'),
    (80, 84.99, 'B+ (80-84)'),
    (75, 79.99, 'B (75-79)'),
    (65, 69.99, 'C+ (65-69)'),
    (60, 64.99, 'C (60-64)'),
    (50, 54.99, 'D (50-54)'),
    (0, 49.99, 'F (0-49)'),
]

for min_score, max_score, label in score_ranges:
    cur.execute("""
        SELECT gc.name, gc."stateAbbr", v2."compositeScore"
        FROM v2_affordability_score v2
        JOIN geo_city gc ON v2."geoId" = gc."cityId" AND v2."geoType" = 'CITY'
        WHERE v2."compositeScore" >= %s AND v2."compositeScore" <= %s
        ORDER BY RANDOM()
        LIMIT 2;
    """, (min_score, max_score))

    samples = cur.fetchall()
    if samples:
        print(f"\n{label}:")
        for s in samples:
            print(f"  - {s['name']}, {s['stateAbbr']}: {s['compositeScore']:.2f}")

cur.close()
conn.close()
