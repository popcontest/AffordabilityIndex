#!/usr/bin/env python3
"""
Check detailed status of missing/incomplete data
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 80)
print("DETAILED MISSING DATA ANALYSIS")
print("=" * 80)

# Check how many cities COULD have COL scores if county mapping were complete
print("\n1. POTENTIAL COL SCORE COVERAGE (if county mapping complete):")
print("-" * 80)

cur.execute("""
    SELECT
        COUNT(*) as total_cities,
        COUNT(c."countyFips") as cities_with_county_mapping,
        (SELECT COUNT(DISTINCT "countyFips") FROM cost_basket WHERE source = 'mit_living_wage') as counties_in_cost_basket,
        COUNT(c."countyFips") FILTER (
            WHERE c."countyFips" IN (
                SELECT DISTINCT "countyFips" FROM cost_basket WHERE source = 'mit_living_wage'
            )
        ) as cities_that_could_get_col_score
    FROM geo_city c;
""")

row = cur.fetchone()
print(f"  Total Cities: {row['total_cities']:,}")
print(f"  Cities with County Mapping: {row['cities_with_county_mapping']:,} ({100*row['cities_with_county_mapping']/row['total_cities']:.1f}%)")
print(f"  Counties in MIT Living Wage: {row['counties_in_cost_basket']:,}")
print(f"  Cities Ready for COL Score: {row['cities_that_could_get_col_score']:,}")
print(f"  BLOCKER: City-to-County mapping missing for {row['total_cities'] - row['cities_with_county_mapping']:,} cities")

# Check what's missing from tax burden calculation
print("\n2. TAX BURDEN COMPONENT STATUS:")
print("-" * 80)

print("\n  a) Property Tax Coverage by GeoType:")
cur.execute("""
    SELECT "geoType", COUNT(DISTINCT "geoId") as count
    FROM property_tax_rate
    GROUP BY "geoType";
""")
for row in cur.fetchall():
    print(f"     {row['geoType']:10s} {row['count']:,} geographies")

print("\n  b) Sales Tax Coverage (State-Level Only):")
cur.execute("""
    SELECT COUNT(DISTINCT "geoId") as states_with_sales_tax
    FROM sales_tax_rate
    WHERE "geoType" = 'STATE';
""")
row = cur.fetchone()
print(f"     States with Sales Tax: {row['states_with_sales_tax'] if row else 0}")
print(f"     BLOCKER: No city-level sales tax data")

print("\n  c) Income Tax Coverage:")
cur.execute("""
    SELECT
        COUNT(DISTINCT "stateAbbr") as states,
        COUNT(*) FILTER (WHERE "localJurisdiction" IS NOT NULL) as local
    FROM income_tax_rate;
""")
row = cur.fetchone()
print(f"     States: {row['states']}")
print(f"     Local Jurisdictions: {row['local']}")

# Check crime data situation
print("\n3. CRIME DATA (Quality of Life Component):")
print("-" * 80)

cur.execute("""
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'crime_rate'
    ) as table_exists;
""")

if cur.fetchone()['table_exists']:
    print("  Table exists but has no data")
    print("  BLOCKER: Need to download + import FBI UCR data")
else:
    print("  Table does not exist")
    print("  BLOCKER: Need to create table and import FBI UCR data")

# Check V2 score completeness by city
print("\n4. V2 SCORE COMPLETENESS FOR TOP 100 CITIES:")
print("-" * 80)

cur.execute("""
    WITH city_scores AS (
        SELECT
            c."cityId",
            c.name,
            c."stateAbbr",
            c."countyFips",
            v."housingScore",
            v."colScore",
            v."taxScore",
            v."qolScore",
            CASE
                WHEN v."housingScore" IS NOT NULL AND v."colScore" IS NOT NULL
                     AND v."taxScore" IS NOT NULL THEN 'COMPLETE'
                WHEN v."housingScore" IS NOT NULL AND v."taxScore" IS NOT NULL THEN 'PARTIAL (missing COL)'
                WHEN v."housingScore" IS NOT NULL THEN 'MINIMAL (housing only)'
                ELSE 'NONE'
            END as completeness
        FROM geo_city c
        LEFT JOIN v2_affordability_score v ON v."geoId" = c."cityId" AND v."geoType" = 'CITY'
        WHERE c.population > 50000
        ORDER BY c.population DESC
        LIMIT 100
    )
    SELECT
        completeness,
        COUNT(*) as city_count,
        ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
    FROM city_scores
    GROUP BY completeness
    ORDER BY
        CASE completeness
            WHEN 'COMPLETE' THEN 1
            WHEN 'PARTIAL (missing COL)' THEN 2
            WHEN 'MINIMAL (housing only)' THEN 3
            ELSE 4
        END;
""")

for row in cur.fetchall():
    print(f"  {row['completeness']:30s} {row['city_count']:3d} cities ({row['pct']:5.1f}%)")

# Check why COL scores are missing
print("\n5. WHY ARE COL SCORES MISSING?")
print("-" * 80)

cur.execute("""
    SELECT
        COUNT(*) as cities_with_v2_scores,
        COUNT("colScore") as cities_with_col_score,
        COUNT(*) - COUNT("colScore") as cities_missing_col_score
    FROM v2_affordability_score
    WHERE "geoType" = 'CITY';
""")

row = cur.fetchone()
print(f"  Cities with V2 scores: {row['cities_with_v2_scores']:,}")
print(f"  Cities with COL score: {row['cities_with_col_score']:,}")
print(f"  Cities missing COL score: {row['cities_missing_col_score']:,}")

# Sample cities missing COL scores
print("\n  Sample cities missing COL scores (checking countyFips):")
cur.execute("""
    SELECT
        c.name,
        c."stateAbbr",
        c."countyFips",
        CASE
            WHEN c."countyFips" IS NULL THEN 'NO COUNTY MAPPING'
            WHEN NOT EXISTS (
                SELECT 1 FROM cost_basket cb
                WHERE cb."countyFips" = c."countyFips"
                AND cb.source = 'mit_living_wage'
            ) THEN 'COUNTY NOT IN MIT DATA'
            ELSE 'UNKNOWN REASON'
        END as reason
    FROM geo_city c
    INNER JOIN v2_affordability_score v ON v."geoId" = c."cityId" AND v."geoType" = 'CITY'
    WHERE v."colScore" IS NULL
    AND c.population > 100000
    ORDER BY c.population DESC
    LIMIT 10;
""")

for row in cur.fetchall():
    state = row.get('stateAbbr') or row.get('stateabbr') or 'XX'
    county = row.get('countyFips') or row.get('countyfips') or 'NULL'
    print(f"    {row['name']:25s} {state:2s}  County: {str(county):5s}  Reason: {row['reason']}")

# Check ZORI rent data coverage
print("\n6. ZORI RENT DATA COVERAGE:")
print("-" * 80)

cur.execute("""
    SELECT
        "regionType",
        COUNT(DISTINCT "regionId") as regions,
        MIN("asOfDate") as earliest_date,
        MAX("asOfDate") as latest_date
    FROM zori
    GROUP BY "regionType";
""")

for row in cur.fetchall():
    print(f"  {row['regionType']:10s} {row['regions']:,} regions")
    print(f"               Date Range: {row['earliest_date']} to {row['latest_date']}")

print("\n" + "=" * 80)

cur.close()
conn.close()
