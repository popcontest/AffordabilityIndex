# V2 Affordability Score - Data Quality Diagnosis

**Date:** 2026-01-03
**Investigator:** Claude Code Analysis
**Database Records Analyzed:** 43,407 V2 scores

---

## Executive Summary

**CRITICAL BUG IDENTIFIED:** All V2 affordability scores are incorrectly set to 100, despite having properly calculated and varying burden ratios. The percentile ranking algorithm in `calculate_v2_scores.py` has a SQL query structure flaw that causes `PERCENT_RANK()` to always return 0.0.

**Impact:** 100% of composite and component scores are incorrect. Users cannot differentiate between affordable and unaffordable cities.

**Root Cause:** WHERE clause applied BEFORE percentile calculation instead of AFTER, resulting in window function operating on single row.

---

## Findings

### 1. Composite Score Distribution

| Metric | Value |
|--------|-------|
| **Total Records** | 43,407 |
| **Scores = 100** | 43,407 (100%) |
| **Scores < 100** | 0 (0%) |
| **Min Score** | 100 |
| **Max Score** | 100 |
| **Average Score** | 100.00 |

**Finding:** EVERY geography has a perfect composite score of 100, which is statistically impossible.

---

### 2. Component Score Distribution

#### Housing Scores
- **Count of 100s:** 43,407 (100%)
- **Min/Max/Average:** 100 / 100 / 100.00
- **Null count:** 0

#### Cost of Living Scores
- **Count of 100s:** 998 (100% of non-null)
- **Min/Max/Average:** 100 / 100 / 100.00
- **Null count:** 42,409 (97.7% missing)

#### Tax Scores
- **Count of 100s:** 43,407 (100%)
- **Min/Max/Average:** 100 / 100 / 100.00
- **Null count:** 0

#### Quality of Life Scores
- **Null count:** 43,407 (100% missing - expected, feature not implemented)

**Finding:** ALL non-null component scores are 100, regardless of geography.

---

### 3. Burden Ratio Analysis

This is where the smoking gun appears - burden ratios ARE correctly calculated and DO vary:

#### Housing Burden Ratio Distribution

| Percentile | Burden Ratio | Expected Score | Actual Score |
|------------|-------------|----------------|--------------|
| **0th (Min)** | 0.0318 | ~100 | 100 |
| **1st** | 0.0974 | ~99 | 100 |
| **10th** | 0.1666 | ~90 | 100 |
| **25th** | 0.2154 | ~75 | 100 |
| **50th (Median)** | 0.2769 | ~50 | 100 |
| **75th** | 0.3658 | ~25 | 100 |
| **90th** | 0.4880 | ~10 | 100 |
| **99th** | 0.9562 | ~1 | 100 |
| **100th (Max)** | 12.1309 | ~0 | 100 |

**VARIATION CHECK:** GOOD - Housing burden ratios vary from 0.03 to 12.13 (381x range)

#### Housing Burden Distribution Buckets

| Range | Count | Percentage |
|-------|-------|------------|
| < 0.1 (Very Affordable) | 501 | 1.2% |
| 0.1 - 0.2 (Affordable) | 7,946 | 18.3% |
| 0.2 - 0.3 (Moderate) | 16,766 | 38.6% |
| 0.3 - 0.4 (Challenging) | 9,911 | 22.8% |
| 0.4 - 0.5 (Difficult) | 4,269 | 9.8% |
| 0.5 - 1.0 (Very Difficult) | 3,638 | 8.4% |
| > 1.0 (Extreme) | 376 | 0.9% |

**Finding:** Burden ratios show excellent variation and normal distribution, but scores don't reflect this.

#### Cost of Living Burden Ratio
- **Min:** 0.1831
- **Max:** 2.1060
- **Variation:** GOOD (11.5x range)

#### Tax Burden Ratio
- **Min:** 0.0000
- **Max:** 8.8000
- **Variation:** GOOD (infinite range due to zero-tax states)

---

### 4. Data Quality Breakdown

| Quality Status | Count | Percentage |
|---------------|-------|------------|
| **partial** | 42,409 | 97.7% |
| **complete** | 998 | 2.3% |

**Missing Component Analysis:**

| Component | Missing | Percentage |
|-----------|---------|------------|
| Quality of Life | 43,407 | 100.0% (expected) |
| Cost of Living | 42,409 | 97.7% (limited MIT data) |
| Housing | 0 | 0.0% |
| Tax | 0 | 0.0% |

---

### 5. Burden vs Score Examples

#### Best Housing Burdens (Should Have Highest Scores)

| Rank | City | State | Burden Ratio | Actual Score | Expected Score |
|------|------|-------|--------------|--------------|----------------|
| 1 | Edgewater | AL | 0.0318 | 100 | ~100 |
| 2 | Belfry | KY | 0.0354 | 100 | ~99 |
| 3 | (ZCTA 17935) | PA | 0.0426 | 100 | ~98 |
| 4 | Auxier | KY | 0.0448 | 100 | ~97 |
| 5 | Midwest | WY | 0.0451 | 100 | ~97 |

#### Worst Housing Burdens (Should Have Lowest Scores)

| Rank | City | State | Burden Ratio | Actual Score | Expected Score |
|------|------|-------|--------------|--------------|----------------|
| 1 | (ZCTA 67232) | KS | 12.1309 | 100 | ~0 |
| 2 | (ZCTA 76429) | TX | 11.6004 | 100 | ~1 |
| 3 | Heathsville | VA | 9.1754 | 100 | ~2 |
| 4 | Sagaponack | NY | 5.7335 | 100 | ~5 |
| 5 | (ZCTA 37376) | TN | 5.4480 | 100 | ~7 |

**Finding:** Cities with 381x difference in burden ratios all have the same score of 100.

---

