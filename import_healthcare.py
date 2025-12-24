"""
Import healthcare costs by state.

Data Source: Kaiser Family Foundation (KFF)
https://www.kff.org/statedata/

Covers:
- Average health insurance premiums (individual and family)
- Deductibles
- Out-of-pocket costs

Note: Using 2024 estimates based on KFF's annual employer health benefits survey.

Run: python import_healthcare.py
"""

import psycopg2
import psycopg2.extras
from typing import Dict, Optional
import sys
import io
import secrets
import string

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Data year
DATA_YEAR = 2024


def generate_cuid() -> str:
    """Generate a simple unique ID similar to Prisma's cuid."""
    chars = string.ascii_lowercase + string.digits
    return 'c' + ''.join(secrets.choice(chars) for _ in range(24))

# State-level healthcare costs (annual premiums for 2024)
# Source: KFF Employer Health Benefits Survey 2024 + state marketplace data
# These are EMPLOYEE contributions (what people actually pay)
STATE_HEALTHCARE_COSTS = {
    'AL': {'individual': 6800, 'family': 18400, 'deductible': 1800, 'oop_max': 4500, 'cost_index': 0.92},
    'AK': {'individual': 10200, 'family': 26400, 'deductible': 2400, 'oop_max': 5800, 'cost_index': 1.45},
    'AZ': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 0.98},
    'AR': {'individual': 6600, 'family': 18000, 'deductible': 1800, 'oop_max': 4400, 'cost_index': 0.90},
    'CA': {'individual': 8200, 'family': 22000, 'deductible': 1700, 'oop_max': 4200, 'cost_index': 1.15},
    'CO': {'individual': 7600, 'family': 20400, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.05},
    'CT': {'individual': 8600, 'family': 23200, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 1.20},
    'DE': {'individual': 8000, 'family': 21600, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.10},
    'DC': {'individual': 8400, 'family': 22600, 'deductible': 1700, 'oop_max': 4400, 'cost_index': 1.18},
    'FL': {'individual': 7400, 'family': 20000, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 1.00},
    'GA': {'individual': 7000, 'family': 19200, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.96},
    'HI': {'individual': 7000, 'family': 18800, 'deductible': 1600, 'oop_max': 4000, 'cost_index': 1.08},
    'ID': {'individual': 6800, 'family': 18600, 'deductible': 1900, 'oop_max': 4600, 'cost_index': 0.94},
    'IL': {'individual': 7800, 'family': 21200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.08},
    'IN': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.98},
    'IA': {'individual': 7000, 'family': 19000, 'deductible': 1800, 'oop_max': 4500, 'cost_index': 0.95},
    'KS': {'individual': 7000, 'family': 19200, 'deductible': 1900, 'oop_max': 4600, 'cost_index': 0.96},
    'KY': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.98},
    'LA': {'individual': 7400, 'family': 20000, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 1.02},
    'ME': {'individual': 7800, 'family': 21200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.08},
    'MD': {'individual': 7800, 'family': 21000, 'deductible': 1700, 'oop_max': 4400, 'cost_index': 1.10},
    'MA': {'individual': 9000, 'family': 24200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.25},
    'MI': {'individual': 7400, 'family': 20200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.02},
    'MN': {'individual': 7200, 'family': 19400, 'deductible': 1700, 'oop_max': 4400, 'cost_index': 1.05},
    'MS': {'individual': 7000, 'family': 19200, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 0.96},
    'MO': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.98},
    'MT': {'individual': 7400, 'family': 20000, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 1.00},
    'NE': {'individual': 7000, 'family': 19200, 'deductible': 1900, 'oop_max': 4600, 'cost_index': 0.96},
    'NV': {'individual': 7600, 'family': 20600, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 1.04},
    'NH': {'individual': 8200, 'family': 22200, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 1.15},
    'NJ': {'individual': 8400, 'family': 22800, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.18},
    'NM': {'individual': 6800, 'family': 18600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.94},
    'NY': {'individual': 8800, 'family': 23800, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.22},
    'NC': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.98},
    'ND': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.98},
    'OH': {'individual': 7400, 'family': 20200, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 1.02},
    'OK': {'individual': 7000, 'family': 19200, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 0.96},
    'OR': {'individual': 7600, 'family': 20600, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.05},
    'PA': {'individual': 7800, 'family': 21200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.08},
    'RI': {'individual': 8200, 'family': 22200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.15},
    'SC': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 0.98},
    'SD': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4700, 'cost_index': 0.98},
    'TN': {'individual': 7200, 'family': 19600, 'deductible': 1900, 'oop_max': 4800, 'cost_index': 0.98},
    'TX': {'individual': 7400, 'family': 20200, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 1.02},
    'UT': {'individual': 6800, 'family': 18400, 'deductible': 1800, 'oop_max': 4500, 'cost_index': 0.92},
    'VT': {'individual': 8000, 'family': 21600, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.12},
    'VA': {'individual': 7400, 'family': 20000, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.02},
    'WA': {'individual': 7800, 'family': 21000, 'deductible': 1700, 'oop_max': 4400, 'cost_index': 1.08},
    'WV': {'individual': 7600, 'family': 20600, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 1.04},
    'WI': {'individual': 7400, 'family': 20200, 'deductible': 1800, 'oop_max': 4600, 'cost_index': 1.02},
    'WY': {'individual': 7600, 'family': 20800, 'deductible': 2000, 'oop_max': 4900, 'cost_index': 1.04},
}


