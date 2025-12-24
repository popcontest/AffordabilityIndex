#!/bin/bash

echo "Waiting for Census import to complete..."

# Monitor the import process
while ps aux | grep -q "[p]ython import_census_income.py"; do
    sleep 10
done

echo "✅ Census import complete!"
echo ""
echo "🔄 Starting affordability snapshot regeneration..."
echo ""

DATABASE_URL="postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres" python generate_affordability_snapshots.py

echo ""
echo "✅ All snapshots regenerated with 2023 Census data!"
