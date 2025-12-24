"""
Import state and local income tax rates.

Data Source: Tax Foundation (https://taxfoundation.org/data/all/state/state-income-tax-rates/)

This script calculates effective tax rates at various income levels for all 50 states + DC.
Handles:
- States with no income tax (TX, FL, WA, TN, NH, NV, SD, WY, AK)
- Flat tax states (CO, IL, IN, KY, MA, MI, NC, PA, UT)
- Progressive tax states (all others)
- Local income taxes (NY, OH, PA, MD, etc.)

Run: python import_income_tax.py
"""

import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Dict, List, Optional
import sys
import io
import secrets
import string

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Tax year
TAX_YEAR = 2025


def generate_cuid() -> str:
    """Generate a simple unique ID similar to Prisma's cuid."""
    chars = string.ascii_lowercase + string.digits
    return 'c' + ''.join(secrets.choice(chars) for _ in range(24))

# State income tax data for 2025
# Format: {state_abbr: {'rate': X.XX, 'type': 'none'|'flat'|'progressive'}}
STATE_TAX_RATES = {
    # No income tax states
    'AK': {'type': 'none', 'rate': 0.0},
    'FL': {'type': 'none', 'rate': 0.0},
    'NV': {'type': 'none', 'rate': 0.0},
    'NH': {'type': 'none', 'rate': 0.0},  # Only dividends/interest
    'SD': {'type': 'none', 'rate': 0.0},
    'TN': {'type': 'none', 'rate': 0.0},
    'TX': {'type': 'none', 'rate': 0.0},
    'WA': {'type': 'none', 'rate': 0.0},
    'WY': {'type': 'none', 'rate': 0.0},

    # Flat tax states (single rate applies to all income)
    'AZ': {'type': 'flat', 'rate': 2.5},
    'CO': {'type': 'flat', 'rate': 4.4},
    'IL': {'type': 'flat', 'rate': 4.95},
    'IN': {'type': 'flat', 'rate': 3.05},
    'KY': {'type': 'flat', 'rate': 4.0},
    'MA': {'type': 'flat', 'rate': 5.0},
    'MI': {'type': 'flat', 'rate': 4.25},
    'NC': {'type': 'flat', 'rate': 4.5},
    'PA': {'type': 'flat', 'rate': 3.07},
    'UT': {'type': 'flat', 'rate': 4.55},

    # Progressive tax states (simplified to top marginal rate)
    # Note: These are TOP rates; effective rates will be lower
    'AL': {'type': 'progressive', 'top_rate': 5.0, 'threshold': 3001},
    'AR': {'type': 'progressive', 'top_rate': 4.4, 'threshold': 24300},
    'CA': {'type': 'progressive', 'top_rate': 13.3, 'threshold': 1000000},
    'CT': {'type': 'progressive', 'top_rate': 6.99, 'threshold': 500000},
    'DE': {'type': 'progressive', 'top_rate': 6.6, 'threshold': 60000},
    'DC': {'type': 'progressive', 'top_rate': 10.75, 'threshold': 1000000},
    'GA': {'type': 'progressive', 'top_rate': 5.75, 'threshold': 7000},
    'HI': {'type': 'progressive', 'top_rate': 11.0, 'threshold': 200000},
    'ID': {'type': 'progressive', 'top_rate': 5.8, 'threshold': 12195},
    'IA': {'type': 'progressive', 'top_rate': 5.7, 'threshold': 78435},
    'KS': {'type': 'progressive', 'top_rate': 5.7, 'threshold': 30000},
    'LA': {'type': 'progressive', 'top_rate': 4.25, 'threshold': 50001},
    'ME': {'type': 'progressive', 'top_rate': 7.15, 'threshold': 58050},
    'MD': {'type': 'progressive', 'top_rate': 5.75, 'threshold': 250000},
    'MN': {'type': 'progressive', 'top_rate': 9.85, 'threshold': 183340},
    'MS': {'type': 'progressive', 'top_rate': 5.0, 'threshold': 10000},
    'MO': {'type': 'progressive', 'top_rate': 4.95, 'threshold': 8704},
    'MT': {'type': 'progressive', 'top_rate': 5.9, 'threshold': 21600},
    'NE': {'type': 'progressive', 'top_rate': 5.84, 'threshold': 36960},
    'NJ': {'type': 'progressive', 'top_rate': 10.75, 'threshold': 1000000},
    'NM': {'type': 'progressive', 'top_rate': 5.9, 'threshold': 315000},
    'NY': {'type': 'progressive', 'top_rate': 10.9, 'threshold': 25000000},
    'ND': {'type': 'progressive', 'top_rate': 2.9, 'threshold': 458350},
    'OH': {'type': 'progressive', 'top_rate': 3.75, 'threshold': 115300},
    'OK': {'type': 'progressive', 'top_rate': 4.75, 'threshold': 7200},
    'OR': {'type': 'progressive', 'top_rate': 9.9, 'threshold': 125000},
    'RI': {'type': 'progressive', 'top_rate': 5.99, 'threshold': 155050},
    'SC': {'type': 'progressive', 'top_rate': 6.4, 'threshold': 16300},
    'VT': {'type': 'progressive', 'top_rate': 8.75, 'threshold': 229550},
    'VA': {'type': 'progressive', 'top_rate': 5.75, 'threshold': 17001},
    'WV': {'type': 'progressive', 'top_rate': 5.12, 'threshold': 60000},
    'WI': {'type': 'progressive', 'top_rate': 7.65, 'threshold': 405550},
}

