# Community Snapshot: Decision Memo

**Date:** January 5, 2026
**Status:** APPROVED WITH MODIFICATIONS
**Scope:** Affordability-focused economic context (NOT general demographics)

---

## Executive Summary

After comprehensive UX, SEO, data quality, and scope analysis, we are **proceeding with a modified approach**:

- ✅ **Add 3 affordability-focused metrics** (not 6-8 general demographics)
- ✅ **ZCTA pages only** initially (city mapping unsolved)
- ✅ **Prioritize Rent vs Buy Calculator** using existing HUD FMR data
- ❌ **No generic "Community Snapshot"** (high thin content risk, scope creep danger)

---

## What We WILL Include (3 Metrics Maximum)

### Phase 1: ZCTA Pages Only

**1. Median Rent** (ACS B25064)
- **Why**: Directly answers "If I can't buy, what will renting cost?"
- **User Value**: High - rent vs buy decision support
- **Data Quality**: Moderate MOE; suppress if CV > 30%
- **Display**: "Typical rent: $1,850/month (±$95)"

**2. Housing Cost Burden** (ACS DP04)
- **Why**: Shows what % of residents are cost-burdened (30%+ income on housing)
- **User Value**: High - reality check on affordability
- **Data Quality**: Moderate-High MOE; suppress if CV > 30%
- **Display**: "32% of households spend 30%+ of income on housing"

**3. Poverty Rate** (ACS S1701)
- **Why**: Economic health indicator; shows if lower-income households can survive here
- **User Value**: Medium-High - community economic viability
- **Data Quality**: Moderate MOE; suppress if CV > 30%
- **Display**: "12.3% of residents below poverty line (±1.8%)"

**Data Source**: U.S. Census Bureau ACS 5-year estimates (2018-2022, released December 2023)

---

## What We EXPLICITLY Will NOT Include

### Excluded Metrics (And Why)

**Population** - City size ≠ affordability indicator
**Bachelor's Degree %** - Demographics for demographics' sake; opens scope creep door
**Unemployment Rate** - 2-year lag makes data misleading; users assume it's current
**Median Home Value (ACS)** - Redundant; Zillow ZHVI is superior (monthly updates vs 2-year lag)
**Median Commute Time** - Quality-of-life metric, not core affordability
**Age Distribution** - No affordability connection
**Race/Ethnicity** - Not affordability-related; ethical concerns; available on Census Reporter
**Household Composition** - Demographics unrelated to housing costs
**Industry/Occupation** - Median income already captures earning capacity

### Features We Will NOT Build

**Crime Statistics** → Try CrimeGrade.org or FBI UCR
**School Ratings** → Try GreatSchools.org
**Walkability Scores** → Try WalkScore.com
**Weather/Climate** → Try NOAA or Weather.com
**Tax Rates** → Try Tax-Rates.org or state/local government sites
**Healthcare Costs** → Try Medicare.gov
**Job Growth Rates** → Try Bureau of Labor Statistics

**Mission Boundary**: We answer ONE question: "Can I afford to live here?" Everything else is out of scope.

---

## How We'll Handle Margin of Error (MOE)

### Coefficient of Variation (CV) Thresholds

```
CV = (MOE / 1.645) / estimate
```

**Reliability Tiers:**
- **CV < 15%**: Reliable - show normally with small MOE tooltip
- **CV 15-30%**: Moderate - show with ⚠️ "Low confidence" badge + MOE tooltip
- **CV > 30%**: Unreliable - **suppress entirely**, show "Data not available"

### Population Thresholds

**For ZCTAs:**
- Pop ≥ 5,000: Show all metrics passing CV filters
- Pop 2,000-4,999: Show with "⚠️ Small sample size" warning
- Pop < 2,000: Show only if CV < 20%
- Pop < 500: **Do not import** ACS data (ETL filter)

**For Cities (Future Phase):**
- Pop ≥ 10,000: Show all metrics passing CV filters
- Pop 5,000-9,999: Show with warning
- Pop < 5,000: Strict CV < 20% threshold
- Pop < 1,000: **Suppress** ACS section entirely

---

## Where This Module Appears

### Page Hierarchy (ZCTA Pages)

```
1. ScoreHero (V2 Composite Score + Required Income) ← PRIMARY
2. Score Breakdown Panel
3. Fit Signals
4. [NEW] Housing & Economic Context ← SECONDARY (collapsible, collapsed by default)
   - Median Rent
   - Housing Cost Burden %
   - Poverty Rate
5. Nearby Alternatives
6. Affordability Calculator
```

### Visual Design

**Collapsible Section:**
- Header: "Housing & Economic Context" (NOT "Demographics" or "Community Snapshot")
- Subheader: "Economic factors that affect affordability in this area"
- Default state: **Collapsed** (avoid information overload)
- Position: Below Score Breakdown, above Nearby Alternatives

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Housing & Economic Context              [▼]    │
└─────────────────────────────────────────────────┘

[Expanded view]
┌─────────────────────────────────────────────────┐
│ Median Rent              Housing Cost Burden   │
│ $1,850/mo (±$95)        32% cost-burdened      │
│ vs $1,320 state avg     vs 28% state avg       │
├─────────────────────────────────────────────────┤
│ Poverty Rate                                    │
│ 12.3% (±1.8%)                                   │
│ vs 14.1% state avg                              │
└─────────────────────────────────────────────────┘