## Root Cause Analysis

### The Bug

Located in `calculate_v2_scores.py`, lines 214-237 (housing), 316-343 (COL), and 444-492 (tax).

**Broken Query Pattern:**

```sql
WITH burden_calc AS (
    SELECT
        a."geoType",
        a."geoId",
        -- Calculate burden ratio for ALL geographies
        <burden_calculation> AS burden_ratio
    FROM affordability_snapshot a
    WHERE a."homeValue" IS NOT NULL
      AND a."medianIncome" IS NOT NULL
)
SELECT
    PERCENT_RANK() OVER (ORDER BY burden_ratio) * 100 AS percentile
FROM burden_calc
WHERE "geoType" = %s AND "geoId" = %s  -- ❌ FILTERS TO ONE ROW BEFORE PERCENT_RANK!
```

**Why This Breaks:**

1. The CTE `burden_calc` calculates burden ratios for all geographies ✓
2. The SELECT filters to ONE row using WHERE clause ❌
3. `PERCENT_RANK()` operates on the filtered result (1 row)
4. With only 1 row, `PERCENT_RANK()` always returns 0.0
5. Score = 100 - 0.0 = 100 for EVERY geography

### Correct Query Pattern

```sql
WITH burden_calc AS (
    SELECT
        a."geoType",
        a."geoId",
        <burden_calculation> AS burden_ratio,
        -- Calculate percentile INSIDE the CTE, across ALL rows
        PERCENT_RANK() OVER (ORDER BY burden_ratio) * 100 AS percentile
    FROM affordability_snapshot a
    WHERE a."homeValue" IS NOT NULL
      AND a."medianIncome" IS NOT NULL
)
SELECT percentile
FROM burden_calc
WHERE "geoType" = %s AND "geoId" = %s  -- ✓ Filter AFTER percentile calculation
```

**Why This Works:**

1. The CTE calculates burden ratios for all geographies ✓
2. `PERCENT_RANK()` operates on ALL rows in the CTE ✓
3. Each row gets its correct percentile rank (0-100) ✓
4. The WHERE clause then selects the ONE row we want ✓
5. Scores now range from ~0 to ~100 based on actual ranking ✓

---

## Impact Assessment

### Affected Functions

1. `calculate_housing_burden_score()` - Lines 214-237
2. `calculate_cost_of_living_score()` - Lines 316-343
3. `calculate_tax_burden_score()` - Lines 444-492

### Affected Data

- **All 43,407 V2 scores** in the database are incorrect
- **All component scores** (housing, COL, tax) are set to 100
- **All composite scores** are 100
- **Burden ratios ARE correct** (not affected by this bug)

### User Impact

- **City comparison is broken:** Users cannot differentiate affordable vs unaffordable cities
- **Rankings don't exist:** All cities tied at 100
- **Search/filter by score is useless:** No variation in results
- **Data appears valid but is meaningless:** Burden ratios are correct, scores are not

---

## Verification Test

To confirm the fix works, run this test query:

```sql
WITH burden_calc AS (
    SELECT
        a."geoType",
        a."geoId",
        ((a."homeValue" * 0.80 * (0.065 / 12) * POWER(1 + 0.065 / 12, 360)) /
         (POWER(1 + 0.065 / 12, 360) - 1) +
         (a."homeValue" * COALESCE(a."propertyTaxRate", 0.01) / 12)) /
        (a."medianIncome" / 12) AS burden_ratio,
        PERCENT_RANK() OVER (ORDER BY
            ((a."homeValue" * 0.80 * (0.065 / 12) * POWER(1 + 0.065 / 12, 360)) /
             (POWER(1 + 0.065 / 12, 360) - 1) +
             (a."homeValue" * COALESCE(a."propertyTaxRate", 0.01) / 12)) /
            (a."medianIncome" / 12)
        ) * 100 AS percentile
    FROM affordability_snapshot a
    WHERE a."homeValue" IS NOT NULL
      AND a."medianIncome" IS NOT NULL
      AND a."medianIncome" > 0
)
SELECT
    "geoType",
    "geoId",
    burden_ratio,
    percentile,
    100 - percentile AS expected_score
FROM burden_calc
ORDER BY burden_ratio
LIMIT 100;
```

**Expected Result:** Percentile should range from 0.00 to 0.02 for the first 100 rows.

**Current (Broken) Result:** Would show percentile = 0 for all if filtered first.

---

## Recommended Actions

### Immediate
1. ✅ **Fix SQL queries** in `calculate_v2_scores.py` (3 functions)
2. ⚠️ **Re-run score generation** for all 43,407 geographies
3. ⚠️ **Verify score distribution** (should range 0-100)

### Testing
1. Sample 100 geographies across percentile spectrum
2. Verify lowest burden → highest score
3. Verify highest burden → lowest score
4. Check composite score formula weights correctly

### Communication
1. Document the fix in commit message
2. Note that all previous V2 scores were incorrect
3. Provide migration/update path for any cached scores

---

## Analysis Scripts Generated

The following diagnostic scripts were created during this investigation:

1. **`analyze_v2_scores.js`** - Comprehensive score distribution analysis
2. **`detailed_burden_analysis.js`** - Burden ratio percentile breakdown
3. **`test_percentile_query.js`** - Percentile calculation verification

These can be re-run after the fix to confirm proper score distribution.

---

## Conclusion

The V2 scoring system has a critical SQL bug where window functions calculate percentiles on filtered results (1 row) instead of the full dataset. This causes all scores to be 100. The burden ratio calculations are working correctly, so fixing the three SQL queries will immediately resolve the issue. After the fix, scores should distribute normally from 0-100, with most cities clustered around the 40-60 range (typical of normally distributed data).

**Status:** Bug identified, fix location pinpointed, verification tests ready.
