# Affordability Index 2.0: Comprehensive Implementation Master Plan

**Date:** December 22, 2025
**Status:** PLAN MODE - Multi-Agent Collaboration Complete
**Version:** 1.0

---

## Executive Summary

Three AI agents have collaborated to design a comprehensive transformation of the Affordability Index from a simple housing-price-to-income ratio into a **true multi-factor cost-of-living platform** comparable to MIT Living Wage Calculator and BEA Regional Price Parities.

### The Vision

Transform from:
- **Current:** Home Value / Income = Affordability Ratio
- **Future:** Comprehensive 8-factor True Affordability Score covering housing, healthcare, transportation, food, childcare, taxes, utilities, and insurance

### Key Findings

1. **HIGHLY FEASIBLE** - All data sources are free government datasets with county-level granularity
2. **VALIDATED METHODOLOGY** - Composite index design based on proven models (MIT, BEA, C2ER)
3. **CLEAR ROADMAP** - 6-phase implementation over 12 weeks
4. **COMPETITIVE ADVANTAGE** - Only free, comprehensive affordability tool with persona support

### Quick Wins (Start Week 1)

These 3 metrics can be implemented IMMEDIATELY with the highest user value:

1. **HUD Fair Market Rents** - Add rental affordability (Easy, High Impact)
2. **FHFA House Price Index** - Quarterly home price trends (Easy, Complements Zillow)
3. **Tax Foundation Property Taxes** - Critical missing housing cost (Medium, High Impact)

---

## Multi-Agent Research Summary

### Agent 1: Data Architecture Specialist

**Mission:** Identify comprehensive affordability metrics and data sources

**Deliverables:**
- `AFFORDABILITY_DATA_RESEARCH.md` (30,000+ word analysis)
- `AFFORDABILITY_METRICS_SUMMARY.md` (Quick reference)

**Key Recommendations:**

| Tier | Metrics | Implementation Difficulty | Timeline |
|------|---------|---------------------------|----------|
| **Tier 1** | Rental costs, Home prices, Property tax, Childcare, Sales tax, Home insurance | Easy-Medium | Weeks 1-4 |
| **Tier 2** | Food, Healthcare, Transportation, Income tax, Auto insurance | Medium-Hard | Weeks 5-10 |
| **Tier 3** | Utilities, Broadband | Medium | Weeks 11-12 |

**Major Discoveries:**
- Treasury FIO Homeowners Insurance (2024 release): Most comprehensive public insurance dataset ever, ZIP-level
- DOL Childcare Database: County-level prices for 2,360 counties (critical family affordability factor)
- FHFA HPI: Free government alternative to Zillow with county AND ZIP-level quarterly data

### Agent 3: Index Methodology Specialist

**Mission:** Design composite affordability index calculation

**Deliverables:**
- `COMPOSITE_INDEX_METHODOLOGY.md` (Main methodology)
- `COMPOSITE_INDEX_TECHNICAL_APPENDIX.md` (Formulas & pseudocode)
- `METHODOLOGY_COMPARISON_MATRIX.md` (Competitive analysis)

**Key Recommendations:**

**Dual-Index Approach:**
1. Keep simple ratio as "Housing Affordability Score" (legacy/SEO continuity)
2. Add "True Affordability Score" (TAS) as primary metric

**True Affordability Score Formula:**
```
TAS = (Median Income - Total Annual Costs) / Median Income × 100

Where Total Annual Costs = Weighted Sum of 8 Categories:
  - Housing (33%): Mortgage/rent + property tax + home insurance
  - Transportation (17%): Vehicle ownership + commute costs
  - Food (13%): Regional grocery prices
  - Taxes (15%): Income + sales tax
  - Healthcare (8%): Premiums + Medicare GPCI adjustments
  - Childcare (5%): If family persona (0% for singles/retirees)
  - Utilities (6%): Electric + gas + water
  - Other (3%): Miscellaneous essentials
```

**Interpretation:**
- TAS = 20% means "20% of income remains after essential costs" (Good affordability)
- TAS = -5% means "Costs exceed income by 5%" (Challenging affordability)
- Range: -20% to +50% (realistic bounds)

**Persona Support:** 4 household types with adjusted weights:
1. Single Adult
2. Couple
3. Family (2 adults, 2 children)
4. Retiree (65+)

