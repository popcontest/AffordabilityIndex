# Composite Affordability Index Methodology Design

**Version:** 1.0
**Date:** 2025-12-22
**Agent:** Agent 3 (Index Methodology Specialist)

---

## Executive Summary

### Recommended Approach

We propose a **dual-index system** that maintains the current simple housing ratio while introducing a comprehensive "True Affordability Score" that incorporates 8 cost dimensions. This approach:

1. **Preserves simplicity** - Keep the simple ratio (home value / income) as "Housing Affordability Score" for quick comparisons
2. **Adds depth** - Introduce "True Affordability Score" that considers total cost of living
3. **Enables personas** - Support different household types (single adult, family, retiree) with adjusted weightings
4. **Maintains transparency** - Clear methodology explanation with worked examples

### Core Formula

```
True Affordability Score = Disposable Income Ratio (DIR)

DIR = (Median Income - Total Annual Costs) / Median Income

Where Total Annual Costs = Weighted Sum of:
  - Housing (mortgage/rent + property tax + insurance)
  - Taxes (state/local income + sales)
  - Healthcare (premiums + out-of-pocket)
  - Transportation (car ownership or transit)
  - Childcare (if applicable to persona)
  - Utilities (electricity + gas + water)
  - Food (regional cost index)
  - Other necessities (weighted basket)
```

### Key Design Decisions

1. **Normalization Method**: Percentile-based (0-100) rather than z-scores
   - More robust to outliers in housing/income data
   - Easier interpretation for users
   - Consistent scale across all metrics

2. **Weighting Scheme**: Based on 2024 BLS Consumer Expenditure Survey
   - Housing: 33% (largest household expense)
   - Transportation: 17%
   - Food: 13%
   - Healthcare: 8%
   - Utilities: 6%
   - Taxes: 15%
   - Childcare: 5% (family personas only)
   - Other: 3%

3. **Missing Data Strategy**: Tiered fallback approach
   - Primary: Use exact location data
   - Secondary: Use county/metro averages
   - Tertiary: Use state averages
   - Mark data quality flag (complete/partial/estimated)

4. **Persona Support**: Multiple household types with adjusted weights
   - Single Adult (no childcare, lower food/utilities)
   - Couple (moderate across categories)
   - Family (higher childcare, food, housing)
   - Retiree (lower transportation, higher healthcare)

---

## Literature Review: Existing Affordability Indexes

### 1. MIT Living Wage Calculator

**Methodology:**
- Calculates minimum hourly wage needed to cover basic family expenses
- Covers 12 family configurations (0-2 adults, 0-4 children)
- Seven expense categories: housing, food, childcare, transportation, healthcare, taxes, other necessities
- Uses actual regional cost data from government sources
- Does not use explicit weighting - instead calculates absolute dollar amounts needed

**Key Insight:** Focus on **sufficiency** (what you need) rather than **comparison** (how expensive vs others). Their approach is household-centric.

**What We Learned:**
- Importance of household type variations
- Using government data sources (ACS, BLS) for credibility
- Providing detailed methodology transparency
- Regional granularity matters (county-level where possible)

---

### 2. C2ER Cost of Living Index (COLI)

**Methodology:**
- Composite index with 6 categories
- **Explicit Weighting Scheme:**
  - Housing: 28%
  - Utilities: 11%
  - Groceries: 13.24%
  - Transportation: ~12% (inferred)
  - Healthcare: ~10% (inferred)
  - Miscellaneous Goods and Services: 33%
- Normalized to 100 = national average
- Based on government survey data on expenditure patterns for **professional/managerial households** (top 20% income)
- Quarterly data collection from 300+ urban areas

**Key Insight:** Uses **expenditure weights** based on how much households actually spend in each category, not how "important" categories are.

**What We Learned:**
- Clear precedent for weighted composite indexes
- Normalization to 100 (national average) is intuitive
- Focus on professional households (relevant for our target users - people considering relocation)
- "Miscellaneous" catch-all category is necessary (~33% of spending)

**Limitation:** COLI focuses on upper-income households, may not reflect affordability challenges for median-income families

---

### 3. BEA Regional Price Parities (RPP)

**Methodology:**
- Measures differences in price levels across states/metros
- Expressed as percentage of national average (US = 100)
- Uses multilateral aggregation (Geary additive method)
- Combines CPI price relatives with ACS housing data
- Expenditure weights from Personal Consumption Expenditures (PCE)

**Key Insight:** **Multilateral comparison** allows any region to be compared directly without loss of consistency. If Area A has RPP=120 and Area B has RPP=90, prices are exactly 33% higher in A than B.

**What We Learned:**
- Sophisticated normalization preserves ratio properties
- Government standard for regional price comparisons
- Can adjust nominal income to "real" purchasing power
- RPP data available at state and metro level (can integrate directly)

