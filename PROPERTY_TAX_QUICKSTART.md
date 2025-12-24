# Property Tax Import - Quick Start Guide

## What Was Fixed

The import script had **3 critical bugs** that prevented any data collection:

1. **Missing API Key** - No API key was set in environment
2. **Wrong Parameter Name** - Script used `zip_code` instead of `zip`
3. **Wrong Response Fields** - Script looked for `percentile_50` instead of `property_tax_50th_percentile`

All bugs have been fixed in the updated `import_property_tax.py` script.

## Before You Start

### Step 1: Get API Key

1. Visit: https://api-ninjas.com/api/propertytax
2. Sign up for a free account
3. Get your API key from the dashboard
4. Copy the API key (you'll need it in Step 2)

### Step 2: Set Environment Variable

**Windows PowerShell:**
```powershell
$env:API_NINJAS_KEY = "paste_your_api_key_here"
```

**Windows Command Prompt:**
```cmd
set API_NINJAS_KEY=paste_your_api_key_here
```

**Linux/Mac:**
```bash
export API_NINJAS_KEY="paste_your_api_key_here"
```

**Verify it's set:**
```powershell
# PowerShell
echo $env:API_NINJAS_KEY

# Bash
echo $API_NINJAS_KEY
```

## Testing

### Test 1: Verify API Access

Run the test script to verify your API key works:

```bash
python test_api_ninjas.py
```

**Expected output:**
- Status Code: 200
- Response showing property tax data
- Fields: `property_tax_25th_percentile`, `property_tax_50th_percentile`, `property_tax_75th_percentile`

**If you see errors:**
- Status 401: Invalid API key
- Status 403: API key not authorized for this endpoint
- Status 404: Wrong URL (should not happen with test script)
- Status 429: Rate limit exceeded (wait and try again)

### Test 2: Small Import Test

Modify `import_property_tax.py` to test with a small sample:

```python
# In main() function, after line 183:
cities = cities[:5]  # Test with first 5 cities only
zips = zips[:5]      # Test with first 5 ZIPs only
```

Then run:
```bash
python import_property_tax.py
```

**Expected output:**
```
🏠 Property Tax Import - 2024
============================================================

📊 Connecting to database...

📋 Fetching locations from database...
   Found 5 cities with home value data
   Found 5 ZIPs with home value data

🏙️  Processing cities...
   ✓ Seattle, WA: 1.04%
   ✓ Austin, TX: 1.81%
   ...

📮 Processing ZIPs...
   ✓ ZIP 98101: 1.02%
   ...

============================================================
✅ Import complete!
   Cities: 3/5 (60.0% coverage)
   ZIPs: 2/5 (40.0% coverage)
```

### Test 3: Verify Database Records

Check that data was inserted:

```sql
-- Connect to PostgreSQL
-- Count inserted records
SELECT COUNT(*) FROM property_tax_rate;

-- View sample records
SELECT
  "geoType",
  "geoId",
  "effectiveRate",
  "asOfYear",
  source
FROM property_tax_rate
LIMIT 10;
```

## Full Import

Once testing succeeds, run the full import:

### Step 1: Remove Test Limits

Remove or comment out the test limits:
```python
# cities = cities[:5]  # Remove this line
# zips = zips[:5]      # Remove this line
```

### Step 2: Run Full Import

```bash
python import_property_tax.py
```

### Step 3: Monitor Progress

The script will show progress every 100 records:
```
   Progress: 100/21459 cities (68 with data)
   Progress: 200/21459 cities (142 with data)
   ...
```

### Step 4: Handle Rate Limits

**Free Tier Limit:** ~10,000 requests/month

**If you hit the limit:**
- Script will wait 60 seconds and retry
- Or: upgrade to paid tier
- Or: run import in batches over multiple days

## Expected Results

Based on API Ninjas coverage:

- **Cities:** ~60-70% success rate (12,000-15,000 records)
  - Larger cities have better coverage
  - Small/rural cities may be missing

- **ZIPs:** ~50-60% success rate (varies by state)
  - Urban ZIPs have better coverage
  - Rural ZIPs may be missing

**Total Expected Records:** ~15,000-20,000 property tax rates

## Troubleshooting

### Problem: 0 Records Collected (Again)

**Check API Key:**
```powershell
# PowerShell
echo $env:API_NINJAS_KEY

# Should show your API key, not empty
```

**If empty**, re-run:
```powershell
$env:API_NINJAS_KEY = "your_key_here"
```

**Test the API:**
```bash
python test_api_ninjas.py
```

### Problem: Rate Limited (429 Errors)

**Solution 1:** Wait for rate limit reset (usually monthly)

**Solution 2:** Upgrade API Ninjas plan

**Solution 3:** Batch import
```python
# Process only cities in specific states
cities = [c for c in cities if c['state_abbr'] in ['CA', 'TX', 'FL']]
```

### Problem: Low Success Rate (<30%)

**Possible Causes:**
1. API doesn't have data for small/rural areas
2. City names don't match API database exactly
3. Network issues

**Solutions:**
- Implement state-level fallback data
- Use Census ACS property tax calculations
- See `PROPERTY_TAX_IMPORT_ANALYSIS.md` for alternative data sources

### Problem: Database Connection Error

**Check connection string:**
```python
# In import_property_tax.py, line 26
DATABASE_URL = "postgresql://..."
```

**Test connection:**
```python
python -c "import psycopg2; conn = psycopg2.connect('YOUR_DATABASE_URL'); print('Connected!'); conn.close()"
```

## What The Script Does

1. **Connects to database** - Queries cities and ZIPs with home value data
2. **Fetches property tax rates** - Calls API Ninjas for each location
3. **Stores results** - Inserts/updates `property_tax_rate` table
4. **Rate limiting** - Waits 0.2s between requests (5 req/second max)
5. **Progress tracking** - Shows progress every 100 records
6. **Summary report** - Shows final coverage statistics

## Data Format

**API Response (example):**
```json
{
  "state": "WA",
  "county": "King",
  "city": "Seattle",
  "zip": "98101",
  "property_tax_25th_percentile": 0.00943,
  "property_tax_50th_percentile": 0.01044,
  "property_tax_75th_percentile": 0.01148
}
```

**Database Storage:**
| Column | Example | Notes |
|--------|---------|-------|
| geoType | CITY | CITY or ZCTA |
| geoId | 123456 | City ID or ZIP code |
| effectiveRate | 0.01044 | Median rate (decimal) |
| rate25th | 0.00943 | 25th percentile |
| rate75th | 0.01148 | 75th percentile |
| asOfYear | 2024 | Tax year |
| source | API Ninjas | Data source |

**Note:** Rates are stored as decimals (0.01044 = 1.044%)

## Next Steps After Import

1. **Verify coverage:**
   ```sql
   SELECT
     "geoType",
     COUNT(*) as total_records,
     AVG("effectiveRate") as avg_rate
   FROM property_tax_rate
   GROUP BY "geoType";
   ```

2. **Identify gaps:**
   ```sql
   -- Cities with home values but no property tax data
   SELECT
     gc.name,
     gc."stateAbbr"
   FROM geo_city gc
   INNER JOIN metric_snapshot ms ON ms."geoId" = gc."cityId"
   LEFT JOIN property_tax_rate ptr ON ptr."geoId" = gc."cityId" AND ptr."geoType" = 'CITY'
   WHERE ms."homeValue" IS NOT NULL
     AND ptr.id IS NULL
   LIMIT 100;
   ```

3. **Implement fallback data** for gaps (see alternatives in analysis doc)

4. **Update application** to use property tax data in affordability calculations

---

**Last Updated:** 2025-12-24
**Status:** Script fixed and ready to run
**Issues Fixed:** 3/3 critical bugs resolved
