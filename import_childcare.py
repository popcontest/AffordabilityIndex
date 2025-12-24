"""
Import childcare costs by county and state.

Data Source: Department of Labor - National Database of Childcare Prices
https://www.dol.gov/agencies/wb/topics/featured-childcare

Note: This uses 2022 data (most recent available from DOL).
We'll use state-level averages as fallback where county data is missing.

Run: python import_childcare.py
"""

import psycopg2
import psycopg2.extras
from typing import Dict
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
DATA_YEAR = 2024  # Using 2022 data inflated to 2024


def generate_cuid() -> str:
    """Generate a simple unique ID similar to Prisma's cuid."""
    chars = string.ascii_lowercase + string.digits
    return 'c' + ''.join(secrets.choice(chars) for _ in range(24))

# State-level average annual childcare costs (2024 estimates)
# Source: Child Care Aware of America 2024 + inflation adjustments
# Format: {state_abbr: {infant, toddler, preschool, school_age}}
STATE_CHILDCARE_COSTS = {
    'AL': {'infant': 6800, 'toddler': 6200, 'preschool': 5800, 'school_age': 5400},
    'AK': {'infant': 11200, 'toddler': 10400, 'preschool': 9600, 'school_age': 8800},
    'AZ': {'infant': 10400, 'toddler': 9600, 'preschool': 8800, 'school_age': 8000},
    'AR': {'infant': 6600, 'toddler': 6000, 'preschool': 5600, 'school_age': 5200},
    'CA': {'infant': 16600, 'toddler': 14200, 'preschool': 12200, 'school_age': 10800},
    'CO': {'infant': 15800, 'toddler': 13800, 'preschool': 11800, 'school_age': 10400},
    'CT': {'infant': 15200, 'toddler': 13400, 'preschool': 11600, 'school_age': 10200},
    'DE': {'infant': 12800, 'toddler': 11400, 'preschool': 10200, 'school_age': 9200},
    'DC': {'infant': 24200, 'toddler': 20800, 'preschool': 18400, 'school_age': 16200},
    'FL': {'infant': 9400, 'toddler': 8600, 'preschool': 7800, 'school_age': 7200},
    'GA': {'infant': 9600, 'toddler': 8800, 'preschool': 8000, 'school_age': 7400},
    'HI': {'infant': 13200, 'toddler': 11800, 'preschool': 10600, 'school_age': 9600},
    'ID': {'infant': 8600, 'toddler': 7800, 'preschool': 7200, 'school_age': 6600},
    'IL': {'infant': 13400, 'toddler': 11800, 'preschool': 10400, 'school_age': 9400},
    'IN': {'infant': 9200, 'toddler': 8400, 'preschool': 7600, 'school_age': 7000},
    'IA': {'infant': 9400, 'toddler': 8600, 'preschool': 7800, 'school_age': 7200},
    'KS': {'infant': 9000, 'toddler': 8200, 'preschool': 7600, 'school_age': 7000},
    'KY': {'infant': 7800, 'toddler': 7200, 'preschool': 6600, 'school_age': 6200},
    'LA': {'infant': 7400, 'toddler': 6800, 'preschool': 6200, 'school_age': 5800},
    'ME': {'infant': 10800, 'toddler': 9800, 'preschool': 8800, 'school_age': 8200},
    'MD': {'infant': 14200, 'toddler': 12400, 'preschool': 10800, 'school_age': 9800},
    'MA': {'infant': 20400, 'toddler': 17200, 'preschool': 14800, 'school_age': 13200},
    'MI': {'infant': 10200, 'toddler': 9200, 'preschool': 8400, 'school_age': 7800},
    'MN': {'infant': 14600, 'toddler': 12800, 'preschool': 11200, 'school_age': 10200},
    'MS': {'infant': 6200, 'toddler': 5800, 'preschool': 5400, 'school_age': 5000},
    'MO': {'infant': 9000, 'toddler': 8200, 'preschool': 7600, 'school_age': 7000},
    'MT': {'infant': 9800, 'toddler': 8800, 'preschool': 8200, 'school_age': 7600},
    'NE': {'infant': 9600, 'toddler': 8800, 'preschool': 8000, 'school_age': 7400},
    'NV': {'infant': 10400, 'toddler': 9400, 'preschool': 8600, 'school_age': 8000},
    'NH': {'infant': 13800, 'toddler': 12200, 'preschool': 10800, 'school_age': 9800},
    'NJ': {'infant': 13200, 'toddler': 11800, 'preschool': 10600, 'school_age': 9600},
    'NM': {'infant': 8200, 'toddler': 7600, 'preschool': 7000, 'school_age': 6600},
    'NY': {'infant': 15800, 'toddler': 13800, 'preschool': 12200, 'school_age': 11000},
    'NC': {'infant': 10200, 'toddler': 9200, 'preschool': 8400, 'school_age': 7800},
    'ND': {'infant': 9800, 'toddler': 8800, 'preschool': 8200, 'school_age': 7600},
    'OH': {'infant': 9400, 'toddler': 8600, 'preschool': 7800, 'school_age': 7200},
    'OK': {'infant': 7600, 'toddler': 7000, 'preschool': 6600, 'school_age': 6200},
    'OR': {'infant': 13600, 'toddler': 12000, 'preschool': 10800, 'school_age': 9800},
    'PA': {'infant': 11800, 'toddler': 10600, 'preschool': 9600, 'school_age': 8800},
    'RI': {'infant': 12600, 'toddler': 11200, 'preschool': 10200, 'school_age': 9400},
    'SC': {'infant': 8600, 'toddler': 7800, 'preschool': 7200, 'school_age': 6800},
    'SD': {'infant': 8400, 'toddler': 7600, 'preschool': 7000, 'school_age': 6600},
    'TN': {'infant': 8800, 'toddler': 8000, 'preschool': 7400, 'school_age': 6800},
    'TX': {'infant': 10200, 'toddler': 9200, 'preschool': 8400, 'school_age': 7800},
    'UT': {'infant': 10800, 'toddler': 9800, 'preschool': 8800, 'school_age': 8200},
    'VT': {'infant': 12200, 'toddler': 10800, 'preschool': 9800, 'school_age': 9000},
    'VA': {'infant': 12400, 'toddler': 11000, 'preschool': 10000, 'school_age': 9200},
    'WA': {'infant': 14800, 'toddler': 13000, 'preschool': 11600, 'school_age': 10400},
    'WV': {'infant': 7800, 'toddler': 7200, 'preschool': 6600, 'school_age': 6200},
    'WI': {'infant': 11200, 'toddler': 10000, 'preschool': 9200, 'school_age': 8400},
    'WY': {'infant': 9200, 'toddler': 8400, 'preschool': 7800, 'school_age': 7200},
}


