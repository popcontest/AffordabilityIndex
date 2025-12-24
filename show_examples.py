"""Show example True Affordability scores from database."""
import psycopg2
import psycopg2.extras
import json
import sys
import io

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# Get count
cursor.execute('SELECT COUNT(*) FROM affordability_snapshot')
count = cursor.fetchone()['count']
print(f"✅ Found {count:,} affordability snapshots in database\n")

if count == 0:
    print("⏳ Snapshots are still being generated...")
    exit()

# Get top 5 most affordable cities
print("="*80)
print("🏆 TOP 5 MOST AFFORDABLE CITIES (by True Affordability Score)")
print("="*80)

cursor.execute('''
    SELECT
        a."geoType",
        a."geoId",
        gc.name || ', ' || gc."stateAbbr" as location_name,
        a."homeValue",
        a."medianIncome",
        a."simpleRatio",
        a."incomeTaxCost",
        a."propertyTaxCost",
        a."transportationCost",
        a."childcareCost",
        a."healthcareCost",
        a."netDisposableIncome",
        a."annualHousingCost",
        a."trueAffordabilityScore",
        a."personaScores"
    FROM affordability_snapshot a
    INNER JOIN geo_city gc ON a."geoType" = 'CITY' AND a."geoId" = gc."cityId"
    WHERE a."trueAffordabilityScore" IS NOT NULL
    ORDER BY a."trueAffordabilityScore" DESC
    LIMIT 5
''')

results = cursor.fetchall()

for idx, r in enumerate(results, 1):
    print(f'\n#{idx} 📍 {r["location_name"]}')
    print('─'*80)
    print(f'   Median Home Value:        ${r["homeValue"]:>12,.0f}')
    print(f'   Median Household Income:  ${r["medianIncome"]:>12,.0f}')
    print(f'   Simple Ratio:             {r["simpleRatio"]:>17.2f} (old metric)')
    print()
    print(f'   💸 Cost Breakdown:')
    print(f'   ├─ Income Tax:            ${r["incomeTaxCost"]:>12,.0f}')
    print(f'   ├─ Property Tax:          ${r["propertyTaxCost"]:>12,.0f}')
    print(f'   ├─ Transportation:        ${r["transportationCost"]:>12,.0f}')
    print(f'   ├─ Childcare:             ${r["childcareCost"]:>12,.0f}')
    print(f'   └─ Healthcare:            ${r["healthcareCost"]:>12,.0f}')
    print(f'   ──────────────────────────────────────────')
    print(f'   = Net Disposable Income:  ${r["netDisposableIncome"]:>12,.0f}')
    print()
    print(f'   🏠 Annual Housing Cost:   ${r["annualHousingCost"]:>12,.0f}')
    print(f'   ──────────────────────────────────────────')
    print(f'   ⭐ TRUE AFFORDABILITY:    {r["trueAffordabilityScore"]:>17.2f}')
    print(f'   💰 Money Left Over:       ${r["netDisposableIncome"] - r["annualHousingCost"]:>12,.0f}/year')
    print(f'                             (${(r["netDisposableIncome"] - r["annualHousingCost"])/12:>10,.0f}/month)')

    if r['personaScores']:
        personas = json.loads(r['personaScores'])
        print()
        print(f'   👥 Persona Scores:')
        print(f'      Single:       {personas.get("single", 0):>6.2f}')
        print(f'      Couple:       {personas.get("couple", 0):>6.2f}')
        print(f'      Family:       {personas.get("family", 0):>6.2f}')
        print(f'      Empty Nester: {personas.get("emptyNester", 0):>6.2f}')
        print(f'      Retiree:      {personas.get("retiree", 0):>6.2f}')
        print(f'      Remote:       {personas.get("remote", 0):>6.2f}')

# Get bottom 5
print("\n\n" + "="*80)
print("❌ 5 LEAST AFFORDABLE CITIES (by True Affordability Score)")
print("="*80)

cursor.execute('''
    SELECT
        a."geoType",
        gc.name || ', ' || gc."stateAbbr" as location_name,
        a."homeValue",
        a."medianIncome",
        a."simpleRatio",
        a."trueAffordabilityScore",
        a."netDisposableIncome",
        a."annualHousingCost"
    FROM affordability_snapshot a
    INNER JOIN geo_city gc ON a."geoType" = 'CITY' AND a."geoId" = gc."cityId"
    WHERE a."trueAffordabilityScore" IS NOT NULL
    ORDER BY a."trueAffordabilityScore" ASC
    LIMIT 5
''')

results = cursor.fetchall()

for idx, r in enumerate(results, 1):
    print(f'\n#{idx} 📍 {r["location_name"]}')
    print(f'   Home: ${r["homeValue"]:,.0f} | Income: ${r["medianIncome"]:,.0f} | Ratio: {r["simpleRatio"]:.2f}')
    print(f'   ⭐ True Affordability: {r["trueAffordabilityScore"]:.2f}')
    print(f'   💸 Left Over: ${r["netDisposableIncome"] - r["annualHousingCost"]:,.0f}/year')

cursor.close()
conn.close()
