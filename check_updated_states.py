import psycopg2
import psycopg2.extras

conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

cursor.execute('''
    SELECT gc."stateAbbr", COUNT(*) as count
    FROM metric_snapshot ms
    INNER JOIN geo_city gc ON ms."geoId" = gc."cityId"
    WHERE ms."geoType" = 'CITY'
      AND ms.sources LIKE '%census_acs5_2023%'
    GROUP BY gc."stateAbbr"
    ORDER BY gc."stateAbbr"
''')

results = cursor.fetchall()

print('States updated to 2023 Census data:')
print('=' * 40)
total = 0
for row in results:
    print(f"  {row['stateAbbr']}: {row['count']:,} cities")
    total += row['count']

print('=' * 40)
print(f"Total: {total:,} cities updated")

conn.close()
