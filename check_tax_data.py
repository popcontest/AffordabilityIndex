#!/usr/bin/env python3
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Count tax data
cur.execute('SELECT COUNT(*) FROM income_tax_rate')
income_count = cur.fetchone()[0]

cur.execute('SELECT COUNT(*) FROM sales_tax_rate')
sales_count = cur.fetchone()[0]

print(f'Income tax rates: {income_count:,} records')
print(f'Sales tax rates: {sales_count:,} records')

# Check any states
cur.execute('SELECT DISTINCT "stateAbbr" FROM income_tax_rate LIMIT 10')
states = [r[0] for r in cur.fetchall()]
print(f'States with income tax data: {states}')

cur.execute("SELECT DISTINCT \"geoId\" FROM sales_tax_rate WHERE \"geoType\" = 'STATE' LIMIT 10")
sales_states = [r[0] for r in cur.fetchall()]
print(f'States with sales tax data: {sales_states}')
