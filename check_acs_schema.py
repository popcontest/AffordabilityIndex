import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Check the column type for geoType in acs_snapshot
cur.execute('''
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'acs_snapshot'
    AND column_name = 'geoType'
''')

row = cur.fetchone()
if row:
    print(f'Column: {row[0]}')
    print(f'Data Type: {row[1]}')
    print(f'UDT Name: {row[2]}')
else:
    print('Column geoType not found in acs_snapshot table')

cur.close()
conn.close()
