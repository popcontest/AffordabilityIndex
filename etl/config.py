"""
ETL Configuration
Loads environment variables for database and API access.
"""

import os
from dotenv import load_dotenv

# Load .env file from parent directory if it exists
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Census API (optional - increases rate limits)
CENSUS_API_KEY = os.getenv("CENSUS_API_KEY", "")

# Data source URLs
# NOTE: Check https://www.zillow.com/research/data/ for current URLs
# These may need updating if Zillow changes their data structure
ZILLOW_PLACE_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/Place_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"
ZILLOW_ZIP_URL = "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

# Census API configuration
CENSUS_API_BASE = "https://api.census.gov/data"
CENSUS_ACS_VINTAGE = "2022"  # Use most recent 5-year estimates
CENSUS_ACS_DATASET = "acs/acs5"  # 5-year American Community Survey
