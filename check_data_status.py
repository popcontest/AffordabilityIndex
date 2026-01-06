#!/usr/bin/env python3
"""
Check V2 Data Source Status
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 80)
print("V2 DATA SOURCE INVENTORY")
print("=" * 80)

# Check what tables exist
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'cost_basket',
        'property_tax_rate',
        'sales_tax_rate',
        'crime_rate',
        'mortgage_rate',
        'freddie_mac_rate',
        'zori',
        'income_tax_rate',
        'zhvi_home_value',
        'census_income',
        'affordability_snapshot',
        'geo_city',
        'geo_zcta',
        'v2_affordability_score'
    )
    ORDER BY table_name;
""")

existing_tables = [row['table_name'] for row in cur.fetchall()]

print("\n1. TABLE EXISTENCE:")
print("-" * 80)
for table in ['cost_basket', 'property_tax_rate', 'sales_tax_rate', 'crime_rate',
              'mortgage_rate', 'freddie_mac_rate', 'zori', 'income_tax_rate',
              'v2_affordability_score', 'affordability_snapshot']:
    exists = "[YES] EXISTS" if table in existing_tables else "[NO] MISSING"
    print(f"  {table:30s} {exists}")

print("\n2. TABLE ROW COUNTS:")
print("-" * 80)

for table in existing_tables:
    try:
        cur.execute(f'SELECT COUNT(*) as count FROM "{table}"')
        count = cur.fetchone()['count']
        print(f"  {table:30s} {count:,} rows")
    except Exception as e:
        print(f"  {table:30s} ERROR: {e}")

# Check cost_basket details
if 'cost_basket' in existing_tables:
    print("\n3. COST BASKET DETAILS:")
    print("-" * 80)

    cur.execute("""
        SELECT source, COUNT(DISTINCT "countyFips") as counties,
               COUNT(DISTINCT "householdType") as household_types,
               COUNT(*) as total_rows
        FROM cost_basket
        GROUP BY source
        ORDER BY source;
    """)

    for row in cur.fetchall():
        print(f"  Source: {row['source']}")
        print(f"    Counties: {row['counties']:,}")
        print(f"    Household Types: {row['household_types']}")
        print(f"    Total Rows: {row['total_rows']:,}")

# Check geo_city county mapping
if 'geo_city' in existing_tables:
    print("\n4. CITY-COUNTY MAPPING:")
    print("-" * 80)

    cur.execute("""
        SELECT
            COUNT(*) as total_cities,
            COUNT("countyFips") as cities_with_county,
            COUNT(*) - COUNT("countyFips") as cities_missing_county,
            ROUND(100.0 * COUNT("countyFips") / COUNT(*), 1) as pct_mapped
        FROM geo_city;
    """)

    row = cur.fetchone()
    print(f"  Total Cities: {row['total_cities']:,}")
    print(f"  Mapped to County: {row['cities_with_county']:,} ({row['pct_mapped']}%)")
    print(f"  Missing County: {row['cities_missing_county']:,}")

# Check property tax coverage
if 'property_tax_rate' in existing_tables:
    print("\n5. PROPERTY TAX COVERAGE:")
    print("-" * 80)

    cur.execute("""
        SELECT "geoType", COUNT(DISTINCT "geoId") as count
        FROM property_tax_rate
        GROUP BY "geoType"
        ORDER BY "geoType";
    """)

    for row in cur.fetchall():
        print(f"  {row['geoType']:10s} {row['count']:,} geographies")

# Check sales tax coverage
if 'sales_tax_rate' in existing_tables:
    print("\n6. SALES TAX COVERAGE:")
    print("-" * 80)

    cur.execute("""
        SELECT "geoType", COUNT(DISTINCT "geoId") as count
        FROM sales_tax_rate
        GROUP BY "geoType"
        ORDER BY "geoType";
    """)

    for row in cur.fetchall():
        print(f"  {row['geoType']:10s} {row['count']:,} geographies")

# Check crime rate coverage
if 'crime_rate' in existing_tables:
    print("\n7. CRIME RATE COVERAGE:")
    print("-" * 80)

    cur.execute("""
        SELECT "geoType", COUNT(DISTINCT "geoId") as count
        FROM crime_rate
        GROUP BY "geoType"
        ORDER BY "geoType";
    """)

    for row in cur.fetchall():
        print(f"  {row['geoType']:10s} {row['count']:,} geographies")

