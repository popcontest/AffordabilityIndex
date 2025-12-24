import psycopg2
conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor()

# Check places
cursor.execute('SELECT COUNT(*) FROM geo_place WHERE "stateAbbr" = \'IL\'')
print(f'Illinois places in geo_place: {cursor.fetchone()[0]}')

# Check cities
cursor.execute('SELECT COUNT(*) FROM geo_city WHERE "stateAbbr" = \'IL\'')
print(f'Illinois cities in geo_city: {cursor.fetchone()[0]}')

# Check ZCTAs
cursor.execute('SELECT COUNT(*) FROM geo_zcta WHERE "stateAbbr" = \'IL\'')
print(f'Illinois ZIPs in geo_zcta: {cursor.fetchone()[0]}')

# Check metric snapshots for places
cursor.execute('''
    SELECT COUNT(*) FROM metric_snapshot ms
    INNER JOIN geo_place gp ON ms."geoType" = 'PLACE' AND ms."geoId" = gp."placeGeoid"
    WHERE gp."stateAbbr" = 'IL' AND ms.ratio IS NOT NULL
''')
print(f'Illinois places with metrics: {cursor.fetchone()[0]}')

# Check metric snapshots for cities
cursor.execute('''
    SELECT COUNT(*) FROM metric_snapshot ms
    INNER JOIN geo_city gc ON ms."geoType" = 'CITY' AND ms."geoId" = gc."cityId"
    WHERE gc."stateAbbr" = 'IL' AND ms.ratio IS NOT NULL
''')
print(f'Illinois cities with metrics: {cursor.fetchone()[0]}')

# Check metric snapshots for ZCTAs
cursor.execute('''
    SELECT COUNT(*) FROM metric_snapshot ms
    INNER JOIN geo_zcta gz ON ms."geoType" = 'ZCTA' AND ms."geoId" = gz.zcta
    WHERE gz."stateAbbr" = 'IL' AND ms.ratio IS NOT NULL
''')
print(f'Illinois ZIPs with metrics: {cursor.fetchone()[0]}')

conn.close()
