# V2 Affordability Scoring - Implementation Summary

## Current Status

### NIBRS Crime Data Analysis - COMPLETED
- Analyzed nibrs-2024.zip (6GB file)
- Format: FBI fixed-width incident-level data
- **Verdict**: NOT RECOMMENDED
  - Only ~33% coverage (not nationally representative)
  - Complex parsing required (58+ data elements, multiple record types)
  - No direct county FIPS (requires ORI-to-County crosswalk)
  - Processing time: 1-2 hours
- **Recommendation**: Use Jacob Kaplan's County-Level UCR data instead
  - CSV format, already aggregated
  - Better coverage (~90%: UCR Summary + NIBRS combined)
  - Direct county FIPS mapping
  - Pre-calculated rates per 100k

### V2 Scoring Calculation Function - COMPLETED
- Created calculate_v2_scores.py with full methodology
- 4-component weighted scoring system:
  1. Housing Burden (40%): Monthly payment / Monthly income
  2. Cost of Living (30%): MIT Living Wage non-housing costs
  3. Tax Burden (20%): Income + sales + property tax (TODO)
  4. Quality of Life (10%): Crime + schools + walkability (TODO)
- Graceful degradation: Missing components redistribute weight
- Percentile-based normalization (0-100 scale)

## Data Collection Status

### TIER 1 - COMPLETE
| Data Source          | Status    | Records  | Coverage        |
|---------------------|-----------|----------|-----------------|
| MIT Living Wage     | COMPLETE  | 25,768   | 3,221 counties  |
| Income Tax          | COMPLETE  | 60       | 51 states + 9 local |
| Mortgage Rates      | COMPLETE  | 2        | National (Freddie Mac) |
| Property Tax        | PARTIAL   | 1,190    | Will re-run after MIT |

### TIER 1 - PENDING
| Data Source          | Status    | Blocker                       |
|---------------------|-----------|-------------------------------|
| Sales Tax           | READY     | Need correct LOST Excel file  |
| Crime Rates         | READY     | Need manual download from openICPSR |

### TIER 2/3 - FUTURE
- School quality (GreatSchools API or NCES)
- Walkability (Walk Score API or EPA)
- Climate (NOAA)
- Unemployment (BLS)
- Air quality (EPA)

## Implementation Blockers

### 1. Database Schema Mismatch
**Issue**: V2 calculation script assumes separate tables:
- zhvi (home values)
- median_household_income

**Reality**: Data is in `affordability_snapshot` table with different structure

**Fix Required**:
1. Update calculate_v2_scores.py to query affordability_snapshot
2. OR create views to match expected schema
3. OR wait to implement V2 after schema migration

### 2. Missing Core Data
**Crime Rates** - Quality of Life component blocked
- Manual registration + download required (15-25 min)
- URL: https://www.openicpsr.org/openicpsr/project/108164
- File: County-Level Detailed Arrest and Offense Data CSV
- Import script ready: import_crime_rates.py

**Sales Tax** - Tax Burden component blocked
- Need: Z:\Downloads\LOST_July_2025_Table_Data.xlsx (not Census collections file)
- Import script ready: import_sales_tax.py (needs Excel analysis)

## Recommended Next Steps

### Option A: Implement V2 with Available Data (Fast)
1. Fix calculate_v2_scores.py to use affordability_snapshot table
2. Run V2 scoring with 2 components (Housing + COL only)
3. Update UI to show V2 scores with disclaimer: "Based on housing & cost of living. Crime and tax data coming soon."
4. Add missing data later, rerun scoring

**Timeline**: 2-4 hours
**Pros**: Shows progress, partial V2 better than nothing
**Cons**: Incomplete methodology, may confuse users

### Option B: Complete TIER 1 Data First (Thorough)
1. User downloads Jacob Kaplan crime data (15-25 min)
2. Run import_crime_rates.py
3. Analyze LOST Excel file, complete sales tax import
4. Fix calculate_v2_scores.py schema issues
5. Run full V2 scoring with all 4 components
6. Update UI with complete methodology

**Timeline**: 4-6 hours (including user download time)
**Pros**: Complete, production-ready V2 scoring
**Cons**: Requires user action (download), longer timeline

### Option C: Schema-First Approach (Clean)
1. Update database schema to support V2 properly
2. Migrate existing affordability_snapshot data
3. Complete TIER 1 data collection
4. Implement V2 scoring end-to-end
5. Update UI

**Timeline**: 8-12 hours
**Pros**: Clean architecture, future-proof
**Cons**: Longest timeline, requires schema migration

## Files Created

1. **analyze_nibrs.py** - NIBRS data analyzer (verdict: don't use)
2. **calculate_v2_scores.py** - V2 scoring calculation function
3. **CRIME_DATA_GUIDE.md** - Updated with NIBRS analysis results
4. **import_crime_rates.py** - Ready to import Jacob Kaplan CSV
5. **import_sales_tax.py** - Ready for LOST Excel (needs analysis)

## Current Todo List

1. [COMPLETED] Design V2 scoring calculation function
2. [IN_PROGRESS] Test V2 calculation on sample geography (blocked by schema)
3. [PENDING] Create generate_v2_scores.py script for all geographies
4. [PENDING] Update database schema for V2 scores
5. [PENDING] Run V2 score generation for all cities/ZIPs
6. [PENDING] Update UI components to display V2 scores
7. [PENDING] Add V2 methodology explanation to pages

## User Decision Needed

Which option should we pursue?
- **Option A**: Quick V2 with 2 components
- **Option B**: Wait for complete TIER 1 data
- **Option C**: Schema migration first

Current blocker: Database schema mismatch + missing crime/sales tax data
