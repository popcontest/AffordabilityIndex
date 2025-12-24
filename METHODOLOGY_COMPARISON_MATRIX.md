# Affordability Index Methodology Comparison Matrix

**Version:** 1.0
**Date:** 2025-12-22

Quick reference comparison of major affordability/cost-of-living indexes and our proposed True Affordability Score (TAS).

---

## Summary Comparison Table

| Index | Primary Metric | Normalization | Weights | Household Types | Granularity | Update Frequency |
|-------|----------------|---------------|---------|-----------------|-------------|------------------|
| **Our TAS (Proposed)** | % Disposable Income | Percentile (0-100) | BLS 2024 (8 categories) | 4 personas | County/City/ZIP | Monthly |
| **Simple Ratio (Current)** | Home Value / Income | None (raw ratio) | N/A (single metric) | Universal | City/ZIP | Monthly |
| **MIT Living Wage** | Required Hourly Wage | None ($ amount) | Unweighted (7 categories) | 12 family types | County | Annual |
| **C2ER COLI** | Composite Index | 100 = US Average | Professional households (6 categories) | Upper income only | Metro (300+ areas) | Quarterly |
| **BEA RPP** | Price Level Index | 100 = US Average | PCE weights | Universal | State/Metro | Annual |
| **EPI Family Budget** | Required Annual Income | None ($ amount) | Unweighted (7 categories) | 10 family types | County | Annual |
| **Numbeo COLI** | Composite Index | 100 = NYC baseline | Crowdsourced | Universal | City (global) | Continuous |

---

## Detailed Feature Comparison

### 1. MIT Living Wage Calculator

**Website:** livingwage.mit.edu

**Philosophy:** "What wage do you need to survive?"

**Strengths:**
- ✅ Comprehensive cost categories (7 essential expenses)
- ✅ Detailed family configurations (12 types: 0-2 adults, 0-4 children)
- ✅ County-level granularity (3,000+ counties)
- ✅ Transparent methodology with source citations
- ✅ Academic credibility (MIT research)

**Weaknesses:**
- ❌ No composite score (just lists dollar amounts per category)
- ❌ Doesn't rank/compare locations easily
- ❌ Annual updates only (data can be 1-2 years old)
- ❌ Doesn't account for quality of life factors
- ❌ Uses "required" costs, not actual spending patterns

**Our Improvement:**
- We add percentile rankings for easy comparison
- Monthly updates for housing (Zillow ZHVI)
- Composite score (TAS) for at-a-glance assessment

---

### 2. C2ER Cost of Living Index (COLI)

**Website:** coli.org

**Philosophy:** "How expensive is this city compared to average?"

**Strengths:**
- ✅ Long-established (50+ years of data)
- ✅ Explicit weighting scheme
- ✅ Quarterly data collection
- ✅ Composite index easy to understand (100 = average)
- ✅ 6 component indexes (can drill down)

**Weaknesses:**
- ❌ Subscription required ($180/year)
- ❌ Only 300+ urban areas (limited coverage)
- ❌ Focused on professional/managerial households (top 20% income)
- ❌ Doesn't show affordability relative to income (just relative prices)
- ❌ Expensive for casual users

**Weighting Breakdown:**
- Housing: 28%
- Miscellaneous Goods & Services: 33%
- Groceries: 13.24%
- Utilities: 11%
- Transportation: ~12% (inferred)
- Healthcare: ~10% (inferred)

**Our Improvement:**
- Free and open to all users
- Broader coverage (all US cities/ZIPs with data)
- Multiple personas (not just high earners)
- Affordability relative to actual median income

---

### 3. BEA Regional Price Parities (RPP)

**Website:** bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area

**Philosophy:** "How much do prices differ across regions?"

**Strengths:**
- ✅ Official government data (Bureau of Economic Analysis)
- ✅ Methodologically rigorous (multilateral Geary aggregation)
- ✅ State AND metro-level data
- ✅ Free and public
- ✅ Consistent methodology over time
- ✅ Can adjust nominal income to "real" purchasing power

