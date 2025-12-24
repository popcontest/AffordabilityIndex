#!/usr/bin/env python3
"""
Affordability Index ETL Pipeline
Fetches Zillow ZHVI and Census ACS data, calculates affordability ratios, and loads to Postgres.
"""

import argparse
import json
import sys
import os
import glob
import re
from datetime import datetime
from typing import Dict, Tuple, Optional
import pandas as pd
import numpy as np
import requests
import psycopg2
from psycopg2.extras import execute_values
from config import (
    DATABASE_URL,
    CENSUS_API_KEY,
    ZILLOW_PLACE_URL,
    ZILLOW_ZIP_URL,
    CENSUS_API_BASE,
    CENSUS_ACS_VINTAGE,
    CENSUS_ACS_DATASET,
)
from county_lookup import lookup_county_fips


# State FIPS lookup
STATE_FIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
    'CO': '08', 'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12',
    'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23',
    'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
    'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
    'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
    'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44',
    'SC': '45', 'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49',
    'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
    'WY': '56'
}


def normalize_text_value(value) -> Optional[str]:
    """
    Normalize text values to handle NaN, empty strings, and pandas NA values.
    Converts 'NaN', 'nan', '', pd.NA, np.nan, None to None (SQL NULL).
    Returns the string value otherwise.
    """
    if value is None or pd.isna(value):
        return None

    # Convert to string and check for NaN string literals
    str_val = str(value).strip()
    if str_val == '' or str_val.lower() == 'nan':
        return None

    return str_val


