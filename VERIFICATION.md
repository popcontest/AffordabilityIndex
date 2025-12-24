# Affordability Index - Verification & Testing Guide

This document provides step-by-step instructions for verifying the complete implementation.

## Quick Status

✅ Prisma 7 schema with GeoCity and GeoType=CITY
✅ Real ETL implementation (Zillow City+Zip ZHVI + Census ACS B19013)
✅ Safe ACS matching with ambiguity detection
✅ City disambiguation via slug-cityId URLs
✅ Search API with CITY canonical URLs
✅ Database connectivity options (Docker optional)
✅ Score-first UX (0-100 scores + letter grades A+ to F)

---

## Prerequisites

1. **Node.js 18+** and **Python 3.11+** installed
2. **PostgreSQL database** (choose one):
   - **Option A:** Docker - `docker compose up -d`
   - **Option B:** Local PostgreSQL - `createdb affordability_index`
   - **Option C:** Hosted (Neon/Supabase/Railway)

3. **Environment configured:**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

---

## Verification Steps

### 1. Database Setup

#### Test Prisma Connection
```bash
cd apps/web
npx prisma generate
npx prisma db push
```

**Expected output:**
```
✔ Generated Prisma Client
Your database is now in sync with your schema.
```

#### Browse Database (Optional)
```bash
npx prisma studio
```

Opens GUI at http://localhost:5555 to view schema.

---

### 2. ETL Pipeline Tests

#### Dry-Run Mode (No Database Required)
```bash
cd etl
python main.py --dry-run
```

**Expected output:**
```
======================================================================
Affordability Index ETL Pipeline
MODE: DRY-RUN (no actual data fetching or database writes)
======================================================================
[1/4] Fetching Zillow ZHVI data...
[2/4] Fetching Census ACS income data...
[3/4] Transforming data...
[4/4] Loading data to Postgres...
======================================================================
ETL pipeline dry-run completed successfully
======================================================================
```

#### Local Zillow Import (Recommended for Development)

If you have local Zillow CSV files, use `--zillow-dir` for faster testing:

```bash
cd etl
python main.py --zillow-dir ../data --geos city,zip --limit-states 2
```

**Requirements:**
- Place CSV files in `../data/` directory (e.g., `City_*.csv`, `Zip_*.csv`)
- Download from: https://www.zillow.com/research/data/

**What this does:**
- Loads Zillow data from local files (no network download)
- Processes City and Zip geographies (default: city,zip)
- Implements safe ACS matching with ambiguity detection
- Fetches Census income + population for 2 states only
- Memory-efficient: loads only latest date column
- Rerunnable: uses upserts on (geo_type, geo_id, as_of_date)

**Expected output:**
```
[1/4] Loading local Zillow ZHVI data...
  Directory: ../data
  Geographies: city,zip
  Found City: City_zhvi_....csv
  Found Zip: Zip_zhvi_....csv
  Loading City data from City_zhvi_....csv...
    Latest data: 2024-XX-XX
    Loaded XXXX records
    Processed XXX cities
  Loading ZIP data from Zip_zhvi_....csv...
    Latest data: 2024-XX-XX
    Loaded XXXX records
    Processed XXX ZCTAs

[2/4] Fetching Census ACS income data...
  Fetching Place income data...
    Fetched XXX places with income data
  Fetching ZCTA income data...
    Fetched XXX ZCTAs with income data

[3/4] Transforming data...
  Joining XXX Zillow cities with XXX Census places...
  Matching cities to Census places by name...
    Match results:
      Exact matches: XXX
      Population-disambiguated: XXX
      Ambiguous (multiple candidates): XXX
      No match: XXX
    Cities with income data: XXX
    Cities without income (ambiguous/none): XXX
  Total records prepared: XXX
    Cities: XXX
    ZCTAs: XXX
    Avg ratio: X.XX

[4/4] Loading data to Postgres...
  Upserting XXX GeoCity records...
  Upserting XXX GeoZcta records...
  Inserting XXX MetricSnapshot records...
  Successfully loaded XXX records
```

**To test search API after local import:**
```bash
curl "http://localhost:3000/api/search?q=90210"
```

#### Test Mode with Limited Data (Requires Database)
```bash
python main.py --limit-states 2
```

**What this does:**
- Downloads full Zillow ZHVI CSVs (Place + ZIP) from remote URLs
- Fetches Census ACS income for **2 states only** (faster test)
- Joins and calculates ratios
- Loads to database