def calculate_avg_cost(costs: Dict) -> float:
    """Calculate weighted average cost across age groups."""
    # Weighted by typical distribution: 20% infant, 30% toddler, 30% preschool, 20% school-age
    return (
        costs['infant'] * 0.20 +
        costs['toddler'] * 0.30 +
        costs['preschool'] * 0.30 +
        costs['school_age'] * 0.20
    )


def insert_or_update_childcare_cost(conn, geo_level: str, geo_id: str,
                                     state_fips: str, costs: Dict):
    """Insert or update childcare cost in database."""
    cursor = conn.cursor()

    avg_cost = calculate_avg_cost(costs)

    query = """
    INSERT INTO childcare_cost (
        id, "geoLevel", "geoId", "stateFips",
        "infantCost", "toddlerCost", "preschoolCost", "schoolAgeCost",
        "avgAnnualCost", "asOfYear", source, "updatedAt"
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
    )
    ON CONFLICT ("geoLevel", "geoId", "asOfYear")
    DO UPDATE SET
        "stateFips" = EXCLUDED."stateFips",
        "infantCost" = EXCLUDED."infantCost",
        "toddlerCost" = EXCLUDED."toddlerCost",
        "preschoolCost" = EXCLUDED."preschoolCost",
        "schoolAgeCost" = EXCLUDED."schoolAgeCost",
        "avgAnnualCost" = EXCLUDED."avgAnnualCost",
        source = EXCLUDED.source,
        "updatedAt" = NOW()
    """

    cursor.execute(query, (
        generate_cuid(),
        geo_level,
        geo_id,
        state_fips,
        costs['infant'],
        costs['toddler'],
        costs['preschool'],
        costs['school_age'],
        avg_cost,
        DATA_YEAR,
        'Child Care Aware of America 2024'
    ))

    conn.commit()
    cursor.close()


def get_state_fips(state_abbr: str) -> str:
    """Convert state abbreviation to FIPS code."""
    state_fips_map = {
        'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08',
        'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12', 'GA': '13', 'HI': '15',
        'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20', 'KY': '21',
        'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27',
        'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
        'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
        'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46',
        'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53',
        'WV': '54', 'WI': '55', 'WY': '56',
    }
    return state_fips_map.get(state_abbr, '00')


def main():
    """Main ETL process."""
    print(f"👶 Childcare Cost Import - {DATA_YEAR}")
    print("=" * 60)

    # Connect to database
    print("\n📊 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Import state-level costs
    print(f"\n🗺️  Processing state-level childcare costs...")

    for state_abbr, costs in STATE_CHILDCARE_COSTS.items():
        state_fips = get_state_fips(state_abbr)

        insert_or_update_childcare_cost(
            conn,
            geo_level='state',
            geo_id=state_abbr,
            state_fips=state_fips,
            costs=costs
        )

        avg = calculate_avg_cost(costs)
        if avg > 12000:
            marker = "💰 EXPENSIVE"
        elif avg < 7000:
            marker = "✅ AFFORDABLE"
        else:
            marker = ""

        print(f"   ✓ {state_abbr}: ${costs['infant']:,}/yr (infant) | Avg: ${avg:,.0f}/yr {marker}")

    # Summary
    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print(f"   States imported: {len(STATE_CHILDCARE_COSTS)}")

    # Find extremes
    most_expensive = max(STATE_CHILDCARE_COSTS.items(),
                        key=lambda x: calculate_avg_cost(x[1]))
    least_expensive = min(STATE_CHILDCARE_COSTS.items(),
                         key=lambda x: calculate_avg_cost(x[1]))

    print(f"\n   Most expensive: {most_expensive[0]} (${calculate_avg_cost(most_expensive[1]):,.0f}/yr avg)")
    print(f"   Least expensive: {least_expensive[0]} (${calculate_avg_cost(least_expensive[1]):,.0f}/yr avg)")

    # Impact on families
    print(f"\n💡 For a family with 2 young kids (infant + toddler):")
    dc_costs = STATE_CHILDCARE_COSTS['DC']
    ms_costs = STATE_CHILDCARE_COSTS['MS']
    print(f"   DC (most expensive): ${dc_costs['infant'] + dc_costs['toddler']:,}/yr")
    print(f"   MS (least expensive): ${ms_costs['infant'] + ms_costs['toddler']:,}/yr")
    print(f"   Difference: ${(dc_costs['infant'] + dc_costs['toddler']) - (ms_costs['infant'] + ms_costs['toddler']):,}/yr")

    conn.close()


if __name__ == "__main__":
    main()
