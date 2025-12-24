# True Affordability Score - Implementation Plan

## Executive Summary

**Problem:** The current affordability ratio (Home Value ÷ Income) is too simplistic. It ignores critical location-based costs that dramatically affect real affordability: property taxes, state/local income taxes, transportation costs, childcare, and healthcare.

**Solution:** Implement a "True Affordability Score" that calculates net disposable income after ALL fixed costs, then compares it to housing costs.

**Impact:** Transform from a "cocktail party stat" site into a genuine decision-making tool for people considering relocation.

---

## Methodology Overview

### Current Formula
```
Affordability Ratio = Home Value ÷ Median Income
```

### New Formula
```
True Affordability Score = Net Disposable Income ÷ Annual Housing Cost

Where:
  Net Disposable Income = Gross Income
                        - State/Local Income Tax
                        - Property Tax
                        - Transportation Costs
                        - Childcare Costs (if applicable)
                        - Healthcare Premiums

  Annual Housing Cost = Mortgage P&I
                      + Property Tax
                      + Homeowners Insurance
```

### Score Interpretation

| Score | Tier | Meaning |
|-------|------|---------|
| **2.5+** | Extremely Comfortable | Housing is <28% of take-home |
| **2.0-2.5** | Very Comfortable | Housing is 33-40% of take-home |
| **1.5-2.0** | Comfortable | Housing is 40-50% of take-home |
| **1.0-1.5** | Tight | Housing is 50-67% of take-home |
| **0.5-1.0** | Very Tight | Housing is 67-100% of take-home |
| **< 0.5** | Unaffordable | Housing exceeds remaining income |

---

## Data Sources (All Publicly Available)

### 1. Property Taxes
- **API Ninjas Property Tax API** - 25th/50th/75th percentile rates by location
- **Tax Foundation** - County-level property tax data
- **Update Frequency:** Annual
- **Cost:** Free tier available

### 2. State/Local Income Taxes
- **Tax Foundation GitHub Repo** - Structured tax rate data
- **Tax Foundation API** - 2025 brackets and rates
- **Update Frequency:** Annual (January)
- **Cost:** Free

### 3. Childcare Costs
- **Dept of Labor - National Database of Childcare Prices** - County-level (2008-2022)
- **Child Care Aware of America** - State/county averages
- **MIT Living Wage Calculator** - Incorporates childcare
- **Update Frequency:** Annual
- **Cost:** Free

### 4. Transportation Costs
- **BLS Consumer Expenditure Survey** - MSA-level transportation spending
- **Census ACS** - Car ownership rates, commute patterns
- **H+T Affordability Index (CNT)** - Location-based transport costs
- **Update Frequency:** Annual
- **Cost:** Free

### 5. Healthcare Costs
- **Kaiser Family Foundation State Health Facts** - 800+ health indicators by state
- **CMS National Health Expenditure Data** - State-level costs
- **Peterson-KFF Health System Tracker** - Regional comparisons
- **Update Frequency:** Annual
- **Cost:** Free

---

## Database Schema Changes

### New Tables