**Validation Targets:**
- MIT Living Wage Calculator (expect r > 0.85 correlation)
- BEA Regional Price Parities (expect r > 0.90)
- C2ER Cost of Living Index (expect r > 0.80)

### Agent 2: Data Engineering Specialist

**Mission:** Evaluate technical feasibility and create ETL implementation guides

**Status:** Analysis complete, integration strategies identified

**Key Findings:**
- All Tier 1 data sources have **direct download or API access**
- Geographic mapping is **standardized on county FIPS codes**
- **No licensing restrictions** for government data
- **Python + Pandas + DuckDB** stack is sufficient (no new tools needed)

---

## Implementation Phases (12-Week Roadmap)

### Phase 1: Enhanced Housing Affordability (Weeks 1-2) 🎯 START HERE

**Goal:** Add rental affordability and property tax to existing housing ratio

**Data Sources:**
1. **HUD Fair Market Rents (FMR)** - https://www.huduser.gov/portal/datasets/fmr.html
   - Geography: Metro, County, ZIP (Small Area FMR for select metros)
   - Format: REST API + CSV downloads
   - Update: Annual (September/October release)
   - Implementation: Easy - direct API integration

2. **FHFA House Price Index** - https://www.fhfa.gov/data/hpi/datasets
   - Geography: State, Metro, County, ZIP
   - Format: CSV quarterly files
   - Update: Quarterly (45-day lag)
   - Implementation: Easy - file download + bulk load

3. **Tax Foundation Property Taxes** - https://taxfoundation.org/data/all/state/property-taxes-by-state-county/
   - Geography: County
   - Format: Interactive map + CSV export
   - Update: Annual
   - Implementation: Medium - web export + manual download

**Database Changes:**
```prisma
// Add to MetricSnapshot model
hudFmr1Br            Float?   // HUD Fair Market Rent 1-bedroom
hudFmr2Br            Float?   // HUD Fair Market Rent 2-bedroom
fhfaHpi              Float?   // FHFA House Price Index
propertyTaxRate      Float?   // Effective property tax rate (%)
```

**ETL Scripts to Create:**
- `etl/import_hud_fmr.py` - Fetch from HUD API, map to counties
- `etl/import_fhfa_hpi.py` - Download quarterly files, join on FIPS
- `etl/import_property_tax.py` - Parse Tax Foundation CSV

**UI Updates:**
- Add "Rental Affordability" vs "Ownership Affordability" toggle
- Display property tax burden as % of home value
- Show FHFA HPI quarterly trend chart

**Success Metrics:**
- 90%+ counties have FMR data
- 80%+ counties have FHFA HPI
- 95%+ counties have property tax rates

**Estimated Effort:** 40-60 hours

---

### Phase 2: Critical Family Expenses (Weeks 3-4)

**Goal:** Add childcare, homeowners insurance, and sales tax

**Data Sources:**
1. **DOL Childcare Prices** - https://www.datalumos.org/datalumos/project/226943/version/V1/view
   - Geography: County (2,360 counties, 2008-2022 data)
   - Format: CSV download
   - Update: Historic dataset (use 2022 as baseline, inflate annually)
   - Implementation: Easy-Medium - CSV import + county join

2. **Treasury FIO Homeowners Insurance** - https://home.treasury.gov/news/press-releases/jy2791
   - Geography: ZIP-level aggregated (2018-2022)
   - Format: CSV download (one-time historic release)
   - Update: One-time (use 2022, inflate annually)
   - Implementation: Easy-Medium - CSV import + ZIP to county aggregation

3. **Avalara Sales Tax Rates** - https://www.avalara.com/taxrates/en/download-tax-tables.html
   - Geography: County + ZIP
   - Format: Monthly CSV via email (free sign-up)
   - Update: Monthly
   - Implementation: Medium - email automation + CSV parsing

**Database Changes:**
```prisma
childcareCostInfant  Float?   // Annual childcare cost - infant center-based
childcareCostPreK    Float?   // Annual childcare cost - preschool
salesTaxRate         Float?   // Combined state+local sales tax rate (%)
homeInsurancePremium Float?   // Average annual homeowners insurance premium
```

**ETL Scripts:**
- `etl/import_childcare.py` - Load DOL CSV, join on county FIPS
- `etl/import_homeowners_insurance.py` - Load Treasury ZIP data, aggregate to county
- `etl/import_sales_tax.py` - Parse Avalara monthly files

