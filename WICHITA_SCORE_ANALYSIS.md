# Wichita, Kansas - Affordability Score Analysis

## Executive Summary

**ISSUE CONFIRMED**: The V2 affordability scores for Wichita, Kansas contain a mathematical error. The composite score stored in the database (68.2) is incorrect and does not match the weighted calculation from its component scores.

## Database Values (Current/Stored)

From table `v2_affordability_score` for Wichita, KS (cityId: 7929):

- **Housing Score**: 68.22
- **COL Score**: NULL (not available)
- **Tax Score**: 21.13
- **QOL Score**: NULL (not available)
- **Composite Score**: 68.22 ⚠️
- **Data Quality**: "complete"

## V1 Score Verification

From table `affordability_snapshot`:

- **Home Value**: $196,196.55
- **Median Income**: $63,072
- **Simple Ratio**: 3.11
- **Calculated Ratio**: 3.11 ✓

**V1 Score is CORRECT** - The simple ratio calculation matches perfectly.

## The Problem: Incorrect V2 Composite Score

### Expected Calculation

According to `calculate_v2_scores.py`, when only 2 components are available, the weights should be normalized:

**Original Weights**:
- Housing: 40%
- COL: 30% (unavailable)
- Tax: 20%
- QOL: 10% (unavailable)

**Normalized Weights** (only Housing and Tax available):
- Housing: 40 / (40+20) = 66.67%
- Tax: 20 / (40+20) = 33.33%

**Expected Composite Calculation**:
```
Composite = (68.22 × 0.6667) + (21.13 × 0.3333)
          = 45.48 + 7.04
          = 52.52
```

### What's Actually Stored

The database shows:
- **Composite Score**: 68.22

This is **identical to the housing score**, suggesting the composite calculation either:
1. Failed and defaulted to housing score only, OR
2. Was calculated with incorrect weight normalization, OR
3. The data is stale and was calculated with old logic

## Fresh Calculation Results

When running the current `calculate_v2_scores.py` code on Wichita today:

- **Calculated Housing Score**: 71.63
- **Calculated Tax Score**: 22.23
- **Calculated Composite**: 55.17

This reveals that:
1. The stored scores are **stale/outdated**
2. The housing burden has changed (71.63 vs 68.22)
3. The tax burden has changed (22.23 vs 21.13)
4. The current code **DOES** calculate the composite correctly (55.17 ≈ 71.63 × 0.67 + 22.23 × 0.33)

## Root Cause

The database contains **stale V2 scores** that were calculated with either:
- Old/incorrect composite calculation logic that didn't normalize weights properly
- A bug in an earlier version of the scoring script
- Different underlying data that has since been updated

The current code in `calculate_v2_scores.py` **is mathematically correct** and properly normalizes weights when components are missing.

## Impact on UI

The screenshot shows:
- **Overall Affordability**: B- 74
- **Housing Affordability**: 74 (60% weight)
- **V2 Composite Score**: 68/100
- **V2 Housing Component**: 68
- **V2 Taxes Component**: 21

These values are displaying the **stale database data** directly without recalculation.

## Recommendations

### Immediate Fix
1. **Re-run the V2 score generation** for all cities using the current `generate_v2_scores.py` script
2. This will update all stale scores with correctly weighted composites

### Command
```bash
export DATABASE_URL="your-database-url"
python generate_v2_scores.py
```

### Expected Results After Fix
For Wichita, KS:
- **Housing Score**: ~71.6
- **Tax Score**: ~22.2
- **Composite Score**: ~55.2 (not 68.2)

### Long-term Improvements
1. Add automated tests that verify composite = weighted average of components
2. Add database constraints or triggers to validate composite scores on insert/update
3. Consider adding a `calculated_at` timestamp comparison to flag stale scores
4. Add versioning to the V2 score calculation to track methodology changes

## Files Analyzed

- `C:\code\websites\AffordabilityIndex\prisma\schema.prisma` - Database schema
- `C:\code\websites\AffordabilityIndex\calculate_v2_scores.py` - Score calculation logic (CORRECT)
- `C:\code\websites\AffordabilityIndex\generate_v2_scores.py` - Batch generation script
- `C:\code\websites\AffordabilityIndex\lib\v2-scores.ts` - TypeScript data layer
- `C:\code\websites\AffordabilityIndex\components\V2ScoreCard.tsx` - UI component

## Verification Scripts Created

Three analysis scripts were created during this investigation:

1. **`verify_wichita_scores.py`** - Queries database for Wichita's scores and cost basket data
2. **`verify_composite_calculation.py`** - Mathematical verification of weight normalization
3. **`debug_wichita_composite.py`** - Fresh calculation using current code vs database comparison

All scripts confirmed the discrepancy.

---

**Analysis Date**: 2026-01-04
**Database**: PostgreSQL (Supabase)
**City**: Wichita, Kansas (cityId: 7929)