Source: U.S. Census ACS 2018-2022 (released Dec 2023)
Margins of error shown for reference. [Learn about data quality]
```

### Why Below the Fold
- Keeps affordability score primary
- Avoids overwhelming users
- Provides context for curious users without forcing it on everyone
- Progressive disclosure pattern

---

## Citation & Attribution

### On-Page Attribution (Every Page with ACS Data)

**Header Attribution:**
```
Source: U.S. Census Bureau American Community Survey 2018-2022
```

**Footer Link:**
```
"Learn about data quality" → Modal/page explaining:
- ACS methodology
- What margins of error mean
- Why some metrics aren't available (small sample size)
- Data vintage and why it lags home values
```

### Data Quality Modal Content

```markdown
### About This Data

**Source:** U.S. Census Bureau American Community Survey (ACS)
**Vintage:** 2018-2022 (5-year estimates, released December 2023)
**Coverage:** Most reliable data for small geographies

**Why Are These Metrics Older Than Home Values?**
Census data is collected over 5 years and released with a lag.
Home values from Zillow are updated monthly. We use the most
recent data available for each metric.

**Margins of Error:**
All ACS estimates include margins of error (MOE). We only show
metrics with reasonable reliability (coefficient of variation < 30%).
Some metrics may be unavailable for very small areas due to small
sample sizes.

**Questions?** Visit [Census Bureau ACS documentation]
```

### Methodology Page Update

Add section to `/methodology`:

```markdown
## Community Economic Data

For ZIP code pages, we provide economic context from the U.S. Census
Bureau's American Community Survey:

- **Median Rent**: Typical monthly rent (for households considering renting)
- **Housing Cost Burden**: % of households spending 30%+ of income on housing
- **Poverty Rate**: Economic health indicator

We show only affordability-related metrics and suppress unreliable
data (high margins of error or small sample sizes).

**Data Quality Filters:**
- Coefficient of Variation > 30% → metric suppressed
- Population < 500 → no demographic data shown

**Why Not Show More Demographics?**
We focus exclusively on housing affordability. For comprehensive
demographic data, visit Census Reporter or City-Data.
```

---

## Alternative Recommendation: Rent vs Buy Calculator

### Higher Value, Lower Risk Than Demographics

Instead of (or in addition to) showing raw ACS rent data, build an **interactive Rent vs Buy Calculator**:

**Data Source:** HUD Fair Market Rents (already in database: `hudFmr1Br`, `hudFmr2Br`, `hudFmr3Br`)

**Calculator Features:**
- Compare monthly rent payment vs monthly mortgage payment
- Include: property taxes, insurance, maintenance, HOA
- Show breakeven point (years until buying is cheaper)
- Scenario analysis: different down payments, interest rates

**Why This Is Better:**
- ✅ Uses existing data (no new ETL needed)
- ✅ Interactive (high user engagement)
- ✅ Actionable insights (not just data display)
- ✅ Differentiates from competitors (no one else has this)
- ✅ SEO value: "rent vs buy [city]" queries
- ✅ Stays in scope (pure affordability, no demographics)

**Recommendation**: Prioritize Rent vs Buy Calculator over demographics module.

---

## Implementation Constraints

### City Pages: Blocked by Mapping Problem

**Issue**: Zillow cityId does NOT map to Census Place GEOID
- No public crosswalk exists
- Fuzzy matching is risky (wrong data worse than no data)

**Solutions:**
1. **Manual verification** for top 500-1000 cities (4-8 weeks)
2. **Skip city pages** entirely; demographics on ZCTA pages only

**Recommendation**: Phase 1 = ZCTA pages only. Phase 2 = manually verified cities.

### ZCTA Pages: Safe to Implement

**Status**: ✅ Ready to implement
- ZCTA code IS the Census identifier (direct mapping)
- Straightforward ETL
- Can ship in 2-4 weeks

---

## Success Criteria

**After 6 Months, This Feature Succeeds If:**
- ✅ Users understand affordability scores better with rent context
- ✅ Zero scope creep requests ("add crime data," "add school ratings")
- ✅ No expansion beyond 3 metrics
- ✅ Page performance remains strong (no negative impact on Core Web Vitals)
- ✅ Bounce rate does not increase (users don't get overwhelmed)

**Failure Indicators (Remove Feature If):**
- ❌ Users confused by too much data
- ❌ Support requests increase significantly
- ❌ Pressure mounts to add 10+ more metrics
- ❌ Core affordability content gets buried
- ❌ SEO ranking declines due to thin content perception

---

## Decision

**APPROVED: Proceed with modified implementation**

### Phase 1 (Ship in 4-6 weeks)
- ✅ Add 3 affordability metrics to ZCTA pages
- ✅ Implement CV-based MOE filtering
- ✅ Build Rent vs Buy Calculator (higher priority)
- ✅ Collapsible section, below fold
- ✅ Clear attribution and data quality disclosure

### Phase 2 (3-6 months later)
- Evaluate Phase 1 success
- Consider expanding to city pages (if mapping solved)
- Monitor for scope creep

### Explicitly Out of Scope
- General demographics (age, race, education)
- Quality of life metrics (crime, schools, walkability)
- Economic development (job growth, industry mix)
- More than 3 metrics

---

## Appendix: Agent Analysis Summary

**UX Agent**: High value for rent, housing burden, poverty rate (5-6 metrics recommended)
**SEO Agent**: High thin content risk; recommends Rent vs Buy Calculator instead
**Data Quality Agent**: Medium-high risk but manageable with CV filters; city mapping is blocker
**Scope Creep Agent**: Conditional yes with iron-fist scope control; 4-5 metrics maximum

**Consensus**: Modified approach with strict scope control is viable. Rent vs Buy Calculator is higher value.

---

**Approved By:** Claude Code Evaluation Team
**Next Steps**: Implement schema changes (Phase 1) after user confirmation