**UI Updates:**
- Add "Family Affordability" persona with childcare costs
- Display insurance premium as % of home value
- Show sales tax impact on $50k annual spending

**Success Metrics:**
- 75%+ counties have childcare data
- 90%+ ZIPs have homeowners insurance
- 100% counties have sales tax rates

**Estimated Effort:** 40-60 hours

---

### Phase 3: Regional Cost Adjusters (Weeks 5-6)

**Goal:** Add food, healthcare, and income tax costs

**Data Sources:**
1. **USDA Food Prices** - https://www.ers.usda.gov/data-products/food-at-home-monthly-area-prices
   - Geography: 4 Census regions + 10 metro areas
   - Format: Excel downloads
   - Update: Monthly
   - Implementation: Easy-Medium - map counties to regions

2. **Medicare GPCI (Healthcare)** - https://www.cms.gov/medicare/payment/fee-schedules/physician
   - Geography: Medicare localities (89 areas, county-based)
   - Format: CSV downloads
   - Update: Every 3 years
   - Implementation: Medium - map counties to locality codes

3. **Tax Foundation Income Tax** - https://taxfoundation.org/data/all/state/state-income-tax-rates/
   - Geography: State (+ 10 states with local income tax)
   - Format: Web tables + PDFs
   - Update: Annual
   - Implementation: Medium - manual data entry or scraping

**Database Changes:**
```prisma
foodCostIndex        Float?   // Regional food price index (US avg = 100)
healthcareGpci       Float?   // Medicare GPCI composite
incomeStateTaxRate   Float?   // State income tax effective rate (%)
incomeLocalTaxRate   Float?   // Local income tax rate (%)
```

**ETL Scripts:**
- `etl/import_food_costs.py` - USDA data + regional mapping
- `etl/import_medicare_gpci.py` - CMS data + locality crosswalk
- `etl/import_income_tax.py` - Tax Foundation rates

**UI Updates:**
- Display food cost comparison vs. national average
- Show healthcare cost adjustments by region
- Add income tax calculator (state + local)

**Success Metrics:**
- 100% counties mapped to food regions
- 95%+ counties mapped to Medicare localities
- 100% states + local jurisdictions have income tax data

**Estimated Effort:** 50-70 hours

---

### Phase 4: Transportation & Auto Insurance (Weeks 7-8)

**Goal:** Model transportation costs from commute data and add auto insurance

**Data Sources:**
1. **Census ACS Commute Data** - https://data.census.gov
   - Geography: County, Place, ZIP, Tract
   - Format: Census API
   - Update: Annual (5-year estimates)
   - Implementation: Medium - API integration + modeling

2. **BLS/BEA Transportation Factors**
   - Combine regional price parities with commute patterns
   - Implementation: Medium-Hard - statistical modeling required

3. **NAIC Auto Insurance** (State averages)
   - Geography: State (ZIP-level from commercial providers if budget allows)
   - Format: PDF reports + state DOI filings
   - Update: Annual
   - Implementation: Medium - manual collection + data entry

**Database Changes:**
```prisma
avgCommuteMinutes    Float?   // Average commute time
transportCostIndex   Float?   // Modeled transportation cost index
autoInsurancePremium Float?   // Average annual auto insurance premium
```

**ETL Scripts:**
- `etl/import_commute_data.py` - Census ACS API
- `etl/calculate_transport_costs.py` - Model transport costs
- `etl/import_auto_insurance.py` - State averages

**UI Updates:**
- Display commute time and estimated transportation burden
- Show auto insurance premiums by state/county

**Success Metrics:**
- 95%+ counties have commute data
- Transportation cost model validated against AAA driving costs
- 100% states have auto insurance averages

**Estimated Effort:** 60-80 hours

---

### Phase 5: Utilities & Composite Score (Weeks 9-10)

**Goal:** Add utilities and calculate comprehensive True Affordability Score

**Data Sources:**
1. **EIA Electricity Prices** - https://www.eia.gov/electricity/sales_revenue_price/
   - Geography: State (utility territory for detailed analysis)
   - Format: Excel downloads
   - Update: Annual
   - Implementation: Easy-Medium

2. **EIA Natural Gas Prices** - https://www.eia.gov/naturalgas/
   - Geography: State
   - Format: Excel downloads
   - Update: Annual
   - Implementation: Easy-Medium

