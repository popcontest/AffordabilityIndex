"""
Import local Zillow ZHVI data and Census ACS income data
Loads data from local CSV files in the data/ directory
"""

import os
import sys
import pandas as pd
import requests
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values

# Add etl directory to path for config
sys.path.append(os.path.join(os.path.dirname(__file__), 'etl'))
from config import DATABASE_URL, CENSUS_API_KEY

print("=" * 70)
print("Affordability Index - Local Zillow Data Import")
print("=" * 70)
print()

# Paths to local Zillow files
CITY_FILE = "data/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
ZIP_FILE = "data/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

print("[1/5] Loading Zillow City ZHVI data...")
city_df = pd.read_csv(CITY_FILE)
print(f"  Loaded {len(city_df)} cities")

# Get latest date column (last column with a date)
date_cols = [col for col in city_df.columns if col.startswith('20')]
latest_date = max(date_cols)
print(f"  Latest data: {latest_date}")

# Keep only cities with valid data for latest month
city_df = city_df[city_df[latest_date].notna()]
city_df = city_df[['RegionName', 'State', 'StateName', latest_date]]
city_df.columns = ['city', 'state_abbr', 'state_name', 'home_value']
print(f"  Filtered to {len(city_df)} cities with data")

print()
print("[2/5] Loading Zillow ZIP ZHVI data...")
zip_df = pd.read_csv(ZIP_FILE)
print(f"  Loaded {len(zip_df)} ZIP codes")

# Filter ZIPs with valid data
zip_df = zip_df[zip_df[latest_date].notna()]
zip_df = zip_df[['RegionName', 'State', 'StateName', latest_date]]
zip_df.columns = ['zcta', 'state_abbr', 'state_name', 'home_value']
# Convert ZCTA to string with leading zeros
zip_df['zcta'] = zip_df['zcta'].astype(str).str.zfill(5)
print(f"  Filtered to {len(zip_df)} ZIPs with data")

print()
print("[3/5] Fetching Census ACS income data...")