# Check mortgage rates
if 'mortgage_rate' in existing_tables:
    print("\n8. MORTGAGE RATES:")
    print("-" * 80)

    cur.execute("""
        SELECT "loanType", COUNT(*) as records,
               MIN("asOfDate") as earliest, MAX("asOfDate") as latest
        FROM mortgage_rate
        GROUP BY "loanType"
        ORDER BY "loanType";
    """)

    for row in cur.fetchall():
        print(f"  {row['loanType']:15s} {row['records']} records ({row['earliest']} to {row['latest']})")

# Check freddie mac rates (alternative table)
if 'freddie_mac_rate' in existing_tables:
    print("\n9. FREDDIE MAC RATES:")
    print("-" * 80)

    cur.execute("""
        SELECT COUNT(*) as records,
               MIN("weekEnding") as earliest, MAX("weekEnding") as latest
        FROM freddie_mac_rate;
    """)

    row = cur.fetchone()
    if row['records'] > 0:
        print(f"  Total Records: {row['records']}")
        print(f"  Date Range: {row['earliest']} to {row['latest']}")

# Check ZORI rent data
if 'zori' in existing_tables:
    print("\n10. ZORI RENT DATA:")
    print("-" * 80)

    cur.execute("""
        SELECT "regionType", COUNT(DISTINCT "regionId") as regions
        FROM zori
        GROUP BY "regionType"
        ORDER BY "regionType";
    """)

    for row in cur.fetchall():
        print(f"  {row['regionType']:10s} {row['regions']:,} regions")

# Check income tax
if 'income_tax_rate' in existing_tables:
    print("\n11. INCOME TAX RATES:")
    print("-" * 80)

    cur.execute("""
        SELECT
            COUNT(DISTINCT "stateAbbr") as states,
            COUNT(*) FILTER (WHERE "localJurisdiction" IS NOT NULL) as local_jurisdictions,
            COUNT(*) as total_records
        FROM income_tax_rate;
    """)

    row = cur.fetchone()
    print(f"  States: {row['states']}")
    print(f"  Local Jurisdictions: {row['local_jurisdictions']}")
    print(f"  Total Records: {row['total_records']}")

# Check baseline data (ZHVI + Income)
if 'affordability_snapshot' in existing_tables:
    print("\n12. BASELINE DATA (ZHVI + Income):")
    print("-" * 80)

    cur.execute("""
        SELECT "geoType",
               COUNT(DISTINCT "geoId") as geographies,
               COUNT(*) FILTER (WHERE "homeValue" IS NOT NULL) as with_home_value,
               COUNT(*) FILTER (WHERE "medianIncome" IS NOT NULL) as with_income
        FROM affordability_snapshot
        GROUP BY "geoType"
        ORDER BY "geoType";
    """)

    for row in cur.fetchall():
        print(f"  {row['geoType']:10s}")
        print(f"    Total: {row['geographies']:,}")
        print(f"    With Home Value: {row['with_home_value']:,}")
        print(f"    With Income: {row['with_income']:,}")

# Check V2 scores
if 'v2_affordability_score' in existing_tables:
    print("\n13. V2 AFFORDABILITY SCORES:")
    print("-" * 80)

    cur.execute("""
        SELECT "geoType",
               COUNT(*) as total,
               COUNT("housingScore") as with_housing,
               COUNT("colScore") as with_col,
               COUNT("taxScore") as with_tax,
               COUNT("qolScore") as with_qol
        FROM v2_affordability_score
        GROUP BY "geoType"
        ORDER BY "geoType";
    """)

    for row in cur.fetchall():
        print(f"  {row['geoType']:10s} {row['total']:,} scores")
        print(f"    Housing: {row['with_housing']:,}")
        print(f"    COL: {row['with_col']:,}")
        print(f"    Tax: {row['with_tax']:,}")
        print(f"    QOL: {row['with_qol']:,}")

print("\n" + "=" * 80)

cur.close()
conn.close()