3. **FCC Broadband Affordability** - https://www.fcc.gov/BroadbandData
   - Geography: County
   - Format: CSV downloads
   - Update: Annual
   - Implementation: Medium

**Database Changes:**
```prisma
electricityRate      Float?   // Cents per kWh
naturalGasRate       Float?   // $ per therm
broadbandCost        Float?   // Average monthly broadband cost

// COMPOSITE SCORES
trueAffordabilityScore      Float?   // Primary comprehensive metric
housingAffordabilityScore   Float?   // Legacy ratio (home value/income)
affordabilityPercentile     Float?   // Ranking 0-100
costBreakdown               Json?    // JSON object with category breakdown
dataQualityFlag             String?  // "complete" | "partial" | "estimated"
```

**Calculation Engine:**
- `lib/calculateTrueAffordabilityScore.ts` - TypeScript implementation
- `etl/regenerate_affordability_snapshots.py` - Batch recalculation

**UI Updates:**
- **New Dashboard:** True Affordability Score as hero metric
- **Interactive Breakdown:** 8-category cost visualization (pie chart)
- **Persona Selector:** Toggle between Single/Couple/Family/Retiree
- **Comparison Mode:** Side-by-side city comparisons
- **Quality Badges:** Display data completeness indicators

**Success Metrics:**
- 100% states have utility rates
- 90%+ counties have complete data for composite score
- <10% locations rely on heavily imputed data

**Estimated Effort:** 70-90 hours

---

### Phase 6: Validation, Documentation & Launch (Weeks 11-12)

**Goal:** Validate methodology, document everything, and launch to production

**Validation Tasks:**

1. **Statistical Validation:**
   - Compare our scores to MIT Living Wage for 50 overlapping counties
   - Compare our scores to BEA Regional Price Parities for 384 MSAs
   - Compare our scores to C2ER COLI for participating cities
   - Target correlations: r > 0.80 for all comparisons

2. **Spot Checks:**
   - Manually verify 10 high-population counties against known cost data
   - Check outliers (top 10 most/least affordable)
   - Verify persona weights produce sensible results

3. **Edge Case Testing:**
   - Rural counties with missing data
   - High-cost metro areas (NYC, SF, HI)
   - Low-cost areas (Midwest, South)

**Documentation Tasks:**

1. **Public-Facing:**
   - Create `/methodology/` page explaining index calculation
   - Create `/data-sources/` page with attributions and update schedules
   - Add FAQ section addressing common questions
   - Create persona explainer page

2. **Internal:**
   - ETL runbook for data updates
   - Database schema documentation
   - API documentation (if exposing data programmatically)
   - Monitoring and alerting setup

**Launch Tasks:**

1. **Content & SEO:**
   - Update homepage with new messaging
   - Create launch blog post
   - Prepare social media graphics
   - SEO optimization for "comprehensive affordability index"

2. **Performance:**
   - Load testing for new database queries
   - Caching strategy for composite scores
   - CDN optimization for data-heavy pages

3. **Monitoring:**
   - Set up alerts for ETL failures
   - Track user engagement with new features
   - Monitor data freshness

**Success Metrics:**
- Methodology page ranks in top 10 for "affordability index methodology"
- User engagement increases 50%+ vs. simple ratio
- Zero P0 bugs in first 2 weeks post-launch

**Estimated Effort:** 60-80 hours

---

## Total Implementation Summary

| Phase | Focus | Weeks | Effort (hrs) | New Metrics | Cumulative Value |
|-------|-------|-------|--------------|-------------|------------------|
| 1 | Enhanced Housing | 1-2 | 40-60 | 3 | 🟢 High - Rental affordability |
| 2 | Family Expenses | 3-4 | 40-60 | 3 | 🟢 High - Childcare critical |
| 3 | Regional Adjusters | 5-6 | 50-70 | 3 | 🟡 Medium - Cost variations |
| 4 | Transportation | 7-8 | 60-80 | 3 | 🟡 Medium - Major expense |
| 5 | Composite Score | 9-10 | 70-90 | 4 | 🟢 High - Complete index |
| 6 | Launch | 11-12 | 60-80 | 0 | 🟢 High - Validation & SEO |
| **TOTAL** | | **12 weeks** | **320-440 hrs** | **16 metrics** | **MVP to World-Class** |

