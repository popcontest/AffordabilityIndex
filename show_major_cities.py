"""Show True Affordability scores for major cities (50K+ population)."""
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

print("="*80)
print("🏆 TOP 20 MOST AFFORDABLE MAJOR CITIES (Population 50K+)")
print("="*80)
print()

cursor.execute('''
    SELECT
        a."geoId",
        gc.name,
        gc."stateAbbr",
        gc.population,
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
      AND gc.population >= 50000
    ORDER BY a."trueAffordabilityScore" DESC
    LIMIT 20
''')

results = cursor.fetchall()

if not results:
    print("⏳ No city scores calculated yet. The background process is still running.")
    print("   Cities are being processed after all ZIP codes complete.")
    exit()

for idx, r in enumerate(results, 1):
    print(f"#{idx} 📍 {r['name']}, {r['stateAbbr']}")
    print(f"   Population: {r['population']:,}")
    print("─"*80)
    print(f"   Median Home Value:        ${r['homeValue']:>12,.0f}")
    print(f"   Median Household Income:  ${r['medianIncome']:>12,.0f}")
    print(f"   Simple Ratio:             {r['simpleRatio']:>17.2f} (old metric)")
    print()
    print(f"   💸 Cost Breakdown:")
    print(f"   ├─ Income Tax:            ${r['incomeTaxCost']:>12,.0f}")
    print(f"   ├─ Property Tax:          ${r['propertyTaxCost']:>12,.0f}")
    print(f"   ├─ Transportation:        ${r['transportationCost']:>12,.0f}")
    print(f"   ├─ Childcare:             ${r['childcareCost']:>12,.0f}")
    print(f"   └─ Healthcare:            ${r['healthcareCost']:>12,.0f}")
    print(f"   ──────────────────────────────────────────")
    print(f"   = Net Disposable Income:  ${r['netDisposableIncome']:>12,.0f}")
    print()
    print(f"   🏠 Annual Housing Cost:   ${r['annualHousingCost']:>12,.0f}")
    print(f"   ──────────────────────────────────────────")
    print(f"   ⭐ TRUE AFFORDABILITY:    {r['trueAffordabilityScore']:>17.2f}")

    left_over = r['netDisposableIncome'] - r['annualHousingCost']
    print(f"   💰 Money Left Over:       ${left_over:>12,.0f}/year")
    print(f"                             (${left_over/12:>10,.0f}/month)")

    if r.get('personaScores'):
        personas = json.loads(r['personaScores'])
        print()
        print(f"   👥 Persona Scores:")
        print(f"      Single:       {personas.get('single', 0):>6.2f}")
        print(f"      Couple:       {personas.get('couple', 0):>6.2f}")
        print(f"      Family:       {personas.get('family', 0):>6.2f}")
        print(f"      Empty Nester: {personas.get('emptyNester', 0):>6.2f}")
        print(f"      Retiree:      {personas.get('retiree', 0):>6.2f}")
        print(f"      Remote:       {personas.get('remote', 0):>6.2f}")

    print()

print("\n" + "="*80)
print("📊 LEAST AFFORDABLE MAJOR CITIES (Population 50K+)")
print("="*80)
print()

cursor.execute('''
    SELECT
        gc.name,
        gc."stateAbbr",
        gc.population,
        a."homeValue",
        a."medianIncome",
        a."simpleRatio",
        a."trueAffordabilityScore",
        a."netDisposableIncome",
        a."annualHousingCost"
    FROM affordability_snapshot a
    INNER JOIN geo_city gc ON a."geoType" = 'CITY' AND a."geoId" = gc."cityId"
    WHERE a."trueAffordabilityScore" IS NOT NULL
      AND gc.population >= 50000
    ORDER BY a."trueAffordabilityScore" ASC
    LIMIT 10
''')

results = cursor.fetchall()

for idx, r in enumerate(results, 1):
    left_over = r['netDisposableIncome'] - r['annualHousingCost']
    print(f"#{idx} 📍 {r['name']}, {r['stateAbbr']}")
    print(f"   Population: {r['population']:,}")
    print(f"   Home: ${r['homeValue']:,.0f} | Income: ${r['medianIncome']:,.0f}")
    print(f"   Simple Ratio: {r['simpleRatio']:.2f} → True Score: {r['trueAffordabilityScore']:.2f}")
    print(f"   💸 Left Over: ${left_over:,.0f}/year (${left_over/12:,.0f}/mo)")
    print()

cursor.close()
conn.close()
