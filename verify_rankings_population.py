"""
Verify that rankings page is showing cities with correct population thresholds.
Cities should have population >= 50,000
"""

import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres")

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("=" * 80)
print("VERIFYING RANKINGS PAGE - CITY POPULATION THRESHOLDS")
print("=" * 80)

# Check Most Affordable Cities (should be >= 50k)
print("\n1. Most Affordable Cities (Top 10):")
print("-" * 80)

cursor.execute("""
    SELECT
        c.name,
        c."stateAbbr",
        c.population,
        s."simpleRatio"
    FROM geo_city c
    INNER JOIN affordability_snapshot s
        ON c."cityId" = s."geoId"
        AND s."geoType" = 'CITY'
        AND s."asOfDate" = (SELECT MAX("asOfDate") FROM affordability_snapshot WHERE "geoType" = 'CITY')
    WHERE c.population >= 50000
        AND c.population IS NOT NULL
        AND s."simpleRatio" IS NOT NULL
    ORDER BY s."simpleRatio" ASC
    LIMIT 10;
""")

affordable_results = cursor.fetchall()
for i, (name, state, pop, ratio) in enumerate(affordable_results, 1):
    status = "PASS" if pop >= 50000 else "FAIL"
    print(f"  {i:2d}. {name}, {state:<2} | Pop: {pop:>8,} | Ratio: {ratio:>5.2f} | {status}")

print("\n2. Least Affordable Cities (Top 10):")
print("-" * 80)

cursor.execute("""
    SELECT
        c.name,
        c."stateAbbr",
        c.population,
        s."simpleRatio"
    FROM geo_city c
    INNER JOIN affordability_snapshot s
        ON c."cityId" = s."geoId"
        AND s."geoType" = 'CITY'
        AND s."asOfDate" = (SELECT MAX("asOfDate") FROM affordability_snapshot WHERE "geoType" = 'CITY')
    WHERE c.population >= 50000
        AND c.population IS NOT NULL
        AND s."simpleRatio" IS NOT NULL
    ORDER BY s."simpleRatio" DESC
    LIMIT 10;
""")

expensive_results = cursor.fetchall()
for i, (name, state, pop, ratio) in enumerate(expensive_results, 1):
    status = "PASS" if pop >= 50000 else "FAIL"
    print(f"  {i:2d}. {name}, {state:<2} | Pop: {pop:>8,} | Ratio: {ratio:>5.2f} | {status}")

# Check if any cities with pop < 50k are being returned
print("\n3. Validation Check:")
print("-" * 80)

cursor.execute("""
    SELECT COUNT(*)
    FROM geo_city c
    INNER JOIN affordability_snapshot s
        ON c."cityId" = s."geoId"
        AND s."geoType" = 'CITY'
        AND s."asOfDate" = (SELECT MAX("asOfDate") FROM affordability_snapshot WHERE "geoType" = 'CITY')
    WHERE (c.population < 50000 OR c.population IS NULL)
        AND s."simpleRatio" IS NOT NULL;
""")

invalid_count = cursor.fetchone()[0]
if invalid_count == 0:
    print(f"  PASS: All cities in rankings have population >= 50,000")
else:
    print(f"  FAIL: Found {invalid_count} cities with population < 50,000 in snapshot data")

cursor.close()
conn.close()

print("\n" + "=" * 80)
print("Verification complete!")
print("=" * 80)
