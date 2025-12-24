# Property Tax Import Script Analysis

## Executive Summary

The `import_property_tax.py` script processed 21,459 cities but collected 0 records due to **three critical issues**:

1. **Missing API Key** (Primary blocker)
2. **Incorrect API parameter name** for ZIP codes
3. **Incorrect response field names** for extracting tax rates

## Root Cause Analysis

### Issue 1: Missing API Key (PRIMARY BLOCKER)

**Location:** Environment variable `API_NINJAS_KEY`

**Problem:** The API key is not set in the environment, causing all API requests to fail silently.

**Evidence:**
```python
API_NINJAS_KEY = os.getenv('API_NINJAS_KEY', '')  # Returns empty string
```

The script checks for the API key at line 46:
```python
if not API_NINJAS_KEY:
    return None  # Silently returns None for every call
```

**Impact:** 100% of API calls return `None` immediately without attempting any HTTP requests.

**Fix Required:** Set the environment variable:
```powershell
# PowerShell
$env:API_NINJAS_KEY = "your_api_key_here"

# Or Bash
export API_NINJAS_KEY="your_api_key_here"
```

### Issue 2: Incorrect ZIP Parameter Name

**Location:** `import_property_tax.py`, line 54

**Current Code:**
```python
if zip_code:
    params['zip_code'] = zip_code  # ❌ WRONG
```

**API Expectation:** The API expects the parameter name to be `zip`, not `zip_code`

**Correct Code:**
```python
if zip_code:
    params['zip'] = zip_code  # ✓ CORRECT
```

**Evidence:** API Ninjas documentation states:
- Parameter name: `zip` (not `zip_code`)
- Example: `GET https://api.api-ninjas.com/v1/propertytax?zip=97401`

**Impact:** All ZIP-based queries (100% of ZCTA records) would fail even with a valid API key.

### Issue 3: Incorrect Response Field Names

**Location:** `import_property_tax.py`, lines 67-69

**Current Code:**
```python
return {
    'median_rate': data[0].get('percentile_50', None),      # ❌ WRONG
    'percentile_25': data[0].get('percentile_25', None),    # ❌ WRONG
    'percentile_75': data[0].get('percentile_75', None),    # ❌ WRONG
}
```

**API Response Format:** The API returns these field names:
```json
{
  "state": "OR",
  "county": "Lane",
  "city": "Eugene",
  "zip": "97401",
  "property_tax_25th_percentile": 0.00943,
  "property_tax_50th_percentile": 0.01044,
  "property_tax_75th_percentile": 0.01148
}
```

**Correct Code:**
```python
return {
    'median_rate': data[0].get('property_tax_50th_percentile', None),
    'percentile_25': data[0].get('property_tax_25th_percentile', None),
    'percentile_75': data[0].get('property_tax_75th_percentile', None),
}
```

**Impact:** Even if the API returned data successfully, the script would extract `None` for all three rate fields because it's looking for non-existent keys.

## API Documentation Reference

**Endpoint:** `https://api.api-ninjas.com/v1/propertytax`

**Parameters:**
- `state` (optional): 2-letter state abbreviation
- `county` (optional): County name
- `city` (optional): City name (case-sensitive)
- `zip` (optional): ZIP code

**Requirements:**
- At least one parameter must be provided
- Header: `X-Api-Key` with valid API key
- Maximum 100 results per request

**Response Fields:**
- `property_tax_25th_percentile`: Decimal (e.g., 0.00943 = 0.943%)
- `property_tax_50th_percentile`: Decimal (median rate)
- `property_tax_75th_percentile`: Decimal

## Recommended Fixes

### Fix 1: Obtain and Set API Key

1. Sign up for a free API key at: https://api-ninjas.com/api/propertytax
2. Set the environment variable before running the script:

```powershell
# PowerShell (Windows)
$env:API_NINJAS_KEY = "your_actual_key_here"

# Then run the script
python import_property_tax.py
```

```bash
# Bash (Linux/Mac)
export API_NINJAS_KEY="your_actual_key_here"
python import_property_tax.py
```

### Fix 2: Update the Script

Apply the following code changes to `import_property_tax.py`:

**Change 1 - Line 54 (ZIP parameter name):**
```python
# Before:
params['zip_code'] = zip_code

# After:
params['zip'] = zip_code
```

**Change 2 - Lines 67-69 (Response field names):**
```python
# Before:
return {
    'median_rate': data[0].get('percentile_50', None),
    'percentile_25': data[0].get('percentile_25', None),
    'percentile_75': data[0].get('percentile_75', None),
}

# After:
return {
    'median_rate': data[0].get('property_tax_50th_percentile', None),
    'percentile_25': data[0].get('property_tax_25th_percentile', None),
    'percentile_75': data[0].get('property_tax_75th_percentile', None),
}
```

### Fix 3: Add Better Error Logging

To help diagnose issues in the future, consider adding debug logging:

```python
def fetch_property_tax_rate(city: str, state: str, zip_code: Optional[str] = None) -> Optional[Dict]:
    if not API_NINJAS_KEY:
        print(f"  ⚠️  Skipping {city or zip_code}: No API key configured")
        return None

    # ... existing code ...

    try:
        response = requests.get(API_NINJAS_BASE, headers=headers, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()
            if data:
                # API Ninjas returns percentile rates
                return {
                    'median_rate': data[0].get('property_tax_50th_percentile', None),
                    'percentile_25': data[0].get('property_tax_25th_percentile', None),
                    'percentile_75': data[0].get('property_tax_75th_percentile', None),
                }
            else:
                print(f"  ⚠️  Empty response for {city or zip_code}, {state}")
                return None

        # Add logging for non-200 responses
        if response.status_code != 429:  # Don't log rate limits (already handled)
            print(f"  ⚠️  API returned {response.status_code} for {city or zip_code}, {state}")

        # Rate limit: wait if we hit it
        if response.status_code == 429:
            print("  ⚠️  Rate limit hit, waiting 60s...")
            time.sleep(60)
            return fetch_property_tax_rate(city, state, zip_code)

        return None
    except Exception as e:
        print(f"  ⚠️  Error fetching property tax for {city or zip_code}, {state}: {e}")
        return None
```

