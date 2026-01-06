"""
ACS (American Community Survey) Snapshot Import Module

Fetches affordability-related demographic metrics from U.S. Census ACS API
and imports them into the acs_snapshot table with margins of error.

Metrics:
- Median Gross Rent (B25064_001E/M)
- Housing Cost Burden % (DP04_0136PE/PM)
- Poverty Rate % (S1701_C03_001E/M)
"""

import requests
import psycopg2
from psycopg2.extras import execute_values
from typing import Optional, Dict, List
import uuid
import time
from datetime import datetime
import config


# Census API configuration
ACS_YEAR = 2022
ACS_VINTAGE = "2018-2022"  # 5-year period ending in 2022

# ACS variable codes
# Note: Different tables (B/DP/S) require separate API calls
ACS_VARIABLES = {
    'medianRent': 'B25064_001E',
    'medianRentMoe': 'B25064_001M',
    'housingBurdenPct': 'DP04_0136PE',
    'housingBurdenPctMoe': 'DP04_0136PM',
    'povertyRatePct': 'S1701_C03_001E',
    'povertyRatePctMoe': 'S1701_C03_001M',
}


def calculate_cv(estimate: float, moe: float) -> float:
    """
    Calculate coefficient of variation (CV) for ACS estimate.

    CV = (MOE / 1.645) / estimate

    Returns:
        CV as a decimal (e.g., 0.15 = 15% CV)
        Returns infinity if estimate is 0
    """
    if estimate == 0:
        return float('inf')
    return (moe / 1.645) / abs(estimate)


def should_suppress_metric(estimate: Optional[float], moe: Optional[float], threshold: float = 0.30) -> bool:
    """
    Determine if metric should be suppressed due to high MOE.

    Args:
        estimate: The estimate value
        moe: Margin of error
        threshold: CV threshold for suppression (default 30%)

    Returns:
        True if metric should be suppressed
    """
    if estimate is None or moe is None:
        return True
    if estimate == 0:
        return True
    cv = calculate_cv(estimate, moe)
    return cv > threshold


