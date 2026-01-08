import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Check for ACS data in the 5 sample ZCTAs
cur.execute('''
    SELECT
        "geoId",
        "medianRent",
        "housingBurdenPct",
        "povertyRatePct",
        vintage
    FROM acs_snapshot
    WHERE "geoType" = 'ZCTA'
    AND "geoId" IN ('01001', '01002', '01005', '01007', '01008')
    ORDER BY "geoId"
''')

rows = cur.fetchall()
print('ACS Data for Sample ZCTAs:')
print('ZCTA     Median Rent     Housing Burden     Poverty Rate    Vintage')
print('-' * 80)
for row in rows:
    zcta = row[0]
    rent = '${:,.0f}/mo'.format(row[1]) if row[1] else 'N/A'
    burden = '{:.1f}%'.format(row[2]) if row[2] else 'N/A'
    poverty = '{:.1f}%'.format(row[3]) if row[3] else 'N/A'
    vintage = row[4]
    print('{:<8} {:<15} {:<18} {:<15} {:<15}'.format(zcta, rent, burden, poverty, vintage))

print('\nTotal ZCTAs with ACS data: {} / 5'.format(len(rows)))

cur.close()
conn.close()
