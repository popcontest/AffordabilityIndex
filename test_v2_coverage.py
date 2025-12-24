"""
Quick test script to verify v2 scoring coverage
"""
import psycopg2
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Check cities with county FIPS
cursor.execute('SELECT COUNT(*) FROM geo_city WHERE "countyFips" IS NOT NULL')
cities_with_county = cursor.fetchone()[0]
print(f"Cities with county FIPS: {cities_with_county}")

# Check cities eligible for v2 scoring
cursor.execute("""
    SELECT COUNT(DISTINCT gc."cityId")
    FROM geo_city gc
    JOIN cost_basket cb ON gc."countyFips" = cb."countyFips"
    WHERE cb.source = 'basket_stub'
      AND cb.version = '2025-01'
      AND cb."householdType" = '1_adult_0_kids'
""")
v2_eligible = cursor.fetchone()[0]
print(f"Cities eligible for v2 scoring: {v2_eligible}")

# Sample cities with basket data
cursor.execute("""
    SELECT
      gc.name,
      gc."stateAbbr",
      gc."countyFips",
      cb."countyName",
      cb."totalAnnual"
    FROM geo_city gc
    JOIN cost_basket cb ON gc."countyFips" = cb."countyFips"
    WHERE cb.source = 'basket_stub'
      AND cb.version = '2025-01'
      AND cb."householdType" = '1_adult_0_kids'
    LIMIT 5
""")
print("\nSample cities with v2 basket data:")
for row in cursor.fetchall():
    print(f"  - {row[0]}, {row[1]} (County: {row[3]}, Basket: ${row[4]:,.0f}/year)")

cursor.close()
conn.close()

print("\nv2 coverage check complete")
