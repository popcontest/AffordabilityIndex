# V2 Scoring Data Import Guide

This guide explains how to populate the data needed for v2 affordability scoring nationwide.

## Current Status

- **v2 Code:** ✅ Fully implemented (lib/data.ts:245)
- **Cost Basket Data:** ⚠️ Only 25 CA counties (need 3,143 counties nationwide)
- **City-County Mapping:** ⚠️ Only 1,189/21,459 cities (5.5%)

## Required Data

### 1. County FIPS Mapping (geo_city.countyFips)
Every city needs to be mapped to its county to join with cost_basket data.

### 2. Cost Basket Data (cost_basket table)
Annual living costs by county and household type (food, healthcare, transportation, taxes, etc.)

---

## Scripts Created

### `import_city_county_mapping.py`
Maps all cities to counties using Census Geocoding API.

**What it does:**
- Fetches all cities missing `countyFips`
- Uses Census Geocoding API (batch mode, 1000 cities at a time)
- Updates `geo_city` table with county FIPS codes

**API:** https://geocoding.geo.census.gov/geocoder/
**Rate:** Free, no API key needed
**Batch size:** 1,000 cities per request (10k max)

**Runtime estimate:**
- 20,270 cities to geocode
- ~20 batches × 2 seconds = **~45 minutes**

### `import_mit_living_wage.py`
Fetches living wage data from MIT for all counties.

**What it does:**
- Scrapes MIT Living Wage Calculator for each county
- Parses cost breakdowns (food, healthcare, transport, taxes, housing, other)
- Supports 8 household types (1 adult, 2 adults, 0-3 kids)
- Inserts/updates `cost_basket` table

**Source:** https://livingwage.mit.edu/
**Rate:** 1 request every 2 seconds (be respectful)
**Coverage:** All 3,143 US counties

**Runtime estimate:**
- ~1,200 unique counties in database
- 2 seconds per county = **~40 minutes**

**Important:** MIT Living Wage is for non-commercial/research use. Consider:
1. Emailing MIT first: livingwage@mit.edu
2. Asking for bulk data access
3. If scraping, use the rate limiting in the script

---

## Step-by-Step Execution

### Prerequisites

```bash
# Install required Python packages
pip install beautifulsoup4 psycopg2-binary requests
```

### Step 1: Map Cities to Counties

```bash
# Set database connection
set DATABASE_URL=postgresql://postgres.mbydrrzhdjrenkpfmhlz:xTdU3BqsZBRhG4e8@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# Run the geocoding script
python import_city_county_mapping.py
```

**Expected output:**
```
Found 20,270 cities without county FIPS mapping

Batch 1/21 (1000 cities)
  Geocoding batch of 1000 cities...
  Successfully geocoded 987 cities
  Retrying 13 failed cities individually...
  Updated 1000 cities with county FIPS

...

COMPLETE: Mapped 20,270 cities to counties
```

**Verify:**
```bash
python -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM geo_city WHERE \"countyFips\" IS NOT NULL')
print(f'Cities with county: {cur.fetchone()[0]}')
cur.close(); conn.close()
"
```

### Step 2: Import MIT Living Wage Data

**IMPORTANT:** Before running, consider emailing MIT Living Wage:
```
To: livingwage@mit.edu
Subject: Bulk Data Request for AffordabilityIndex.org

Hello,

I'm building a non-commercial public affordability comparison website
(affordabilityindex.org) and would like to integrate your living wage
data for all US counties.

Would it be possible to get bulk data access, or should I proceed with
respectful scraping at 1 request per 2 seconds?

Thank you for your incredible public resource!
```

**If proceeding with scraping:**

```bash
# Run the MIT scraper (will prompt for confirmation)
python import_mit_living_wage.py
```

**Expected output:**
```
MIT Living Wage Data Import

NOTE: This script scrapes data from livingwage.mit.edu
Please ensure compliance with their terms of service.
Rate limit: 1 request every 2 seconds

Proceed with scraping 1,189 counties? (yes/no): yes

[1/1189] Los Angeles, CA (06037)
    Inserted 8 household types

[2/1189] San Francisco, CA (06075)
    Inserted 8 household types

...

COMPLETE:
  Success: 1,150 counties
  Failed:  39 counties
```

**Verify:**
```bash
python -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute('SELECT COUNT(DISTINCT \"countyFips\") FROM cost_basket')
print(f'Counties with cost data: {cur.fetchone()[0]}')
cur.close(); conn.close()
"
```

---

## Verification: Check v2 Scoring

After both scripts complete, test a California city that should show v2 scores:

```bash
# Check if Oakland, CA shows v2 scoring
python -c "
import os, psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

# Oakland cityId = 13072
cur.execute('''
    SELECT c.\"cityId\", c.name, c.\"stateAbbr\", c.\"countyFips\",
           cb.\"totalAnnual\", cb.\"householdType\"
    FROM geo_city c
    LEFT JOIN cost_basket cb ON c.\"countyFips\" = cb.\"countyFips\"
        AND cb.source = 'mit_living_wage'
        AND cb.\"householdType\" = '1_adult_0_kids'
    WHERE c.\"cityId\" = '13072'
''')

row = cur.fetchone()
if row and row[4]:
    print(f'✅ {row[1]}, {row[2]} has v2 data!')
    print(f'   County: {row[3]}, Basket: ${row[4]:,.0f}/year')
else:
    print(f'❌ {row[1]}, {row[2]} missing cost basket data')

cur.close(); conn.close()
"
```

Visit http://localhost:3000/california/oakland in your browser and check if the Score Breakdown shows:
- ✅ **Version: v2_full** (not v1_housing)
- ✅ **Essentials Affordability** section visible
- ✅ **Cost Basket Details** showing household type and annual costs

---

## Troubleshooting

### Script fails with "column not found"
The database schema uses camelCase (e.g., `countyFips`). Make sure you're quoting column names properly in SQL.

### MIT scraper returns empty data
1. Check if the county page exists: https://livingwage.mit.edu/counties/06037
2. MIT may have changed their HTML structure - inspect the page and update parsing logic
3. Try with a different User-Agent header

### Too many geocoding failures
The Census API sometimes has timeouts. The script automatically retries failed cities individually. If still failing:
1. Check network connectivity
2. Try smaller batch sizes (change BATCH_SIZE in script)
3. Manually geocode problem cities

### Want to update data later
Both scripts use `ON CONFLICT` clauses - you can re-run them to update existing data.

---

## Next Steps After Data Import

Once data is populated:
1. Clear Next.js cache: Delete `.next/` folder and rebuild
2. Visit city pages to verify v2 scoring appears
3. Update ScoreBreakdownPanel to handle multiple household types (future enhancement)
4. Consider pre-computing v2 scores for rankings page

---

## Data Maintenance

**Update frequency:**
- MIT Living Wage: Annual (check their site for updates)
- County mappings: Only needed for new cities added to database

**Future improvements:**
- Cache MIT data locally to avoid re-scraping
- Support multiple household types in UI (currently hardcoded to '1_adult_0_kids')
- Add regional price parity adjustments from BEA