**Expected output:**
```
[1/4] Fetching Zillow ZHVI data...
  Downloading Place ZHVI data...
    Loaded XXXX places
    Latest Place data: 2024-XX-XX
    Processed XXX places with valid geoids and values
  Downloading ZIP ZHVI data...
    Loaded XXXX ZIPs
    Latest ZIP data: 2024-XX-XX
    Processed XXX ZCTAs with valid values

[2/4] Fetching Census ACS income data...
  Fetching Place income data...
    Fetched XXX places with income data
  Fetching ZCTA income data...
    Fetched XXXX ZCTAs with income data

[3/4] Transforming data...
  Joining XXX Zillow places with XXX Census places...
    Matched XXX places
  Joining XXX Zillow ZIPs with XXX Census ZCTAs...
    Matched XXX ZCTAs
  Total records prepared: XXX
    Places: XXX
    ZCTAs: XXX
    Avg ratio: X.XX

[4/4] Loading data to Postgres...
  Upserting XXX GeoPlace records...
  Upserting XXX GeoZcta records...
  Inserting XXX MetricSnapshot records...
  Successfully loaded XXX records
```

**Important Notes:**
- Zillow URLs may change; check https://www.zillow.com/research/data/ if 404 errors occur
- Census API has rate limits; use CENSUS_API_KEY for higher limits
- First run takes longer (downloads large CSVs)

#### Full Production Run (Optional)
```bash
python main.py
```

Fetches all 50 states (takes 5-10 minutes depending on Census API limits).

---

### 3. Web Application Tests

#### Build Test
```bash
cd apps/web
npm run build
```

**Expected output:**
```
✓ Linting and checking validity of types
✓ Compiled successfully
Route (app)                               Size     First Load JS
┌ ○ /                                     ...
├ ○ /[state]                              ...
├ ○ /[state]/[place]                      ...
├ ○ /[state]/county/[county]              ...
├ ○ /rankings                             ...
├ ○ /zip/[zip]                            ...
...
```

#### Start Dev Server
```bash
cd apps/web
npm run dev
```

Visit http://localhost:3000

**Expected:**
- Home page with "Affordability Index" title
- Placeholder search box (disabled)
- Attribution footer

#### Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{"ok":true}
```

#### Test Page Routes

**Rankings Hub:**
```
http://localhost:3000/rankings/
```

**State Page (example):**
```
http://localhost:3000/maine/
http://localhost:3000/california/
```
Shows top 20 most affordable places and ZIPs for the state.

**City Page (example):**
```
http://localhost:3000/maine/portland/
http://localhost:3000/california/san-francisco/
```
Shows home value, income, ratio, earning power, county/metro, and FAQ.

**Note:** If city name is ambiguous (multiple cities with same name in state), will show disambiguation list with links to specific cities using compound URLs like `/maine/springfield-12345/`.

**ZIP Page (example):**
```
http://localhost:3000/zip/04101/
http://localhost:3000/zip/90210/
```
Shows metrics for the ZIP code area.

**County Page (placeholder):**
```
http://localhost:3000/maine/county/cumberland/
```
Returns 404 (county data not yet implemented).

#### Test URL Normalization (Middleware)

**Uppercase → Lowercase (308 redirect):**
```bash
curl -I "http://localhost:3000/Maine/"
# Should redirect to: /maine/
```

**Underscores → Hyphens (308 redirect):**
```bash
curl -I "http://localhost:3000/new_york/"
# Should redirect to: /new-york/
```

**Missing Trailing Slash (308 redirect):**
```bash
curl -I "http://localhost:3000/rankings"
# Should redirect to: /rankings/
```

**State ZIP Redirect (308 redirect):**
```bash
curl -I "http://localhost:3000/california/zip/90210/"
# Should redirect to: /zip/90210/
```

#### Test Search API

**Search by City Name:**
```bash
curl "http://localhost:3000/api/search?q=San"
```

**Expected response (now includes canonicalUrl):**
```json
{
  "query": "San",
  "results": [
    {
      "geoType": "CITY",
      "geoId": "12345",
      "label": "San Francisco, CA",
      "state": "CA",
      "canonicalUrl": "https://affordabilityindex.org/california/san-francisco/",
      "ratio": 8.45,
      "homeValue": 1200000,
      "income": 142000,
      "asOfDate": "2024-10-31"
    },
    ...
  ],
  "count": 10
}
```

**Note:** If a city name is not unique in its state (e.g., "Springfield"), the canonical URL will include the cityId: `/massachusetts/springfield-54321/`

**Search by ZIP Code:**
```bash
curl "http://localhost:3000/api/search?q=90210"
```

**Expected response:**
```json
{
  "query": "90210",
  "results": [
    {
      "geoType": "ZCTA",
      "geoId": "90210",
      "label": "ZIP 90210",
      "state": "CA",
      "canonicalUrl": "https://affordabilityindex.org/zip/90210/",
      "ratio": 12.5,
      "homeValue": 2500000,
      "income": 200000,
      "asOfDate": "2024-10-31"
    }
  ],
  "count": 1
}
```

---

## Database Schema Verification

Run this SQL to verify data loaded correctly:

```sql
-- Check GeoCity count
SELECT COUNT(*) FROM geo_city;