## Testing Plan

### Step 1: Test API Access

Use the provided test script to verify API access:

```bash
# Set API key
$env:API_NINJAS_KEY = "your_key_here"

# Run test script
python test_api_ninjas.py
```

Expected output should show successful 200 responses with property tax data.

### Step 2: Test with Limited Dataset

Modify the main script to test with a small sample:

```python
# In main() function, after getting cities:
cities = cities[:10]  # Test with first 10 cities only
zips = zips[:10]      # Test with first 10 ZIPs only
```

### Step 3: Monitor Results

Watch for:
- Successful API calls (200 status codes)
- Data being extracted and inserted into database
- Console output showing: `✓ City, ST: 1.23%`

## Alternative Approaches

If the API Ninjas API is unavailable, unreliable, or rate-limited, consider these alternatives:

### Alternative 1: Tax Foundation Data (State-level)

**Source:** Tax Foundation (https://taxfoundation.org/)

**Pros:**
- Reliable, authoritative source
- Comprehensive state-level data
- Annual updates with historical data

**Cons:**
- State-level only (not city/ZIP specific)
- Manual data collection (no API)
- Annual updates (not real-time)

**Implementation:**
- Download CSV from Tax Foundation
- Import state averages as fallback
- Join to cities/ZIPs by state

### Alternative 2: Census Bureau Property Tax Data

**Source:** Census Bureau American Community Survey (ACS)
- Table B25103: Mortgage Status by Median Real Estate Taxes Paid
- Table B25081: Mortgage Status by Median Value

**Pros:**
- Official government data
- Available via Census API
- Same source as income data (consistency)

**Cons:**
- Complex calculation required (taxes / home value)
- May have high margins of error for small geographies
- Annual updates only

**Implementation:**
```python
# Pseudo-code
effective_rate = median_property_tax / median_home_value
```

### Alternative 3: ATTOM Data Solutions API

**Source:** ATTOM Property Tax API (https://www.attomdata.com/)

**Pros:**
- Very detailed (parcel-level data)
- Regular updates
- Covers most US properties

**Cons:**
- Commercial API (paid)
- Higher cost than API Ninjas
- Overkill for aggregate statistics

### Alternative 4: Hybrid Approach

**Recommended:** Use a combination:

1. **Primary:** API Ninjas for city/ZIP-level data (where available)
2. **Fallback 1:** Census ACS property tax data
3. **Fallback 2:** Tax Foundation state averages
4. **Cache results:** Store successfully retrieved rates to minimize API calls

**Implementation:**
```python
def get_property_tax_rate(geo_type, geo_id, city, state):
    # Try API Ninjas first
    rate = fetch_from_api_ninjas(city, state, geo_id if geo_type == 'ZCTA' else None)
    if rate:
        return rate

    # Fallback to Census ACS
    rate = calculate_from_census_acs(geo_type, geo_id)
    if rate:
        return rate

    # Final fallback to state average
    rate = get_state_average(state)
    return rate
```

## API Rate Limits

**API Ninjas Free Tier:**
- Typical limit: 10,000 requests/month
- Rate limiting: 429 status code when exceeded

**Current Dataset:**
- 21,459 cities
- Unknown number of ZIPs (likely 20,000+)
- Total: ~40,000+ API calls needed

**Recommendation:**
- Free tier may be insufficient for full import
- Consider paid tier or hybrid approach
- Implement aggressive caching
- Batch updates (e.g., only import new/changed records)

## Database Considerations

The `property_tax_rate` table is correctly designed:

```sql
CREATE TABLE property_tax_rate (
  id TEXT PRIMARY KEY,
  "geoType" TEXT NOT NULL,      -- 'CITY' or 'ZCTA'
  "geoId" TEXT NOT NULL,         -- City ID or ZIP code
  "effectiveRate" REAL NOT NULL, -- Median rate (as decimal, e.g., 0.01044)
  "rate25th" REAL,               -- 25th percentile
  "rate75th" REAL,               -- 75th percentile
  "asOfYear" INTEGER NOT NULL,   -- 2024
  source TEXT,                   -- 'API Ninjas'
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("geoType", "geoId", "asOfYear")
);
```

**Note:** The API returns rates as decimals (0.01044 = 1.044%), which matches the database schema. No conversion needed.

## Estimated Success Rate

**With all fixes applied:**
- API Ninjas coverage: ~60-70% of cities (larger cities)
- API Ninjas coverage: ~50-60% of ZIPs (populated ZIPs)
- Overall expected success: ~15,000-20,000 records

**Gaps:**
- Small/rural cities may not be in API Ninjas database
- Low-population ZIPs may not have data
- New/recently incorporated cities may be missing

**Recommendation:** Implement hybrid approach with state-level fallbacks for 100% coverage.

## Next Steps

1. ✓ Obtain API Ninjas API key
2. ✓ Apply code fixes to `import_property_tax.py`
3. ✓ Test with `test_api_ninjas.py` script
4. ✓ Run limited test import (10-50 records)
5. ✓ Verify data in database
6. ✓ Run full import (monitor for rate limits)
7. ✓ Implement fallback data sources for gaps
8. ✓ Document coverage statistics

---

**Report Generated:** 2025-12-24
**Script Analyzed:** `import_property_tax.py`
**Issues Found:** 3 critical issues
**Fixes Required:** Environment setup + 2 code changes
