import psycopg2
import psycopg2.extras
import json
import sys, io
if sys.platform == 'win32': sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

print('='*80)
print('🏆 TOP 3 MOST AFFORDABLE ZIP CODES (by True Affordability Score)')
print('='*80)

cursor.execute('''
    SELECT
        a."geoId" as zip_code,
        gz.city,
        gz."stateAbbr",
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
    INNER JOIN geo_zcta gz ON a."geoType" = 'ZCTA' AND a."geoId" = gz.zcta
    WHERE a."trueAffordabilityScore" IS NOT NULL
    ORDER BY a."trueAffordabilityScore" DESC
    LIMIT 3
''')

for idx, r in enumerate(cursor.fetchall(), 1):
    print(f'\n#{idx} 📍 ZIP {r["zip_code"]} - {r.get("city", "Unknown")}, {r.get("stateAbbr", "?")}')
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

    if r.get('personaScores'):
        p = json.loads(r['personaScores'])
        print()
        print(f'   👥 Persona Scores:')
        print(f'      Single:       {p.get("single",0):>6.2f}')
        print(f'      Couple:       {p.get("couple",0):>6.2f}')
        print(f'      Family:       {p.get("family",0):>6.2f}')
        print(f'      Empty Nester: {p.get("emptyNester",0):>6.2f}')
        print(f'      Retiree:      {p.get("retiree",0):>6.2f}')
        print(f'      Remote:       {p.get("remote",0):>6.2f}')

print('\n\n' + '='*80)
print('❌ 3 LEAST AFFORDABLE ZIP CODES (by True Affordability Score)')
print('='*80)

cursor.execute('''
    SELECT a."geoId", gz.city, gz."stateAbbr", a."homeValue", a."medianIncome", a."simpleRatio", a."trueAffordabilityScore", a."netDisposableIncome", a."annualHousingCost"
    FROM affordability_snapshot a
    INNER JOIN geo_zcta gz ON a."geoType" = 'ZCTA' AND a."geoId" = gz.zcta
    WHERE a."trueAffordabilityScore" IS NOT NULL
    ORDER BY a."trueAffordabilityScore" ASC
    LIMIT 3
''')

for idx, r in enumerate(cursor.fetchall(), 1):
    print(f'\n#{idx} 📍 ZIP {r["geoId"]} - {r.get("city", "Unknown")}, {r.get("stateAbbr", "?")}')
    print(f'   Home: ${r["homeValue"]:,.0f} | Income: ${r["medianIncome"]:,.0f}')
    print(f'   Simple Ratio: {r["simpleRatio"]:.2f} → True Score: {r["trueAffordabilityScore"]:.2f}')
    print(f'   💸 Left Over: ${r["netDisposableIncome"] - r["annualHousingCost"]:,.0f}/year (${(r["netDisposableIncome"] - r["annualHousingCost"])/12:,.0f}/mo)')

cursor.close()
conn.close()
