import psycopg2
conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM affordability_snapshot WHERE "geoType" = \'CITY\'')
print(f'City snapshots calculated: {cursor.fetchone()[0]}')
