# Affordability Index v2.0: Data Collection & Scoring Methodology

**Date:** 2025-12-26
**Status:** Planning Phase
**Current MIT Living Wage Import:** 26% complete (850/3,221 counties)

---

## 1. PROPERTY TAX IMPORT STATUS ❌

### Current State: FAILING

All property tax background processes are **failing or returning 0 data**:

| Process | Status | Issue |
|---------|--------|-------|
| 269489  | Completed | 0 cities with data (missing API key) |
| 980321  | Completed | 0 cities with data (missing API key) |
| 6c7c4a  | Completed | 9000+ cities processed, 0 with data |
| e7c0ee  | Failed | SQL error: `column ms.geoid does not exist` (case sensitivity) |

### Root Causes Identified

1. **Missing API_NINJAS_KEY** (import_property_tax.py:101)
   - Script runs but fetches 0 data without API key
   - Free API key available at: https://api-ninjas.com/api/propertytax

2. **SQL Case Sensitivity Bug** (import_property_tax.py:101)
   ```sql
   -- BROKEN:
   INNER JOIN metric_snapshot ms ON ms.geoid = gc.cityId

   -- CORRECT:
   INNER JOIN metric_snapshot ms ON ms."geoId" = gc."cityId"
   ```

3. **Alternative Data Source Available**
   - `import_tax_foundation_property_tax.py` exists
   - Uses Tax Foundation county-level CSV data
   - Applies county rates to all cities in county
   - **NOT YET RUN**

### Recommended Fix

**Option A: Fix API Ninjas Import** (Best for granular data)
1. Get free API key from API Ninjas
2. Fix SQL case sensitivity bug in import_property_tax.py:101
3. Run with API key: `API_NINJAS_KEY=xxx python import_property_tax.py`

**Option B: Use Tax Foundation Data** (Faster, county-level only)
1. Download Tax Foundation CSV
2. Run: `python import_tax_foundation_property_tax.py`
3. This gives county-level rates for all cities in ~3,000 counties

**Recommendation:** Do BOTH
- Start with Tax Foundation (fast, covers all counties)
- Then layer in API Ninjas data (more granular city-level rates)

---

## 2. DATA COLLECTION ROADMAP 📊

### Currently Available Data ✅

| Data Type | Coverage | Source | Status |
|-----------|----------|--------|--------|
| Home Values | 21,459 cities, 26,299 ZIPs | Zillow ZHVI | ✅ Complete |
| Median Income | Same coverage | Census ACS | ✅ Complete |
| Cost of Living | 850/3,221 counties (26%) | MIT Living Wage | 🔄 In Progress |
| Income Tax Rates | All 50 states + DC + 8 cities | Tax Foundation | ✅ Script Ready |
| Property Tax | 0 coverage | API Ninjas / Tax Foundation | ❌ Broken |

### Missing Critical Data 🔴

#### TIER 1: Essential for V2 Affordability Score

1. **Property Tax Rates** - PRIORITY 1
   - **Why:** 1-3% of home value annually; massive affordability impact
   - **Source:** API Ninjas (city-level) + Tax Foundation (county-level)
   - **Effort:** 2 hours (fix bugs + run imports)
   - **Action:** Fix SQL bug, get API key, run both importers

2. **Sales Tax Rates** - PRIORITY 2
   - **Why:** Affects purchasing power (5-10% on goods)
   - **Source:** Tax Foundation, API Ninjas
   - **Effort:** 4 hours (new script)
   - **Coverage:** State + local combined rates

3. **Mortgage Rates** - PRIORITY 3
   - **Why:** 3% vs 6% changes monthly payment by 40%+
   - **Source:** Freddie Mac Primary Mortgage Market Survey
   - **Effort:** 2 hours (API integration)
   - **Update:** Weekly

#### TIER 2: Quality of Life Context

4. **School Quality Ratings**
   - **Source:** GreatSchools API (paid) OR NCES (free)
   - **Effort:** 8 hours
   - **Value:** High cost may be justified by great schools