**Application:** Use BEA RPP as the "Cost of Living" dimension in our composite index rather than constructing our own price index.

---

### 4. EPI Family Budget Calculator

**Methodology:**
- Seven components: rent, food, transportation, childcare, healthcare, taxes, other necessities
- Creates budgets for **10 family types** (1-2 adults, 0-4 children)
- Shows monthly income needed for "modest yet adequate" standard
- County-level granularity (3,000+ counties)
- **Does not weight** - reports actual dollar amounts per category

**Key Insight:** Different household types have **radically different** cost structures:
- Childcare: $0 for single adult vs $1,800/month for family with 2 kids
- Transportation: Varies by population density (urban vs rural)
- Healthcare: ACA exchange premiums + out-of-pocket

**What We Learned:**
- Essential to support multiple personas
- Childcare is often the 2nd largest expense after housing for families
- Taxes must include federal + state + payroll + local
- "Other necessities" includes: apparel, personal care, household supplies, reading, school supplies

---

### 5. Consumer Expenditure Survey (BLS 2024)

**Actual Household Spending Percentages:**
- Housing: **33.4%** (largest share)
- Transportation: **17.0%**
- Food: **12.9%**
- Personal insurance and pensions: **12.5%** (savings - not a cost)
- Healthcare: **7.9%**
- Entertainment: **4.6%**
- Cash contributions: **2.9%**
- Apparel: **2.5%**
- Education: **2.0%**
- Other: remaining ~4%

**Average Annual Expenditure (2024):** $78,535

**Key Insight:** These are **actual spending patterns** for average US households, not budget recommendations.

**What We Learned:**
- Housing truly dominates (1/3 of spending)
- Transportation is massive (often overlooked in affordability discussions)
- Healthcare is smaller % than expected (7.9%) but highly variable by location
- Entertainment/discretionary spending is significant (~10% combined)

**Implication:** Our weights should reflect actual spending patterns, with adjustments for household type.

---

## Proposed Methodology

### 1. Core Metric: True Affordability Score (TAS)

The True Affordability Score measures **what percentage of income remains after covering essential costs** in a given location.

#### Formula

```
TAS = DIR × 100

Where DIR (Disposable Income Ratio) =
  (Median Household Income - Total Annual Essential Costs) / Median Household Income

DIR Range:
  - 1.0 (100%) = All income is disposable (impossible, but theoretical max)
  - 0.0 (0%) = All income consumed by essentials (nothing left)
  - Negative = Expenses exceed income (unaffordable)
```

#### Interpretation

| TAS Score | Interpretation | What It Means |
|-----------|----------------|---------------|
| 40-50 | Excellent Affordability | 40-50% of income remains after essentials |
| 30-40 | Good Affordability | 30-40% remains for savings/discretionary |
| 20-30 | Moderate Affordability | 20-30% remains, limited flexibility |
| 10-20 | Challenging Affordability | 10-20% remains, tight budget |
| 0-10 | Very Challenging | <10% remains, financial stress |
| <0 | Unaffordable | Essentials exceed income |

**Why This Metric:**
1. Intuitive: "What percentage can I keep?" is easier to understand than complex ratios
2. Comparable: Same scale (0-100) for all locations
3. Actionable: Users can see exact impact of location on financial flexibility
4. Transparent: Simple subtraction, easy to verify

---

### 2. Essential Cost Categories and Weights

Based on BLS Consumer Expenditure Survey 2024, adjusted for "essential vs discretionary" classification:

| Category | Weight | Rationale |
|----------|--------|-----------|
| **Housing** | 33% | Largest expense; includes mortgage/rent + property tax + home insurance |
| **Transportation** | 17% | Car ownership or transit; essential for work |
| **Taxes** | 15% | State/local income tax + sales tax (federal taxes in income baseline) |
| **Food** | 13% | Groceries + minimal dining (regional cost variation) |
| **Healthcare** | 8% | Premiums + estimated out-of-pocket |
| **Utilities** | 6% | Electricity, gas, water/sewer |
| **Childcare** | 5%* | *Only for family personas; redistributed for others |
| **Other** | 3% | Apparel, household supplies, personal care |
| **Total** | **100%** | |

**Adjustments by Persona:**
- **Single Adult:** No childcare (5% redistributed to housing/transportation)
- **Couple:** No childcare (5% redistributed)
- **Family (2 adults, 2 children):** Full childcare weight (5%)
- **Retiree:** Reduced transportation (-5%), increased healthcare (+5%)

---

### 3. Weighting Formula

```
Total Annual Essential Costs =
  (Housing Cost × 0.33) +
  (Transportation Cost × 0.17) +
  (Tax Cost × 0.15) +
  (Food Cost × 0.13) +
  (Healthcare Cost × 0.08) +
  (Utility Cost × 0.06) +
  (Childcare Cost × 0.05) +  // If applicable
  (Other Cost × 0.03)
```

