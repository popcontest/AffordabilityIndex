# V2 Data Source Inventory - Comprehensive Report

**Report Date:** 2026-01-03
**Database:** AffordabilityIndex Production
**Purpose:** Complete inventory of V2 affordability scoring data sources

---

## Executive Summary

### Overall Status: 🟡 PARTIALLY COMPLETE

**V2 Score Generation Status:**
- **Total V2 Scores:** 43,407 geographies scored
  - Cities: 17,556 (81.8% of 21,459 cities)
  - ZCTAs: 25,841 (98.3% of 26,299 ZCTAs)
  - Places: 10

**Component Completeness:**
- ✅ **Housing Component:** EXCELLENT (100% for scored geographies)
- 🟡 **Cost of Living (COL) Component:** POOR (only 988/17,556 cities = 5.6%)
- ✅ **Tax Component:** EXCELLENT (100% for scored geographies)
- ❌ **Quality of Life (QOL) Component:** MISSING (0% - crime data not imported)

**Critical Blocker:**
The primary blocker preventing complete V2 scoring is **missing city-to-county mapping**. Only 1,191 out of 21,459 cities (5.6%) are mapped to counties, which prevents COL score calculation for 94.4% of cities.

---

## Detailed Data Source Inventory

### 1. MIT Living Wage (Cost of Living / Essentials)

| Attribute | Status |
|-----------|--------|
| **Status** | ✅ **COMPLETE** |
| **Table** | `cost_basket` |
| **Row Count** | 25,153 total rows |
| **Coverage** | 3,141 counties (out of ~3,143 US counties = 99.9%) |
| **Data Quality** | Excellent - 8 household types per county |
| **Household Types** | 1_adult_0_kids, 1_adult_1_kid, 1_adult_2_kids, 1_adult_3_kids, 2_adults_0_kids, 2_adults_1_kid, 2_adults_2_kids, 2_adults_3_kids |
| **Source** | MIT Living Wage Calculator (livingwage.mit.edu) |
| **Last Updated** | 2025 data |
| **Import Script** | `import_mit_living_wage.py` ✅ |
| **Data Completeness** | 25,128 MIT rows + 25 stub rows = 25,153 total |

**Components Provided:**
- Food costs (annual)
- Healthcare costs (annual)
- Transportation costs (annual)
- Taxes (annual)
- Other essentials (annual)
- Total annual cost by household type

**Blocker:**
Data exists but only 5.6% of cities can use it due to missing city-to-county mapping.

**Impact on V2:**
- **Current Impact:** Only 988/17,556 cities (5.6%) have COL scores
- **Potential Impact if Fixed:** Could score 100% of cities if mapping completed
- **V2 Weight:** 30% of composite score

---

### 2. Property Tax Data

| Attribute | Status |
|-----------|--------|
| **Status** | 🟡 **PARTIAL** (5.5% coverage) |
| **Table** | `property_tax_rate` |
| **Row Count** | 1,190 cities |
| **Coverage** | 1,190 cities (out of 21,459 = 5.5%) |
| **Data Quality** | Good where available |
| **Source** | API Ninjas Property Tax API |
| **Last Updated** | December 2025 |
| **Import Script** | `import_property_tax.py` (needs fixes) |

**Coverage by GeoType:**
- CITY: 1,190 geographies
- ZCTA: 0
- STATE: 0
- COUNTY: 0

**Blockers:**
1. **Missing API Key:** API_NINJAS_KEY environment variable not set
2. **SQL Case Sensitivity Bug:** Fixed in documentation but may still exist in script
3. **Alternative Source Available:** Tax Foundation county-level data (`import_tax_foundation_property_tax.py`) not yet run

**Next Steps:**
1. Get free API key from api-ninjas.com/api/propertytax
2. Fix SQL case sensitivity: `ms.geoid` → `ms."geoId"`
3. Run `import_tax_foundation_property_tax.py` for county-level coverage (fast baseline)
4. Then run API Ninjas import for city-specific rates (more granular)