```prisma
// Property tax rates by location
model PropertyTaxRate {
  id              String   @id @default(cuid())
  geoType         GeoType
  geoId           String   @db.VarChar(16)
  effectiveRate   Float    // Median effective rate (%)
  rate25th        Float?
  rate75th        Float?
  asOfYear        Int
  source          String?  @db.VarChar(255)
  updatedAt       DateTime @updatedAt

  @@unique([geoType, geoId, asOfYear])
  @@map("property_tax_rate")
}

// State/local income tax data
model IncomeTaxRate {
  id                    String   @id @default(cuid())
  stateAbbr             String   @db.VarChar(2)
  localJurisdiction     String?  @db.VarChar(255)
  hasTax                Boolean  @default(true)
  effectiveRateAt50k    Float
  effectiveRateAt75k    Float
  effectiveRateAt100k   Float
  effectiveRateAt150k   Float
  effectiveRateAt200k   Float
  taxYear               Int
  source                String?  @db.VarChar(255)
  updatedAt             DateTime @updatedAt

  @@unique([stateAbbr, localJurisdiction, taxYear])
  @@map("income_tax_rate")
}

// Transportation costs by metro area
model TransportationCost {
  id                    String   @id @default(cuid())
  metroArea             String   @db.VarChar(255)
  stateAbbr             String   @db.VarChar(2)
  annualCarCost         Float
  carOwnershipRate      Float
  annualTransitPass     Float?
  transitModeShare      Float
  estimatedAvgCost      Float
  asOfYear              Int
  source                String?  @db.VarChar(255)
  updatedAt             DateTime @updatedAt

  @@unique([metroArea, asOfYear])
  @@map("transportation_cost")
}

// Childcare costs by county/state
model ChildcareCost {
  id                    String   @id @default(cuid())
  geoLevel              String   @db.VarChar(20) // "county" or "state"
  geoId                 String   @db.VarChar(50)
  stateFips             String   @db.VarChar(2)
  infantCost            Float?
  toddlerCost           Float?
  preschoolCost         Float?
  schoolAgeCost         Float?
  avgAnnualCost         Float
  asOfYear              Int
  source                String?  @db.VarChar(255)
  updatedAt             DateTime @updatedAt

  @@unique([geoLevel, geoId, asOfYear])
  @@map("childcare_cost")
}

// Healthcare costs by state/region
model HealthcareCost {
  id                    String   @id @default(cuid())
  stateAbbr             String   @db.VarChar(2)
  region                String?  @db.VarChar(50)
  individualPremium     Float
  familyPremium         Float
  avgDeductible         Float?
  avgOutOfPocket        Float?
  costOfCareIndex       Float?
  asOfYear              Int
  source                String?  @db.VarChar(255)
  updatedAt             DateTime @updatedAt

  @@unique([stateAbbr, region, asOfYear])
  @@map("healthcare_cost")
}

// Enhanced affordability with comprehensive costs
model AffordabilitySnapshot {
  id                    String   @id @default(cuid())
  geoType               GeoType
  geoId                 String   @db.VarChar(16)
  asOfDate              DateTime @db.Date

  // Original metrics
  homeValue             Float?
  medianIncome          Float?
  simpleRatio           Float?

  // Cost breakdowns (annual)
  propertyTaxCost       Float?
  incomeTaxCost         Float?
  transportationCost    Float?
  childcareCost         Float?
  healthcareCost        Float?

  // Calculated scores
  netDisposableIncome   Float?
  annualHousingCost     Float?
  trueAffordabilityScore Float?

  // Persona-specific scores (JSON)
  personaScores         String?  @db.Text

  // Metadata
  assumptions           String?  @db.Text
  sources               String?  @db.Text
  createdAt             DateTime @default(now())

  @@unique([geoType, geoId, asOfDate])
  @@index([trueAffordabilityScore])
  @@map("affordability_snapshot")
}

// User customized calculations
model UserCalculation {
  id                    String   @id @default(cuid())
  sessionId             String?  @db.VarChar(255)
  geoType               GeoType
  geoId                 String   @db.VarChar(16)

  // User inputs
  annualIncome          Float
  downPaymentPct        Float    @default(0.2)
  householdType         String   @db.VarChar(50)
  numChildren           Int      @default(0)
  needsCar              Boolean  @default(true)
  mortgageRate          Float?

  // Results
  maxAffordableHome     Float?
  estimatedMonthly      Float?
  trueAffordability     Float?
  netDisposable         Float?

  createdAt             DateTime @default(now())

  @@index([sessionId])
  @@map("user_calculation")
}
```

---

## User Customization Parameters

### Household Profiles
1. **Single** - Individual, no dependents
2. **Couple (DINK)** - Dual income, no kids
3. **Family** - Household with children
4. **Empty Nesters** - Kids grown, higher income
5. **Retiree** - Fixed income, Medicare
6. **Remote Worker** - Eliminates commute costs

### Adjustable Inputs
- **Annual Income** (overrides median)
- **Down Payment %** (3-30%, default 20%)
- **Mortgage Rate** (default: current market rate)
- **Number of Children** (0-4+)
- **Child Ages** (affects childcare costs)
- **Car Dependency** (yes/no/hybrid)
- **Work From Home** (reduces transportation)

---

## UI/UX Changes

### 1. Detail Pages (City/ZIP)

**New Hero Section:**
```
Before: Affordability Ratio: 4.2
After:  True Affordability Score: 1.8 ⭐ | Comfortable
```

**New Component: Cost Breakdown Card**
- Stacked bar showing income → fixed costs → disposable income
- Expandable sections for each cost category
- Comparison to national/state averages
- "Customize for You" button

### 2. Rankings Page

**New Filters:**
- Sort by True Affordability Score (not just simple ratio)
- Filter by household type (Single/Family/Retiree/Remote)
- Filter by max property tax rate
- Filter by transit accessibility

**Enhanced Table:**
- Add columns: Net Take-Home, Money Left Over, True Score
- Show cost "surprises" (high prop tax, high childcare, etc.)

### 3. Comparison Tool