5. **Crime Rates**
   - **Source:** FBI UCR (Uniform Crime Reporting)
   - **Effort:** 6 hours
   - **Value:** Safety is critical to affordability perception

6. **Walk Score / Transit Score**
   - **Source:** Walk Score API (paid)
   - **Effort:** 3 hours
   - **Value:** Car ownership costs $10k/year

7. **Climate/Weather Data**
   - **Source:** NOAA API (free)
   - **Effort:** 5 hours
   - **Metrics:** Avg temp, precipitation, snow days, extreme weather

#### TIER 3: Enhanced Metrics

8. **Unemployment Rate**
   - **Source:** Bureau of Labor Statistics
   - **Effort:** 3 hours
   - **Value:** Job availability affects affordability

9. **Commute Times**
   - **Source:** Census Transportation Planning
   - **Effort:** 4 hours
   - **Value:** Long commutes = hidden costs (gas, time)

10. **Rent Data**
    - **Source:** Zillow ZORI (rent index)
    - **Effort:** 2 hours (similar to ZHVI import)
    - **Value:** Rent vs buy comparison

11. **Home Insurance Costs**
    - **Source:** Quadrant Information Services API
    - **Effort:** 8 hours
    - **Value:** Varies 2-10x by region (hurricanes, floods)

12. **Utilities Cost**
    - **Source:** EIA (Energy Information Administration)
    - **Effort:** 6 hours
    - **Value:** $100-300/mo variation by state

### Data Collection Priority Matrix

```
High Impact + Low Effort (DO FIRST):
├─ Property Tax Rates (fix bugs, 2 hrs)
├─ Mortgage Rates (API, 2 hours)
└─ Rent Data (Zillow, 2 hours)

High Impact + Medium Effort (NEXT):
├─ Sales Tax Rates (4 hours)
├─ School Quality (8 hours)
└─ Crime Rates (6 hours)

High Impact + High Effort (BACKLOG):
├─ Walk Score (requires paid API)
├─ Home Insurance (complex data)
└─ Utilities (state-level only)

Low Impact (SKIP FOR NOW):
└─ HOA Fees (too variable, hard to source)
```

---

## 3. V2 AFFORDABILITY SCORING METHODOLOGY 🎯

### Current V1 Scoring (Too Simple)

```
Affordability Ratio = Home Value / Median Household Income
```

**Problems:**
- Ignores all ongoing costs (property tax, insurance, etc.)
- No household type customization
- Doesn't account for mortgage rates
- Missing quality-of-life context

### Proposed V2 Scoring Framework

#### Component 1: **Housing Burden Score** (0-100)
Measures monthly housing cost as % of income

```typescript
interface HousingBurden {
  monthlyMortgage: number;      // Principal + interest
  propertyTax: number;           // Annual / 12
  homeInsurance: number;         // Est. based on home value & region
  hoaFees: number;               // Optional, default 0
  utilities: number;             // State average

  totalMonthlyHousing: number;
  monthlyIncome: number;
  housingBurdenRatio: number;   // total / income

  score: number;                 // 100 - (ratio * 100)
                                 // 100 = 0% of income
                                 // 0 = 100%+ of income
}
```

**Calculation:**
```
score = 100 - min(housingBurdenRatio * 100, 100)

Examples:
- 20% of income → score = 80 (excellent)
- 30% of income → score = 70 (good)
- 50% of income → score = 50 (poor)
- 100%+ of income → score = 0 (impossible)
```

**Data Requirements:**
- ✅ Home Value (have)
- ✅ Median Income (have)
- ❌ Property Tax Rate (need to fix)
- ❌ Mortgage Rate (need to add)
- ❌ Insurance Estimate (need to add)
- ❌ Utilities (state avg, need to add)

#### Component 2: **Cost of Living Score** (0-100)
Measures non-housing expenses relative to income

