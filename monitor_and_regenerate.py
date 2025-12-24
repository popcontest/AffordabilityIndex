"""Monitor Census import completion and auto-regenerate snapshots."""
import time
import subprocess
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("🔍 Monitoring Census import completion...")
print("   Will auto-start snapshot regeneration when complete")
print()

# Wait for the import to complete by checking the database
import psycopg2
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

target_count = 17454  # Total cities expected with 2023 data

while True:
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM metric_snapshot WHERE sources LIKE '%census_acs5_2023%'")
        current_count = cursor.fetchone()[0]
        cursor.close()
        conn.close()

        print(f"\r   Progress: {current_count:,} / {target_count:,} cities updated with 2023 data", end='', flush=True)

        if current_count >= target_count:
            break

    except Exception as e:
        print(f"\n   Error checking database: {e}")

    time.sleep(15)

print("\n\n✅ Census import complete!")
print()
print("🔄 Starting affordability snapshot regeneration...")
print("=" * 70)
print()

# Run snapshot regeneration
result = subprocess.run(
    ['python', 'generate_affordability_snapshots.py'],
    env={'DATABASE_URL': DATABASE_URL},
    capture_output=False
)

if result.returncode == 0:
    print()
    print("=" * 70)
    print("✅ All snapshots regenerated with 2023 Census data!")
else:
    print()
    print("❌ Snapshot regeneration failed!")
    sys.exit(1)