# Local income taxes (major cities)
LOCAL_TAXES = {
    ('NY', 'New York'): 3.876,  # NYC top rate
    ('PA', 'Philadelphia'): 3.8398,
    ('OH', 'Columbus'): 2.5,
    ('OH', 'Cleveland'): 2.0,
    ('OH', 'Cincinnati'): 1.8,
    ('MD', 'Baltimore'): 3.2,
    ('MI', 'Detroit'): 2.4,
    ('KY', 'Louisville'): 2.2,
    ('OR', 'Portland'): 1.0,  # Metro tax
}


def calculate_effective_rate(income: float, state_data: Dict) -> float:
    """
    Calculate effective tax rate for a given income level.

    For progressive states, this is a simplified calculation.
    Real calculation would require full bracket data.
    """
    if state_data['type'] == 'none':
        return 0.0

    if state_data['type'] == 'flat':
        return state_data['rate']

    # Progressive: use simplified estimate
    # If income is below top threshold, use ~60% of top rate as estimate
    # If income is at/above threshold, use ~80% of top rate
    top_rate = state_data['top_rate']
    threshold = state_data.get('threshold', 100000)

    if income < threshold:
        # Lower income: effective rate is much lower than top rate
        return top_rate * (income / threshold) * 0.6
    else:
        # Higher income: effective rate approaches top rate
        return top_rate * 0.8


def insert_or_update_income_tax(conn, state_abbr: str, local_jurisdiction: Optional[str],
                                 has_tax: bool, rates: Dict):
    """Insert or update income tax rates in database."""
    cursor = conn.cursor()

    query = """
    INSERT INTO income_tax_rate (
        id, "stateAbbr", "localJurisdiction", "hasTax",
        "effectiveRateAt50k", "effectiveRateAt75k", "effectiveRateAt100k",
        "effectiveRateAt150k", "effectiveRateAt200k",
        "taxYear", source, "updatedAt"
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
    )
    ON CONFLICT ("stateAbbr", "localJurisdiction", "taxYear")
    DO UPDATE SET
        "hasTax" = EXCLUDED."hasTax",
        "effectiveRateAt50k" = EXCLUDED."effectiveRateAt50k",
        "effectiveRateAt75k" = EXCLUDED."effectiveRateAt75k",
        "effectiveRateAt100k" = EXCLUDED."effectiveRateAt100k",
        "effectiveRateAt150k" = EXCLUDED."effectiveRateAt150k",
        "effectiveRateAt200k" = EXCLUDED."effectiveRateAt200k",
        source = EXCLUDED.source,
        "updatedAt" = NOW()
    """

    cursor.execute(query, (
        generate_cuid(),
        state_abbr,
        local_jurisdiction,
        has_tax,
        rates['rate_50k'],
        rates['rate_75k'],
        rates['rate_100k'],
        rates['rate_150k'],
        rates['rate_200k'],
        TAX_YEAR,
        'Tax Foundation 2025'
    ))

    conn.commit()
    cursor.close()


def main():
    """Main ETL process."""
    print(f"💰 Income Tax Import - {TAX_YEAR}")
    print("=" * 60)

    # Connect to database
    print("\n📊 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Process state taxes
    print(f"\n🏛️  Processing state income taxes...")

    for state_abbr, state_data in STATE_TAX_RATES.items():
        # Calculate effective rates at different income levels
        rates = {
            'rate_50k': calculate_effective_rate(50000, state_data),
            'rate_75k': calculate_effective_rate(75000, state_data),
            'rate_100k': calculate_effective_rate(100000, state_data),
            'rate_150k': calculate_effective_rate(150000, state_data),
            'rate_200k': calculate_effective_rate(200000, state_data),
        }

        has_tax = state_data['type'] != 'none'

        # Insert state-level tax
        insert_or_update_income_tax(
            conn,
            state_abbr=state_abbr,
            local_jurisdiction=None,
            has_tax=has_tax,
            rates=rates
        )

        tax_desc = "No tax" if not has_tax else f"{state_data.get('rate', state_data.get('top_rate'))}%"
        print(f"   ✓ {state_abbr}: {tax_desc}")

    # Process local taxes
    print(f"\n🏙️  Processing local income taxes...")

    for (state_abbr, city_name), local_rate in LOCAL_TAXES.items():
        state_data = STATE_TAX_RATES[state_abbr]

        # Local tax is ON TOP of state tax
        rates = {
            'rate_50k': calculate_effective_rate(50000, state_data) + local_rate,
            'rate_75k': calculate_effective_rate(75000, state_data) + local_rate,
            'rate_100k': calculate_effective_rate(100000, state_data) + local_rate,
            'rate_150k': calculate_effective_rate(150000, state_data) + local_rate,
            'rate_200k': calculate_effective_rate(200000, state_data) + local_rate,
        }

        insert_or_update_income_tax(
            conn,
            state_abbr=state_abbr,
            local_jurisdiction=city_name,
            has_tax=True,
            rates=rates
        )

        print(f"   ✓ {city_name}, {state_abbr}: +{local_rate}% local")

    # Summary
    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print(f"   States: {len(STATE_TAX_RATES)}")
    print(f"   Local jurisdictions: {len(LOCAL_TAXES)}")

    conn.close()


if __name__ == "__main__":
    main()