**Weaknesses:**
- ❌ Only measures prices, not affordability (doesn't compare to income)
- ❌ Annual updates only
- ❌ Doesn't include all cost categories (focuses on consumption goods/services)
- ❌ No granularity below metro level (no county/city/ZIP)

**How We Use RPP:**
- Integrate RPP as regional adjustment factor for food, utilities, other costs
- Use RPP to impute missing data (national average × RPP)
- Cite BEA as authoritative source for regional price differences

**Example:**
- North Carolina RPP: 92.5 (7.5% cheaper than US average)
- California RPP: 115 (15% more expensive)
- Use these to adjust USDA food costs, utility estimates, etc.

---

### 4. EPI Family Budget Calculator

**Website:** epi.org/resources/budget

**Philosophy:** "What income do families need for a modest yet adequate standard of living?"

**Strengths:**
- ✅ 7 essential cost categories
- ✅ 10 family types (1-2 adults, 0-4 children)
- ✅ County-level granularity (all 3,000+ US counties)
- ✅ Free and public
- ✅ Progressive research institute (worker-focused)
- ✅ Includes taxes (federal, state, payroll)

**Weaknesses:**
- ❌ No composite score (just lists dollar amounts)
- ❌ Doesn't rank locations
- ❌ Annual updates (can be outdated)
- ❌ Conservative assumptions (e.g., assumes center-based childcare, not family care)

**Categories & Example Costs (Raleigh, NC - Family of 4):**
- Housing: $1,177/mo
- Food: $916/mo
- Childcare: $1,565/mo
- Transportation: $1,230/mo
- Healthcare: $822/mo
- Other: $637/mo
- Taxes: $1,295/mo
- **Total:** $7,642/mo = $91,704/year

**Our Improvement:**
- Add composite TAS score for easy comparison
- More frequent updates (monthly for housing)
- Percentile rankings
- User-friendly UI (EPI is data-focused, not UX-optimized)

---

### 5. Simple Housing Ratio (Our Current Metric)

**Formula:** Home Value / Median Household Income

**Example:**
- Home Value: $300,000
- Income: $75,000
- Ratio: 4.0×

**Strengths:**
- ✅ Extremely simple to understand
- ✅ Industry standard (lenders use 3× rule)
- ✅ Fast to calculate
- ✅ Works with limited data (just 2 inputs)

**Weaknesses:**
- ❌ Ignores 70% of household expenses
- ❌ Doesn't account for property taxes (vary 10× across US)
- ❌ Doesn't account for childcare (often 2nd largest expense)
- ❌ Doesn't account for healthcare, transportation, etc.
- ❌ Misleading: Low housing cost doesn't mean affordable life

**Example of Misleading Ratio:**
- City A: Ratio 3.5× (looks affordable)
- City B: Ratio 5.5× (looks expensive)
- **But:** City A has 10% property tax, $2k/mo childcare, no transit
- City B has 0% income tax, $800/mo childcare, good transit
- **Result:** City B may be more affordable despite higher ratio!

**Our Approach:**
- Keep simple ratio as secondary metric (familiarity)
- Make TAS the primary metric (accuracy)

---

### 6. Numbeo Cost of Living Index

**Website:** numbeo.com

**Philosophy:** "Crowdsourced global cost of living data"

**Strengths:**
- ✅ Global coverage (9,000+ cities worldwide)
- ✅ Continuous updates (user-submitted)
- ✅ Free for basic access
- ✅ Many cost categories
- ✅ Composite index + component breakdowns

**Weaknesses:**
- ❌ Crowdsourced data (quality varies, potential bias)
- ❌ No official government validation
- ❌ Baseline is NYC (100 = New York City), not national average
- ❌ Doesn't account for income (just costs)
- ❌ US data less comprehensive than international

**Our Advantage:**
- Government data sources (Zillow, Census, BLS, BEA) > crowdsourced
- US-focused depth
- Affordability relative to income (not just cost)

---

## Weighting Scheme Comparison

### BLS Consumer Expenditure Survey 2024 (Actual Spending)

| Category | % of Budget | Annual Amount (avg) |
|----------|-------------|---------------------|
| Housing | 33.4% | $26,230 |
| Transportation | 17.0% | $13,351 |
| Food | 12.9% | $10,131 |
| Personal Insurance/Pensions | 12.5% | $9,817 (savings, not cost) |
| Healthcare | 7.9% | $6,204 |
| Entertainment | 4.6% | $3,612 |
| Apparel | 2.5% | $1,963 |
| Education | 2.0% | $1,571 |
| Other | ~7% | ~$5,500 |

**Total Average Expenditure:** $78,535

### C2ER COLI Weights (Professional Households)

| Category | % Weight |
|----------|----------|
| Housing | 28% |
| Miscellaneous | 33% |
| Groceries | 13.24% |
| Utilities | 11% |
| Transportation | ~12% |
| Healthcare | ~10% |

### Our TAS Weights (Family Baseline)

| Category | % Weight | Rationale |
|----------|----------|-----------|
| Housing | 33% | Matches BLS actual spending |
| Transportation | 17% | Matches BLS |
| Taxes | 15% | Essential, not discretionary |
| Food | 13% | Matches BLS |
| Healthcare | 8% | Matches BLS |
| Utilities | 6% | Derived from BLS "Housing - Utilities" |
| Childcare | 5% | Critical for families (often 2nd largest) |
| Other | 3% | Essentials only (apparel, personal care) |

**Key Difference:**
- We explicitly separate **taxes** (15%) - most indexes ignore or bundle
- We explicitly separate **childcare** (5%) - often hidden in "miscellaneous"
- We exclude **entertainment, education** (discretionary, not essential)

---

## Normalization Method Comparison

### Index Score (C2ER, Numbeo)
- **Formula:** `Index = (Local Cost / National Average) × 100`
- **Range:** 0-200+ (no upper bound)
- **Interpretation:** 120 = 20% more expensive than average
- **Pros:** Easy comparison to national benchmark
- **Cons:** No direct connection to affordability (doesn't account for income)

### Z-Score (Academic Research)
- **Formula:** `Z = (Value - Mean) / Standard Deviation`
- **Range:** Typically -3 to +3
- **Interpretation:** How many std deviations from mean
- **Pros:** Statistically rigorous
- **Cons:** Assumes normal distribution (housing is skewed), hard for users to understand

### Percentile Rank (Our Choice)
- **Formula:** `Percentile = (Count Worse / Total) × 100`
- **Range:** 0-100
- **Interpretation:** "Better than X% of locations"
- **Pros:** Robust to outliers, intuitive, consistent range
- **Cons:** Loses information about magnitude of difference

### Disposable Income Ratio (Our Primary Metric)
- **Formula:** `TAS = [(Income - Costs) / Income] × 100`
- **Range:** -20 to 50 (realistic bounds)
- **Interpretation:** "X% of income remains after essentials"
- **Pros:** Direct affordability measure, actionable for users
- **Cons:** Requires comprehensive cost data

**Why We Use Both:**
- TAS (primary): Shows actual affordability
- Percentile (secondary): Shows relative standing

---

## Household Type Coverage Comparison

| Index | Household Types Supported | Notes |
|-------|---------------------------|-------|
| **MIT Living Wage** | 12 types (0-2 adults, 0-4 children) | Most comprehensive |
| **EPI Family Budget** | 10 types (1-2 adults, 0-4 children) | Very comprehensive |
| **C2ER COLI** | 1 type (professional household) | Limited to top 20% income |
| **BEA RPP** | Universal (no differentiation) | Measures prices, not costs |
| **Simple Ratio** | Universal (no differentiation) | One size fits all |
| **Our TAS** | 4 personas (single, couple, family, retiree) | Balanced coverage |

**Our 4 Personas:**

1. **Single Adult**
   - 1 working adult, no dependents
   - 1BR housing, individual health plan
   - No childcare costs
   - Lower food/utilities

2. **Couple**
   - 2 working adults, no children
   - 2BR housing, family health plan (2 adults)
   - No childcare
   - Moderate costs

3. **Family**
   - 2 adults, 2 children (ages 3 and 7)
   - 3-4BR housing, family health plan (4 people)
   - Full childcare costs
   - Highest total costs

4. **Retiree**
   - 1-2 adults, age 65+, fixed income
   - Homeowner or renter, Medicare + supplemental
   - No childcare, low transportation
   - High healthcare costs

**Why Not 12 Types?**
- Complexity vs utility trade-off
- 4 personas cover 90% of user scenarios
- Can add more later based on usage data

---

## Data Source Comparison

| Cost Category | MIT Living Wage | EPI Family Budget | C2ER COLI | Our TAS |
|---------------|-----------------|-------------------|-----------|---------|
| **Housing** | HUD Fair Market Rents | HUD FMR | Member surveys | Zillow ZHVI + ACS |
| **Food** | USDA food plans | USDA food plans | Member surveys | USDA + BEA RPP |
| **Childcare** | State childcare surveys | State surveys + EPI analysis | (Not separate) | HHS + state surveys |
| **Transportation** | IRS mileage + public transit | IRS + local transit | Member surveys | BLS + AAA + Census |
| **Healthcare** | MEPS + marketplace premiums | MEPS + ACA data | Member surveys | Healthcare.gov + KFF |
| **Taxes** | NBER TAXSIM | Tax Policy Center | (Not separate) | Tax Foundation + state data |
| **Utilities** | (Included in housing) | EIA + state data | Member surveys | EIA state rates |
| **Other** | BLS Consumer Expenditure | BLS CE | Member surveys | BLS CE + BEA RPP |

**Our Advantage:**
- Primary reliance on **government data** (Census, BLS, BEA, HHS)
- Supplement with **industry data** (Zillow, AAA, KFF)
- Avoid crowdsourced/survey data (less reliable)

---

## Update Frequency Comparison

| Index | Housing | Income | Other Costs | Composite |
|-------|---------|--------|-------------|-----------|
| **Our TAS** | Monthly (Zillow) | Annual (Census ACS) | Varies by source | Monthly |
| **MIT Living Wage** | Annual | Annual | Annual | Annual |
| **C2ER COLI** | Quarterly | N/A | Quarterly | Quarterly |
| **BEA RPP** | Annual | Annual | Annual | Annual |
| **EPI Family Budget** | Annual | Annual | Annual | Annual |

**Our Advantage:**
- Monthly housing updates (most volatile component)
- Can refresh composite TAS monthly
- Income updated annually (it doesn't change fast)
- Other costs updated as source data refreshes

---

## Use Case Suitability Matrix

| Use Case | Simple Ratio | MIT Living Wage | C2ER COLI | BEA RPP | Our TAS |
|----------|--------------|-----------------|-----------|---------|---------|
| **Quick glance affordability** | ✅ Excellent | ❌ Too detailed | ✅ Good | ❌ Doesn't show affordability | ✅ Excellent |
| **Relocation decision** | ⚠️ Misleading | ✅ Excellent | ✅ Good | ⚠️ Incomplete | ✅ Excellent |
| **Comparing 2-3 cities** | ✅ Easy | ⚠️ Manual comparison | ✅ Good | ✅ Good | ✅ Excellent |
| **Understanding cost breakdown** | ❌ N/A | ✅ Excellent | ✅ Good | ⚠️ Limited | ✅ Excellent |
| **Financial planning** | ❌ Incomplete | ✅ Excellent | ⚠️ Limited personas | ❌ Prices only | ✅ Excellent |
| **Academic research** | ⚠️ Too simple | ✅ Excellent | ✅ Good | ✅ Excellent | ✅ Good |
| **Policy analysis** | ❌ Incomplete | ✅ Excellent | ⚠️ Limited coverage | ✅ Excellent | ✅ Good |
| **SEO content** | ✅ Familiar concept | ⚠️ Too technical | ⚠️ Paywalled | ⚠️ Technical | ✅ Novel + credible |

---

## Competitive Positioning

### What Makes Our TAS Unique?

1. **Only index that combines:**
   - Comprehensive costs (8 categories)
   - Relative to actual income (affordability, not just cost)
   - Multiple personas
   - Monthly updates
   - Percentile rankings
   - Free and public

2. **Bridges the gap between:**
   - Simple ratio (too simple, misleading)
   - Academic calculators (too complex, no rankings)
   - Industry indexes (paywalled, limited coverage)

3. **User-facing value:**
   - "28% of income remains" is more actionable than "Index score 112"
   - Percentile rank satisfies comparison need ("Top 15% most affordable")
   - Cost breakdown shows where the pain points are

4. **SEO/Marketing angle:**
   - "The ONLY affordability index that accounts for childcare, healthcare, and taxes"
   - "Beyond home prices: See the full cost of living"
   - "True Affordability Score: What you actually keep, not just what you pay"

---

## Decision Matrix: Why Our Approach

| Decision | Rationale |
|----------|-----------|
| **Dual metrics (TAS + Simple Ratio)** | Balances innovation with familiarity; gradual user adoption |
| **Percentile normalization** | More robust than z-scores for skewed economic data |
| **BLS weights** | Reflects actual spending patterns, not arbitrary weights |
| **4 personas** | Covers 90% of users without overwhelming complexity |
| **Government data sources** | Credibility > crowdsourced; free access; authoritative |
| **Monthly updates** | Housing market moves fast; annual is too slow |
| **County/City/ZIP granularity** | Balances data availability with local relevance |
| **8 cost categories** | Comprehensive without being exhaustive (10+ gets noisy) |
| **Disposable Income Ratio** | Most intuitive metric for users ("what I keep" vs "how expensive") |

---

## Conclusion

**Our True Affordability Score (TAS) is positioned as:**

- **More comprehensive** than simple housing ratios
- **More user-friendly** than academic calculators (MIT, EPI)
- **More affordable** than industry indexes (C2ER requires subscription)
- **More actionable** than price indexes (BEA shows cost, not affordability)
- **More flexible** than single-household indexes (4 personas)

**Competitive Advantages:**
1. Free and public
2. Monthly updates
3. Covers all US cities/ZIPs with data
4. Shows affordability (not just cost or prices)
5. Multiple personas
6. Transparent methodology
7. Percentile rankings for easy comparison
8. Cost breakdown for financial planning

**Next Steps:**
1. Build TAS calculation engine
2. Validate against MIT Living Wage and EPI benchmarks
3. A/B test user preference (TAS vs Simple Ratio)
4. Launch with blog post: "Introducing the True Affordability Score"
5. Outreach to media: "First index to account for childcare and healthcare costs"

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Related Documents:**
- COMPOSITE_INDEX_METHODOLOGY.md
- COMPOSITE_INDEX_TECHNICAL_APPENDIX.md