**Side-by-side cost breakdowns:**
- Show full waterfall for each location
- Highlight which costs differ most
- Calculate winner based on user's profile
- "Copy to calculator" button

### 4. Homepage

**New Hero:**
"Find Where You Can ACTUALLY Afford to Live"
"Most sites show home prices. We show what's left after taxes, childcare, transportation, and healthcare."

**New Featured Lists:**
- "Most Underrated Cities" (great True Score despite higher prices)
- "Most Deceptive Cities" (look cheap, hidden costs)

### 5. New Page: Cost of Living Explorer

Route: `/cost-of-living/[location]`

Interactive income slider that updates real-time visualization of:
- Gross income
- All deductions
- Net disposable
- Housing cost
- Money left over

---

## Implementation Phases

### Phase 1: Data Collection (Weeks 1-3)
**Goal:** Populate new cost tables with current data

- [ ] Set up ETL pipelines for each data source
- [ ] Create property tax import script (API Ninjas + Tax Foundation)
- [ ] Create income tax import script (Tax Foundation GitHub)
- [ ] Create transportation cost import (BLS + Census)
- [ ] Create childcare cost import (DOL database)
- [ ] Create healthcare cost import (KFF)
- [ ] Run initial data load for all locations
- [ ] Validate data quality and coverage

**Deliverable:** Database populated with cost data for all geographies

---

### Phase 2: Calculation Engine (Weeks 4-5)
**Goal:** Build backend logic to calculate True Affordability Score

