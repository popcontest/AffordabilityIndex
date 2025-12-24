import pandas as pd
import requests
from io import BytesIO

# Download file
url = "https://www.fhfa.gov/hpi/download/annual/hpi_at_county.xlsx"
print(f"Downloading {url}...")
response = requests.get(url, timeout=60)
xlsx_buffer = BytesIO(response.content)

# Try skiprows=5 and use first row as header
print("\n=== Reading with skiprows=5, header=0 ===")
df = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl', skiprows=5, header=None, nrows=20)
print(f"Shape: {df.shape}")
print(f"\nFirst 20 rows:")
print(df)

# Now try reading the whole file properly
xlsx_buffer.seek(0)
print("\n\n=== Full file with skiprows=4, header=0 ===")
df_full = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl', skiprows=4, header=0)
print(f"Shape: {df_full.shape}")
print(f"Columns: {list(df_full.columns)}")
print(f"\nFirst 10 rows:")
print(df_full.head(10))
print(f"\nColumn dtypes:")
print(df_full.dtypes)
