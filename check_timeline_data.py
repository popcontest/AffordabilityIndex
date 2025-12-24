#!/usr/bin/env python3
"""
Quick check: Do we have historical data for the Affordability Timeline chart?
"""
import os
import psycopg2

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("=" * 70)
print("AFFORDABILITY TIMELINE DATA CHECK")
print("=" * 70)

# Check MetricSnapshot
cursor.execute("""
    SELECT
        COUNT(*) as total_rows,
        COUNT(DISTINCT "geoId") as unique_cities,
        MIN("asOfDate") as earliest_date,
        MAX("asOfDate") as latest_date,
        COUNT(DISTINCT "asOfDate") as unique_dates
    FROM metric_snapshot
    WHERE "geoType" = 'CITY'
""")
result = cursor.fetchone()
print("\nMETRIC_SNAPSHOT Table:")
print(f"  Total rows: {result[0]:,}")
print(f"  Unique cities: {result[1]:,}")
print(f"  Date range: {result[2]} to {result[3]}")
print(f"  Unique dates: {result[4]:,}")

# Check AffordabilitySnapshot
cursor.execute("""
    SELECT
        COUNT(*) as total_rows,
        COUNT(DISTINCT "geoId") as unique_cities,
        MIN("asOfDate") as earliest_date,
        MAX("asOfDate") as latest_date,
        COUNT(DISTINCT "asOfDate") as unique_dates
    FROM affordability_snapshot
    WHERE "geoType" = 'CITY'
""")
result = cursor.fetchone()
print("\nAFFORDABILITY_SNAPSHOT Table:")
print(f"  Total rows: {result[0]:,}")
print(f"  Unique cities: {result[1]:,}")
print(f"  Date range: {result[2]} to {result[3]}")
print(f"  Unique dates: {result[4]:,}")

# Check a sample city's timeline
cursor.execute("""
    SELECT
        "geoId",
        name,
        "stateAbbr"
    FROM geo_city
    WHERE population > 100000
    LIMIT 1
""")
sample_city = cursor.fetchone()

if sample_city:
    city_id, city_name, state = sample_city
    print(f"\nSAMPLE CITY: {city_name}, {state} (ID: {city_id})")

    # Check metric_snapshot for this city
    cursor.execute("""
        SELECT
            "asOfDate",
            "homeValue",
            income,
            ratio
        FROM metric_snapshot
        WHERE "geoType" = 'CITY' AND "geoId" = %s
        ORDER BY "asOfDate"
    """, (city_id,))

    timeline_data = cursor.fetchall()
    if timeline_data:
        print(f"  Timeline data points: {len(timeline_data)}")
        print(f"  First: {timeline_data[0][0]} - Home: ${timeline_data[0][1]:,.0f}, Income: ${timeline_data[0][2]:,.0f}, Ratio: {timeline_data[0][3]:.2f}")
        print(f"  Last:  {timeline_data[-1][0]} - Home: ${timeline_data[-1][1]:,.0f}, Income: ${timeline_data[-1][2]:,.0f}, Ratio: {timeline_data[-1][3]:.2f}")
    else:
        print("  No timeline data found")

cursor.close()
conn.close()

print("\n" + "=" * 70)
print("CONCLUSION:")
print("=" * 70)
print("✅ Timeline chart is READY if we have multiple dates per city")
print("❌ Timeline chart needs ETL if we only have single snapshots")
print("=" * 70)