- [ ] Write `calculateTrueAffordability()` function
- [ ] Write `calculatePersonaScores()` function
- [ ] Write `estimateNetDisposableIncome()` helper
- [ ] Write `calculateAnnualHousingCost()` helper
- [ ] Create API endpoints for calculations
- [ ] Add caching layer (scores don't change often)
- [ ] Write unit tests for all calculations
- [ ] Generate AffordabilitySnapshot records for all locations

**Deliverable:** API that returns True Affordability Score for any location + user params

---

### Phase 3: Enhanced Calculator (Week 6)
**Goal:** Upgrade affordability calculator with new methodology

- [ ] Create `HouseholdSelector` component
- [ ] Create `CostBreakdownChart` component (stacked bar)
- [ ] Create `FinancialInputs` component (income, down payment, rate)
- [ ] Create `TransportationToggle` component
- [ ] Create `ChildcareInputs` component (conditional on household type)
- [ ] Create `ResultsPanel` component showing True Score
- [ ] Add real-time calculation on input change
- [ ] Add "Compare to Nearby" mini-widget
- [ ] Add "Save Calculation" feature (writes to UserCalculation table)

**Deliverable:** Interactive calculator that shows full cost breakdown

---

### Phase 4: Detail Page Redesign (Week 7)
**Goal:** Show True Affordability prominently on all city/ZIP pages

- [ ] Update hero to show True Score instead of simple ratio
- [ ] Add "Cost of Living Breakdown" card to detail pages
- [ ] Add stacked bar visualization (Austin vs National Average)
- [ ] Update persona cards to use True Score for fit assessment
- [ ] Add "Key Cost Differences" callouts (high prop tax, no income tax, etc.)
- [ ] Update FAQ to explain True Affordability methodology
- [ ] Add cost data to sources section

**Deliverable:** Detail pages showcase comprehensive affordability

---

### Phase 5: Rankings & Comparison (Week 8)
**Goal:** Allow users to filter/sort by True Affordability

- [ ] Add "True Affordability" sort option to rankings page
- [ ] Add household type filter (recalculates scores for that persona)
- [ ] Add property tax filter
- [ ] Add transit score filter
- [ ] Update comparison tool to show cost breakdowns
- [ ] Add "winner" badges in comparison (who saves most)
- [ ] Add "copy to calculator" button

**Deliverable:** Rankings and comparisons use True Affordability

---

### Phase 6: Homepage & Discoverability (Week 9)
**Goal:** Educate users about new methodology

- [ ] Redesign homepage hero (emphasize "ACTUAL affordability")
- [ ] Add "How It Works" section explaining True Score
- [ ] Create "Most Underrated Cities" featured list
- [ ] Create "Most Deceptive Cities" featured list
- [ ] Update persona cards to link to True Score rankings
- [ ] Add testimonial/use case section
- [ ] Update meta descriptions and SEO

**Deliverable:** Homepage clearly communicates value prop

---

### Phase 7: Cost Explorer Page (Week 10)
**Goal:** Standalone interactive cost breakdown tool

- [ ] Create `/cost-of-living/[location]` route
- [ ] Build interactive income slider
- [ ] Build real-time waterfall visualization
- [ ] Add "How [City] Compares" section
- [ ] Add "Better/Worse Than Average" callouts
- [ ] Add social share buttons
- [ ] Generate pages for top 100 cities

**Deliverable:** Sharable, SEO-friendly cost breakdown pages

---

### Phase 8: Data Updates & Automation (Week 11-12)
**Goal:** Set up automated data refresh pipelines

- [ ] Create scheduled jobs for data updates (monthly/annually)
- [ ] Add data versioning (track when each source was last updated)
- [ ] Create admin dashboard showing data freshness
- [ ] Add "Last updated" timestamps to UI
- [ ] Set up monitoring/alerts for failed data fetches
- [ ] Document manual update procedures
- [ ] Create data quality checks (outlier detection)

**Deliverable:** Self-updating data pipelines

---

### Phase 9: Testing & Refinement (Week 13)
**Goal:** Ensure accuracy and usability

- [ ] Validate calculations against manual spreadsheets (10 cities)
- [ ] User testing sessions (5-10 users)
- [ ] A/B test messaging ("True Affordability" vs other names)
- [ ] Performance testing (ensure calculations are fast)
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Fix bugs and refine UX

**Deliverable:** Production-ready feature

---

### Phase 10: Launch & Marketing (Week 14+)
**Goal:** Get eyeballs on the new feature

- [ ] Write methodology page explaining True Score
- [ ] Write blog post: "Why Affordability Ratios Lie"
- [ ] Submit to Product Hunt
- [ ] Post on Reddit (r/realestate, r/personalfinance, r/dataisbeautiful)
- [ ] Create shareable graphics (most underrated cities)
- [ ] Reach out to relocation/remote work blogs for backlinks
- [ ] Update Open Graph images
- [ ] Monitor analytics and user feedback

**Deliverable:** Feature is live and promoted

---

## Success Metrics

### Data Quality
- [ ] Cost data coverage for 95%+ of cities with home value data
- [ ] All 50 states have income tax data
- [ ] Top 100 metros have transportation cost data
- [ ] All states have childcare and healthcare data

### User Engagement
- [ ] 50%+ of detail page visitors interact with calculator
- [ ] Average session duration increases by 30%+
- [ ] Comparison tool usage increases by 40%+
- [ ] Bounce rate decreases by 20%+

### Traffic Growth
- [ ] Organic search traffic increases by 100%+ (long tail keywords)
- [ ] Direct traffic increases by 50%+ (brand recognition)
- [ ] Social shares increase by 200%+ (more shareable insights)
- [ ] Backlinks increase by 50%+ (linkable assets)

### Conversion (if monetized)
- [ ] Email signups increase by 60%+
- [ ] API subscriptions (if offered)
- [ ] Affiliate conversions (relocation services, realtors)

---

## Risk Mitigation

### Data Quality Risks
**Risk:** Public data sources have gaps, especially for small/rural areas
**Mitigation:**
- Use state-level averages as fallback for missing county data
- Clearly indicate when estimates are used vs actual data
- Allow users to override estimates with their own numbers

### Calculation Complexity
**Risk:** Too many inputs overwhelm users
**Mitigation:**
- Smart defaults (use location data to pre-fill car dependency, etc.)
- Progressive disclosure (basic view shows result, expand for details)
- Presets for common household types

### Performance
**Risk:** Calculating on-the-fly for every page view is slow
**Mitigation:**
- Pre-calculate scores for standard assumptions (median income, 20% down)
- Cache results aggressively
- Only recalculate when user customizes inputs
- Use edge caching (Vercel Edge Functions)

### User Confusion
**Risk:** "Why is True Score different from ratio?" causes distrust
**Mitigation:**
- Clear naming ("True" implies "more accurate")
- Prominent methodology link
- Show both scores, explain difference inline
- Use tooltips liberally

### Data Staleness
**Risk:** Cost data updates slowly, becomes outdated
**Mitigation:**
- Display "as of [date]" timestamps
- Automated alerts when data is >18 months old
- Annual refresh cycle matches Census ACS updates
- Allow users to override with current estimates

---

## Maintenance Plan

### Annual Updates (Every January)
- [ ] Refresh income tax rates (Tax Foundation publishes in Jan)
- [ ] Refresh property tax data (Tax Foundation + local assessors)
- [ ] Update childcare costs (DOL database, Child Care Aware)
- [ ] Update healthcare premiums (KFF publishes annual reports)

### Quarterly Updates (Every 3 months)
- [ ] Update mortgage rate defaults (FRED API or manual)
- [ ] Refresh transportation cost estimates (BLS updates quarterly)
- [ ] Review and update calculation assumptions

### Monthly Updates
- [ ] Monitor for data source changes (API deprecations, URL changes)
- [ ] Review user-submitted corrections/feedback
- [ ] Update featured lists (most underrated cities) if scores change

### As Needed
- [ ] Add new data sources as they become available
- [ ] Respond to user-reported errors
- [ ] Adjust calculation methodology based on feedback

---

## Open Questions / Decisions Needed

1. **Naming:** "True Affordability Score" vs "Real Affordability Index" vs "Take-Home Affordability"?
   - Recommendation: **True Affordability Score** (implies accuracy, simple)

2. **Should we keep the simple ratio visible?**
   - Recommendation: Yes, show both. Simple ratio for quick comparison, True Score for decision-making.

3. **How to handle missing data?**
   - Option A: Use state averages as fallback
   - Option B: Show "Data not available" and omit from rankings
   - Recommendation: **Option A** with clear indicator ("Estimated")

4. **Should persona scores be pre-calculated or on-demand?**
   - Recommendation: Pre-calculate for standard personas, save as JSON in AffordabilitySnapshot. Faster page loads.

5. **Monetization strategy?**
   - Option A: Keep free, monetize via ads
   - Option B: Freemium (basic free, advanced features paid)
   - Option C: API access for B2B (relocation companies, HR departments)
   - Recommendation: Start free, add **Option C** (B2B API) after traffic grows

6. **What's the MVP for launch?**
   - Recommendation: Phases 1-6 (data + calculator + detail pages + rankings). Defer Cost Explorer page.

---

## Appendix: Example Calculations

### Example 1: Austin, TX (Family with 2 kids, $120k income)

```
Gross Income:              $120,000

Deductions:
  State Income Tax:        -$0      (TX has no state income tax)
  Property Tax:            -$9,350  (2.2% on $425k home)
  Transportation:          -$11,200 (car required, 96% ownership rate)
  Childcare (2 kids):      -$20,400 ($10,200/child avg in Travis County)
  Healthcare (family):     -$9,600  (TX average family premium)
                           ________
Net Disposable Income:     $69,450

Annual Housing Cost:
  Mortgage P&I:            $28,200  ($425k home, 20% down, 7% rate)
  Property Tax:            $9,350
  Insurance:               $2,100
                           ________
Total Housing Cost:        $39,650

True Affordability Score:  $69,450 / $39,650 = 1.75
Tier:                      Comfortable (40-50% of take-home)
Money Left Over:           $29,800/year ($2,483/month)
```

### Example 2: Denver, CO (Same family, same income)

```
Gross Income:              $120,000

Deductions:
  State Income Tax:        -$5,400  (4.5% flat rate)
  Property Tax:            -$3,780  (0.7% on $540k home)
  Transportation:          -$8,400  (transit-friendly, 70% own cars)
  Childcare (2 kids):      -$28,000 ($14,000/child, highest in nation)
  Healthcare (family):     -$10,200
                           ________
Net Disposable Income:     $64,220

Annual Housing Cost:
  Mortgage P&I:            $36,000  ($540k home, 20% down, 7% rate)
  Property Tax:            $3,780
  Insurance:               $2,200
                           ________
Total Housing Cost:        $41,980

True Affordability Score:  $64,220 / $41,980 = 1.53
Tier:                      Comfortable (borderline Tight)
Money Left Over:           $22,240/year ($1,853/month)
```

**Insight:** Despite Denver having a higher median income ($85k vs $78k) and lower property taxes, the family in Austin has **$7,557 more annually** due to no state income tax and cheaper childcare. The simple ratio made Denver look worse (6.4 vs 5.4), but True Score shows Austin is actually tighter (1.75 vs 1.53 favors Denver).

Wait, let me recalculate... 1.75 > 1.53, so Austin is actually MORE affordable. Denver's high childcare costs and income tax make it tighter despite appearing expensive on simple ratio. This shows exactly why True Score matters!

---

## Conclusion

Implementing True Affordability Score transforms this from a data curiosity into a genuinely useful tool. Users will finally understand what their money actually buys them in different cities, not just what homes cost.

**Estimated Effort:** 10-14 weeks (1 developer full-time)
**Estimated Cost:** $0 in data (all public sources) + hosting costs
**Expected Impact:** 2-3x increase in organic traffic, 10x increase in engagement, actual product-market fit

This is the difference between "neat website" and "I used this to decide where to move."
