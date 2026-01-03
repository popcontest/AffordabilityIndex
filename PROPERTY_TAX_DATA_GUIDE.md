# Property Tax Data Import Guide

## Overview

This project has **three different property tax import scripts** for different data sources and use cases. This guide explains which one to use and how to configure them.

## Import Scripts Comparison

| Script | Data Source | API Key Required | Coverage | Use Case |
|--------|-------------|------------------|----------|----------|
| `import_property_tax.py` | API Ninjas | **Yes** (free tier) | Cities & ZIPs | Best accuracy, granular data |
| `import_tax_foundation_property_tax.py` | Tax Foundation CSV | No (manual CSV) | Counties → Cities | County-level rates applied to all cities in county |
| `etl/phase1_housing/import_property_tax.py` | Hardcoded state averages | No | States → Cities | Quick setup, state-level estimates only |

## Recommended Approach

**For production:** Use `import_property_tax.py` with API Ninjas for the most accurate, location-specific property tax rates.

**For testing/development:** Use `etl/phase1_housing/import_property_tax.py` (no API key needed, but less accurate).

---

## Option 1: API Ninjas (Recommended)

### File: `import_property_tax.py`

**Pros:**
- Most accurate property tax rates
- City-level and ZIP-level data
- Includes percentile ranges (25th, 50th, 75th)
- Free tier available

**Cons:**
- Requires API key signup
- Rate limits on free tier
- May not have data for all small cities

### Setup Instructions

#### 1. Get API Key

1. Visit https://api-ninjas.com/api/propertytax
2. Sign up for free account (no credit card required)
3. Copy your API key from the dashboard

Free tier limits:
- 10,000 requests/month
- 5 requests/second

#### 2. Configure Environment Variable

**Windows (PowerShell):**
```powershell
$env:API_NINJAS_KEY = "your_api_key_here"
```

**Windows (Command Prompt):**
```cmd
set API_NINJAS_KEY=your_api_key_here
```

**Linux/Mac:**
```bash
export API_NINJAS_KEY=your_api_key_here
```

**Or create a `.env` file:**
```bash
API_NINJAS_KEY=your_api_key_here
```

#### 3. Run Import

```bash
python import_property_tax.py
```

The script will:
- Fetch property tax rates for all cities with home value data
- Fetch property tax rates for all ZIPs with home value data
- Store rates in `property_tax_rate` table
- Show progress every 100 locations
- Handle rate limiting automatically

**Expected Runtime:**
- ~500 cities: 1-2 minutes
- ~5,000 cities: 15-20 minutes (with rate limiting)

---

## Option 2: Tax Foundation CSV

### File: `import_tax_foundation_property_tax.py`

**Pros:**
- No API key needed
- Official Tax Foundation data
- County-level accuracy
- One-time download

**Cons:**
- Requires manual CSV download
- County-level only (applied to all cities in county)
- Annual update required
- Not as granular as API Ninjas

### Setup Instructions

#### 1. Download CSV Data

1. Visit: https://taxfoundation.org/data/all/state/property-taxes-by-state-county-2025/
2. Download the "Property Taxes by State and County, 2025" CSV
3. Save to a known location (e.g., `Downloads/property_tax_2025.csv`)

#### 2. Update Script Path

Edit line 185 in `import_tax_foundation_property_tax.py`:

```python
csv_file = r"C:\path\to\your\downloaded\property_tax_2025.csv"
```

#### 3. Run Import

```bash
python import_tax_foundation_property_tax.py
```

The script will:
- Map counties from CSV to counties in your database
- Apply county rates to all cities in that county
- Store rates in `property_tax_rate` table with source="Tax Foundation"

**Expected Runtime:** < 1 minute

---

## Option 3: State Averages (Quick Setup)

### File: `etl/phase1_housing/import_property_tax.py`

**Pros:**
- No API key or download needed
- Works immediately
- Fast execution
- 100% coverage of US states

**Cons:**
- State-level averages only (not city-specific)
- Less accurate for local variations
- Updates require code changes

### Setup Instructions

#### 1. Run Import

```bash
python etl/phase1_housing/import_property_tax.py
```

Or with dry-run mode:
```bash
python etl/phase1_housing/import_property_tax.py --dry-run
```