def fetch_acs_data_for_zcta(zcta: str, api_key: Optional[str] = None, retry_count: int = 3) -> Optional[Dict]:
    """
    Fetch ACS data for a single ZCTA from Census API.

    Note: Census API requires separate calls for different table types (B, DP, S).

    Args:
        zcta: 5-digit ZCTA code
        api_key: Census API key (optional but increases rate limits)
        retry_count: Number of retries on failure

    Returns:
        Dictionary with ACS metrics and MOEs, or None if fetch failed
    """
    base_url = f"{config.CENSUS_API_BASE}/{ACS_YEAR}/{config.CENSUS_ACS_DATASET}"

    result = {
        'zcta': zcta,
        'medianRent': None,
        'medianRentMoe': None,
        'housingBurdenPct': None,
        'housingBurdenPctMoe': None,
        'povertyRatePct': None,
        'povertyRatePctMoe': None,
    }

    # Fetch from B-table (Median Rent)
    b_variables = "B25064_001E,B25064_001M"
    b_params = {
        'get': b_variables,
        'for': f'zip code tabulation area:{zcta}',
    }
    if api_key:
        b_params['key'] = api_key

    for attempt in range(retry_count):
        try:
            response = requests.get(base_url, params=b_params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if len(data) > 1:  # First row is headers
                    values = data[1]
                    # Census uses negative values as sentinel codes for missing/unavailable data
                    rent_val = float(values[0]) if values[0] not in [None, ''] else None
                    rent_moe = float(values[1]) if values[1] not in [None, ''] else None
                    result['medianRent'] = rent_val if rent_val and rent_val > 0 else None
                    result['medianRentMoe'] = rent_moe if rent_moe and rent_moe > 0 else None
                break
            elif response.status_code == 204:  # No content - ZCTA not in ACS
                break
            else:
                print(f"  Warning: B-table API returned {response.status_code} for ZCTA {zcta}")
                if attempt < retry_count - 1:
                    time.sleep(1 * (attempt + 1))  # Exponential backoff
        except Exception as e:
            print(f"  Error fetching B-table for ZCTA {zcta}: {e}")
            if attempt < retry_count - 1:
                time.sleep(1 * (attempt + 1))

    # Fetch from DP-table (Housing Burden)
    dp_variables = "DP04_0136PE,DP04_0136PM"
    dp_params = {
        'get': dp_variables,
        'for': f'zip code tabulation area:{zcta}',
    }
    if api_key:
        dp_params['key'] = api_key

    for attempt in range(retry_count):
        try:
            response = requests.get(f"{base_url}/profile", params=dp_params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if len(data) > 1:
                    values = data[1]
                    burden_val = float(values[0]) if values[0] not in [None, ''] else None
                    burden_moe = float(values[1]) if values[1] not in [None, ''] else None
                    # Validate percentage is reasonable (0-100)
                    result['housingBurdenPct'] = burden_val if burden_val and 0 <= burden_val <= 100 else None
                    result['housingBurdenPctMoe'] = burden_moe if burden_moe and burden_moe > 0 else None
                break
            elif response.status_code == 204:
                break
            else:
                print(f"  Warning: DP-table API returned {response.status_code} for ZCTA {zcta}")
                if attempt < retry_count - 1:
                    time.sleep(1 * (attempt + 1))
        except Exception as e:
            print(f"  Error fetching DP-table for ZCTA {zcta}: {e}")
            if attempt < retry_count - 1:
                time.sleep(1 * (attempt + 1))

    # Fetch from S-table (Poverty Rate)
    s_variables = "S1701_C03_001E,S1701_C03_001M"
    s_params = {
        'get': s_variables,
        'for': f'zip code tabulation area:{zcta}',
    }
    if api_key:
        s_params['key'] = api_key

    for attempt in range(retry_count):
        try:
            response = requests.get(f"{base_url}/subject", params=s_params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if len(data) > 1:
                    values = data[1]
                    poverty_val = float(values[0]) if values[0] not in [None, ''] else None
                    poverty_moe = float(values[1]) if values[1] not in [None, ''] else None
                    # Validate percentage is reasonable (0-100)
                    result['povertyRatePct'] = poverty_val if poverty_val and 0 <= poverty_val <= 100 else None
                    result['povertyRatePctMoe'] = poverty_moe if poverty_moe and poverty_moe > 0 else None
                break
            elif response.status_code == 204:
                break
            else:
                print(f"  Warning: S-table API returned {response.status_code} for ZCTA {zcta}")
                if attempt < retry_count - 1:
                    time.sleep(1 * (attempt + 1))
        except Exception as e:
            print(f"  Error fetching S-table for ZCTA {zcta}: {e}")
            if attempt < retry_count - 1:
                time.sleep(1 * (attempt + 1))

    # Check if we got any data
    if all(v is None for k, v in result.items() if k != 'zcta'):
        return None

    return result


def import_acs_for_zctas(
    database_url: str,
    limit: Optional[int] = None,
    start_offset: int = 0,
    dry_run: bool = False,
    api_key: Optional[str] = None
) -> None:
    """
    Import ACS data for all ZCTAs in geo_zcta table.

    Args:
        database_url: PostgreSQL connection string
        limit: Limit number of ZCTAs to process (for testing)
        start_offset: Skip first N ZCTAs (for resuming)
        dry_run: If True, print actions without executing
        api_key: Census API key (optional)
    """
    print(f"\n[Importing ACS Data for ZCTAs]")
    print(f"  Vintage: {ACS_VINTAGE} (year {ACS_YEAR})")
    print(f"  Dry Run: {dry_run}")
    if limit:
        print(f"  Limit: {limit} ZCTAs")
    if start_offset:
        print(f"  Start Offset: {start_offset}")

    # Get list of ZCTAs
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Fetch ZCTAs with population filter (skip very small areas)
        query = """
            SELECT zcta, population, "stateAbbr"
            FROM geo_zcta
            WHERE population IS NULL OR population >= 500
            ORDER BY zcta
        """
        if start_offset:
            query += f" OFFSET {start_offset}"
        if limit:
            query += f" LIMIT {limit}"

        cursor.execute(query)
        zctas = cursor.fetchall()
        print(f"  Found {len(zctas)} ZCTAs to process")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"  ERROR querying ZCTAs: {e}")
        return

    if dry_run:
        print(f"  [DRY-RUN] Would fetch ACS data for {len(zctas)} ZCTAs")
        if zctas:
            sample_zcta = zctas[0][0]
            print(f"  [DRY-RUN] Sample fetch for ZCTA {sample_zcta}...")
            sample_data = fetch_acs_data_for_zcta(sample_zcta, api_key)
            if sample_data:
                print(f"    Median Rent: ${sample_data['medianRent']} ±${sample_data['medianRentMoe']}")
                print(f"    Housing Burden: {sample_data['housingBurdenPct']}% ±{sample_data['housingBurdenPctMoe']}%")
                print(f"    Poverty Rate: {sample_data['povertyRatePct']}% ±{sample_data['povertyRatePctMoe']}%")
            else:
                print(f"    No data available for this ZCTA")
        return

    # Process ZCTAs
    rows_to_insert = []
    success_count = 0
    no_data_count = 0
    suppressed_count = 0

    for idx, (zcta, population, state_abbr) in enumerate(zctas, start=1):
        if idx % 100 == 0:
            print(f"  Progress: {idx}/{len(zctas)} ZCTAs processed...")

        # Fetch ACS data
        acs_data = fetch_acs_data_for_zcta(zcta, api_key)

        if not acs_data:
            no_data_count += 1
            continue

        # Calculate CVs for quality flagging (but still import the data)
        rent_cv = calculate_cv(acs_data['medianRent'], acs_data['medianRentMoe']) if acs_data['medianRent'] and acs_data['medianRentMoe'] else float('inf')
        burden_cv = calculate_cv(acs_data['housingBurdenPct'], acs_data['housingBurdenPctMoe']) if acs_data['housingBurdenPct'] and acs_data['housingBurdenPctMoe'] else float('inf')
        poverty_cv = calculate_cv(acs_data['povertyRatePct'], acs_data['povertyRatePctMoe']) if acs_data['povertyRatePct'] and acs_data['povertyRatePctMoe'] else float('inf')

        # Count how many metrics pass the CV threshold
        passing_metrics = sum([
            rent_cv < 0.30,
            burden_cv < 0.30,
            poverty_cv < 0.30
        ])

        # Skip if no metrics pass quality threshold
        if passing_metrics == 0:
            suppressed_count += 1
            continue

        # Prepare row for insert
        now = datetime.utcnow()
        rows_to_insert.append((
            str(uuid.uuid4()),
            'ZCTA',
            zcta,
            ACS_VINTAGE,
            ACS_YEAR,
            acs_data['medianRent'],
            acs_data['medianRentMoe'],
            acs_data['housingBurdenPct'],
            acs_data['housingBurdenPctMoe'],
            acs_data['povertyRatePct'],
            acs_data['povertyRatePctMoe'],
            now,
            now,
        ))
        success_count += 1

        # Batch insert every 100 rows to avoid memory issues
        if len(rows_to_insert) >= 100:
            try:
                conn = psycopg2.connect(database_url)
                cursor = conn.cursor()

                execute_values(
                    cursor,
                    """
                    INSERT INTO acs_snapshot (
                        id, "geoType", "geoId", vintage, "asOfYear",
                        "medianRent", "medianRentMoe",
                        "housingBurdenPct", "housingBurdenPctMoe",
                        "povertyRatePct", "povertyRatePctMoe",
                        "createdAt", "updatedAt"
                    ) VALUES %s
                    ON CONFLICT ("geoType", "geoId", "asOfYear")
                    DO UPDATE SET
                        vintage = EXCLUDED.vintage,
                        "medianRent" = EXCLUDED."medianRent",
                        "medianRentMoe" = EXCLUDED."medianRentMoe",
                        "housingBurdenPct" = EXCLUDED."housingBurdenPct",
                        "housingBurdenPctMoe" = EXCLUDED."housingBurdenPctMoe",
                        "povertyRatePct" = EXCLUDED."povertyRatePct",
                        "povertyRatePctMoe" = EXCLUDED."povertyRatePctMoe",
                        "updatedAt" = EXCLUDED."updatedAt"
                    """,
                    rows_to_insert
                )

                conn.commit()
                cursor.close()
                conn.close()

                rows_to_insert = []
            except Exception as e:
                print(f"  ERROR inserting batch: {e}")

        # Rate limiting: small delay to avoid hitting API limits
        time.sleep(0.1)

    # Insert remaining rows
    if rows_to_insert:
        try:
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor()

            execute_values(
                cursor,
                """
                INSERT INTO acs_snapshot (
                    id, "geoType", "geoId", vintage, "asOfYear",
                    "medianRent", "medianRentMoe",
                    "housingBurdenPct", "housingBurdenPctMoe",
                    "povertyRatePct", "povertyRatePctMoe",
                    "createdAt", "updatedAt"
                ) VALUES %s
                ON CONFLICT ("geoType", "geoId", "asOfYear")
                DO UPDATE SET
                    vintage = EXCLUDED.vintage,
                    "medianRent" = EXCLUDED."medianRent",
                    "medianRentMoe" = EXCLUDED."medianRentMoe",
                    "housingBurdenPct" = EXCLUDED."housingBurdenPct",
                    "housingBurdenPctMoe" = EXCLUDED."housingBurdenPctMoe",
                    "povertyRatePct" = EXCLUDED."povertyRatePct",
                    "povertyRatePctMoe" = EXCLUDED."povertyRatePctMoe",
                    "updatedAt" = EXCLUDED."updatedAt"
                """,
                rows_to_insert
            )

            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"  ERROR inserting final batch: {e}")

    print(f"\n[Import Complete]")
    print(f"  Successfully imported: {success_count} ZCTAs")
    print(f"  No data available: {no_data_count} ZCTAs")
    print(f"  Suppressed (high MOE): {suppressed_count} ZCTAs")
