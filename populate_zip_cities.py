"""
Populate city, metro, and county names for ZIP codes from Zillow data
"""
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
ZIP_FILE = "data/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

print("Loading Zillow ZIP data...")
df = pd.read_csv(ZIP_FILE)

# Keep only the columns we need
df = df[['RegionName', 'City', 'Metro', 'CountyName']].copy()
df.columns = ['zcta', 'city', 'metro', 'countyName']

# Convert ZCTA to string with leading zeros
df['zcta'] = df['zcta'].astype(str).str.zfill(5)

# Replace NaN with None for SQL
df = df.where(pd.notnull(df), None)

print(f"Loaded {len(df)} ZIP codes with city information")

# Connect to database
print("Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Update each ZIP with city/metro/county info
print("Updating ZIP codes...")
update_query = """
UPDATE geo_zcta
SET city = %s, metro = %s, \"countyName\" = %s
WHERE zcta = %s
"""

updates = []
for _, row in df.iterrows():
    updates.append((row['city'], row['metro'], row['countyName'], row['zcta']))

execute_values(cursor, """
UPDATE geo_zcta AS g SET
  city = data.city,
  metro = data.metro,
  \"countyName\" = data.\"countyName\"
FROM (VALUES %s) AS data(city, metro, \"countyName\", zcta)
WHERE g.zcta = data.zcta
""", updates, template='(%s, %s, %s, %s)')

conn.commit()
print(f"Updated {cursor.rowcount} ZIP codes")

# Verify
cursor.execute("SELECT COUNT(*) FROM geo_zcta WHERE city IS NOT NULL")
count = cursor.fetchone()[0]
print(f"Total ZIP codes with city names: {count}")

cursor.close()
conn.close()
print("Done!")