```typescript
interface CostOfLiving {
  monthlyIncome: number;
  monthlyHousingCost: number;
  monthlyNonHousingCosts: {
    food: number;              // MIT Living Wage / 12
    healthcare: number;         // MIT Living Wage / 12
    transportation: number;     // MIT Living Wage / 12
    other: number;              // MIT Living Wage / 12
  };

  totalMonthlyNonHousing: number;
  remainingAfterHousing: number;
  nonHousingBurdenRatio: number;

  score: number;
}
```

**Calculation:**
```
remainingAfterHousing = monthlyIncome - monthlyHousingCost
nonHousingBurdenRatio = totalMonthlyNonHousing / remainingAfterHousing

score = 100 - min(nonHousingBurdenRatio * 100, 100)

Examples:
- 60% of remaining income → score = 40 (tight)
- 80% of remaining income → score = 20 (very tight)
- 120%+ of remaining income → score = 0 (underwater)
```

**Data Requirements:**
- ✅ MIT Living Wage (26% complete, finishing today)
- ✅ Household type support (8 types in MIT data)

#### Component 3: **Tax Burden Score** (0-100)
Measures state + local tax impact

```typescript
interface TaxBurden {
  grossIncome: number;
  incomeTaxRate: number;        // State + local
  salesTaxRate: number;          // Combined rate
  propertyTaxRate: number;       // Already in Component 1

  effectiveTaxRate: number;      // Weighted average
  score: number;
}
```

**Calculation:**
```
effectiveTaxRate = (
  incomeTaxRate * 0.5 +          // 50% weight
  salesTaxRate * 0.3 +           // 30% weight
  propertyTaxRate * 0.2          // 20% weight (already in housing)
)

score = 100 - (effectiveTaxRate * 10)

Examples:
- 5% effective → score = 50
- 10% effective → score = 0
- 0% effective (TX, FL) → score = 100
```

**Data Requirements:**
- ✅ Income Tax (script ready, not run yet)
- ❌ Sales Tax (need to add)
- ❌ Property Tax (need to fix)

#### Component 4: **Quality of Life Adjustment** (-20 to +20)
Bonus/penalty for exceptional quality or poor conditions

```typescript
interface QualityOfLife {
  schools: number;        // -10 to +10 (GreatSchools rating normalized)
  crime: number;          // -10 to +10 (FBI UCR, inverted)
  climate: number;        // -5 to +5 (subjective: extreme weather penalty)
  walkability: number;    // 0 to +5 (Walk Score → car cost savings)
  unemployment: number;   // -5 to 0 (high unemployment = penalty)

  totalAdjustment: number;
}
```

**Data Requirements:**
- ❌ School Ratings (TIER 2)
- ❌ Crime Data (TIER 2)
- ❌ Climate (TIER 3)
- ❌ Walk Score (TIER 3, paid)
- ❌ Unemployment (TIER 3)

### Final V2 Composite Score

```typescript
interface AffordabilityScoreV2 {
  housingBurdenScore: number;      // 0-100 (40% weight)
  costOfLivingScore: number;       // 0-100 (30% weight)
  taxBurdenScore: number;          // 0-100 (20% weight)
  qualityOfLifeAdjustment: number; // -20 to +20 (10% weight)

  compositeScore: number;          // 0-100
  grade: string;                   // A+ to F
}
```

**Formula:**
```
compositeScore = (
  housingBurdenScore * 0.40 +
  costOfLivingScore * 0.30 +
  taxBurdenScore * 0.20 +
  baseScore * 0.10   // where baseScore = 50 + qualityOfLifeAdjustment
)

Grades:
- 90-100: A+ (Extremely Affordable)
- 80-89:  A  (Very Affordable)
- 70-79:  B  (Affordable)
- 60-69:  C  (Moderately Affordable)
- 50-59:  D  (Challenging)
- 0-49:   F  (Unaffordable)
```

### Household Type Customization

V2 supports 8 household types (from MIT Living Wage data):
- `1_adult_0_kids`
- `1_adult_1_kid`
- `1_adult_2_kids`
- `1_adult_3_kids`
- `2_adults_0_kids`
- `2_adults_1_kid`
- `2_adults_2_kids`
- `2_adults_3_kids`