**Impact on V2:**
- **Current Impact:** Property tax IS being used in tax burden calculation (part of 20% weight)
- **V2 Weight:** Included in Tax Burden Component (20% of composite)
- **Improvement Needed:** Expand from 1,190 cities to ~20,000+ cities

---

### 3. Sales Tax Data

| Attribute | Status |
|-----------|--------|
| **Status** | 🟡 **PARTIAL** (state-level only) |
| **Table** | `sales_tax_rate` |
| **Row Count** | 43 rows |
| **Coverage** | 43 states (state-level only) |
| **Data Quality** | Good for states |
| **Source** | Tax Foundation LOST (Local Option Sales Tax) |
| **Last Updated** | July 2025 |
| **Import Script** | `import_sales_tax.py` (needs Excel file) |

**Coverage by GeoType:**
- STATE: 43 states
- CITY: 0 (missing local rates)
- COUNTY: 0
- ZCTA: 0

**Blocker:**
Script expects `Z:\Downloads\LOST_July_2025_Table_Data.xlsx` file. Need to:
1. Download correct LOST Excel file from Tax Foundation
2. Analyze Excel structure (may have multiple sheets/formats)
3. Update script to parse city-level local option sales taxes
4. Import combined state + local rates for cities

**Impact on V2:**
- **Current Impact:** State-level rates used in tax burden (20% weight)
- **V2 Weight:** Part of Tax Burden Component (20%)
- **Improvement Needed:** Add local sales tax rates for more accurate city comparisons

---

### 4. Crime Data (Quality of Life)

