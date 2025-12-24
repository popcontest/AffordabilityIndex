import psycopg2
conn = psycopg2.connect('postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres')
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM metric_snapshot WHERE sources LIKE '%census_acs5_2023%'")
print(f'Records with 2023 Census data: {cursor.fetchone()[0]}')
cursor.execute("SELECT COUNT(*) FROM metric_snapshot WHERE sources LIKE '%census_acs5_2022%'")
print(f'Records with 2022 Census data: {cursor.fetchone()[0]}')
conn.close()