**Why This Matters:**
- A single adult and a family of 4 have VASTLY different costs
- Childcare alone can be $15k-30k/year
- Healthcare costs scale with household size
- Food, transportation, housing needs all increase

**Example Comparison (Same City):**
```
Austin, TX - $400k home, $85k income

1 Adult, 0 Kids:
├─ Monthly Costs: $3,500
├─ Housing Burden: 30% → Score: 70
└─ Final Score: 75 (B - Affordable)

2 Adults, 2 Kids:
├─ Monthly Costs: $6,200 (childcare!)
├─ Housing Burden: 52% → Score: 48
└─ Final Score: 52 (D - Challenging)
```

---

## 4. IMPLEMENTATION ROADMAP 🗺️

### Phase 1: Core Data (Week 1)
**Goal:** Fix critical data imports, enable V2 score calculation

- [ ] Fix property tax SQL bug (30 min)
- [ ] Get API_NINJAS_KEY and run property tax import (1 hour)
- [ ] Run Tax Foundation property tax import (1 hour)
- [ ] Run income tax import (30 min)
- [ ] Add mortgage rate fetcher (Freddie Mac API, 2 hours)
- [ ] Wait for MIT Living Wage to complete (74% remaining, ~1 hour)
- [ ] Create V2 score calculation function (4 hours)
- [ ] Test V2 scores on 100 cities (2 hours)

**Deliverable:** V2 affordability scores for all cities with household customization

### Phase 2: Tax Data (Week 2)
**Goal:** Complete tax picture

- [ ] Add sales tax rate import (Tax Foundation, 4 hours)
- [ ] Update V2 scoring to include sales tax (1 hour)
- [ ] Add tax burden component to UI (2 hours)

**Deliverable:** Full tax burden analysis per city

### Phase 3: Quality of Life (Week 3-4)
**Goal:** Add context to raw affordability numbers

- [ ] Import school ratings (8 hours)
- [ ] Import crime data (6 hours)
- [ ] Add quality-of-life adjustment to scores (3 hours)
- [ ] Create "Best Value" ranking (combines affordability + quality) (4 hours)

**Deliverable:** Contextualized affordability (cheap but dangerous ≠ affordable)

### Phase 4: Enhanced Metrics (Month 2)
**Goal:** Comprehensive cost picture

- [ ] Add rent data import (Zillow ZORI, 2 hours)
- [ ] Add utilities cost estimates (state-level, 6 hours)
- [ ] Add unemployment rates (3 hours)
- [ ] Create rent vs buy calculator (8 hours)

**Deliverable:** Complete cost-of-living analysis tool

---

## 5. DATA SOURCES REFERENCE 📚

### Free APIs ✅
| Source | Data | Endpoint | Key Required |
|--------|------|----------|--------------|
| Zillow Research | ZHVI, ZORI | CSV downloads | No |
| Census Bureau | Income, demographics | api.census.gov | No |
| MIT Living Wage | Cost baskets | Web scraping | No |
| Tax Foundation | Property/sales/income tax | CSV downloads | No |
| Freddie Mac | Mortgage rates | freddiemac.com/pmms | No |
| FBI UCR | Crime stats | crime-data-explorer.app.cloud.gov/api | No |
| BLS | Unemployment | api.bls.gov | Yes (free) |
| NOAA | Weather/climate | api.weather.gov | No |
| NCES | School data | nces.ed.gov/ccd/pubschuniv.asp | No |

### Paid APIs 💰
| Source | Data | Cost | Value |
|--------|------|------|-------|
| API Ninjas | Property tax | Free tier: 10k/mo | High (granular) |
| GreatSchools | School ratings | Contact for pricing | High |
| Walk Score | Walkability | $0.05/call | Medium |
| Quad Info Services | Home insurance | Contact for pricing | Medium |

