import psycopg2
import os

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Check for Zillow home values for the 5 sample ZCTAs
cur.execute('''
    SELECT
        z.zcta,
        s."homeValue",
        s."asOfDate"
    FROM geo_zcta z
    LEFT JOIN metric_snapshot s ON s."geoType" = 'ZCTA' AND s."geoId" = z.zcta
    WHERE z.zcta IN ('01001', '01002', '01005', '01007', '01008')
    ORDER BY z.zcta
''')

rows = cur.fetchall()
print('Zillow Home Value Data for Sample ZCTAs:')
print('ZCTA     Home Value      As Of Date')
print('-' * 50)
for row in rows:
    zcta = row[0]
    home_value = '${:,.0f}'.format(row[1]) if row[1] else 'N/A'
    as_of_date = str(row[2]) if row[2] else 'N/A'
    print('{:<8} {:<15} {:<15}'.format(zcta, home_value, as_of_date))

print('\nTotal ZCTAs with home value data: {} / 5'.format(sum(1 for r in rows if r[1] is not None)))

cur.close()
conn.close()