def slugify(text: str) -> str:
    """Convert text to URL-safe slug (lowercase, hyphens, no special chars)"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


def normalize_place_name(name: str) -> str:
    """
    Normalize place name for ACS matching.

    Examples:
        "San Francisco" -> "san francisco"
        "St. Louis" -> "st louis"
        "Springfield city" -> "springfield"
        "New York, NY" -> "new york"
    """
    name = name.lower()
    # Remove state suffix if present
    name = re.sub(r',\s*[a-z]{2}$', '', name)
    # Remove common suffixes
    name = re.sub(r'\s+(city|town|village|borough|municipality)$', '', name)
    # Remove punctuation
    name = re.sub(r'[^\w\s]', '', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name)
    return name.strip()


def load_local_zillow(zillow_dir: str, geos: str, latest_only: bool = True, dry_run: bool = False) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load Zillow ZHVI data from local CSV files.

    Args:
        zillow_dir: Path to directory containing Zillow CSV files
        geos: Comma-separated list of geography types (zip, city)
        latest_only: If True, only load latest date column (reduces memory)
        dry_run: If True, only report what would be loaded

    Returns:
        Tuple of (city_df, zip_df) DataFrames
    """
    print("\n[1/4] Loading local Zillow ZHVI data...")
    print(f"  Directory: {zillow_dir}")
    print(f"  Geographies: {geos}")

    if not os.path.exists(zillow_dir):
        raise ValueError(f"Zillow directory not found: {zillow_dir}")

    geo_list = [g.strip().lower() for g in geos.split(',')]

    # Detect available files
    available_files = {}
    for geo_type in ['City', 'Zip']:
        pattern = os.path.join(zillow_dir, f"{geo_type}_*.csv")
        files = glob.glob(pattern)
        if files:
            available_files[geo_type.lower()] = files[0]  # Use first match
            print(f"  Found {geo_type}: {os.path.basename(files[0])}")

    if not available_files:
        raise ValueError(f"No Zillow CSV files found in {zillow_dir}")

    if dry_run:
        print("  [DRY-RUN] Would load files and extract latest date column")
        return pd.DataFrame(), pd.DataFrame()

    city_result = pd.DataFrame()
    zip_result = pd.DataFrame()

    # Load City data
    if 'city' in geo_list:
        city_file = available_files.get('city')
        if city_file:
            print(f"  Loading City data from {os.path.basename(city_file)}...")
            # Read only ID columns first to detect date columns
            sample_df = pd.read_csv(city_file, nrows=0)
            date_cols = [col for col in sample_df.columns if '-' in col and col[0].isdigit()]

            if not date_cols:
                print("    Warning: No date columns found, skipping")
            else:
                latest_date = max(date_cols)
                print(f"    Latest data: {latest_date}")

                # Load only required columns
                use_cols = ['RegionID', 'RegionName', 'State', 'StateName', 'CountyName', 'Metro', latest_date]
                # Filter to columns that exist
                use_cols = [col for col in use_cols if col in sample_df.columns]

                df = pd.read_csv(city_file, usecols=use_cols)
                print(f"    Loaded {len(df)} records")

                # Process to standard format
                city_data = []
                for _, row in df[df[latest_date].notna()].iterrows():
                    city_id = str(row['RegionID']) if pd.notna(row.get('RegionID')) else None
                    name = row.get('RegionName', '')

                    if city_id and name:
                        city_data.append({
                            'city_id': city_id,
                            'name': name,
                            'state_abbr': row.get('State', '')[:2].upper() if pd.notna(row.get('State')) else '',
                            'state_name': normalize_text_value(row.get('StateName')),
                            'county_name': normalize_text_value(row.get('CountyName')),
                            'metro': normalize_text_value(row.get('Metro')),
                            'slug': slugify(name),
                            'home_value': float(row[latest_date]),
                            'as_of_date': latest_date,
                        })

                city_result = pd.DataFrame(city_data)
                print(f"    Processed {len(city_result)} cities")

    # Load ZIP data
    if 'zip' in geo_list:
        zip_file = available_files.get('zip')
        if zip_file:
            print(f"  Loading ZIP data from {os.path.basename(zip_file)}...")
            sample_df = pd.read_csv(zip_file, nrows=0)
            date_cols = [col for col in sample_df.columns if '-' in col and col[0].isdigit()]

            if not date_cols:
                print("    Warning: No date columns found, skipping")
            else:
                latest_date = max(date_cols)
                print(f"    Latest data: {latest_date}")

                use_cols = ['RegionName', 'State', latest_date]
                use_cols = [col for col in use_cols if col in sample_df.columns]

                df = pd.read_csv(zip_file, usecols=use_cols)
                print(f"    Loaded {len(df)} records")

                # Process to standard format
                zip_data = []
                for _, row in df[df[latest_date].notna()].iterrows():
                    zcta = str(row.get('RegionName', '')).zfill(5)
                    if len(zcta) == 5 and zcta.isdigit():
                        zip_data.append({
                            'zcta': zcta,
                            'state_abbr': row.get('State', '')[:2].upper() if pd.notna(row.get('State')) else None,
                            'home_value': float(row[latest_date]),
                            'as_of_date': latest_date,
                        })

                zip_result = pd.DataFrame(zip_data)
                print(f"    Processed {len(zip_result)} ZCTAs")

    return city_result, zip_result


