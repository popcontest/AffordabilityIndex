"""
Test ACS Data Quality Thresholds

This script verifies that the shouldShowDemographics logic works correctly
by calculating CVs for a sample of ACS data.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

def calculate_cv(estimate, moe):
    """Calculate coefficient of variation (CV)"""
    if estimate is None or moe is None or estimate == 0:
        return float('inf')
    return (moe / 1.645) / abs(estimate)

# Check a sample of ZCTAs
cur.execute('''
    SELECT
        "geoId",
        "medianRent",
        "medianRentMoe",
        "housingBurdenPct",
        "housingBurdenPctMoe",
        "povertyRatePct",
        "povertyRatePctMoe"
    FROM acs_snapshot
    WHERE "geoType" = 'ZCTA'
    AND "geoId" IN ('01001', '01002', '01005', '01007', '01008')
    ORDER BY "geoId"
''')

rows = cur.fetchall()

print('ACS Data Quality Check (CV Thresholds)')
print('=' * 100)
print('{:<8} {:<12} {:<12} {:<12} {:<12} {:<8}'.format(
    'ZCTA', 'Rent CV', 'Burden CV', 'Poverty CV', 'Passing', 'Show?'
))
print('-' * 100)

for row in rows:
    zcta = row[0]
    median_rent, rent_moe = row[1], row[2]
    housing_burden, burden_moe = row[3], row[4]
    poverty, poverty_moe = row[5], row[6]

    # Calculate CVs
    rent_cv = calculate_cv(median_rent, rent_moe)
    burden_cv = calculate_cv(housing_burden, burden_moe) if housing_burden else float('inf')
    poverty_cv = calculate_cv(poverty, poverty_moe)

    # Check thresholds (CV < 30%)
    passing = [
        rent_cv < 0.30,
        burden_cv < 0.30,
        poverty_cv < 0.30,
    ].count(True)

    show = passing >= 2

    print('{:<8} {:<12} {:<12} {:<12} {:<12} {:<8}'.format(
        zcta,
        f'{rent_cv:.2%}' if rent_cv != float('inf') else 'N/A',
        f'{burden_cv:.2%}' if burden_cv != float('inf') else 'N/A',
        f'{poverty_cv:.2%}' if poverty_cv != float('inf') else 'N/A',
        f'{passing}/3',
        'YES' if show else 'NO'
    ))

print()
print('CV Threshold: < 30%')
print('Show Rule: At least 2 of 3 metrics must pass')

cur.close()
conn.close()
