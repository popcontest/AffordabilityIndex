"""
Import ZIP code latitude/longitude coordinates from Census Gazetteer data
Adds geographic coordinates to geo_zcta table for distance calculations
"""

import pandas as pd
import psycopg2
from io import StringIO
import requests

# Database connection
DATABASE_URL = "postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# Download Census 2023 Gazetteer file for ZCTAs
print("Downloading Census 2023 ZCTA Gazetteer data...")
url = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_zcta_national.zip"

try:
    import zipfile
    from io import BytesIO

    # Download the ZIP file
    response = requests.get(url)
    response.raise_for_status()

    # Extract and read the CSV from ZIP
    print("Extracting ZIP file...")
    with zipfile.ZipFile(BytesIO(response.content)) as z:
        # Get the first file in the ZIP (should be the txt file)
        file_list = z.namelist()
        print(f"Files in ZIP: {file_list}")
        data_file = file_list[0]

        with z.open(data_file) as f:
            # Read tab-delimited file
            df = pd.read_csv(f, sep='\t', encoding='latin-1')

    # Strip whitespace from column names
    df.columns = df.columns.str.strip()

    # Check columns
    print(f"Columns: {df.columns.tolist()}")
    print(f"Total records: {len(df)}")
    print(df.head())

    # Connect to database
    print("\nConnecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    # First, add columns if they don't exist
    print("Adding latitude/longitude columns to geo_zcta table...")
    cursor.execute("""
        ALTER TABLE geo_zcta
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    """)
    conn.commit()

    # Update existing ZCTAs with coordinates
    print("Updating ZIP codes with coordinates...")
    updated_count = 0
    not_found_count = 0

    # Census gazetteer uses GEOID for ZCTA and INTPTLAT/INTPTLONG for coordinates
    zip_col = 'GEOID'
    lat_col = 'INTPTLAT'
    lng_col = 'INTPTLONG'

    for _, row in df.iterrows():
        zip_code = str(row[zip_col]).zfill(5)  # Ensure 5 digits with leading zeros
        lat = float(row[lat_col])
        lng = float(row[lng_col])

        cursor.execute("""
            UPDATE geo_zcta
            SET latitude = %s, longitude = %s
            WHERE zcta = %s
        """, (lat, lng, zip_code))

        if cursor.rowcount > 0:
            updated_count += 1
        else:
            not_found_count += 1

        if (updated_count + not_found_count) % 1000 == 0:
            print(f"Processed {updated_count + not_found_count} ZIPs...")
            conn.commit()

    conn.commit()

    print(f"\n✓ Updated {updated_count} ZIP codes with coordinates")
    print(f"  {not_found_count} ZIPs in data file not found in database")

    # Verify
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(latitude) as with_coords
        FROM geo_zcta
    """)
    result = cursor.fetchone()
    print(f"\nDatabase status:")
    print(f"  Total ZIPs: {result[0]}")
    print(f"  With coordinates: {result[1]}")

    cursor.close()
    conn.close()

    print("\n✓ Import complete!")

except requests.exceptions.RequestException as e:
    print(f"Error downloading data: {e}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
