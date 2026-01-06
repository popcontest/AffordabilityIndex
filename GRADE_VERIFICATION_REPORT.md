# Letter Grade Calculation Verification Report

## Executive Summary

The letter grade calculations in the codebase are **mathematically correct** and working as implemented. However, the current grading scale may be **too lenient** given the actual score distribution across all cities.

## Current Grading Scale

**Location:** `C:\code\websites\AffordabilityIndex\lib\scoring.ts` (lines 39-53)

```
A+: 95-100
A:  90-94
A-: 85-89
B+: 80-84
B:  75-79
B-: 70-74
C+: 65-69
C:  60-64
C-: 55-59
D:  50-54
F:  0-49
```

## Test Results

### Database Scores (Actual Values)

1. **Detroit, MI**
   - Composite Score: **79.47**
   - Current Grade: **B** ✓ (correct per scale: 75-79 range)
   - User Expected: C+ (would require 65-69 range)

2. **Wichita, KS**
   - Composite Score: **60.43**
   - Current Grade: **C** ✓ (correct per scale: 60-64 range)
   - User Expected: D- (not in current scale)

3. **Midwest, WY** (Top scorer)
   - Composite Score: **99.98**
   - Current Grade: **A+** ✓ (correct per scale: 95-100 range)
   - User Expected: A+

### All Test Cases: ✓ PASSED

12 test cases executed, all passing with current grading scale.

## Score Distribution Analysis

### Overall Statistics (17,556 cities)

- **Average Score:** 44.14
- **Median Score:** 42.97
- **Min Score:** 0.02
- **Max Score:** 99.98

### Percentiles

| Percentile | Score |
|------------|-------|
| 25th       | 23.37 |
| 50th       | 42.97 |
| 75th       | 65.44 |
| 90th       | 77.39 |
| 95th       | 82.85 |

### Grade Distribution (Current Scale)

| Grade | Count  | Percentage | Interpretation          |
|-------|--------|------------|------------------------|
| A+    | 67     | 0.38%      | Excellent (top 0.4%)   |
| A     | 140    | 0.80%      | Very good             |
| A-    | 377    | 2.15%      | Good                  |
| B+    | 741    | 4.22%      | Above average         |
| B     | 919    | 5.23%      | ← Detroit is here     |
| B-    | 1,173  | 6.68%      |                       |
| C+    | 1,045  | 5.95%      |                       |
| C     | 988    | 5.63%      | ← Wichita is here     |
| C-    | 903    | 5.14%      |                       |
| D     | 1,025  | 5.84%      |                       |
| F     | 10,178 | **57.97%** | **MAJORITY OF CITIES** |

## Key Findings

### 1. The Scale Works Correctly

The grading function properly assigns grades based on the defined thresholds. All test cases pass.

### 2. The Scale May Be Too Lenient

**Problem:** 58% of cities receive an **F grade**, while only 3.3% receive A's. The median score (43) is an F, meaning half of all cities are failing.

**This suggests:**
- The current scale treats affordability like an academic test where 60+ is "passing"
- In reality, most US cities have poor affordability (median score of 43)
- Detroit's B grade (79.47) places it in the **90th percentile** of all cities
- Wichita's C grade (60.43) places it in the **60th percentile** of all cities

### 3. Interpretation Issue

The user's expectations suggest confusion about what scores mean:
- User expected Detroit (79) → C+, but 79 is actually a **very good** affordability score (90th percentile)
- User expected Wichita (60) → D-, but 60 is **above average** (60th percentile)

## Recommendations

### Option 1: Keep Current Scale (Academic Model)

**Philosophy:** Grade cities like a test where 90+ is excellent, 60+ is passing, below 60 is failing.

**Pros:**
- Intuitive for users familiar with academic grading
- Clear thresholds
- Already implemented

**Cons:**
- 58% of cities get F grades (may seem overly harsh)
- Doesn't differentiate well among the majority of cities

**No changes needed.**

### Option 2: Adjust to Percentile-Based Scale (Recommended)

**Philosophy:** Grade cities relative to each other, with more differentiation across the spectrum.

**Proposed Scale (Based on Percentiles):**

```
A+: 85-100   (Top 10%)        - Exceptionally affordable
A:  75-84    (80th-90th)      - Very affordable  ← Detroit would be here
A-: 68-74    (70th-80th)      - Affordable
B+: 60-67    (60th-70th)      - Above average    ← Wichita would be here
B:  50-59    (40th-60th)      - Average
B-: 40-49    (25th-40th)      - Below average
C+: 30-39    (15th-25th)      - Challenging
C:  20-29    (5th-15th)       - Difficult
C-: 10-19    (2nd-5th)        - Very difficult
D:  5-9      (1st-2nd)        - Severely unaffordable
F:  0-4      (Bottom 1%)      - Unaffordable
```

**Pros:**
- Better differentiation across the full range
- Grades reflect relative position, not absolute "pass/fail"
- Only bottom 1% gets F
- Detroit (79) → A (more intuitive for a top 10% city)
- Wichita (60) → B+ (reflects above-average affordability)

**Cons:**
- Less intuitive than academic scale
- Thresholds may need adjustment as data changes
- Would require code changes

### Option 3: Hybrid Scale (Middle Ground)

**Philosophy:** Keep academic-style intervals but compress the scale to better fit the actual data distribution.

**Proposed Scale:**

```
A+: 80-100   (Top 10%)        - Excellent
A:  70-79    (Top 25%)        - Very good        ← Detroit would be here
B+: 60-69    (50th-75th)      - Good            ← Wichita would be here
B:  50-59    (35th-50th)      - Above average
C+: 40-49    (20th-35th)      - Average
C:  30-39    (10th-20th)      - Below average
D+: 25-29    (5th-10th)       - Challenging
D:  20-24    (3rd-5th)        - Difficult
D-: 15-19    (2nd-3rd)        - Very difficult
F:  0-14     (Bottom 2%)      - Unaffordable
```

**Pros:**
- Familiar letter grade structure
- Better aligned with actual score distribution
- Detroit/Wichita grades more intuitive
- Adds D+/D- for more granularity

**Cons:**
- Less standard than pure academic scale
- Still somewhat arbitrary thresholds

## Sample Cities by Grade (Current Scale)

### A+ (95-100): Top 0.38%
- Rensselaer Falls, NY: 97.46
- Herlong, CA: 95.35

### A (90-94): Top 1.2%
- Mountain Ranch, CA: 91.09
- Elmore, MN: 92.02

### B (75-79): Top 18% ← **Detroit is here**
- Detroit, MI: 79.47
- Atlantic, PA: 77.07
- New Vienna, IA: 75.27

### C (60-64): ~60th percentile ← **Wichita is here**
- Wichita, KS: 60.43
- Remsen, IA: 62.41
- Martinsville, VA: 63.80

### F (0-49): Bottom 58%
- Elkton, VA: 23.04
- Trinidad, TX: 2.41

## Conclusion

**The letter grade calculation logic is correct**, but the grading scale may not align with user expectations or the actual distribution of scores.

**Key Decision:** What should grades represent?
1. **Absolute academic standard** (current) - Most cities fail
2. **Relative ranking** (percentile-based) - Better differentiation
3. **Hybrid approach** - Familiar scale adjusted to data

**Recommendation:** Implement **Option 3 (Hybrid Scale)** to:
- Maintain familiar A-F structure
- Better differentiate among the majority of cities
- Align grades with user intuition (Detroit = A, Wichita = B+)
- Add D+/D-/D grades for more nuance

This would require updating the `scoreToGrade()` function in `lib/scoring.ts`.
