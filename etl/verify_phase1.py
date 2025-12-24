import psycopg2
import os

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

cursor.execute("""
    SELECT 
        COUNT(*) FILTER (WHERE "fhfaHpi" IS NOT NULL) as hpi_count,
        COUNT(*) FILTER (WHERE "hudFmr2Br" IS NOT NULL) as fmr_count,
        COUNT(*) FILTER (WHERE "propertyTaxRate" IS NOT NULL) as tax_count,
        COUNT(*) as total
    FROM affordability_snapshot
    WHERE "geoType" = 'CITY'
""")

result = cursor.fetchone()
print('\n=== PHASE 1 DATA COVERAGE ===')
print(f'Total city snapshots: {result[3]:,}')
print(f'FHFA HPI: {result[0]:,} ({result[0]/result[3]*100:.1f}%)')
print(f'HUD FMR: {result[1]:,} ({result[1]/result[3]*100:.1f}%)')
print(f'Property Tax: {result[2]:,} ({result[2]/result[3]*100:.1f}%)')
print()

conn.close()