**Implementation Note:** Weights are applied to **dollar amounts**, not percentiles. We calculate actual costs, then compute TAS.

---

### 4. Normalization Strategy

We use **dual normalization**:

#### A. Primary Metric (TAS): No normalization needed
- Already on 0-100 scale (percentage of disposable income)
- Directly comparable across locations
- Absolute interpretation: "30 means 30% disposable"

#### B. Percentile Rankings: For comparative context
- Calculate percentile rank for each location's TAS
- "This city ranks in the top 15% most affordable"
- Use percentile formula:

```
Percentile = (Number of locations with worse TAS / Total locations) × 100

Where "worse" = lower TAS (less disposable income)
```

**Why Percentiles (Not Z-Scores):**
1. **Robust to outliers:** Housing costs have extreme outliers (San Francisco, Manhattan)
2. **Skewed data:** Affordability distributions are not normal (long right tail)
3. **Intuitive:** "Top 10%" is clearer than "2.1 standard deviations above mean"
4. **Consistent range:** Always 0-100, regardless of data distribution

**When to Use Each:**
- **TAS Score:** Primary display on city pages (absolute affordability)
- **Percentile:** Secondary context for rankings ("How does this compare?")

---

### 5. Missing Data Handling

Real-world data will have gaps. Strategy:

#### Tier 1: Exact Location Data (Preferred)
- Use county-level data matched to city/ZCTA
- Mark as "Complete" in `dataQualityFlag`

#### Tier 2: Regional Fallback
- If county data missing, use metro area average
- If metro missing, use state average
- Mark as "Partial" in `dataQualityFlag`

#### Tier 3: National Imputation
- For categories with <10% missing data: Use median of similar locations (population, region)
- For categories with >10% missing: Use national median × regional price parity
- Mark as "Estimated" in `dataQualityFlag`

#### Exclusion Criteria
- If **housing** or **income** data missing: Cannot calculate TAS (exclude from rankings)
- If 4+ categories missing: Mark as "Insufficient Data" (show on page but no ranking)
- If 1-3 categories missing: Calculate with available data, note limitation

**User Communication:**
```
Affordability Score: 32 (Good)
Data Quality: Partial (2 of 8 categories estimated)
[?] What does this mean?
```

---

### 6. Geographic Adjustments

**Do weights differ by region?**

**Recommendation:** No regional weight variation for MVP, but adjust costs using Regional Price Parities (RPP).

**Rationale:**
1. **Simplicity:** Single methodology is easier to explain
2. **Consistency:** Fair comparisons require uniform weighting
3. **Data:** BLS expenditure patterns are already regional (we use actual regional costs)

**How RPP Fits:**
- Food costs: Base national grocery basket × (Food RPP / 100)
- Other costs: Base basket × (Services RPP / 100)
- Housing: Already regional (Zillow ZHVI)
- Utilities: Already regional (state/metro data)

**Future Enhancement (Post-MVP):**
Consider urban vs rural adjustments:
- Urban: Higher housing, lower transportation
- Rural: Lower housing, higher transportation
- But for now, actual regional costs capture this implicitly

---

### 7. Household Persona Definitions

Support **4 personas** with different cost profiles:

#### Persona 1: Single Adult (No Children)
- **Description:** One working adult, no dependents
- **Adjusted Weights:**
  - Housing: 35% (+2% from childcare)
  - Transportation: 19% (+2% from childcare)
  - Taxes: 15%
  - Food: 10% (-3%, smaller grocery needs)
  - Healthcare: 9% (+1%)
  - Utilities: 5% (-1%, smaller dwelling)
  - Childcare: 0%
  - Other: 7% (+4%, more discretionary)
- **Assumptions:**
  - 1-bedroom apartment or small home
  - Individual health insurance
  - 1 car or transit
  - No childcare costs

#### Persona 2: Couple (No Children)
- **Description:** Two working adults, no dependents
- **Adjusted Weights:**
  - Housing: 34% (+1%)
  - Transportation: 18% (+1%)
  - Taxes: 15% (dual income, higher bracket)
  - Food: 12% (-1%)
  - Healthcare: 10% (+2%, two individuals)
  - Utilities: 6%
  - Childcare: 0%
  - Other: 5% (+2%)
- **Assumptions:**
  - 2-bedroom home
  - Family health insurance (2 adults)
  - 2 cars or 1 car + transit
  - Dual income

#### Persona 3: Family (2 Adults, 2 Children)
- **Description:** Two working adults, two children (ages 3 and 7)
- **Adjusted Weights:** (BLS baseline)
  - Housing: 33%
  - Transportation: 17%
  - Taxes: 15%
  - Food: 13% (4 people)
  - Healthcare: 8% (family plan)
  - Utilities: 6%
  - **Childcare: 5%** (critical differentiator)
  - Other: 3%