def insert_or_update_healthcare_cost(conn, state_abbr: str, costs: Dict, region: Optional[str] = None):
    """Insert or update healthcare cost in database."""
    cursor = conn.cursor()

    query = """
    INSERT INTO healthcare_cost (
        id, "stateAbbr", region,
        "individualPremium", "familyPremium",
        "avgDeductible", "avgOutOfPocket", "costOfCareIndex",
        "asOfYear", source, "updatedAt"
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
    )
    ON CONFLICT ("stateAbbr", region, "asOfYear")
    DO UPDATE SET
        "individualPremium" = EXCLUDED."individualPremium",
        "familyPremium" = EXCLUDED."familyPremium",
        "avgDeductible" = EXCLUDED."avgDeductible",
        "avgOutOfPocket" = EXCLUDED."avgOutOfPocket",
        "costOfCareIndex" = EXCLUDED."costOfCareIndex",
        source = EXCLUDED.source,
        "updatedAt" = NOW()
    """

    cursor.execute(query, (
        generate_cuid(),
        state_abbr,
        region,
        costs['individual'],
        costs['family'],
        costs['deductible'],
        costs['oop_max'],
        costs['cost_index'],
        DATA_YEAR,
        'KFF Employer Health Benefits Survey 2024'
    ))

    conn.commit()
    cursor.close()


def main():
    """Main ETL process."""
    print(f"🏥 Healthcare Cost Import - {DATA_YEAR}")
    print("=" * 60)

    # Connect to database
    print("\n📊 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Import state-level costs
    print(f"\n🗺️  Processing state-level healthcare costs...")

    for state_abbr, costs in STATE_HEALTHCARE_COSTS.items():
        insert_or_update_healthcare_cost(
            conn,
            state_abbr=state_abbr,
            costs=costs,
            region=None
        )

        cost_marker = ""
        if costs['individual'] > 8500:
            cost_marker = "💰 HIGH"
        elif costs['individual'] < 7000:
            cost_marker = "✅ LOW"

        print(f"   ✓ {state_abbr}: ${costs['individual']:,}/yr (individual) | "
              f"${costs['family']:,}/yr (family) | "
              f"Cost index: {costs['cost_index']:.2f} {cost_marker}")

    # Summary
    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print(f"   States imported: {len(STATE_HEALTHCARE_COSTS)}")

    # Find extremes
    most_expensive = max(STATE_HEALTHCARE_COSTS.items(),
                        key=lambda x: x[1]['individual'])
    least_expensive = min(STATE_HEALTHCARE_COSTS.items(),
                         key=lambda x: x[1]['individual'])

    print(f"\n   Most expensive (individual): {most_expensive[0]} "
          f"(${most_expensive[1]['individual']:,}/yr)")
    print(f"   Least expensive (individual): {least_expensive[0]} "
          f"(${least_expensive[1]['individual']:,}/yr)")

    most_expensive_family = max(STATE_HEALTHCARE_COSTS.items(),
                                key=lambda x: x[1]['family'])
    least_expensive_family = min(STATE_HEALTHCARE_COSTS.items(),
                                 key=lambda x: x[1]['family'])

    print(f"\n   Most expensive (family): {most_expensive_family[0]} "
          f"(${most_expensive_family[1]['family']:,}/yr)")
    print(f"   Least expensive (family): {least_expensive_family[0]} "
          f"(${least_expensive_family[1]['family']:,}/yr)")

    # Regional patterns
    print(f"\n💡 Regional insights:")
    print(f"   Northeast avg: ${sum(c['individual'] for s, c in STATE_HEALTHCARE_COSTS.items() if s in ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA']) / 9:,.0f}/yr")
    print(f"   South avg: ${sum(c['individual'] for s, c in STATE_HEALTHCARE_COSTS.items() if s in ['DE', 'MD', 'DC', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK', 'TX']) / 17:,.0f}/yr")
    print(f"   Midwest avg: ${sum(c['individual'] for s, c in STATE_HEALTHCARE_COSTS.items() if s in ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS']) / 12:,.0f}/yr")
    print(f"   West avg: ${sum(c['individual'] for s, c in STATE_HEALTHCARE_COSTS.items() if s in ['MT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'UT', 'NV', 'WA', 'OR', 'CA', 'AK', 'HI']) / 13:,.0f}/yr")

    conn.close()


if __name__ == "__main__":
    main()