def fetch_acs_income(dry_run: bool = False, limit_states: int = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Fetch Census ACS B19013 (median household income) and B01003 (population) for Place and ZCTA.

    Args:
        dry_run: If True, skip actual API calls
        limit_states: If set, only fetch data for N states (for testing)

    Returns:
        Tuple of (place_df, zcta_df) DataFrames
    """
    print("\n[2/4] Fetching Census ACS income data...")
    print(f"  API Key: {'[set]' if CENSUS_API_KEY else '[not set - using public limits]'}")
    print(f"  Vintage: {CENSUS_ACS_VINTAGE} {CENSUS_ACS_DATASET}")

    if limit_states:
        print(f"  Limit: fetching {limit_states} states only (testing)")

    if dry_run:
        print("  [DRY-RUN] Would query Census API for B19013 table")
        print("  [DRY-RUN] Would fetch Place and ZCTA geographies")
        print("  [DRY-RUN] Would extract: geo_id, name, median_income, margin_of_error, population")
        return pd.DataFrame(), pd.DataFrame()

    try:
        # Fetch Place income data (all states or limited)
        print("  Fetching Place income data...")
        place_data = []

        # Get list of state FIPS codes (01-56, excluding certain codes)
        state_fips = [str(i).zfill(2) for i in range(1, 57) if i not in [3, 7, 14, 43, 52]]

        if limit_states:
            state_fips = state_fips[:limit_states]

        for state in state_fips:
            try:
                url = f"{CENSUS_API_BASE}/{CENSUS_ACS_VINTAGE}/{CENSUS_ACS_DATASET}"
                params = {
                    'get': 'NAME,B19013_001E,B19013_001M,B01003_001E',
                    'for': 'place:*',
                    'in': f'state:{state}',
                }
                if CENSUS_API_KEY:
                    params['key'] = CENSUS_API_KEY

                response = requests.get(url, params=params, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    # First row is headers
                    headers = data[0]
                    for row in data[1:]:
                        row_dict = dict(zip(headers, row))
                        income = row_dict.get('B19013_001E')
                        if income and income != '-666666666':  # Census null value
                            place_geoid = row_dict['state'] + row_dict['place']

                            # Extract place name from NAME field (e.g., "Portland city, Maine")
                            name_raw = row_dict.get('NAME', '')
                            # Remove state suffix
                            name = re.sub(r',\s+[A-Za-z\s]+$', '', name_raw)

                            place_data.append({
                                'place_geoid': place_geoid,
                                'name': name,
                                'name_normalized': normalize_place_name(name),
                                'state_fips': row_dict['state'],
                                'income': float(income),
                                'moe': float(row_dict.get('B19013_001M', 0)) if row_dict.get('B19013_001M') else None,
                                'population': int(row_dict.get('B01003_001E', 0)) if row_dict.get('B01003_001E') and row_dict.get('B01003_001E') != '-666666666' else None,
                            })
            except Exception as e:
                print(f"    Warning: Failed to fetch state {state}: {e}")
                continue

        place_result = pd.DataFrame(place_data)
        print(f"    Fetched {len(place_result)} places with income data")

        # Fetch ZCTA income data
        print("  Fetching ZCTA income data...")
        try:
            url = f"{CENSUS_API_BASE}/{CENSUS_ACS_VINTAGE}/{CENSUS_ACS_DATASET}"
            params = {
                'get': 'NAME,B19013_001E,B19013_001M',
                'for': 'zip code tabulation area:*',
            }
            if CENSUS_API_KEY:
                params['key'] = CENSUS_API_KEY

            response = requests.get(url, params=params, timeout=60)
            if response.status_code == 200:
                data = response.json()
                headers = data[0]
                zcta_data = []
                for row in data[1:]:
                    row_dict = dict(zip(headers, row))
                    income = row_dict.get('B19013_001E')
                    if income and income != '-666666666':
                        zcta_data.append({
                            'zcta': row_dict['zip code tabulation area'],
                            'income': float(income),
                            'moe': float(row_dict.get('B19013_001M', 0)) if row_dict.get('B19013_001M') else None,
                        })

                zcta_result = pd.DataFrame(zcta_data)
                print(f"    Fetched {len(zcta_result)} ZCTAs with income data")
            else:
                print(f"    Warning: ZCTA request failed with status {response.status_code}")
                zcta_result = pd.DataFrame()
        except Exception as e:
            print(f"    Warning: Failed to fetch ZCTA data: {e}")
            zcta_result = pd.DataFrame()

        return place_result, zcta_result

    except Exception as e:
        print(f"  ERROR fetching Census data: {e}")
        raise


def match_city_to_census(city_df: pd.DataFrame, census_place_df: pd.DataFrame) -> pd.DataFrame:
    """
    Match Zillow cities to Census places using normalized name and state.

    Returns city_df with added columns:
        - income, moe: matched values (null if ambiguous/none)
        - income_match_type: 'exact', 'pop_disambiguated', 'ambiguous', 'none'
        - income_candidate_count: number of matching candidates
    """
    print("  Matching cities to Census places by name...")

    if census_place_df.empty:
        print("    No Census data available")
        city_df['income'] = None
        city_df['moe'] = None
        city_df['income_match_type'] = 'none'
        city_df['income_candidate_count'] = 0
        return city_df

    # Normalize city names for matching
    city_df['name_normalized'] = city_df['name'].apply(normalize_place_name)

    # Convert state abbr to FIPS for matching
    city_df['state_fips'] = city_df['state_abbr'].map(STATE_FIPS)

    # Prepare result columns
    city_df['income'] = None
    city_df['moe'] = None
    city_df['income_match_type'] = 'none'
    city_df['income_candidate_count'] = 0

    match_counts = {'exact': 0, 'pop_disambiguated': 0, 'ambiguous': 0, 'none': 0}

    for idx, city_row in city_df.iterrows():
        # Find all Census places with matching normalized name and state
        candidates = census_place_df[
            (census_place_df['name_normalized'] == city_row['name_normalized']) &
            (census_place_df['state_fips'] == city_row['state_fips'])
        ]

        candidate_count = len(candidates)
        city_df.at[idx, 'income_candidate_count'] = candidate_count

        if candidate_count == 0:
            # No match
            city_df.at[idx, 'income_match_type'] = 'none'
            match_counts['none'] += 1
        elif candidate_count == 1:
            # Exact match
            city_df.at[idx, 'income'] = candidates.iloc[0]['income']
            city_df.at[idx, 'moe'] = candidates.iloc[0]['moe']
            city_df.at[idx, 'income_match_type'] = 'exact'
            match_counts['exact'] += 1
        else:
            # Multiple candidates - try population disambiguation
            candidates_with_pop = candidates[candidates['population'].notna() & (candidates['population'] > 0)]

            if len(candidates_with_pop) == 0:
                # No population data available
                city_df.at[idx, 'income_match_type'] = 'ambiguous'
                match_counts['ambiguous'] += 1
            else:
                # Check if there's a clear maximum population
                max_pop = candidates_with_pop['population'].max()
                max_pop_rows = candidates_with_pop[candidates_with_pop['population'] == max_pop]

                if len(max_pop_rows) == 1:
                    # Clear winner by population
                    winner = max_pop_rows.iloc[0]
                    city_df.at[idx, 'income'] = winner['income']
                    city_df.at[idx, 'moe'] = winner['moe']
                    city_df.at[idx, 'income_match_type'] = 'pop_disambiguated'
                    match_counts['pop_disambiguated'] += 1
                else:
                    # Tie in population
                    city_df.at[idx, 'income_match_type'] = 'ambiguous'
                    match_counts['ambiguous'] += 1

    print(f"    Match results:")
    print(f"      Exact matches: {match_counts['exact']}")
    print(f"      Population-disambiguated: {match_counts['pop_disambiguated']}")
    print(f"      Ambiguous (multiple candidates): {match_counts['ambiguous']}")
    print(f"      No match: {match_counts['none']}")

    return city_df


def transform(zillow_data: Tuple[pd.DataFrame, pd.DataFrame],
              census_data: Tuple[pd.DataFrame, pd.DataFrame],
              dry_run: bool = False) -> pd.DataFrame:
    """
    Join Zillow and Census data, calculate affordability ratios.

    Returns:
        DataFrame ready for database insertion
    """
    print("\n[3/4] Transforming data...")

    if dry_run:
        print("  [DRY-RUN] Would join Zillow home values with Census income")
        print("  [DRY-RUN] Would calculate ratio = home_value / income")
        print("  [DRY-RUN] Would create sources JSON metadata")
        print("  [DRY-RUN] Output columns: geo_type, geo_id, as_of_date, home_value, income, ratio, sources")
        return pd.DataFrame()

    zillow_city, zillow_zip = zillow_data
    census_place, census_zcta = census_data

    results = []

    # Process City data with safe matching
    if not zillow_city.empty and not census_place.empty:
        print(f"  Joining {len(zillow_city)} Zillow cities with {len(census_place)} Census places...")

        # Match cities to census places
        city_matched = match_city_to_census(zillow_city, census_place)

        for _, row in city_matched.iterrows():
            # Calculate ratio only if income is available (not null/ambiguous)
            ratio = None
            if pd.notna(row['income']) and row['income'] > 0:
                ratio = row['home_value'] / row['income']

            sources = json.dumps({
                'zhvi': {
                    'date': row['as_of_date'],
                    'source': 'Zillow Research ZHVI',
                },
                'income': {
                    'vintage': CENSUS_ACS_VINTAGE,
                    'table': 'B19013',
                    'moe': row['moe'] if pd.notna(row['moe']) else None,
                    'match_type': row['income_match_type'],
                    'candidate_count': int(row['income_candidate_count']),
                } if row['income_match_type'] != 'none' else None
            })

            results.append({
                'geo_type': 'CITY',
                'geo_id': row['city_id'],
                'as_of_date': row['as_of_date'],
                'home_value': row['home_value'],
                'income': row['income'] if pd.notna(row['income']) else None,
                'ratio': ratio,
                'sources': sources,
                # Additional fields for geo tables
                'name': row['name'],
                'state_abbr': row['state_abbr'],
                'state_name': normalize_text_value(row.get('state_name')),
                'county_name': normalize_text_value(row.get('county_name')),
                'metro': normalize_text_value(row.get('metro')),
                'slug': row['slug'],
            })

        # Summary stats
        matched_with_income = city_matched[city_matched['income'].notna()]
        print(f"    Cities with income data: {len(matched_with_income)}")
        print(f"    Cities without income (ambiguous/none): {len(city_matched) - len(matched_with_income)}")

    # Process ZCTA data (simple exact match)
    if not zillow_zip.empty and not census_zcta.empty:
        print(f"  Joining {len(zillow_zip)} Zillow ZIPs with {len(census_zcta)} Census ZCTAs...")
        zcta_merged = zillow_zip.merge(
            census_zcta[['zcta', 'income', 'moe']],
            on='zcta',
            how='inner'
        )
        print(f"    Matched {len(zcta_merged)} ZCTAs")

        for _, row in zcta_merged.iterrows():
            ratio = None
            if row['income'] > 0:
                ratio = row['home_value'] / row['income']

            sources = json.dumps({
                'zhvi': {
                    'date': row['as_of_date'],
                    'source': 'Zillow Research ZHVI',
                },
                'income': {
                    'vintage': CENSUS_ACS_VINTAGE,
                    'table': 'B19013',
                    'moe': row['moe'] if pd.notna(row['moe']) else None,
                }
            })

            results.append({
                'geo_type': 'ZCTA',
                'geo_id': row['zcta'],
                'as_of_date': row['as_of_date'],
                'home_value': row['home_value'],
                'income': row['income'],
                'ratio': ratio,
                'sources': sources,
                # Additional fields for geo tables
                'state_abbr': row.get('state_abbr'),
            })

    result_df = pd.DataFrame(results)
    print(f"  Total records prepared: {len(result_df)}")

    if not result_df.empty:
        cities_count = len(result_df[result_df['geo_type'] == 'CITY'])
        zctas_count = len(result_df[result_df['geo_type'] == 'ZCTA'])
        print(f"    Cities: {cities_count}")
        print(f"    ZCTAs: {zctas_count}")

        # Only show avg ratio for records that have a ratio
        has_ratio = result_df[result_df['ratio'].notna()]
        if len(has_ratio) > 0:
            print(f"    Avg ratio: {has_ratio['ratio'].mean():.2f}")

    return result_df


def load_postgres(data: pd.DataFrame, dry_run: bool = False) -> None:
    """
    Load transformed data into Postgres database.
    """
    print("\n[4/4] Loading data to Postgres...")
    print(f"  Database: {DATABASE_URL[:50]}..." if DATABASE_URL else "  Database: [not configured]")

    if dry_run:
        print(f"  [DRY-RUN] Would upsert GeoCity records")
        print(f"  [DRY-RUN] Would upsert GeoZcta records")
        print(f"  [DRY-RUN] Would insert {len(data)} MetricSnapshot records")
        print(f"  [DRY-RUN] Would use ON CONFLICT for unique constraint (geo_type, geo_id, as_of_date)")
        return

    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is required for actual load (not set in .env)")

    if data.empty:
        print("  No data to load")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Upsert GeoCity records
        city_data = data[data['geo_type'] == 'CITY']
        if not city_data.empty:
            print(f"  Upserting {len(city_data)} GeoCity records...")
            city_rows = [
                (
                    row['geo_id'],
                    row['name'],
                    row['state_abbr'],
                    row.get('state_name'),
                    row.get('county_name'),
                    lookup_county_fips(row['state_abbr'], row.get('county_name')),  # Add countyFips lookup
                    row.get('metro'),
                    row['slug']
                )
                for _, row in city_data.iterrows()
            ]
            execute_values(
                cursor,
                """
                INSERT INTO geo_city ("cityId", name, "stateAbbr", "stateName", "countyName", "countyFips", metro, slug)
                VALUES %s
                ON CONFLICT ("cityId") DO UPDATE SET
                    name = EXCLUDED.name,
                    "stateAbbr" = EXCLUDED."stateAbbr",
                    "stateName" = EXCLUDED."stateName",
                    "countyName" = EXCLUDED."countyName",
                    "countyFips" = EXCLUDED."countyFips",
                    metro = EXCLUDED.metro,
                    slug = EXCLUDED.slug
                """,
                city_rows
            )

        # Upsert GeoZcta records
        zcta_data = data[data['geo_type'] == 'ZCTA']
        if not zcta_data.empty:
            print(f"  Upserting {len(zcta_data)} GeoZcta records...")
            zcta_rows = [
                (row['geo_id'], row.get('state_abbr'))
                for _, row in zcta_data.iterrows()
            ]
            execute_values(
                cursor,
                """
                INSERT INTO geo_zcta (zcta, "stateAbbr")
                VALUES %s
                ON CONFLICT (zcta) DO UPDATE SET
                    "stateAbbr" = COALESCE(EXCLUDED."stateAbbr", geo_zcta."stateAbbr")
                """,
                zcta_rows
            )

        # Insert MetricSnapshot records
        print(f"  Inserting {len(data)} MetricSnapshot records...")

        # Helper function to convert NaN to None
        def clean_value(val):
            if pd.isna(val):
                return None
            return val

        snapshot_rows = [
            (
                f"zillow_{row['geo_type'].lower()}_{row['geo_id']}_{row['as_of_date'].replace('-', '')}",  # deterministic id
                row['geo_type'], row['geo_id'], row['as_of_date'],
                clean_value(row['home_value']),
                clean_value(row['income']),
                clean_value(row['ratio']),
                row['sources']
            )
            for _, row in data.iterrows()
        ]
        execute_values(
            cursor,
            """
            INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources)
            VALUES %s
            ON CONFLICT ("geoType", "geoId", "asOfDate") DO UPDATE SET
                "homeValue" = EXCLUDED."homeValue",
                income = EXCLUDED.income,
                ratio = EXCLUDED.ratio,
                sources = EXCLUDED.sources
            """,
            snapshot_rows
        )

        conn.commit()
        print(f"  Successfully loaded {len(data)} records")

    except Exception as e:
        print(f"  ERROR loading to database: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


def main():
    """
    Run the complete ETL pipeline.
    """
    parser = argparse.ArgumentParser(description="Affordability Index ETL Pipeline")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run in dry-run mode (no actual downloads or database writes)",
    )
    parser.add_argument(
        "--limit-states",
        type=int,
        metavar="N",
        help="Limit processing to N states (for testing)",
    )
    parser.add_argument(
        "--zillow-dir",
        type=str,
        default=None,
        metavar="PATH",
        help="Load Zillow data from local directory instead of URLs (e.g., ../data)",
    )
    parser.add_argument(
        "--geos",
        type=str,
        default="city,zip",
        help="Comma-separated list of geographies to process: city, zip (default: city,zip)",
    )
    parser.add_argument(
        "--latest-only",
        action="store_true",
        default=True,
        help="Only load latest date column from Zillow files (reduces memory, default: True)",
    )
    parser.add_argument(
        "--import-basket",
        action="store_true",
        help="Import cost basket data (alternative mode)",
    )
    parser.add_argument(
        "--basket-file",
        type=str,
        metavar="PATH",
        help="Path to cost basket CSV file",
    )
    parser.add_argument(
        "--basket-source",
        type=str,
        default="basket_stub",
        help="Provider name (default: basket_stub)",
    )
    parser.add_argument(
        "--basket-version",
        type=str,
        default="2025-01",
        help="Version identifier (default: 2025-01)",
    )
    parser.add_argument(
        "--household-type",
        type=str,
        default="1_adult_0_kids",
        help="Household type (default: 1_adult_0_kids)",
    )
    args = parser.parse_args()

    # Handle basket import mode (alternative to main ETL pipeline)
    if args.import_basket:
        from import_cost_basket import import_cost_basket
        if not args.basket_file:
            print("ERROR: --basket-file required when using --import-basket")
            sys.exit(1)
        import_cost_basket(
            args.basket_file,
            DATABASE_URL,
            args.basket_source,
            args.basket_version,
            args.household_type,
            dry_run=args.dry_run
        )
        return

    print("=" * 70)
    print("Affordability Index ETL Pipeline")
    if args.zillow_dir:
        print(f"MODE: Local Zillow directory ({args.zillow_dir})")
    else:
        print("MODE: Remote Zillow URLs (NOT IMPLEMENTED - use --zillow-dir)")
    if args.dry_run:
        print("DRY-RUN: No actual data fetching or database writes")
    if args.limit_states:
        print(f"LIMIT: Testing with {args.limit_states} states")
    print("=" * 70)

    try:
        # Step 1: Fetch Zillow data (local or remote)
        if args.zillow_dir:
            zillow_data = load_local_zillow(
                args.zillow_dir,
                args.geos,
                latest_only=args.latest_only,
                dry_run=args.dry_run
            )
        else:
            raise NotImplementedError("Remote Zillow URLs not yet implemented for City geography. Use --zillow-dir with local CSV files.")

        # Step 2: Fetch Census data
        census_data = fetch_acs_income(dry_run=args.dry_run, limit_states=args.limit_states)

        # Step 3: Transform and join
        transformed_data = transform(zillow_data, census_data, dry_run=args.dry_run)

        # Step 4: Load to database
        load_postgres(transformed_data, dry_run=args.dry_run)

        print("\n" + "=" * 70)
        if args.dry_run:
            print("ETL pipeline dry-run completed successfully")
            print("\nNext: Remove --dry-run and set DATABASE_URL to run for real")
        else:
            print("ETL pipeline completed successfully")
        print("=" * 70)

    except Exception as e:
        print(f"\n{'=' * 70}")
        print(f"ERROR: ETL pipeline failed")
        print(f"{'=' * 70}")
        print(f"{e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