---

## Technical Architecture

### Database Schema Evolution

**Current State:**
```prisma
model MetricSnapshot {
  id                    String   @id @default(uuid())
  snapshotDate          DateTime
  geographyType         String   // "place" | "zcta"
  geographyId           String

  medianHomeValue       Float?
  medianHouseholdIncome Float?
  affordabilityRatio    Float?   // homeValue / income
}
```

**Phase 5 Complete:**
```prisma
model MetricSnapshot {
  // Core identifiers
  id                    String   @id @default(uuid())
  snapshotDate          DateTime
  geographyType         String
  geographyId           String

  // Housing metrics
  medianHomeValue       Float?
  medianHouseholdIncome Float?
  hudFmr1Br            Float?
  hudFmr2Br            Float?
  fhfaHpi              Float?
  propertyTaxRate      Float?
  homeInsurancePremium Float?

  // Tax metrics
  salesTaxRate         Float?
  incomeStateTaxRate   Float?
  incomeLocalTaxRate   Float?

  // Living costs
  childcareCostInfant  Float?
  childcareCostPreK    Float?
  foodCostIndex        Float?
  healthcareGpci       Float?

  // Transportation
  avgCommuteMinutes    Float?
  transportCostIndex   Float?
  autoInsurancePremium Float?

  // Utilities
  electricityRate      Float?
  naturalGasRate       Float?
  broadbandCost        Float?

  // Composite scores
  trueAffordabilityScore    Float?   // PRIMARY METRIC
  housingAffordabilityScore Float?   // Legacy simple ratio
  affordabilityPercentile   Float?   // Ranking 0-100

  // Metadata
  costBreakdown        Json?     // { housing: 12000, food: 8000, ... }
  dataQualityFlag      String?   // "complete" | "partial" | "estimated"

  @@index([geographyType, geographyId])
  @@index([trueAffordabilityScore])
}
```

### ETL Pipeline Architecture

**Directory Structure:**
```
etl/
├── import_hud_fmr.py              # Phase 1: HUD Fair Market Rents
├── import_fhfa_hpi.py             # Phase 1: FHFA House Price Index
├── import_property_tax.py         # Phase 1: Property taxes
├── import_childcare.py            # Phase 2: Childcare costs
├── import_homeowners_insurance.py # Phase 2: Home insurance
├── import_sales_tax.py            # Phase 2: Sales tax
├── import_food_costs.py           # Phase 3: USDA food prices
├── import_medicare_gpci.py        # Phase 3: Medicare GPCI
├── import_income_tax.py           # Phase 3: Income tax rates
├── import_commute_data.py         # Phase 4: Census commute
├── calculate_transport_costs.py   # Phase 4: Transportation model
├── import_auto_insurance.py       # Phase 4: Auto insurance
├── import_utilities.py            # Phase 5: EIA electricity/gas
├── import_broadband.py            # Phase 5: FCC broadband
├── calculate_composite_scores.py  # Phase 5: True Affordability Score
└── regenerate_all_snapshots.py    # Phase 6: Full recalculation
```

**Shared Utilities:**
```
etl/utils/
├── geo_crosswalks.py       # County/ZIP/Place/MSA mappings
├── data_quality.py         # Validation and imputation
├── api_clients.py          # Reusable API wrappers
└── inflation_adjusters.py  # CPI adjustments for historical data
```

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data source discontinuation | Low | High | Monitor source health, maintain backups, identify alternatives |
| API rate limits | Medium | Medium | Implement caching, batch requests, request increases |
| Geographic mapping errors | Medium | High | Extensive validation, manual spot checks, user feedback loop |
| Missing data for small counties | High | Low | Implement tiered fallbacks, flag estimated values |
| Calculation complexity bugs | Medium | High | Unit tests, validation against benchmarks, phased rollout |
| Database performance degradation | Medium | Medium | Indexing strategy, query optimization, caching layer |