def get_census_income(geography_type, state_fips):
    """Fetch income data from Census ACS API"""
    base_url = "https://api.census.gov/data/2022/acs/acs5"

    params = {
        'get': 'NAME,B19013_001E',  # Median household income
    }

    if geography_type == 'place':
        params['for'] = 'place:*'
        params['in'] = f'state:{state_fips}'
    else:  # zcta
        # ZCTAs don't filter by state, get all
        params['for'] = 'zip code tabulation area:*'

    if CENSUS_API_KEY:
        params['key'] = CENSUS_API_KEY

    try:
        response = requests.get(base_url, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()

        # Convert to dataframe
        if len(data) > 1:
            df = pd.DataFrame(data[1:], columns=data[0])

            # For ZCTAs, filter by state abbr after fetching
            if geography_type == 'zcta':
                # We'll filter by state when matching with Zillow data
                pass

            return df
        return pd.DataFrame()
    except Exception as e:
        print(f"    Warning: {e}")
        return pd.DataFrame()

# State FIPS codes
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

# Fetch income for top 3 states by number of cities (to limit API calls and time)
top_states = city_df['state_abbr'].value_counts().head(3).index.tolist()
print(f"  Fetching income for top 3 states: {', '.join(top_states)}")

city_income_dfs = []

for state_abbr in top_states:
    state_fips = STATE_FIPS.get(state_abbr)
    if not state_fips:
        continue

    print(f"    {state_abbr}...", end=" ")

    # Get place income
    place_income = get_census_income('place', state_fips)
    if not place_income.empty:
        place_income['state_abbr'] = state_abbr
        city_income_dfs.append(place_income)
        print(f"{len(place_income)} places")
    else:
        print("no data")

# Fetch ZIP income (nationwide - only once)
print(f"    Fetching nationwide ZIP income data...", end=" ")
zip_income_df = get_census_income('zcta', None)
if not zip_income_df.empty:
    print(f"{len(zip_income_df)} ZIPs")
else:
    print("no data")

# Combine place income data
city_income_df = pd.concat(city_income_dfs, ignore_index=True) if city_income_dfs else pd.DataFrame()

print(f"  Total: {len(city_income_df)} places, {len(zip_income_df) if not zip_income_df.empty else 0} ZIPs with income data")

print()
print("[4/5] Matching and calculating ratios...")

# Match cities by name and state
if not city_income_df.empty:
    city_income_df['income'] = pd.to_numeric(city_income_df['B19013_001E'], errors='coerce')
    # Filter out Census sentinel value for "no data" (-666666666)
    city_income_df = city_income_df[city_income_df['income'] != -666666666]
    city_income_df['city_clean'] = city_income_df['NAME'].str.split(',').str[0].str.strip()

    # Merge with Zillow data
    merged_cities = city_df.merge(
        city_income_df[['city_clean', 'state_abbr', 'income', 'place', 'state']],
        left_on=['city', 'state_abbr'],
        right_on=['city_clean', 'state_abbr'],
        how='inner'
    )

    # Calculate ratio
    merged_cities['ratio'] = merged_cities['home_value'] / merged_cities['income']
    merged_cities['place_geoid'] = merged_cities['state'] + merged_cities['place']

    print(f"  Matched {len(merged_cities)} cities")
else:
    merged_cities = pd.DataFrame()

# Match ZIPs
if not zip_income_df.empty:
    zip_income_df['income'] = pd.to_numeric(zip_income_df['B19013_001E'], errors='coerce')
    # Filter out Census sentinel value for "no data" (-666666666)
    zip_income_df = zip_income_df[zip_income_df['income'] != -666666666]

    # Merge with Zillow data (match by ZCTA only)
    merged_zips = zip_df.merge(
        zip_income_df[['zip code tabulation area', 'income']],
        left_on='zcta',
        right_on='zip code tabulation area',
        how='inner'
    )

    # Calculate ratio
    merged_zips['ratio'] = merged_zips['home_value'] / merged_zips['income']

    print(f"  Matched {len(merged_zips)} ZIPs")
else:
    merged_zips = pd.DataFrame()

print()
print("[5/5] Loading to database...")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Insert places
if not merged_cities.empty:
    place_records = []
    for _, row in merged_cities.iterrows():
        place_records.append((
            row['place_geoid'],
            row['city'],
            row['state_abbr'],
            row['state'],
            None  # county_fips - we don't have this from Zillow
        ))

    execute_values(
        cur,
        """
        INSERT INTO geo_place ("placeGeoid", name, "stateAbbr", "stateFips", "countyFips")
        VALUES %s
        ON CONFLICT ("placeGeoid") DO NOTHING
        """,
        place_records
    )
    print(f"  Inserted {len(place_records)} places")

    # Insert place metrics (generate unique IDs)
    metric_records = []
    for idx, row in merged_cities.iterrows():
        metric_id = f"zillow_place_{row['place_geoid']}_{latest_date.replace('-', '')}"
        metric_records.append((
            metric_id,
            'PLACE',
            row['place_geoid'],
            latest_date,
            float(row['home_value']),
            float(row['income']),
            float(row['ratio']),
            'Zillow ZHVI + Census ACS 2022'
        ))

    execute_values(
        cur,
        """
        INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources)
        VALUES %s
        ON CONFLICT (id) DO NOTHING
        """,
        metric_records
    )
    print(f"  Inserted {len(metric_records)} place metrics")

# Insert ZIPs
if not merged_zips.empty:
    zip_records = []
    for _, row in merged_zips.iterrows():
        zip_records.append((
            row['zcta'],
            row['state_abbr']
        ))

    execute_values(
        cur,
        """
        INSERT INTO geo_zcta (zcta, "stateAbbr")
        VALUES %s
        ON CONFLICT (zcta) DO NOTHING
        """,
        zip_records
    )
    print(f"  Inserted {len(zip_records)} ZIPs")

    # Insert ZIP metrics (generate unique IDs)
    zip_metric_records = []
    for idx, row in merged_zips.iterrows():
        metric_id = f"zillow_zcta_{row['zcta']}_{latest_date.replace('-', '')}"
        zip_metric_records.append((
            metric_id,
            'ZCTA',
            row['zcta'],
            latest_date,
            float(row['home_value']),
            float(row['income']),
            float(row['ratio']),
            'Zillow ZHVI + Census ACS 2022'
        ))

    execute_values(
        cur,
        """
        INSERT INTO metric_snapshot (id, "geoType", "geoId", "asOfDate", "homeValue", income, ratio, sources)
        VALUES %s
        ON CONFLICT (id) DO NOTHING
        """,
        zip_metric_records
    )
    print(f"  Inserted {len(zip_metric_records)} ZIP metrics")

conn.commit()
cur.close()
conn.close()

print()
print("=" * 70)
print("Import completed successfully!")
print(f"  Places: {len(merged_cities) if not merged_cities.empty else 0}")
print(f"  ZIPs: {len(merged_zips) if not merged_zips.empty else 0}")
print("=" * 70)
