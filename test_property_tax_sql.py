"""
Test that the property tax SQL queries work correctly with camelCase column names.
"""

import psycopg2
import psycopg2.extras
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

print("Testing property tax SQL queries...")
print("=" * 60)

# Connect to database
print("\n1. Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
print("   [OK] Connected")

# Test city query
print("\n2. Testing city query (SELECT with JOINs)...")
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

query = """
SELECT DISTINCT
    gc."cityId" as geo_id,
    gc.name,
    gc."stateAbbr" as state_abbr,
    gc."countyName",
    'CITY' as geo_type
FROM geo_city gc
INNER JOIN metric_snapshot ms ON ms."geoId" = gc."cityId" AND ms."geoType" = 'CITY'
WHERE ms."homeValue" IS NOT NULL
ORDER BY gc."stateAbbr", gc.name
LIMIT 5
"""

cursor.execute(query)
cities = cursor.fetchall()
cursor.close()

print(f"   [OK] Query succeeded! Found {len(cities)} cities (showing first 5)")
for city in cities:
    print(f"     - {city['name']}, {city['state_abbr']} (ID: {city['geo_id']})")

# Test ZIP query
print("\n3. Testing ZIP query (SELECT with JOINs)...")
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

query = """
SELECT DISTINCT
    gz.zcta as geo_id,
    gz.city as name,
    gz."stateAbbr" as state_abbr,
    gz."countyName",
    'ZCTA' as geo_type
FROM geo_zcta gz
INNER JOIN metric_snapshot ms ON ms."geoId" = gz.zcta AND ms."geoType" = 'ZCTA'
WHERE ms."homeValue" IS NOT NULL
ORDER BY gz."stateAbbr", gz.zcta
LIMIT 5
"""

cursor.execute(query)
zips = cursor.fetchall()
cursor.close()

print(f"   [OK] Query succeeded! Found {len(zips)} ZIPs (showing first 5)")
for zip_data in zips:
    print(f"     - ZIP {zip_data['geo_id']}: {zip_data['name']}, {zip_data['state_abbr']}")

# Test INSERT query (with rollback)
print("\n4. Testing INSERT query...")
cursor = conn.cursor()

# Generate test record ID
test_id = "CITY-test_city_123-2024"

query = """
INSERT INTO property_tax_rate (
    id, "geoType", "geoId", "effectiveRate", "rate25th", "rate75th", "asOfYear", source, "updatedAt"
) VALUES (
    %s, %s, %s, %s, %s, %s, %s, %s, NOW()
)
ON CONFLICT (id)
DO UPDATE SET
    "effectiveRate" = EXCLUDED."effectiveRate",
    "rate25th" = EXCLUDED."rate25th",
    "rate75th" = EXCLUDED."rate75th",
    source = EXCLUDED.source,
    "updatedAt" = NOW()
RETURNING id, "geoId", "effectiveRate"
"""

cursor.execute(query, (
    test_id,
    'CITY',
    'test_city_123',
    1.25,  # 1.25%
    1.0,   # 25th percentile
    1.5,   # 75th percentile
    2024,
    'Test Source'
))

result = cursor.fetchone()
print(f"   [OK] INSERT succeeded! ID: {result[0]}, geoId: {result[1]}, rate: {result[2]}%")

# Rollback the test insert
conn.rollback()
print("   [OK] Test INSERT rolled back (not saved to database)")

cursor.close()
conn.close()

print("\n" + "=" * 60)
print("[SUCCESS] All SQL queries working correctly!")
print("   The camelCase column fixes resolved the PostgreSQL case sensitivity issue.")
