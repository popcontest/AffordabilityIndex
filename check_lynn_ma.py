import psycopg2
import psycopg2.extras

conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# Find Lynn, MA in cities
cursor.execute('''
    SELECT
        gc."cityId",
        gc.name,
        gc."stateAbbr",
        gc.population,
        ms."homeValue",
        ms.income,
        ms."asOfDate",
        ms.sources
    FROM geo_city gc
    LEFT JOIN metric_snapshot ms ON ms."geoType" = 'CITY' AND ms."geoId" = gc."cityId"
    WHERE gc.name = 'Lynn' AND gc."stateAbbr" = 'MA'
    ORDER BY ms."asOfDate" DESC
    LIMIT 1
''')

result = cursor.fetchone()

if result:
    print(f"Lynn, MA (City ID: {result['cityId']})")
    print(f"Population: {result['population']:,}" if result['population'] else "Population: N/A")
    print(f"\nData in our database:")
    print(f"  Median Income: ${result['income']:,.0f}" if result['income'] else "  Median Income: N/A")
    print(f"  Home Value: ${result['homeValue']:,.0f}" if result['homeValue'] else "  Home Value: N/A")
    print(f"  As of Date: {result['asOfDate']}" if result['asOfDate'] else "  As of Date: N/A")
    print(f"\nSources: {result['sources']}" if result['sources'] else "\nSources: N/A")

    print(f"\n\nUser cited: $74,715 (2023)")
    if result['income']:
        diff = result['income'] - 74715
        pct_diff = (diff / 74715) * 100
        print(f"Our data: ${result['income']:,.0f}")
        print(f"Difference: ${diff:,.0f} ({pct_diff:+.1f}%)")
else:
    print("Lynn, MA not found in database")

conn.close()