### Data Quality Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Outdated data (stale sources) | Medium | Medium | Automated freshness checks, display data vintage to users |
| Inconsistent vintages across metrics | High | Low | Normalize to common year using CPI, document temporal mismatches |
| Coverage gaps (rural areas) | High | Medium | Use state/regional fallbacks, transparent quality flags |
| Imputation errors | Medium | Medium | Conservative imputation methods, extensive validation |
| User misinterpretation | Medium | High | Clear methodology page, tooltips, examples, FAQ |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep (endless metrics) | High | Medium | Stick to 12-metric MVP, Phase 2 can add more later |
| Complexity overwhelms users | Medium | High | Progressive disclosure, default to simplest view, advanced options hidden |
| SEO regression from major changes | Low | High | Keep legacy URLs, 301 redirects, gradual content migration |
| Negative PR from outliers/errors | Low | High | Extensive validation, clear disclaimers, responsive error correction |

---

## Success Metrics & KPIs

### Phase 1 (Enhanced Housing) KPIs:
- ✅ 90%+ counties have HUD FMR data
- ✅ User engagement with rental vs. ownership toggle >30%
- ✅ Page load time <2s with new data

### Phase 5 (Composite Score) KPIs:
- ✅ True Affordability Score displayed for 85%+ locations
- ✅ Correlation with MIT Living Wage r > 0.80
- ✅ User session duration increases 50%+

### Phase 6 (Launch) KPIs:
- ✅ Methodology page ranks in top 10 Google results
- ✅ Zero P0 bugs in first 2 weeks
- ✅ 100+ press mentions/backlinks in first month
- ✅ Organic traffic increases 200%+ within 3 months

---

## Competitive Positioning

### After Phase 6 Completion:

**Affordability Index will be:**
1. **More comprehensive than MIT Living Wage** (interactive UI, rankings, comparisons)
2. **More accessible than C2ER** (free vs. $180/year subscription)
3. **More user-friendly than BEA RPP** (composite score + actionable insights)
4. **More detailed than Zillow affordability** (8 factors vs. housing only)
5. **More flexible than Numbeo** (government data vs. crowdsourced)

**Unique Value Propositions:**
- Only free comprehensive affordability index with ZIP-level granularity
- Only tool with persona support (singles vs. families vs. retirees)
- Only platform with interactive cost breakdowns and comparisons
- Transparent government data sources with full methodology disclosure

**Target SEO Queries:**
- "comprehensive cost of living calculator"
- "affordable places for families with childcare"
- "true affordability including taxes and healthcare"
- "MIT living wage alternative"
- "compare cost of living between cities"

---

## Next Steps (Decision Points)

### Immediate Actions Required:

1. **Stakeholder Review & Approval**
   - Review this master plan with project stakeholders
   - Approve Phase 1 budget and timeline (40-60 hours)
   - Decide on phased vs. big-bang launch approach

2. **Environment Setup**
   - Set up Python ETL environment (requirements.txt)
   - Create `/etl/` directory structure
   - Set up data storage for raw files (S3 or local)

3. **Start Phase 1 Implementation**
   - Task 1: Implement `etl/import_hud_fmr.py` (HUD Fair Market Rents)
   - Task 2: Implement `etl/import_fhfa_hpi.py` (FHFA House Price Index)
   - Task 3: Implement `etl/import_property_tax.py` (Tax Foundation)
   - Task 4: Update Prisma schema with Phase 1 fields
   - Task 5: Migrate database and run ETL
   - Task 6: Update UI to display new metrics

### Questions to Resolve:

1. **Launch Strategy:** Phased rollout (show new metrics as they're added) or big-bang (wait until Phase 5)?
2. **Data Refresh Cadence:** Manual quarterly updates or automated monthly?
3. **API Strategy:** Expose data via API for developers or keep UI-only?
4. **Monetization:** Keep 100% free or offer premium features (API access, bulk data)?
5. **Content Strategy:** Launch blog alongside new features or focus purely on technical implementation?

---

## Appendices

### Appendix A: Full Data Source Inventory

(See `AFFORDABILITY_METRICS_SUMMARY.md` for complete listing)

### Appendix B: Mathematical Specifications

(See `COMPOSITE_INDEX_TECHNICAL_APPENDIX.md` for formulas and pseudocode)

### Appendix C: Competitive Analysis

(See `METHODOLOGY_COMPARISON_MATRIX.md` for detailed comparison)

### Appendix D: Research Background

(See `AFFORDABILITY_DATA_RESEARCH.md` for full 30,000-word analysis)

---

**End of Master Plan**

*This document synthesizes research from three specialized AI agents working in collaboration to design a comprehensive, data-driven transformation of the Affordability Index platform.*
