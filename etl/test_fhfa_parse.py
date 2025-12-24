import pandas as pd
import requests
from io import BytesIO

# Download file
url = "https://www.fhfa.gov/hpi/download/annual/hpi_at_county.xlsx"
print(f"Downloading {url}...")
response = requests.get(url, timeout=60)
xlsx_buffer = BytesIO(response.content)

# Read with different skip rows to find the actual data
print("\n=== Reading first 15 rows (raw) ===")
df_raw = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl', nrows=15)
print(df_raw)

# Try skiprows=4 (based on header inspection)
xlsx_buffer.seek(0)
print("\n\n=== Reading with skiprows=4 ===")
df = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl', skiprows=4, nrows=10)
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(df.head(10))

# Check for year columns
print("\n\n=== All columns ===")
xlsx_buffer.seek(0)
df_full = pd.read_excel(xlsx_buffer, sheet_name=0, engine='openpyxl', skiprows=4)
print(f"Total shape: {df_full.shape}")
print(f"All columns: {list(df_full.columns)}")
print(f"\nSample data:")
print(df_full.iloc[:5, :8])  # First 5 rows, first 8 columns