The script will:
- Apply state-level property tax rates to all cities
- Store rates in `affordability_snapshot.propertyTaxRate` field
- Show match rate and coverage stats

**Expected Runtime:** < 30 seconds

---

## Database Schema

All scripts store data in the `property_tax_rate` table:

```sql
CREATE TABLE property_tax_rate (
    id TEXT PRIMARY KEY,                -- Format: "CITY-{cityId}-{year}" or "ZCTA-{zcta}-{year}"
    "geoType" geo_type NOT NULL,        -- 'CITY' or 'ZCTA'
    "geoId" VARCHAR(16) NOT NULL,       -- City ID or ZCTA code
    "effectiveRate" FLOAT NOT NULL,     -- Median effective rate (decimal, e.g., 0.0125 = 1.25%)
    "rate25th" FLOAT,                   -- 25th percentile rate (if available)
    "rate75th" FLOAT,                   -- 75th percentile rate (if available)
    "asOfYear" INTEGER NOT NULL,        -- Tax year (2024, 2025, etc.)
    source VARCHAR(255),                -- "API Ninjas", "Tax Foundation", etc.
    "updatedAt" TIMESTAMP NOT NULL
);
```

## Data Quality Notes

### API Ninjas
- **Coverage:** ~70-80% of cities, 60-70% of ZIPs
- **Accuracy:** High (location-specific)
- **Update Frequency:** Real-time via API

### Tax Foundation
- **Coverage:** ~90% of counties → cities
- **Accuracy:** Medium (county-level)
- **Update Frequency:** Annual (manual download)

### State Averages
- **Coverage:** 100% of cities (via state mapping)
- **Accuracy:** Low (state-level only)
- **Update Frequency:** Manual code updates

## Troubleshooting

### API Ninjas Issues

**Error: "No API_NINJAS_KEY found"**
- Set the environment variable (see setup instructions above)
- The script will continue with fallback data if key is missing

**Error: "Rate limit hit"**
- Free tier: 10,000 requests/month
- Script automatically waits 60s when rate limited
- Consider paid tier for larger imports

**Error: "Empty response for location"**
- API may not have data for all cities/ZIPs
- This is normal for small towns and rural areas
- Use fallback script for 100% coverage

### Tax Foundation CSV Issues

**Error: "FileNotFoundError"**
- Update the `csv_file` path in line 185 of the script
- Use raw string (r"...") for Windows paths

**Error: "Unknown state"**
- CSV may have unexpected state names
- Check `STATE_ABBR` mapping in script (lines 19-31)

**Warning: "Counties skipped"**
- Some counties in CSV may not match database
- This is normal for small counties without cities in database
- Check output for list of skipped counties

### State Averages Issues

**Error: "No property tax rate for state"**
- State abbreviation not in hardcoded mapping
- Add state to `STATE_PROPERTY_TAX_RATES` dict (lines 43-95)

## SQL Bug Fixes Applied

The following SQL bugs were fixed in this update:

1. **Missing ID field in INSERT queries**
   - **Issue:** Database table `property_tax_rate.id` has no default value configured
   - **Fix:** All INSERT queries now explicitly provide `id` field with format: `{geoType}-{geoId}-{year}`
   - **Files fixed:**
     - `import_property_tax.py`
     - `test_property_tax_sql.py`

2. **psycopg2 VALUES syntax error**
   - **Issue:** Direct `VALUES %s` syntax doesn't work with psycopg2 for bulk updates
   - **Fix:** Use `execute_values()` helper function for proper parameterization
   - **Files fixed:**
     - `etl/phase1_housing/import_property_tax.py`

3. **Conflict resolution strategy**
   - **Changed:** `ON CONFLICT (geoType, geoId, asOfYear)` → `ON CONFLICT (id)`
   - **Reason:** Simpler, matches how id is generated

## Next Steps

1. Choose the import script that best fits your needs
2. Configure API keys or download data (if needed)
3. Run the import script
4. Verify data in database:
   ```sql
   SELECT COUNT(*), source FROM property_tax_rate GROUP BY source;
   ```
5. Update regularly (annually for Tax Foundation, monthly for API Ninjas)

## Questions?

- API Ninjas documentation: https://api-ninjas.com/api/propertytax
- Tax Foundation data: https://taxfoundation.org/data/
- Database schema: See `prisma/schema.prisma`