-- Check GeoZcta count
SELECT COUNT(*) FROM geo_zcta;

-- Check MetricSnapshot count
SELECT COUNT(*) FROM metric_snapshot;

-- Sample high-ratio cities
SELECT
  gc.name,
  gc.state_abbr,
  gc.county_name,
  ms.ratio,
  ms.home_value,
  ms.income,
  ms.as_of_date,
  ms.sources::json->'income'->>'match_type' as income_match_type
FROM metric_snapshot ms
JOIN geo_city gc ON ms.geo_id = gc.city_id
WHERE ms.geo_type = 'CITY'
ORDER BY ms.ratio DESC NULLS LAST
LIMIT 10;

-- Check match type distribution
SELECT
  ms.sources::json->'income'->>'match_type' as match_type,
  COUNT(*) as count
FROM metric_snapshot ms
WHERE ms.geo_type = 'CITY'
GROUP BY match_type
ORDER BY count DESC;
```

---

## Troubleshooting

### ETL Issues

**Problem:** `404 Not Found` on Zillow CSVs
**Solution:** Check https://www.zillow.com/research/data/ for current URLs. Update `etl/config.py` ZILLOW_PLACE_URL and ZILLOW_ZIP_URL.

**Problem:** `MunicipalCodeFIPS` column missing
**Solution:** Zillow changed their CSV format. Check column names and update `etl/main.py` fetch_zillow() to match current structure.

**Problem:** Census API rate limit errors
**Solution:** Get free API key at https://api.census.gov/data/key_signup.html and set `CENSUS_API_KEY` in `.env`.

**Problem:** `psycopg2.OperationalError: could not connect`
**Solution:** Verify DATABASE_URL in `.env` and database is running.

### API Issues

**Problem:** `/api/search` returns empty results
**Solution:** Run ETL first to populate database: `python etl/main.py --limit-states 2`

**Problem:** `PrismaClient` initialization error
**Solution:** Run `npx prisma generate` from `apps/web/` directory.

---

## Development Workflow

### Typical Development Cycle

1. **Start database** (if using Docker):
   ```bash
   docker compose up -d
   ```

2. **Set up database schema**:
   ```bash
   cd apps/web
   npm run db:push
   ```

3. **Load sample data** (2 states for fast testing):
   ```bash
   cd etl
   # Use local files (recommended):
   python main.py --zillow-dir ../data --geos city,zip --limit-states 2
   ```

4. **Start dev server**:
   ```bash
   cd apps/web
   npm run dev
   ```

5. **Test search API**:
   ```bash
   curl "http://localhost:3000/api/search?q=Boston"
   ```

---

## Next Implementation Steps

### Immediate (MVP)
- [ ] Connect home page search UI to `/api/search` endpoint
- [ ] Add loading/error states to search
- [ ] Create detail pages: `/place/[id]` and `/zcta/[id]`

### Short-term
- [ ] Add search results rendering on home page
- [ ] Implement client-side search with debouncing
- [ ] Add ratio visualization (color coding or chart)
- [ ] Create attribution/methodology page

### Medium-term
- [ ] Add filtering (by state, ratio range)
- [ ] Historical data visualization (track changes over time)
- [ ] Export functionality (CSV/JSON)
- [ ] Add County-level data (optional)

### Production
- [ ] Set up automated ETL runs (monthly cron job)
- [ ] Add error monitoring (Sentry, etc.)
- [ ] Optimize search with full-text indexes
- [ ] Deploy to Vercel + hosted Postgres

---

## Data Quality Notes

### Expected Coverage
- **Cities:** ~20,000 Zillow cities nationwide
- **ZCTAs:** ~33,000 ZIP code areas
- **Income Match Rate:** ~60-75% exact or pop-disambiguated matches

### Known Limitations
1. **Temporal Mismatch:** Zillow data is current monthly; ACS is 5-year average lagging 1-2 years
2. **Rural Gaps:** Small towns/rural ZIPs often lack Zillow data
3. **MOE:** ACS margins of error can be high for small geographies
4. **ZCTA ≠ ZIP:** Boundaries differ; document clearly in UI
5. **Name Matching:** Zillow city names may differ from Census place names:
   - Exact matches: 1 Census candidate (best quality)
   - Pop-disambiguated: Multiple candidates, highest population wins (good quality)
   - Ambiguous: Multiple candidates with tie/missing population → income=null (data integrity preserved)
   - None: No Census match → income=null (data integrity preserved)

### Ambiguous Income Handling
When income matching is ambiguous or missing, the system:
- Stores home value (always from Zillow)
- Sets income=null, ratio=null
- Marks match_type in sources JSON
- Shows warning on city page: "Income data match was ambiguous; ratio not shown"

---

## v2 Full Basket Affordability Score Verification

### Overview
v2 scoring incorporates county-level cost basket data to compute a full cost-of-living affordability score:
- **Housing (60%)**: Home value ÷ income percentile (same as v1)
- **Essentials (40%)**: Disposable income percentile (median income - annual living costs)
- **Overall Score**: round(0.60 × housing + 0.40 × essentials)

### Prerequisites
1. Cost basket data imported: `python etl/import_cost_basket_cli.py --csv data/cost_basket.csv`
2. County FIPS lookup populated: `python etl/populate_county_fips.py`

### Test Scenarios

#### 1. City with Cost Basket (v2 Score)

**Test cities with county-level basket data:**
```bash
curl "http://localhost:3000/api/search?q=San+Francisco"
```

Visit a city page for a city with basket data (e.g., Los Angeles, San Francisco, Boston):
```
http://localhost:3000/california/san-francisco/
```

**Expected behavior:**
- ✅ ScoreBreakdownPanel shows "Full cost-of-living basket (v2)"
- ✅ Overall score uses 60/40 blend
- ✅ Housing score is displayed (percentile 0-100)
- ✅ Essentials score is displayed (not "Coming soon")
- ✅ Taxes and Healthcare show "Coming soon" (v2 MVP phase)
- ✅ "Cost Basket Details" section is visible with:
  - Household Type: "1 adult 0 kids"
  - Annual Living Costs: dollar amount
  - Data Source: "basket_stub"
  - Version: "2025-01"
- ✅ Notes explain "v2: Full cost-of-living basket (housing + essentials)"

#### 2. City without Cost Basket (v1 Fallback)

**Test a city without county FIPS or basket data:**

Visit a city page for a small city or town without basket data:
```
http://localhost:3000/maine/augusta/
```

**Expected behavior:**
- ✅ ScoreBreakdownPanel shows "Housing-only score (v1)"
- ✅ Overall score equals housing score
- ✅ Housing score is displayed
- ✅ Essentials score shows "Coming soon" (not available)
- ✅ No "Cost Basket Details" section
- ✅ Graceful fallback with no errors

#### 3. Database Verification

**Check cost basket coverage:**
```sql
-- Count cities with county FIPS
SELECT COUNT(*) as cities_with_county
FROM geo_city
WHERE county_fips IS NOT NULL;

