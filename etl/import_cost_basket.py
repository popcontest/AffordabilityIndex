"""
Cost Basket Import Module

Loads county-level cost basket data from CSV and upserts to CostBasket table.
Supports pluggable providers (basket_stub, mit_living_wage, etc.)
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from typing import Optional
import uuid


def import_cost_basket(
    csv_path: str,
    database_url: str,
    source: str,
    version: str,
    household_type: str,
    dry_run: bool = False
) -> None:
    """
    Import cost basket data from CSV to CostBasket table.

    Args:
        csv_path: Path to CSV file
        database_url: PostgreSQL connection string
        source: Provider name (e.g., "basket_stub", "mit_living_wage")
        version: Version identifier (e.g., "2025-01")
        household_type: Household type (e.g., "1_adult_0_kids")
        dry_run: If True, print actions without executing
    """
    print(f"\n[Importing Cost Basket]")
    print(f"  Source: {source}")
    print(f"  Version: {version}")
    print(f"  Household Type: {household_type}")
    print(f"  CSV: {csv_path}")

    # Load CSV (preserve leading zeros in FIPS codes)
    try:
        df = pd.read_csv(csv_path, dtype={'countyFips': str, 'stateFips': str})
        print(f"  Loaded {len(df)} records from CSV")
    except FileNotFoundError:
        print(f"  ERROR: CSV file not found: {csv_path}")
        return
    except Exception as e:
        print(f"  ERROR loading CSV: {e}")
        return

    # Validate required columns
    required_cols = ['countyFips', 'stateAbbr', 'stateFips', 'countyName', 'totalAnnual']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"  ERROR: Missing required columns: {missing_cols}")
        return

    # Optional component columns
    component_cols = ['food', 'healthcare', 'transportation', 'taxes', 'other', 'housing']

    if dry_run:
        print(f"  [DRY-RUN] Would upsert {len(df)} CostBasket records")
        print(f"  [DRY-RUN] Sample record:")
        if not df.empty:
            sample = df.iloc[0]
            print(f"    countyFips: {sample['countyFips']}")
            print(f"    countyName: {sample['countyName']}")
            print(f"    totalAnnual: ${sample['totalAnnual']:,.2f}")
        return

    # Prepare rows for insert
    from datetime import datetime
    rows = []
    now = datetime.utcnow()

    for _, row in df.iterrows():
        rows.append((
            str(uuid.uuid4()),  # Generate unique ID
            row['countyFips'],
            row['stateFips'],
            row['stateAbbr'],
            row['countyName'],
            source,
            version,
            household_type,
            row.get('food'),
            row.get('healthcare'),
            row.get('transportation'),
            row.get('taxes'),
            row.get('other'),
            row.get('housing'),
            row['totalAnnual'],
            now,  # createdAt
            now,  # updatedAt
        ))

    # Upsert to database
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        execute_values(
            cursor,
            """
            INSERT INTO cost_basket (
                id, "countyFips", "stateFips", "stateAbbr", "countyName",
                source, version, "householdType",
                food, healthcare, transportation, taxes, other, housing,
                "totalAnnual", "createdAt", "updatedAt"
            )
            VALUES %s
            ON CONFLICT ("countyFips", source, version, "householdType") DO UPDATE SET
                "stateFips" = EXCLUDED."stateFips",
                "stateAbbr" = EXCLUDED."stateAbbr",
                "countyName" = EXCLUDED."countyName",
                food = EXCLUDED.food,
                healthcare = EXCLUDED.healthcare,
                transportation = EXCLUDED.transportation,
                taxes = EXCLUDED.taxes,
                other = EXCLUDED.other,
                housing = EXCLUDED.housing,
                "totalAnnual" = EXCLUDED."totalAnnual",
                "updatedAt" = NOW()
            """,
            rows
        )

        conn.commit()
        print(f"  Successfully upserted {len(rows)} CostBasket records")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"  ERROR during database upsert: {e}")
        raise
