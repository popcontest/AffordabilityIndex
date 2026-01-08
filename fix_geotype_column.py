import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

print("Altering geoType column to use GeoType enum...")

# First, check if the enum type exists
cur.execute("""
    SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'GeoType'
    )
""")
enum_exists = cur.fetchone()[0]

if enum_exists:
    print("GeoType enum already exists")
else:
    print("ERROR: GeoType enum does not exist!")
    cur.close()
    conn.close()
    exit(1)

# Alter the column to use the enum type
# Use USING clause to cast the text to the enum
cur.execute('''
    ALTER TABLE acs_snapshot
    ALTER COLUMN "geoType"
    TYPE "GeoType"
    USING "geoType"::"GeoType"
''')

conn.commit()
print("✓ Successfully altered geoType column to use GeoType enum")

# Verify the change
cur.execute('''
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'acs_snapshot'
    AND column_name = 'geoType'
''')

row = cur.fetchone()
print(f"\nVerification:")
print(f'  Column: {row[0]}')
print(f'  Data Type: {row[1]}')
print(f'  UDT Name: {row[2]}')

cur.close()
conn.close()