-- Count cities eligible for v2 scoring
SELECT COUNT(*) as v2_eligible_cities
FROM geo_city gc
WHERE gc.county_fips IN (
  SELECT DISTINCT county_fips
  FROM cost_basket
  WHERE source = 'basket_stub'
  AND version = '2025-01'
  AND household_type = '1_adult_0_kids'
);

-- Sample cities with basket data
SELECT
  gc.name,
  gc.state_abbr,
  gc.county_fips,
  cb.county_name,
  cb.total_annual
FROM geo_city gc
JOIN cost_basket cb
  ON gc.county_fips = cb.county_fips
WHERE cb.source = 'basket_stub'
  AND cb.version = '2025-01'
  AND cb.household_type = '1_adult_0_kids'
LIMIT 10;
```

**Expected results:**
- Cities with county_fips > 0
- v2_eligible_cities matches number of cities in counties with basket data
- Sample query shows cities correctly linked to basket data

#### 4. Percentile Computation Test

**Verify disposable income percentile is computed correctly:**

```sql
-- Test disposable income calculation for a known city
WITH city_disposable AS (
  SELECT
    gc.city_id,
    gc.name,
    gc.state_abbr,
    s.median_income,
    cb.total_annual,
    (s.median_income - cb.total_annual) AS disposable
  FROM geo_city gc
  INNER JOIN LATERAL (
    SELECT DISTINCT ON (geo_id) median_income
    FROM affordability_snapshot
    WHERE geo_type = 'CITY'
      AND geo_id = gc.city_id
      AND median_income IS NOT NULL
    ORDER BY geo_id, as_of_date DESC
  ) s ON true
  INNER JOIN cost_basket cb
    ON gc.county_fips = cb.county_fips
    AND cb.source = 'basket_stub'
    AND cb.version = '2025-01'
    AND cb.household_type = '1_adult_0_kids'
  WHERE gc.county_fips IS NOT NULL
    AND s.median_income IS NOT NULL
)
SELECT
  name,
  state_abbr,
  median_income,
  total_annual,
  disposable,
  ROUND(
    ((1 - CUME_DIST() OVER (ORDER BY disposable ASC)) * 100)::numeric,
    1
  ) AS percentile