### Web Scraping Targets 🕷️
| Source | Data | Reliability | Legal |
|--------|------|-------------|-------|
| MIT Living Wage | Cost baskets | High | ✅ Non-commercial OK |
| Redfin | Recent sales | Medium | ⚠️  Check ToS |
| Local gov sites | Property tax | Low (inconsistent) | ✅ Public data |

---

## 6. DATABASE SCHEMA UPDATES NEEDED 🗄️

### New Tables Required

```sql
-- Sales tax rates
CREATE TABLE sales_tax_rate (
  id TEXT PRIMARY KEY,
  "stateAbbr" TEXT NOT NULL,
  "localJurisdiction" TEXT,
  "combinedRate" DECIMAL(5,4) NOT NULL,
  "stateRate" DECIMAL(5,4),
  "localRate" DECIMAL(5,4),
  "asOfYear" INTEGER NOT NULL,
  source TEXT,
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("stateAbbr", "localJurisdiction", "asOfYear")
);

-- Mortgage rates (national, updates weekly)
CREATE TABLE mortgage_rate (
  id TEXT PRIMARY KEY,
  "weekEnding" DATE NOT NULL UNIQUE,
  "rate30Year" DECIMAL(5,3),
  "rate15Year" DECIMAL(5,3),
  source TEXT DEFAULT 'Freddie Mac PMMS',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- School ratings
CREATE TABLE school_rating (
  id TEXT PRIMARY KEY,
  "geoType" TEXT NOT NULL, -- 'CITY' or 'ZCTA'
  "geoId" TEXT NOT NULL,
  "avgRating" DECIMAL(3,1), -- 1.0 to 10.0
  "numSchools" INTEGER,
  source TEXT,
  "asOfYear" INTEGER,
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("geoType", "geoId", "asOfYear")
);

-- Crime statistics
CREATE TABLE crime_stat (
  id TEXT PRIMARY KEY,
  "geoType" TEXT NOT NULL,
  "geoId" TEXT NOT NULL,
  "violentCrimeRate" DECIMAL(8,2), -- per 100k people
  "propertyCrimeRate" DECIMAL(8,2),
  "overallSafetyScore" DECIMAL(5,2), -- 0-100
  source TEXT,
  "asOfYear" INTEGER,
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("geoType", "geoId", "asOfYear")
);
```

---

## 7. SUCCESS METRICS 📈

### V2 Launch Goals (Month 1)
- ✅ Property tax data: 95%+ coverage
- ✅ MIT Living Wage: 100% coverage (all 3,221 counties)
- ✅ Income tax: 100% (all states + major cities)
- ✅ V2 scores: Live for all cities
- ✅ Household type selection: 8 types supported
- 📊 User testing: 50+ users, >80% satisfaction

### V2.5 Goals (Month 3)
- ✅ Sales tax: 100% coverage
- ✅ School ratings: 80%+ coverage
- ✅ Crime data: 70%+ coverage
- ✅ Quality-of-life adjustments active
- 📊 "Best Value" rankings published
- 📊 100k+ V2 score calculations

### V3 Goals (Month 6)
- ✅ All TIER 2 data sources
- ✅ Rent vs buy calculator
- ✅ Custom household builder (age, income, kids)
- ✅ Scenario planning ("What if I earn 20% more?")
- 📊 API access for developers
- 📊 1M+ V2 score calculations

---

## 8. NEXT IMMEDIATE ACTIONS ⚡

### Today (Next 4 Hours)
1. ✅ Fix property tax SQL bug
2. ✅ Get API Ninjas key
3. ✅ Run all tax imports
4. ✅ Verify MIT Living Wage completes (currently 26%)

### Tomorrow
5. ✅ Add mortgage rate fetcher
6. ✅ Implement V2 score calculation
7. ✅ Test on 10 cities manually
8. ✅ Deploy V2 scores to staging

### This Week
9. ✅ Launch V2 scores to production
10. ✅ Add household type selector to UI
11. ✅ Update methodology page with V2 explanation
12. ✅ Announce V2 launch (blog post, social media)

---

**Status:** Ready for implementation
**Next Review:** After MIT Living Wage completes (today)
**Owner:** Development Team
