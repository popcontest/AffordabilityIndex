import pandas as pd
import requests
from io import BytesIO

# Download file
url = "https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs.xlsx"
print(f"Downloading {url}...")
response = requests.get(url, timeout=60)
xlsx_buffer = BytesIO(response.content)

# Read file
df = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl')
print(f"\nShape: {df.shape}")
print(f"\nColumns: {list(df.columns)}")
print(f"\nFirst 10 rows (all columns):")
print(df.head(10))

print(f"\n\nFIPS column details:")
print(f"Type: {df['fips'].dtype}")
print(f"First 20 values:")
print(df['fips'].head(20))
print(f"\nNull count: {df['fips'].isna().sum()}")
print(f"Non-null count: {df['fips'].notna().sum()}")

# Try converting to string
df['fips_str'] = df['fips'].astype(str).str.zfill(5)
print(f"\n\nConverted FIPS (first 20):")
print(df['fips_str'].head(20))