FROM city_disposable
ORDER BY disposable DESC
LIMIT 20;
```

**Expected results:**
- Cities with highest disposable income have percentile near 100
- Cities with lowest disposable income have percentile near 0
- Percentile values are between 0-100

#### 5. Component Verification

**Check that UI shows correct components for v1 vs v2:**

**v2 city (has basket):**
```
Housing Affordability: [score] ✓
Essentials Affordability: [score] ✓
Tax Burden: Coming soon (grayed out)
Healthcare Cost: Coming soon (grayed out)
```

**v1 city (no basket):**
```
Housing Affordability: [score] ✓
Essentials Affordability: Coming soon (grayed out)
Tax Burden: Coming soon (grayed out)
Healthcare Cost: Coming soon (grayed out)
```

### Known Limitations (v2 MVP)
- County-level approximation (all cities in same county get same basket)
- Single household type: 1_adult_0_kids (must be displayed to users)
- Stub data provider (not real MIT Living Wage or similar)
- No granular tax/healthcare breakdowns yet (future enhancement)

---

## Score-First UX Implementation (v1)

### Current Implementation
✅ **Affordability Score (0-100)** with letter grades (A+ to F)
- Score = housing affordability percentile within peer group
- Higher score = more affordable (100 = most affordable)
- Letter grades: A+ (95-100), A (90-94), A- (85-89), B+ (80-84), B (75-79), B- (70-74), C+ (65-69), C (60-64), C- (55-59), D (50-54), F (<50)

### Pages Updated
✅ City detail pages (`/[state]/[place]/`) - ScoreHero + ScoreBreakdownPanel at top
✅ ZIP detail pages (`/zip/[zip]/`) - ScoreHero + ScoreBreakdownPanel at top
✅ State pages (`/[state]/`) - City cards show "Score: XX (Grade)" as primary
✅ Homepage (`/`) - City cards show "Score: XX (Grade)" as primary
✅ Methodology page - Comprehensive scoring explanation with grade table
✅ Data sources page - Brief mention of score metric

### Implementation Details
- **Scoring utilities**: `lib/scoring.ts` - `clampScore()`, `scoreToGrade()`, `formatScore()`, `scoreLabel()`, `getScoreColor()`, `getScoreDescription()`
- **Score types**: `lib/scoreTypes.ts` - Versioned `ScoreBreakdown` interface supporting v1 (housing-only) and future v2 (full basket)
- **Data layer**: `lib/data.ts` - Dashboard functions populate `score: ScoreBreakdown` field
- **UI components**: `ScoreHero.tsx`, `ScoreBreakdownPanel.tsx`
- **Percentile computation**: SQL queries compute `affordabilityPercentile` for cities within peer groups
- **Heuristic elimination**: Removed `estimateAffordabilityPercentile()` usage for city cards (now use computed percentiles)

### Future Enhancements (v2)
- Weighted basket: 60% housing + 15% essentials + 15% taxes + 10% healthcare
- Components will be added once reliable datasets are identified

---

## E2E Testing with Playwright

### Running E2E Tests

**Prerequisites:**
1. Database must be populated with data (run ETL first)
2. Dev server must be running on port 3004

**Start dev server on port 3004:**
```bash
cd apps/web
PORT=3004 npm run dev
```

**Run E2E tests (headless mode):**
```bash
cd apps/web
npm run test:e2e
```

**Run E2E tests in UI mode (interactive):**
```bash
cd apps/web
npm run test:e2e:ui
```

**Run specific test file:**
```bash
cd apps/web
npx playwright test tests/e2e/smoke.spec.ts
```

**Run tests in headed mode (with browser):**
```bash
cd apps/web
npx playwright test --headed
```

### Test Coverage

The E2E test suite (`tests/e2e/smoke.spec.ts`) verifies:

#### 1. Homepage Sections
- ✅ All six ranking sections load correctly
  - Most Affordable Cities (>=50k)
  - Most Affordable Small Cities (10k-50k)
  - Most Affordable Towns (<10k)
  - Least Affordable Cities (>=50k)
  - Least Affordable Small Cities (10k-50k)
  - Least Affordable Towns (<10k)
- ✅ Each section contains place cards with required elements

#### 2. Population Bucket Filtering
- ✅ City bucket (>=50k) shows only "City" badges
- ✅ Small City bucket (10k-50k) shows only "Small City" badges
- ✅ Town bucket (<10k) shows only "Town" badges
- ✅ Filtering is consistent across homepage and state pages

#### 3. Sorting Direction
- ✅ Most affordable sections: ascending ratio order (lowest first)
- ✅ Least affordable sections: descending ratio order (highest first)
- ✅ Sorting verified by extracting and comparing ratio values from cards

#### 4. Score Version Detection
- ✅ v1 scoring (housing-only) displays correctly
- ✅ v2 scoring (full basket) displays correctly
- ✅ Version indicator shows "v1_housing" or "v2_full"
- ✅ Housing score always visible
- ✅ Essentials score shows value for v2, "Coming soon" for v1

#### 5. City Detail Pages
- ✅ Score hero component displays
- ✅ Overall score and grade visible
- ✅ Score breakdown panel shows correct version
- ✅ Component scores display based on data availability

#### 6. State Pages
- ✅ State page sections load correctly
- ✅ Bucket filtering maintained on state pages
- ✅ Place cards have correct structure

#### 7. Card Display
- ✅ Score and grade display in correct format (e.g., "85 (B+)")
- ✅ Ratio displays in correct format (e.g., "3.2× income")

### Test IDs Reference

The following `data-testid` attributes are used for E2E testing:

**Homepage & State Page Sections:**
- `section-most-affordable-cities`
- `section-most-affordable-small-cities`
- `section-most-affordable-towns`
- `section-least-affordable-cities`
- `section-least-affordable-small-cities`
- `section-least-affordable-towns`

**Place Cards:**
- `place-card` - Card wrapper
- `place-name` - City/town name
- `place-type` - PlaceTypeBadge (City/Small City/Town)
- `place-score` - Affordability score with grade
- `place-ratio` - Home value to income ratio

**Score Components (City Detail Pages):**
- `score-hero` - Hero section wrapper
- `score-overall` - Overall score display
- `score-version` - Version indicator (v1_housing or v2_full)
- `score-housing` - Housing affordability component
- `score-essentials` - Essentials affordability component

### Test Data Requirements

Tests are designed to be tolerant of sparse data:
- Tests check for element existence before assertions
- Conditionals handle cases where sections may be empty
- Tests verify up to first 3 cards per section (sufficient sample)

**Recommended test data setup:**
```bash
# Load data for 2-3 states for faster test execution
cd etl
python main.py --zillow-dir ../data --geos city,zip --limit-states 3
```

### Debugging Tests

**View test report after failed run:**
```bash
cd apps/web
npx playwright show-report
```

**Run tests with debug mode:**
```bash
cd apps/web
npx playwright test --debug
```

**Generate trace files for debugging:**
```bash
cd apps/web
npx playwright test --trace on
```

**View trace files:**
```bash
npx playwright show-trace trace.zip
```

### Expected Test Results

When database is populated with test data, all tests should pass:
```
✓ Homepage Sections (2 tests)
✓ Population Bucket Filtering (3 tests)
✓ Sorting Direction (4 tests)
✓ City Detail Page - Score Components (2 tests)
✓ State Page (2 tests)
✓ Score and Ratio Display (1 test)

Total: 14 tests passed
```

---

*Last updated: 2025-12-22 after implementing comprehensive E2E tests with Playwright*
