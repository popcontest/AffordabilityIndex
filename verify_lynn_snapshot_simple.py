import psycopg2
import psycopg2.extras
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# Find Lynn, MA snapshot
cursor.execute('''
    SELECT
        a.*
    FROM affordability_snapshot a
    INNER JOIN geo_city gc ON a."geoType" = 'CITY' AND a."geoId" = gc."cityId"
    WHERE gc.name = 'Lynn' AND gc."stateAbbr" = 'MA'
    ORDER BY a."asOfDate" DESC
    LIMIT 1
''')

snapshot = cursor.fetchone()

if snapshot:
    print(f"Lynn, MA - True Affordability Snapshot")
    print("=" * 60)
    print(f"Median Income: ${snapshot['medianIncome']:,.0f}")
    print(f"Home Value: ${snapshot['homeValue']:,.0f}")
    print(f"True Affordability Score: {snapshot['trueAffordabilityScore']:.2f}")
    print(f"As of Date: {snapshot['asOfDate']}")
    print()
    print("Cost Breakdown:")
    print(f"  Income Tax: ${snapshot['incomeTaxCost']:,.0f}")
    print(f"  Property Tax: ${snapshot['propertyTaxCost']:,.0f}")
    print(f"  Transportation: ${snapshot['transportationCost']:,.0f}")
    print(f"  Childcare: ${snapshot['childcareCost']:,.0f}")
    print(f"  Healthcare: ${snapshot['healthcareCost']:,.0f}")
    print(f"  Net Disposable: ${snapshot['netDisposableIncome']:,.0f}")
    print(f"  Annual Housing Cost: ${snapshot['annualHousingCost']:,.0f}")
    print()
    if snapshot['medianIncome'] == 74715:
        print("SUCCESS: Using 2023 Census Data!")
    else:
        print(f"WARNING: Still on old data (expected $74,715, got ${snapshot['medianIncome']:,.0f})")
else:
    print("Lynn, MA snapshot not found")

conn.close()