| Attribute | Status |
|-----------|--------|
| **Status** | ❌ **MISSING** |
| **Table** | `crime_rate` (does not exist) |
| **Row Count** | 0 |
| **Coverage** | 0% |
| **Source** | FBI UCR (via Jacob Kaplan's County-Level Data) |
| **Import Script** | `import_crime_rates.py` ✅ Ready |

**Blocker:**
1. Table does not exist in database (needs migration)
2. Data file not downloaded
3. Manual registration required at openICPSR.org

**Data Source:**
- **Recommended:** Jacob Kaplan's County-Level UCR Data
  - URL: https://www.openicpsr.org/openicpsr/project/108164
  - Format: CSV (pre-aggregated, county-level)
  - Coverage: ~90% of US counties (UCR Summary + NIBRS combined)
  - File: County-Level Detailed Arrest and Offense Data CSV
  - Registration: Free account required (15-25 min download)

**NOT Recommended:** NIBRS raw incident data
- 6GB zip file
- Only 33% coverage
- Complex parsing (58+ data elements)
- Requires ORI-to-County crosswalk

**Next Steps:**
1. User registers at openICPSR and downloads CSV
2. Run database migration to create `crime_rate` table
3. Run `import_crime_rates.py fbi_county_crime_data.csv`
4. Rerun V2 score calculation to include QOL component

**Impact on V2:**
- **Current Impact:** QOL component not calculated (0/43,407 scores have QOL data)
- **V2 Weight:** 10% of composite score (currently redistributed to other components)
- **Importance:** HIGH - safety is critical to affordability perception

---

### 5. Mortgage Rate Data

| Attribute | Status |
|-----------|--------|
| **Status** | ✅ **COMPLETE** |
| **Table** | `mortgage_rate` |
| **Row Count** | 2 records |
| **Coverage** | National (applies to all geographies) |
| **Data Quality** | Excellent (authoritative source) |
| **Source** | Freddie Mac PMMS (Primary Mortgage Market Survey) |
| **Last Updated** | 2025-12-24 |
| **Import Script** | `import_freddie_mac_rates.py` ✅ |

**Current Rates (as of 2025-12-24):**
- 30 Year Fixed: 1 record
- 15 Year Fixed: 1 record

**Update Frequency:** Weekly (typically Thursday)

**Impact on V2:**
- **Current Impact:** Used in housing burden calculation (40% of V2)
- **V2 Weight:** Critical for monthly mortgage payment calculation
- **Status:** Working perfectly

---

### 6. ZHVI Home Values (Baseline Data)

| Attribute | Status |
|-----------|--------|
| **Status** | ✅ **EXCELLENT** |
| **Table** | `affordability_snapshot` (homeValue column) |
| **Coverage** | 35,385 cities + 63,600 ZCTAs with home values |
| **Data Quality** | Excellent |
| **Source** | Zillow Research ZHVI |
| **Last Updated** | Monthly updates |

**Coverage:**
- Cities: 35,385 with home values (out of 21,459 unique cities)
- ZCTAs: 63,600 with home values (out of 25,841 unique)
- Total records: 102,908 in affordability_snapshot

**Impact on V2:**
- **Current Impact:** Core component of housing burden (40% weight)
- **V2 Weight:** 40% of composite score
- **Status:** Working perfectly

---

### 7. Census ACS Income (Baseline Data)

| Attribute | Status |
|-----------|--------|
| **Status** | ✅ **EXCELLENT** |
| **Table** | `affordability_snapshot` (medianIncome column) |
| **Coverage** | 35,385 cities + 63,600 ZCTAs with income |
| **Data Quality** | Excellent |
| **Source** | US Census Bureau ACS |
| **Last Updated** | Annual (5-year estimates) |

**Coverage:**
- Cities: 35,385 with income (out of 21,459 unique cities)
- ZCTAs: 63,600 with income (out of 25,841 unique)

**Impact on V2:**
- **Current Impact:** Denominator for all burden ratios (housing, COL, tax)
- **V2 Weight:** Affects all components (critical baseline)
- **Status:** Working perfectly

---

### 8. Income Tax Data

| Attribute | Status |
|-----------|--------|
| **Status** | ✅ **COMPLETE** |
| **Table** | `income_tax_rate` |
| **Row Count** | 111 records |
| **Coverage** | 51 states + 9 local jurisdictions |
| **Data Quality** | Excellent |
| **Source** | Tax Foundation |
| **Last Updated** | 2025 tax year |
| **Import Script** | `import_income_tax.py` ✅ |

**Coverage:**
- States: 51 (all 50 states + DC)
- Local Jurisdictions: 9 (cities with local income tax)

**Impact on V2:**
- **Current Impact:** Used in tax burden calculation (20% weight)
- **V2 Weight:** Part of Tax Burden Component (20%)
- **Status:** Working perfectly

---

### 9. ZORI Rent Data (Enhancement)

| Attribute | Status |
|-----------|--------|
| **Status** | ✅ **COMPLETE** |
| **Table** | `zori` |
| **Row Count** | 49,815 records |
| **Coverage** | 3,740 cities + 1,229 counties |
| **Data Quality** | Excellent |
| **Source** | Zillow Observed Rent Index (ZORI) |
| **Last Updated** | Monthly (latest: 2025-11-30) |
| **Import Script** | `import_zori.py` ✅ |

**Coverage by Region Type:**
- City: 3,740 regions (Dec 2024 - Nov 2025)
- County: 1,229 regions (Dec 2024 - Nov 2025)

**Use Case:**
- Rent vs. buy analysis
- Renter affordability calculations
- Housing cost alternatives

**Impact on V2:**
- **Current Impact:** Not yet used in V2 scoring (available for future enhancement)
- **Potential Use:** Renter-specific affordability scores
- **Status:** Data collected, awaiting implementation

---

## Summary Table: Data Source Status

| Data Source | Status | Coverage | Blocker | Impact on V2 | Priority |
|-------------|--------|----------|---------|--------------|----------|
| **MIT Living Wage** | ✅ COMPLETE | 3,141 counties | City-county mapping | HIGH (30% weight) | P0 |
| **Property Tax** | 🟡 PARTIAL | 1,190 cities (5.5%) | Missing API key + alternative source | MEDIUM (part of 20%) | P1 |
| **Sales Tax** | 🟡 PARTIAL | 43 states | Need city-level data | MEDIUM (part of 20%) | P1 |
| **Crime Data** | ❌ MISSING | 0% | Manual download required | HIGH (10% weight) | P0 |
| **Mortgage Rates** | ✅ COMPLETE | National | None | HIGH (affects 40%) | P0 |
| **ZHVI Home Values** | ✅ COMPLETE | 35k+ cities, 63k+ ZCTAs | None | CRITICAL (40% weight) | P0 |
| **Census Income** | ✅ COMPLETE | 35k+ cities, 63k+ ZCTAs | None | CRITICAL (all components) | P0 |
| **Income Tax** | ✅ COMPLETE | 51 states + 9 local | None | MEDIUM (part of 20%) | P1 |
| **ZORI Rent** | ✅ COMPLETE | 3,740 cities, 1,229 counties | Not yet used in scoring | LOW (future) | P2 |

---

## Critical Gaps Analysis

### 1. City-to-County Mapping (MOST CRITICAL)

**Problem:**
- Only 1,191 out of 21,459 cities (5.6%) are mapped to counties
- This prevents 94.4% of cities from getting COL scores
- MIT Living Wage data exists for 99.9% of counties but cities can't use it

**Impact:**
- **Top 100 Cities:** Only 29 have complete V2 scores (29%), 71 missing COL component
- **All Cities:** 16,568 out of 17,556 cities missing COL scores
- **Sample Major Cities Missing COL:**
  - Chicago, IL
  - Phoenix, AZ
  - Philadelphia, PA
  - Jacksonville, FL
  - Columbus, OH
  - Charlotte, NC
  - Denver, CO
  - Oklahoma City, OK
  - El Paso, TX
  - Washington, DC

**Solution:**
Run `import_city_county_mapping.py` (already created, tested, ready to run)

**Effort:** ~45 minutes (20,268 cities × 2 sec batch geocoding)

**Expected Result:**
- Maps all 20,268 cities to counties using Census Geocoding API
- Unlocks COL scores for ~20,000 additional cities
- Increases V2 completeness from 29% to nearly 100% for top cities

---

### 2. Crime Data (Quality of Life Component)

**Problem:**
- Table doesn't exist
- No QOL component in any V2 scores (0/43,407)

**Impact:**
- Missing 10% of V2 composite score
- Cannot distinguish safe vs. dangerous areas
- Incomplete affordability picture (cheap but unsafe ≠ affordable)

**Solution:**
1. User downloads Jacob Kaplan CSV (15-25 min, requires free registration)
2. Run database migration to create `crime_rate` table
3. Run `import_crime_rates.py fbi_county_crime_data.csv`

**Effort:** 1-2 hours (including download time)

---

### 3. Property Tax - Low Coverage

**Problem:**
- Only 1,190 cities have property tax data (5.5%)
- Remaining 20,269 cities use state/county defaults

**Impact:**
- MEDIUM - Tax burden component still calculated but less accurate
- Property tax already included in V2 scores where available
- Cities without data fall back to state averages

**Solutions:**
1. **Quick:** Run `import_tax_foundation_property_tax.py` for county-level rates (2 hours)
2. **Thorough:** Get API Ninjas key and run city-specific import (2 hours)

**Effort:** 2-4 hours total

---

### 4. Sales Tax - State-Level Only

**Problem:**
- Only state-level rates (43 states)
- Missing local option sales taxes (can add 1-5% in major cities)

**Impact:**
- LOW - State rates still provide reasonable approximation
- Tax burden component functional but not maximally accurate

**Solution:**
- Download Tax Foundation LOST Excel file
- Parse city-level local rates
- Update import script

**Effort:** 4-6 hours (Excel parsing + script updates)

---

## V2 Score Completeness

### Current V2 Score Status

**Total Scored:** 43,407 geographies

**By Component:**
| Geography | Total Scores | Housing | COL | Tax | QOL |
|-----------|--------------|---------|-----|-----|-----|
| CITY | 17,556 | 17,556 (100%) | 988 (5.6%) | 17,556 (100%) | 0 (0%) |
| ZCTA | 25,841 | 25,841 (100%) | 0 (0%) | 25,841 (100%) | 0 (0%) |
| PLACE | 10 | 10 (100%) | 10 (100%) | 10 (100%) | 0 (0%) |

### Top 100 Cities (Population > 50k)

**Completeness Distribution:**
- **COMPLETE (all 3 components):** 29 cities (29.0%)
- **PARTIAL (missing COL):** 71 cities (71.0%)
- **MINIMAL (housing only):** 0 cities (0%)
- **NONE:** 0 cities (0%)

**Analysis:**
Even among the top 100 largest cities, 71% are missing COL scores due to lack of county mapping.

---

## Recommended Action Plan

### Phase 1: Critical Data (IMMEDIATE - 2-4 hours)

**Priority 0 - Unblock V2 Completeness:**

1. **Run City-County Mapping** (45 minutes)
   ```bash
   python import_city_county_mapping.py
   ```
   - Maps 20,268 cities to counties
   - Unlocks COL scores for ~95% of cities
   - **Impact:** V2 completeness jumps from 29% to ~95% for top cities

2. **Download Crime Data** (15-25 minutes user time)
   - Register at openICPSR.org
   - Download Jacob Kaplan County-Level UCR CSV
   - Place in project directory

3. **Import Crime Data** (30 minutes)
   - Run database migration for `crime_rate` table
   - Run `import_crime_rates.py fbi_county_crime_data.csv`
   - **Impact:** Adds QOL component (10% of V2 score)

4. **Regenerate V2 Scores** (15 minutes)
   - Run `generate_v2_scores.py` (if it exists) or score calculation
   - **Impact:** All cities get complete 4-component V2 scores

**Total Phase 1 Time:** 2-3 hours (including user download)

**Expected Outcome:**
- V2 scoring goes from 29% complete to 95%+ complete
- All 4 components calculated (Housing, COL, Tax, QOL)
- Production-ready V2 scores for all major cities

---

### Phase 2: Enhanced Tax Data (NEXT - 4-6 hours)

**Priority 1 - Improve Tax Accuracy:**

1. **Property Tax - County Baseline** (1 hour)
   - Download Tax Foundation county property tax CSV
   - Run `import_tax_foundation_property_tax.py`
   - **Impact:** All cities get county-level property tax estimates

2. **Property Tax - City Granular** (2 hours)
   - Get free API Ninjas key
   - Fix SQL case sensitivity bug if needed
   - Run `import_property_tax.py`
   - **Impact:** Major cities get accurate city-specific rates

3. **Sales Tax - Local Rates** (4-6 hours)
   - Download Tax Foundation LOST Excel
   - Analyze Excel structure
   - Update `import_sales_tax.py` to parse city-level data
   - Run import
   - **Impact:** Tax burden more accurate for high-sales-tax cities

**Total Phase 2 Time:** 4-6 hours

**Expected Outcome:**
- Property tax coverage: 5.5% → 95%+
- Sales tax coverage: State-level → City + Local combined
- Tax burden component accuracy significantly improved

---

### Phase 3: Future Enhancements (LATER - 20+ hours)

**Priority 2 - Quality of Life & Comparisons:**

- School quality ratings (8 hours)
- Walk Score / Transit Score (3 hours, requires paid API)
- Unemployment rates (3 hours)
- Commute time data (4 hours)
- Climate/weather data (5 hours)
- Rent vs. buy calculator using ZORI (8 hours)

---

## Data Maintenance Requirements

### Update Frequencies

| Data Source | Frequency | Effort | Automation |
|-------------|-----------|--------|------------|
| ZHVI Home Values | Monthly | 5 min | Cron: `import_local_zillow.py` |
| Census Income | Annual (Dec) | 30 min | Manual: `import_census_income.py` |
| MIT Living Wage | Annual | 45 min | Manual: `import_mit_living_wage.py` |
| Mortgage Rates | Weekly (Thu) | 2 min | Cron: `import_freddie_mac_rates.py` |
| Property Tax | Annual | 1 hour | Manual: re-run imports |
| Sales Tax | Annual (July) | 1 hour | Manual: LOST Excel |
| Crime Data | Annual | 30 min | Manual: Jacob Kaplan CSV |
| Income Tax | Annual (Jan) | 15 min | Manual: `import_income_tax.py` |
| ZORI Rent | Monthly | 5 min | Cron: `import_zori.py` |

---

## Files & Scripts Status

### Ready to Run (No Modifications Needed)
- ✅ `import_city_county_mapping.py` - Maps cities to counties
- ✅ `import_crime_rates.py` - Imports FBI UCR crime data
- ✅ `import_freddie_mac_rates.py` - Fetches mortgage rates
- ✅ `import_zori.py` - Imports Zillow rent data
- ✅ `import_income_tax.py` - Imports state/local income tax
- ✅ `import_mit_living_wage.py` - Scrapes MIT Living Wage

### Needs Fixes Before Running
- 🔧 `import_property_tax.py` - Needs API key + SQL case fix
- 🔧 `import_sales_tax.py` - Needs Excel file + parsing updates
- 🔧 `import_tax_foundation_property_tax.py` - Needs CSV file

### Analysis/Documentation Files Created
- 📄 `analyze_nibrs.py` - NIBRS analysis (concluded: don't use)
- 📄 `calculate_v2_scores.py` - V2 scoring methodology
- 📄 `CRIME_DATA_GUIDE.md` - Crime data source analysis
- 📄 `DATA_COLLECTION_AND_V2_SCORING.md` - V2 planning doc
- 📄 `V2_DATA_IMPORT_GUIDE.md` - Import instructions
- 📄 `V2_SCORING_SUMMARY.md` - Implementation summary
- 📄 `check_data_status.py` - Database inventory checker
- 📄 `check_missing_details.py` - Detailed gap analysis

---

## Conclusion

### What's Working Well ✅
1. **Baseline data** (ZHVI, Income) - 100% complete
2. **Housing component** - 100% calculated for scored geographies
3. **Tax component** - 100% calculated (state/county level)
4. **Mortgage rates** - Current, accurate, automated
5. **MIT Living Wage** - 99.9% of counties covered (3,141/3,143)
6. **Income tax** - All states + major cities
7. **ZORI rent data** - 3,740 cities ready for rent analysis

### Critical Gaps ❌
1. **City-county mapping** - 94.4% of cities missing (MOST CRITICAL)
2. **Crime data** - 0% coverage (needs manual download)
3. **Property tax** - 94.5% of cities using fallback rates
4. **Sales tax** - Local rates missing (state-level only)

### Next Steps
**To achieve production-ready V2 scoring:**
1. Run city-county mapping (45 min) → Unlocks COL for 95% of cities
2. Download + import crime data (1 hour) → Adds QOL component
3. Regenerate V2 scores → Complete 4-component scoring

**Estimated time to complete V2:** 2-3 hours

**Result:**
- 95%+ of cities with complete V2 scores
- All 4 components (Housing, COL, Tax, QOL) calculated
- Production-ready affordability index v2.0

---

**Report Generated:** 2026-01-03
**Database Query Scripts:** `check_data_status.py`, `check_missing_details.py`
**For Questions:** See import scripts in project root or review documentation files
