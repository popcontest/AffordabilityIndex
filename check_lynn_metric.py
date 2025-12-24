import psycopg2
import psycopg2.extras

conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# Check metric_snapshot for Lynn, MA
cursor.execute('''
    SELECT ms.income, ms.sources
    FROM metric_snapshot ms
    INNER JOIN geo_city gc ON ms."geoId" = gc."cityId"
    WHERE gc.name = 'Lynn' AND gc."stateAbbr" = 'MA' AND ms."geoType" = 'CITY'
    ORDER BY ms."asOfDate" DESC
    LIMIT 1
''')

metric = cursor.fetchone()

if metric:
    print(f"Lynn MA metric_snapshot:")
    print(f"  Income: ${metric['income']:,}")
    print(f"  Sources: {metric['sources']}")
else:
    print("Lynn MA not found in metric_snapshot")

conn.close()
