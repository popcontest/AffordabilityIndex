# V2 Data Status - Quick View

**Last Updated:** 2026-01-03

## At-a-Glance Status

### V2 Score Completeness: 29% (Top 100 Cities)

```
COMPLETE (Housing + COL + Tax):     29 cities  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░ 29%
PARTIAL (missing COL):              71 cities  █████████████████████████████░░░░░░░ 71%
QOL Component:                       0 cities  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%
```

---

## Data Source Scorecard

| # | Data Source | Status | Coverage | V2 Impact | Action Required |
|---|-------------|--------|----------|-----------|-----------------|
| 1 | **MIT Living Wage** | ✅ | 3,141 counties | 30% weight | None - Waiting on city mapping |
| 2 | **ZHVI Home Values** | ✅ | 35k cities, 63k ZCTAs | 40% weight | None - Working perfectly |
| 3 | **Census Income** | ✅ | 35k cities, 63k ZCTAs | Critical | None - Working perfectly |
| 4 | **Mortgage Rates** | ✅ | National | Affects 40% | None - Updated weekly |
| 5 | **Income Tax** | ✅ | 51 states + 9 local | Part of 20% | None - Complete |
| 6 | **ZORI Rent** | ✅ | 3,740 cities | Future use | None - Data ready |
| 7 | **Property Tax** | 🟡 | 1,190 cities (5.5%) | Part of 20% | Get API key + run imports |
| 8 | **Sales Tax** | 🟡 | 43 states | Part of 20% | Import local rates |
| 9 | **Crime Data** | ❌ | 0% | 10% weight | Download + import CSV |
| 10 | **City-County Map** | ❌ | 1,191 cities (5.6%) | Blocks COL | **RUN MAPPING SCRIPT** |

---

## The Critical Blocker

### Why Only 29% of Top Cities Have Complete Scores?

**Root Cause:** Missing city-to-county mapping

```
21,459 total cities
- 1,191 mapped to counties (5.6%)
= 20,268 cities CANNOT access MIT Living Wage data

Even though MIT Living Wage has data for 3,141/3,143 counties (99.9%),
cities can't use it without knowing which county they're in.
```

**Example - Major Cities Without COL Scores:**
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

**Solution:** Run `import_city_county_mapping.py` (45 minutes)

---

## Quick Fix Checklist

### To Get to 95%+ Complete V2 Scores (2-3 hours)

- [ ] **RUN:** `python import_city_county_mapping.py` (45 min)
  - Maps 20,268 cities to counties via Census API
  - Unlocks COL scores for 95% of cities

- [ ] **DOWNLOAD:** FBI Crime Data (15-25 min user time)
  - Register at openICPSR.org/openicpsr/project/108164
  - Download Jacob Kaplan County-Level UCR CSV

- [ ] **IMPORT:** Crime data (30 min)
  - Create `crime_rate` table (migration)
  - Run `python import_crime_rates.py fbi_county_crime_data.csv`
  - Adds QOL component (10% of V2 score)

- [ ] **REGENERATE:** V2 scores (15 min)
  - Run score calculation script
  - All cities now have 4-component scores

**Result:** V2 completeness: 29% → 95%+

---

## Data Inventory Summary

### Database Tables

| Table | Exists? | Rows | Notes |
|-------|---------|------|-------|
| `cost_basket` | ✅ | 25,153 | MIT data for 3,141 counties |
| `property_tax_rate` | ✅ | 1,190 | Only 5.5% of cities |
| `sales_tax_rate` | ✅ | 43 | State-level only |
| `crime_rate` | ❌ | 0 | **TABLE MISSING** |
| `mortgage_rate` | ✅ | 2 | Current rates (12/24/2025) |
| `zori` | ✅ | 49,815 | Rent data ready |
| `income_tax_rate` | ✅ | 111 | All states + local |
| `affordability_snapshot` | ✅ | 102,908 | ZHVI + Income baseline |
| `v2_affordability_score` | ✅ | 43,407 | Current V2 scores |

### Geography Coverage

| GeoType | Total | With Home Value | With Income | With V2 Score | V2 Complete |
|---------|-------|-----------------|-------------|---------------|-------------|
| CITY | 21,459 | 35,385* | 35,385* | 17,556 (82%) | 988 (5.6%) |
| ZCTA | 26,299 | 63,600* | 63,600* | 25,841 (98%) | 0 (0%) |
| PLACE | ~11k+ | 20* | 20* | 10 (0.1%) | 10 (100%) |

*Multiple snapshots per geography (time series data)

---

## Component Breakdown

### V2 Score Components (Weighted)

```
Housing Burden:     ████████████████████████████████████████  40%  ✅ 100% coverage
Cost of Living:     ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  30%  ❌   6% coverage
Tax Burden:         ████████████████████████████████████████  20%  ✅ 100% coverage
Quality of Life:    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%  ❌   0% coverage
                    ----------------------------------------
                    Total Composite Score                        🟡  29% complete
```

### What Each Component Includes

**Housing Burden (40%)** - ✅ Working
- Home value (Zillow ZHVI)
- Mortgage rate (Freddie Mac)
- Property tax (where available, otherwise estimate)
- Monthly payment as % of income

**Cost of Living (30%)** - ❌ Blocked
- Food costs (MIT Living Wage)
- Healthcare costs (MIT Living Wage)
- Transportation costs (MIT Living Wage)
- Other essentials (MIT Living Wage)
- **BLOCKER:** Cities not mapped to counties

**Tax Burden (20%)** - ✅ Working
- Income tax (state + local)
- Sales tax (state-level)
- Property tax (included in housing)
- Combined effective tax rate

**Quality of Life (10%)** - ❌ Missing
- Crime rates (violent + property)
- Safety score (per 100k population)
- **BLOCKER:** Crime data not imported

---

## Import Scripts Status

### Ready to Run ✅
- `import_city_county_mapping.py` - **RUN THIS FIRST**
- `import_crime_rates.py` - Ready (needs CSV file)
- `import_freddie_mac_rates.py` - Weekly updates
- `import_zori.py` - Monthly rent data
- `import_income_tax.py` - Annual updates
- `import_mit_living_wage.py` - Annual updates

### Needs Fixes 🔧
- `import_property_tax.py` - Need API key + SQL fix
- `import_sales_tax.py` - Need Excel file
- `import_tax_foundation_property_tax.py` - Need CSV

---

## Next Steps

### Priority 0: Unblock V2 (TODAY)
1. Run city-county mapping script
2. Download crime CSV
3. Import crime data
4. Regenerate V2 scores

**Time:** 2-3 hours
**Result:** 95%+ complete V2 scores

### Priority 1: Enhance Tax Data (THIS WEEK)
1. Get API Ninjas key for property tax
2. Import Tax Foundation property tax
3. Add city-level sales tax data

**Time:** 4-6 hours
**Result:** More accurate tax burden

### Priority 2: Future Enhancements (LATER)
- School quality ratings
- Walk Score
- Unemployment data
- Climate data
- Rent vs. buy calculator

---

**For Full Details:** See `V2_DATA_INVENTORY_REPORT.md`
**Database Scripts:** `check_data_status.py`, `check_missing_details.py`