- **Assumptions:**
  - 3-4 bedroom home
  - Family health insurance (4 people)
  - 2 cars
  - Childcare: 1 child in daycare, 1 in after-school

#### Persona 4: Retiree (1-2 Adults, No Children)
- **Description:** Retired adult(s), fixed income, age 65+
- **Adjusted Weights:**
  - Housing: 35% (+2%, higher % of fixed income)
  - Transportation: 12% (-5%, less commuting)
  - Taxes: 12% (-3%, lower income, often tax-advantaged)
  - Food: 13%
  - Healthcare: 15% (+7%, Medicare + supplemental + out-of-pocket)
  - Utilities: 7% (+1%, home more often)
  - Childcare: 0%
  - Other: 6% (+3%)
- **Assumptions:**
  - Homeowner (no mortgage) or renter
  - Medicare + supplemental insurance
  - 1 car, low mileage
  - Higher medical costs

---

### 8. Migration Strategy from Simple Ratio

**Phase 1: Soft Launch (MVP)**
- **Keep:** Simple ratio as "Housing Affordability Ratio"
- **Add:** New "True Affordability Score" badge
- **UI:** Show both side-by-side on city pages

```
┌─────────────────────────────────────────┐
│ AFFORDABILITY OVERVIEW                  │
├─────────────────────────────────────────┤
│ Housing Ratio: 4.2× income              │
│ Rating: Moderate                        │
│                                         │
│ True Affordability Score: 28%           │
│ (28% of income remains after costs)     │
│ Percentile: Top 35% most affordable     │
└─────────────────────────────────────────┘
```

**Phase 2: Data Collection (Months 1-3)**
- Populate all 8 cost dimensions in database
- Validate calculations against known benchmarks
- A/B test user preference: simple ratio vs TAS

**Phase 3: Transition (Months 4-6)**
- Make TAS the **primary** metric
- Demote simple ratio to "Housing Costs" subsection
- Update rankings to sort by TAS (not ratio)

**Phase 4: Full Adoption (Month 6+)**
- Simple ratio remains available in detailed view
- TAS is the hero metric
- Marketing: "The only affordability index that considers total cost of living"

**Backward Compatibility:**
- API v1: Returns both `ratio` and `trueAffordabilityScore`
- Historical data: Keep `MetricSnapshot` table (simple ratio)
- New data: Use `AffordabilitySnapshot` table (full TAS)

---

## Worked Examples

### Example 1: City A - Low Housing, High Healthcare

**Location:** Tuscaloosa, Alabama
**Profile:** Family of 4

**Inputs:**
- Median Household Income: $50,000
- Median Home Value: $180,000

**Annual Cost Breakdown:**

| Category | Amount | Calculation |
|----------|--------|-------------|
| Housing | $13,200 | Mortgage (3.5% down, 7% rate) + property tax (0.4%) + insurance |
| Transportation | $10,000 | 2 cars (gas, insurance, maintenance) |
| Taxes | $4,500 | AL income tax (5%) + sales tax (~4% effective) |
| Food | $8,500 | USDA moderate plan × 4 people × regional factor (0.95) |
| Healthcare | $6,500 | Family premium (ACA silver) + out-of-pocket |
| Utilities | $2,400 | Electricity (high AC use) + gas + water |
| Childcare | $7,000 | 1 child daycare (lower AL rates) |
| Other | $2,000 | Apparel, household goods |
| **Total Costs** | **$54,100** | |

**TAS Calculation:**
```
DIR = ($50,000 - $54,100) / $50,000 = -0.082
TAS = -8.2%
```

**Interpretation:** **Unaffordable for median family.** Costs exceed income by 8.2%.

**Why?** Despite low housing costs (ratio = 3.6×), healthcare and childcare consume 27% of income. This is a classic case where simple housing ratio is misleading.

**Simple Housing Ratio:** 3.6× (appears "Affordable")
**True Affordability:** -8.2% (actually "Unaffordable")

---

### Example 2: City B - High Housing, Low Everything Else

**Location:** Seattle, Washington (suburban)
**Profile:** Family of 4

**Inputs:**
- Median Household Income: $110,000
- Median Home Value: $650,000

**Annual Cost Breakdown:**

| Category | Amount | Calculation |
|----------|--------|-------------|
| Housing | $38,000 | Mortgage (10% down, 7% rate) + property tax (1%) + insurance |
| Transportation | $12,000 | 2 cars + transit mix (better public transit) |
| Taxes | $8,500 | WA has NO income tax, but higher sales tax (10.5%) |
| Food | $12,000 | Higher regional costs (RPP = 110) |
| Healthcare | $7,500 | Family premium (employer-sponsored typical) |
| Utilities | $3,000 | Moderate electric (mild climate), gas heating |
| Childcare | $15,000 | WA has high childcare costs (~$1,250/mo) |
| Other | $3,000 | Regional cost adjustment |
| **Total Costs** | **$99,000** | |

**TAS Calculation:**
```
DIR = ($110,000 - $99,000) / $110,000 = 0.10
TAS = 10%
```

**Interpretation:** **Challenging Affordability.** Only 10% of income remains after essentials.

**Why?** High housing (ratio = 5.9×) + expensive childcare, but offset by no income tax and higher income.

**Simple Housing Ratio:** 5.9× (appears "Challenging")
**True Affordability:** 10% (confirms "Challenging" but shows it's workable)

---

### Example 3: City C - Moderate Across the Board

**Location:** Raleigh, North Carolina
**Profile:** Family of 4

**Inputs:**
- Median Household Income: $75,000
- Median Home Value: $320,000

**Annual Cost Breakdown:**

| Category | Amount | Calculation |
|----------|--------|-------------|
| Housing | $20,500 | Mortgage + property tax (0.8%) + insurance |
| Transportation | $11,000 | 2 cars (moderate costs) |
| Taxes | $6,500 | NC income tax (4.75%) + sales tax (7%) |
| Food | $9,500 | Near-national average |
| Healthcare | $6,000 | Competitive health insurance market |
| Utilities | $2,200 | Moderate climate |
| Childcare | $10,000 | Mid-range daycare costs |
| Other | $2,300 | Average basket |
| **Total Costs** | **$68,000** | |

**TAS Calculation:**
```
DIR = ($75,000 - $68,000) / $75,000 = 0.093
TAS = 9.3% → rounds to 9%
```

**Interpretation:** **Challenging Affordability.** About 9% remains for savings/discretionary.

**Why?** Everything is average, which means limited financial flexibility for median family. Childcare is the silent budget killer.

**Simple Housing Ratio:** 4.27× (appears "Moderate")
**True Affordability:** 9% (reveals tighter reality)

---

### Example 4: Single Adult in Low-Cost City

**Location:** Fort Wayne, Indiana
**Profile:** Single Adult

**Inputs:**
- Median Household Income: $48,000
- Median Home Value: $140,000

**Annual Cost Breakdown:**

| Category | Amount | Calculation |
|----------|--------|-------------|
| Housing | $9,600 | Rent 1BR apt ($800/mo) |
| Transportation | $7,000 | 1 car (essential in Midwest) |
| Taxes | $5,500 | IN income tax (3.15%) + sales tax (7%) |
| Food | $4,000 | Single person, moderate plan |
| Healthcare | $3,600 | Individual marketplace plan |
| Utilities | $1,800 | 1BR apartment |
| Childcare | $0 | N/A |
| Other | $2,500 | Personal expenses |
| **Total Costs** | **$34,000** | |

**TAS Calculation:**
```
DIR = ($48,000 - $34,000) / $48,000 = 0.292
TAS = 29.2% → rounds to 29%
```

**Interpretation:** **Moderate Affordability.** About 29% of income remains.

**Why?** Low housing costs + no childcare = significantly better affordability. Single adults fare much better than families.

**Simple Housing Ratio:** 2.92× (appears "Very Affordable")
**True Affordability:** 29% (confirms "Good Affordability")

---

### Summary Table: Comparison of Examples

| City | Profile | Income | Housing Ratio | TAS | Interpretation |
|------|---------|--------|---------------|-----|----------------|
| Tuscaloosa, AL | Family | $50k | 3.6× | **-8%** | Unaffordable despite low housing |
| Seattle, WA | Family | $110k | 5.9× | **10%** | Challenging but workable |
| Raleigh, NC | Family | $75k | 4.27× | **9%** | Tighter than ratio suggests |
| Fort Wayne, IN | Single | $48k | 2.92× | **29%** | Good affordability |

**Key Insight:** The simple housing ratio **alone** is insufficient. Two cities with identical ratios can have vastly different true affordability due to taxes, childcare, healthcare, and transportation costs.

---

## User Communication Strategy

### 1. Methodology Page Content

**Headline:** "How We Calculate True Affordability"

**Section 1: The Problem with Simple Ratios**
```
Most affordability calculators only compare home prices to income.
But what about:
- Property taxes that vary 10× between states?
- Childcare that costs $2,000/month in Boston but $800 in Birmingham?
- Healthcare premiums that differ by region?
- Transportation costs in car-dependent vs transit-rich cities?

These "hidden costs" can make or break affordability.
```

**Section 2: Our Solution**
```
The True Affordability Score answers one simple question:
"What percentage of my income will I keep after covering essential costs?"

We calculate the total annual cost of 8 essential categories:
1. Housing (mortgage/rent, property tax, insurance)
2. Transportation (car ownership or transit)
3. Taxes (state and local income taxes)
4. Food (regional grocery costs)
5. Healthcare (insurance premiums and out-of-pocket)
6. Utilities (electricity, gas, water)
7. Childcare (if you have kids)
8. Other necessities (clothing, household supplies)

Then we subtract from your income:
Score = (Income - Essential Costs) / Income × 100
```

**Section 3: Interpreting Your Score**
```
40-50%: Excellent - Plenty left for savings and lifestyle
30-40%: Good - Comfortable margin for discretionary spending
20-30%: Moderate - Limited flexibility, careful budgeting needed
10-20%: Challenging - Tight budget, little room for error
0-10%: Very Challenging - Financial stress likely
Below 0%: Unaffordable - Costs exceed median income
```

**Section 4: Why It Varies by Household Type**
```
A single adult and a family of 4 have completely different costs:

Single Adult:
- Smaller housing needs (1BR vs 3BR)
- Individual health plan (not family)
- No childcare
- Lower food and utilities

Family of 4:
- Larger home required
- Family health insurance (often 3× individual)
- Childcare ($10-25k/year!)
- 4× food costs
- Higher utilities

That's why we calculate separate scores for:
- Single Adults
- Couples (no kids)
- Families (2 adults, 2 kids)
- Retirees (65+)
```

**Section 5: Data Sources**
```
We combine data from trusted government sources:

- Home Values: Zillow Home Value Index (ZHVI)
- Income: US Census Bureau, American Community Survey
- Healthcare: CMS, Healthcare.gov marketplace data
- Childcare: HHS, state childcare surveys
- Taxes: State revenue departments, Tax Foundation
- Transportation: BLS, AAA vehicle ownership costs
- Food: USDA food plans, regional adjustments
- Utilities: EIA, state utility commissions
- Regional Prices: Bureau of Economic Analysis (BEA)

All data is updated regularly and includes source timestamps.
```

---

### 2. On-Page Tooltips

**Simple Ratio Tooltip:**
```
Housing Affordability Ratio: 4.2× income
[?] This shows how many years of income it would take
to buy a median home. Lower is more affordable.

Traditional benchmark: 3× or less is "affordable"

This ratio only considers housing - see True Affordability
Score for a complete picture.
```

**True Affordability Score Tooltip:**
```
True Affordability Score: 28%
[?] This shows what percentage of income remains after
paying for housing, healthcare, taxes, food, transportation,
utilities, and other essentials.

Higher is better: 30%+ is comfortable, <20% is tight.

Calculated for: Family (2 adults, 2 children)
[Change household type]
```

**Percentile Tooltip:**
```
Percentile: Top 25% most affordable
[?] This city is more affordable than 75% of US cities
with available data (comparing True Affordability Scores).

Rank: #87 out of 432 cities
```

---

### 3. Comparison Table Display

When comparing 3 cities side-by-side:

```
┌──────────────────────────────────────────────────────────────────┐
│                  City A        City B        City C              │
├──────────────────────────────────────────────────────────────────┤
│ AFFORDABILITY                                                    │
│ True Score       32% ✓         18%           25%                 │
│ Percentile       Top 15%       Top 60%       Top 35%             │
│                                                                  │
│ COST BREAKDOWN (Annual for Family of 4)                         │
│ Housing          $18,500       $42,000       $28,000             │
│ Childcare        $8,000        $22,000 ⚠     $12,000             │
│ Healthcare       $6,000        $7,500        $6,200              │
│ Transportation   $9,500        $8,000 ✓      $11,000             │
│ Taxes            $5,500 ✓      $12,000       $7,200              │
│ Food             $9,000        $11,500       $9,200              │
│ Utilities        $2,400        $3,500        $2,600              │
│ Other            $2,100        $2,800        $2,300              │
│ ───────────────────────────────────────────────────────────────  │
│ TOTAL COSTS      $61,000       $109,300      $78,500             │
│                                                                  │
│ Median Income    $90,000       $135,000      $105,000            │
│ After Costs      $29,000 (32%) $25,700 (19%) $26,500 (25%)      │
└──────────────────────────────────────────────────────────────────┘

✓ = Below national average for this category
⚠ = Above national average for this category
```

---

### 4. Blog Post / SEO Content Template

**Title:** "Why [City Name] Is More/Less Affordable Than You Think"

**Structure:**
1. **Headline Number:** "True Affordability Score: 32%"
2. **What That Means:** "Families in [City] keep 32% of income after essential costs"
3. **Comparison:** "That's better than 85% of US cities"
4. **The Surprise:** "Despite median home prices of $400k (5.1× income), lower taxes and childcare costs make [City] surprisingly livable"
5. **Breakdown Chart:** Visual showing 8 cost categories
6. **Who It's Best For:** "Best for: Families with kids. Challenging for: Single adults (smaller housing cost advantage)"
7. **Similar Cities:** "Cities with similar affordability: X, Y, Z"
8. **Data Timestamp:** "Based on 2024 data, updated monthly"

---

## Alternative Approaches Considered (and Rejected)

### Alternative 1: Weighted Sum of Percentiles

**Approach:** Convert each cost category to percentile, then weighted average.

```
Housing Percentile: 75th (this city is cheaper than 75% of cities)
Healthcare Percentile: 40th (more expensive than 60% of cities)
...
Composite = 0.33×75 + 0.08×40 + ...
```

**Why Rejected:**
- **Loss of meaning:** Percentile 75 in housing ($200k) vs percentile 75 in food ($5k) are not equivalent
- **Non-linear:** A city at 90th percentile in all categories is exponentially better than 50th in all, but weighted average doesn't capture this
- **Harder to explain:** "Your composite percentile is 67.3" - what does that mean in dollars?
- **Obscures trade-offs:** Hides whether costs are high because of housing vs taxes vs childcare

**When It's Useful:**
- Quality-of-life indexes where dollar amounts aren't comparable (weather, crime, schools)
- We may use this for **ranking** (supplementary percentile display), but not for primary score

---

### Alternative 2: Mortgage Payment Focused Index

**Approach:** Calculate affordable mortgage payment (28% of gross income), compare to actual costs.

```
Max Affordable Payment = Income × 0.28 / 12
Actual Payment = (Mortgage + Tax + Insurance) / 12
Affordability = Max Affordable / Actual
```

**Why Rejected:**
- **Too narrow:** Ignores 70% of household expenses
- **Industry bias:** The 28% rule is a lending guideline, not a measure of quality of life
- **Doesn't account for:** Childcare, healthcare, regional price differences
- **Favors high-income:** Someone earning $200k has 72% for other expenses; someone at $50k has 72% for everything including food

**When It's Useful:**
- Mortgage pre-qualification (banks use this)
- We include this as a **housing-specific metric** but not the comprehensive score

---

### Alternative 3: Z-Score Normalization

**Approach:** For each cost category, calculate z-score (distance from mean in standard deviations).

```
Z = (City Value - National Mean) / Standard Deviation
Composite Z = Weighted Average of Category Z-Scores
```

**Why Rejected:**
- **Assumes normal distribution:** Housing costs are heavily right-skewed (San Francisco/NYC outliers)
- **Sensitive to outliers:** One extreme city distorts all comparisons
- **Harder interpretation:** "Your z-score is -1.2" requires statistics knowledge
- **Negative values:** Confusing to users ("Is negative good or bad?")

**When It's Useful:**
- Academic research with normally distributed data
- Quality control in manufacturing

**Our Choice:** Percentiles are more robust for skewed economic data.

---

### Alternative 4: Single Household Type (No Personas)

**Approach:** Calculate for "median household" only, no differentiation by family type.

**Why Rejected:**
- **Childcare variance:** A single adult pays $0; a family pays $15,000+. Averaging these is meaningless.
- **Tax brackets:** Single vs married filing jointly vs head of household have different rates
- **Housing needs:** 1BR vs 4BR fundamentally different markets
- **Medicare vs private:** Retirees have different healthcare costs

**Compromise:**
- Default to **Family (2 adults, 2 children)** since it's closest to BLS "average household"
- Prominently display household selector: "Viewing for: Family of 4 [Change]"
- Explain that scores vary significantly by household type

---

### Alternative 5: Replace Simple Ratio Entirely

**Approach:** Remove housing ratio, show only True Affordability Score.

**Why Rejected:**
- **Familiarity:** Many users know the 3× rule of thumb
- **Speed:** Ratio is quick to grasp; TAS requires explanation
- **SEO:** Existing content and backlinks reference "home price to income ratio"
- **Data availability:** Some locations may only have housing + income (no full cost data)

**Our Choice:** **Dual metrics** - show both, with TAS as primary and ratio as secondary.

---

### Alternative 6: Equal Weighting (All Categories 12.5%)

**Approach:** Weight all 8 categories equally instead of by actual expenditure.

**Why Rejected:**
- **Ignores reality:** Housing is 33% of spending; food is 13%. Equal weight distorts impact.
- **Overweights small items:** Utilities (6% actual) would get 2× more influence
- **Underweights housing:** 33% → 12.5% would hide housing affordability crisis

**Theoretical Appeal:** Philosophically, "all needs are equal" (food, shelter, health)

**Practical Problem:** Dollar amounts differ by 10×. $30k housing vs $3k utilities can't be weighted equally.

---

### Alternative 7: User-Customizable Weights

**Approach:** Let users adjust weights: "I care more about healthcare, less about transportation."

**Why Rejected for MVP:**
- **Complexity:** Most users don't know what weights to choose
- **Incomparable:** Can't rank cities if everyone uses different formulas
- **Analysis paralysis:** Too many options overwhelm users
- **SEO:** "Most Affordable Cities" list requires single methodology

**Future Enhancement:** Advanced users could customize in calculator tool, but rankings use standard weights.

---

## Implementation Roadmap

### Phase 1: Database Schema (Week 1)
- [x] Already exists: `AffordabilitySnapshot` table in schema
- [x] Already exists: Cost dimension tables (healthcare, transportation, childcare, taxes)
- [ ] Add: `persona_scores` JSON field to store all 4 household types
- [ ] Add: `data_quality_flag` enum ('complete', 'partial', 'estimated')

### Phase 2: Data Collection (Weeks 2-4)
- [ ] **Housing:** Already have (Zillow ZHVI)
- [ ] **Income:** Already have (Census ACS)
- [ ] **Property Tax:** Scrape county tax assessor data / Tax Foundation
- [ ] **Income Tax:** Tax Foundation state/local tax database
- [ ] **Healthcare:** Healthcare.gov marketplace premiums by county + KFF data
- [ ] **Transportation:** AAA annual cost + BLS regional factors + transit data
- [ ] **Childcare:** HHS childcare data + state surveys
- [ ] **Utilities:** EIA electricity/gas rates by state
- [ ] **Food:** USDA food plans × BEA regional price parities
- [ ] **Regional Price Parities:** Download BEA RPP data (state + metro)

### Phase 3: Calculation Engine (Week 5)
- [ ] Function: `calculateTrueAffordabilityScore(location, persona)`
- [ ] Function: `calculateCostBreakdown(location, persona)` → 8 categories
- [ ] Function: `calculatePercentileRank(location)`
- [ ] Function: `imputeMissingData(location, category)` → fallback logic
- [ ] Function: `determineDataQuality(location)` → flag

### Phase 4: UI Components (Week 6)
- [ ] Component: `TrueAffordabilityBadge` (hero score display)
- [ ] Component: `PersonaSelector` (dropdown to switch household type)
- [ ] Component: `CostBreakdownChart` (bar chart of 8 categories)
- [ ] Component: `AffordabilityComparisonTable` (side-by-side cities)
- [ ] Component: `MethodologyModal` (detailed explanation)

### Phase 5: Testing & Validation (Week 7)
- [ ] Validate against known benchmarks (MIT Living Wage, EPI Family Budget)
- [ ] Spot-check 20 cities: Do scores match intuition?
- [ ] Compare to user surveys: "Where do you feel stretched?"
- [ ] A/B test: TAS vs Ratio - which do users prefer?

### Phase 6: Content & SEO (Week 8)
- [ ] Write methodology page (2,000 words)
- [ ] Create worked examples (10 cities)
- [ ] Update all city pages with TAS
- [ ] Blog post: "Introducing True Affordability Score"
- [ ] Press release: "Beyond Home Prices: New Index Reveals Hidden Costs"

### Phase 7: Launch & Iteration (Week 9+)
- [ ] Soft launch with beta tag
- [ ] Collect user feedback
- [ ] Refine weights based on usage
- [ ] Add more personas (e.g., "Young Professional", "Large Family")
- [ ] API endpoint: `/api/v2/affordability?location=X&persona=Y`

---

## Open Questions for Future Research

1. **Childcare Age Assumptions:** We assume ages 3 and 7. Should we support custom ages (infant care is 2× more expensive)?

2. **Homeownership vs Renting:** Should we calculate separate TAS for renters vs buyers? Renters avoid property tax but pay higher monthly costs.

3. **Income Tax Brackets:** We use median income, but marginal rates differ. Should we calculate for $50k, $75k, $100k separately?

4. **Commute Distance:** Transportation costs vary by commute length. Do we need metro-specific commute data?

5. **Quality Adjustments:** Should a city with great public schools "credit" childcare costs (less private school need)?

6. **Lifestyle Inflation:** High-income areas have cultural pressure to spend more (San Francisco "essentials" ≠ Topeka "essentials"). How to address?

7. **Remote Work:** Should remote workers exclude commute costs? Or is that a "persona" variant?

8. **Temporal Changes:** How often to recalculate? Monthly (with Zillow updates), quarterly, or annually?

---

## Conclusion

The True Affordability Score (TAS) provides a comprehensive, transparent, and actionable metric for comparing the real cost of living across US cities. By incorporating 8 essential cost dimensions with empirically-based weights, supporting multiple household personas, and using percentile-based normalization, we create a system that is:

1. **More accurate** than simple housing ratios
2. **More intuitive** than complex statistical indexes
3. **More actionable** for users making relocation decisions
4. **More transparent** with clear methodology and data sources

The dual-metric approach (keeping simple ratio + adding TAS) balances familiarity with innovation, allowing gradual user adoption while maintaining SEO value of existing content.

**Next Steps:**
1. Agent 1: Review methodology for alignment with recommended metrics
2. Agent 2: Assess data source feasibility and identify gaps
3. Implementation team: Build calculation engine and validate against benchmarks
4. User testing: A/B test TAS vs ratio for user preference

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Next Review:** After Agent 1 & 2 feedback
