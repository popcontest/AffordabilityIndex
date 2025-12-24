# Affordability Index - Metrics Summary
## Quick Reference Guide

**Last Updated:** December 22, 2025

---

## Top 12 Recommended Metrics

| # | Metric | Data Source | Geography | Update Freq | Difficulty | Priority |
|---|--------|-------------|-----------|-------------|------------|----------|
| 1 | **Rental Housing Costs** | HUD Fair Market Rents | Metro/County/ZIP | Annual | Easy | Tier 1 |
| 2 | **Home Price Index** | FHFA HPI | County/ZIP | Quarterly | Easy | Tier 1 |
| 3 | **Property Taxes** | Tax Foundation | County | Annual | Medium | Tier 1 |
| 4 | **Childcare Costs** | DOL Nat'l Database | County | Annual | Easy-Med | Tier 1 |
| 5 | **Sales Tax** | Avalara/Tax Foundation | County/ZIP | Monthly | Medium | Tier 1 |
| 6 | **Homeowners Insurance** | Treasury FIO | ZIP | One-time (2018-22) | Easy-Med | Tier 1 |
| 7 | **Food Costs** | USDA/BLS | Region/Metro | Monthly | Easy-Med | Tier 2 |
| 8 | **Healthcare Costs** | Medicare GPCI (CMS) | Metro/Locality | Every 3 years | Medium | Tier 2 |
| 9 | **Transportation** | ACS + BLS + BEA | Composite | Annual | Med-Hard | Tier 2 |
| 10 | **State/Local Income Tax** | Tax Foundation | State/County | Annual | Medium | Tier 2 |
| 11 | **Auto Insurance** | NAIC / Commercial | State/ZIP | Annual | Med-Hard | Tier 2 |
| 12 | **Broadband/Internet** | FCC | Regional/County | Annual | Medium | Tier 3 |

---

## Quick Links to Data Sources

### Tier 1 Data Sources (Start Here)

**HUD Fair Market Rents**
- URL: https://www.huduser.gov/portal/datasets/fmr.html
- API: https://hudgis-hud.opendata.arcgis.com/datasets/fair-market-rents
- Format: REST API, CSV downloads

**FHFA House Price Index**
- URL: https://www.fhfa.gov/data/hpi/datasets
- Format: CSV/Excel downloads (quarterly)
- Geography: County, ZIP, Metro, State

**Tax Foundation Property Taxes**
- URL: https://taxfoundation.org/data/all/state/property-taxes-by-state-county/
- Format: Interactive maps, CSV downloads
- Geography: County-level national coverage

**DOL Childcare Prices**
- URL: https://www.dol.gov/agencies/wb/topics/featured-childcare
- Download: https://www.datalumos.org/datalumos/project/226943/version/V1/view
- Format: CSV download (2008-2022 data)

**Avalara Sales Tax Rates**
- URL: https://www.avalara.com/taxrates/en/download-tax-tables.html
- Format: Free monthly email CSV by state
- Updates: End of each month

**Treasury Federal Insurance Office - Homeowners Insurance**
- URL: https://home.treasury.gov/news/press-releases/jy2791
- Format: ZIP-level aggregated data (2018-2022)
- Note: Historic release, most comprehensive public dataset

---

### Tier 2 Data Sources

**USDA Food Prices**
- URL: https://www.ers.usda.gov/data-products/food-at-home-monthly-area-prices
- Format: Excel/CSV downloads
- Geography: 4 regions + 10 metros

**Medicare GPCI (Healthcare Costs)**
- URL: https://www.cms.gov/medicare/payment/fee-schedules/physician
- County data: https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-geographic-comparisons/medicare-geographic-variation-by-national-state-county
- Format: CSV downloads, dashboards

**Census ACS Transportation/Commute Data**
- URL: https://www.census.gov/topics/employment/commuting.html
- API: https://data.census.gov
- Geography: ZIP, county, place, tract

**BEA Regional Price Parities**
- URL: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
- Format: Interactive tables, CSV
- Geography: State, metro (384 MSAs), experimental county

**Tax Foundation Income Tax Rates**
- URL: https://taxfoundation.org/data/all/state/state-income-tax-rates/
- Format: Web tables, PDFs
- Geography: State (10 states have local income taxes)

**NAIC Auto Insurance Data**
- URL: https://content.naic.org/
- Note: State averages readily available; ZIP-level from commercial providers

---

### Tier 3 Data Sources

**EIA Energy Prices**
- Electricity: https://www.eia.gov/electricity/sales_revenue_price/
- Natural Gas: https://www.eia.gov/naturalgas/
- Service territories: Form EIA-861
- Geography: State, utility service territory

**FCC Broadband Data**
- URL: https://www.fcc.gov/BroadbandData
- County connections: https://www.fcc.gov/form-477-county-data-internet-access-services
- Geography: County, regional pricing

**AWWA Water/Sewer Rates**
- URL: https://www.awwa.org/data-products/rate-survey/
- Note: Subscription required, 500 utilities (not comprehensive county coverage)

---

## Budget Weights (Based on BLS Consumer Expenditure Survey)

Use these weights for composite affordability index:

| Category | Weight | Notes |
|----------|--------|-------|
| Housing | 30% | Rent/mortgage + property tax |
| Transportation | 18% | Vehicle costs, gas, insurance, commute |
| Food | 13% | Groceries and dining |
| Childcare | 10% | Conditional on family type |
| Healthcare | 8% | Insurance premiums + out-of-pocket |
| Other Taxes | 6% | Income tax + sales tax |
| Utilities | 5% | Electricity, gas, water |
| Insurance (Home) | 5% | Homeowners/renters insurance |
| Broadband | 2% | Essential internet access |
| Other | 3% | Miscellaneous necessities |

**Note:** Weights should be adjusted based on household composition. Childcare is 0% for households without young children; retirees have higher healthcare weights.

---

## Geographic Standardization Strategy

### Target: County-Level Base
Most data sources provide county-level granularity or can be mapped to counties:
- Use county FIPS codes as primary key
- Join to Census Place (cities/towns) via county
- Join to ZCTA (ZIP codes) via county (with many-to-many relationship)

### When Data is Coarser than County:
- **State-level only** (e.g., some utilities, auto insurance): Apply state average to all counties
- **Regional** (e.g., USDA food prices): Map counties to census region/metro area
- **Metro-level** (e.g., Medicare GPCI): Map counties to MSA/locality codes

### When Data is Finer than County:
- **ZIP-level** (e.g., Treasury insurance, HUD SAFMR): Aggregate to county using population weights
- **Utility service territory**: Map territories to counties they serve

### Handling Missing Data:
1. Use state average as fallback
2. Flag imputed values in database (`data_quality` field)
3. Display confidence indicators in UI
4. Consider excluding geographies with >50% imputed data

---

## Implementation Phases

### Phase 1: Enhanced Housing (Weeks 1-2) ✓ Start Here
- [ ] ETL: HUD Fair Market Rents API integration
- [ ] ETL: FHFA House Price Index quarterly files
- [ ] ETL: Tax Foundation property tax county data
- [ ] Database: Add `rental_cost_index`, `fhfa_hpi`, `property_tax_rate` fields
- [ ] UI: Display housing affordability breakdown (ownership vs. rental)

### Phase 2: Critical Expenses (Weeks 3-4)
- [ ] ETL: DOL childcare prices (county CSV)
- [ ] ETL: Treasury FIO homeowners insurance (ZIP CSV)
- [ ] ETL: Avalara sales tax rates (county/ZIP)
- [ ] Database: Add `childcare_cost_annual`, `homeowners_ins_premium`, `sales_tax_rate`
- [ ] UI: Family affordability calculator with childcare toggle

### Phase 3: Regional Adjusters (Weeks 5-6)
- [ ] ETL: USDA food prices (map counties to regions)
- [ ] ETL: Medicare GPCI (map counties to localities)
- [ ] ETL: Tax Foundation income tax (state + local rates)
- [ ] Database: Add `food_cost_index`, `healthcare_cost_index`, `income_tax_burden`
- [ ] UI: Cost breakdown by category

### Phase 4: Transportation & Auto Insurance (Weeks 7-8)
- [ ] ETL: Census ACS commute time (API integration)
- [ ] ETL: BLS/BEA transportation cost factors
- [ ] Model: Calculate transportation cost estimates
- [ ] ETL: Auto insurance state averages
- [ ] Database: Add `transportation_cost_index`, `auto_insurance_premium`
- [ ] UI: Transportation affordability analysis

### Phase 5: Utilities & Refinement (Weeks 9-10)
- [ ] ETL: EIA electricity/gas state averages
- [ ] ETL: FCC broadband affordability thresholds
- [ ] Model: Composite affordability score calculation
- [ ] Database: Add `utility_cost_index`, `broadband_cost`, `composite_score`
- [ ] UI: Full affordability dashboard

### Phase 6: Validation & Launch (Weeks 11-12)
- [ ] Validation: Compare to MIT Living Wage Calculator (50 county sample)
- [ ] Validation: Compare to BEA Regional Price Parities (metro areas)
- [ ] Validation: Compare to C2ER COLI (participating cities)
- [ ] Documentation: Create methodology page
- [ ] Documentation: Create data sources and attribution page
- [ ] Launch: Production deployment with comprehensive index

---

## Database Schema Additions

### Recommended New Fields for `MetricSnapshot` Table

```prisma
model MetricSnapshot {
  // Existing fields
  id                    String   @id @default(uuid())
  snapshotDate          DateTime
  geographyType         String   // "place" | "zcta"
  geographyId           String   // place GEOID or ZCTA code

  // EXISTING METRICS
  medianHomeValue       Float?
  medianHouseholdIncome Float?
  affordabilityRatio    Float?

  // TIER 1 ADDITIONS
  hudFmr1Br            Float?   // HUD Fair Market Rent 1-bedroom
  hudFmr2Br            Float?   // HUD Fair Market Rent 2-bedroom
  fhfaHpi              Float?   // FHFA House Price Index
  propertyTaxRate      Float?   // Effective property tax rate (%)
  childcareCostInfant  Float?   // Annual childcare cost - infant center-based
  childcareCostPreK    Float?   // Annual childcare cost - preschool
  salesTaxRate         Float?   // Combined state+local sales tax rate (%)
  homeInsurancePremium Float?   // Average annual homeowners insurance premium

  // TIER 2 ADDITIONS
  foodCostIndex        Float?   // Regional food price index (US avg = 100)
  healthcareGpci       Float?   // Medicare GPCI composite
  transportCostIndex   Float?   // Modeled transportation cost index
  incomeStateTaxRate   Float?   // State income tax effective rate (%)
  incomeLocalTaxRate   Float?   // Local income tax rate (%)
  autoInsurancePremium Float?   // Average annual auto insurance premium

  // TIER 3 ADDITIONS
  electricityRate      Float?   // Cents per kWh
  naturalGasRate       Float?   // $ per therm
  broadbandCost        Float?   // Average monthly broadband cost

  // COMPOSITE METRICS
  compositeCostIndex   Float?   // Weighted composite cost of living index
  affordabilityScore   Float?   // Final affordability score (0-100)

  // METADATA
  dataQuality          String?  // "complete" | "partial" | "imputed"
  imputedFields        String[] // List of field names that were imputed

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

### Supporting Tables

```prisma
model DataSource {
  id              String   @id @default(uuid())
  name            String   // "HUD FMR", "FHFA HPI", etc.
  url             String   // Source URL
  updateFrequency String   // "annual", "quarterly", "monthly"
  lastUpdated     DateTime
  geography       String   // "county", "zip", "metro", "state"
  attribution     String   // Required attribution text
}

model CountyMetadata {
  countyFips      String   @id
  countyName      String
  stateFips       String
  stateName       String
  msaCode         String?  // Metropolitan Statistical Area
  censusRegion    String   // "Northeast", "Midwest", "South", "West"
  censusDivision  String
  population      Int?
  medianIncome    Float?
  // Used for mapping geographies to data sources
}
```

---

## API Response Example (Future State)

```json
{
  "geography": {
    "type": "place",
    "id": "2507000",
    "name": "Boston, MA",
    "county": "Suffolk County",
    "state": "Massachusetts"
  },
  "affordability": {
    "compositeScore": 42.3,
    "interpretation": "Below Average Affordability",
    "percentile": 28,
    "breakdown": {
      "housing": {
        "score": 35.2,
        "components": {
          "homeValue": 725000,
          "rent1Br": 2200,
          "rent2Br": 2800,
          "propertyTaxRate": 1.23
        }
      },
      "transportation": {
        "score": 55.1,
        "components": {
          "avgCommuteMin": 28,
          "transitAccess": "excellent",
          "costIndex": 105
        }
      },
      "childcare": {
        "score": 25.4,
        "components": {
          "infantCenterBased": 24500,
          "preschoolCenterBased": 18200
        }
      },
      "healthcare": {
        "score": 48.3,
        "gpci": 1.025
      },
      "food": {
        "score": 52.1,
        "costIndex": 108
      },
      "taxes": {
        "score": 38.5,
        "components": {
          "propertyTax": 1.23,
          "salesTax": 6.25,
          "stateincomeTax": 5.0,
          "localIncomeTax": 0
        }
      },
      "insurance": {
        "score": 45.2,
        "components": {
          "homeowners": 1850,
          "auto": 1920
        }
      }
    }
  },
  "medianHouseholdIncome": 89212,
  "purchasingPower": 67840,
  "dataQuality": "complete",
  "lastUpdated": "2025-03-15",
  "sources": [
    {
      "metric": "housing",
      "source": "HUD Fair Market Rents (FY2025), FHFA HPI (Q4 2024)",
      "updated": "2024-10-01"
    }
  ]
}
```

---

## Validation Strategy

### Benchmark Against Established Indices

**MIT Living Wage Calculator**
- URL: https://livingwage.mit.edu
- Coverage: All US counties
- Methodology: 8 component costs + taxes
- Comparison: Calculate affordability for same 50-county sample, compare results
- Expected correlation: >0.85 for overall affordability

**BEA Regional Price Parities**
- URL: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
- Coverage: States and 384 metros
- Methodology: Comprehensive price index
- Comparison: Compare metro-area cost indices
- Expected correlation: >0.90 for metro areas

**C2ER Cost of Living Index**
- URL: https://www.coli.org
- Coverage: ~270 participating cities
- Methodology: 6 component indices (groceries, housing, utilities, transport, healthcare, misc)
- Comparison: Compare cities where both datasets available
- Expected correlation: >0.80 (different base methodology)

### Validation Tests
1. **Face validity**: Do expensive areas (SF, NYC) score as expensive?
2. **Rank correlation**: Do rankings match known cost-of-living rankings?
3. **Regional patterns**: Do patterns match expected regional trends (coastal vs. midwest)?
4. **Outlier investigation**: Identify and explain any surprising results
5. **Component analysis**: Do individual components (housing, food, etc.) align with known variations?

---

## Common Pitfalls to Avoid

### 1. Temporal Mismatch
❌ **Wrong:** Combining 2022 childcare data with 2025 income without adjustment
✓ **Right:** Inflate all costs to common year using CPI before calculating ratios

### 2. Double-Counting
❌ **Wrong:** Including property taxes in both "housing costs" and "tax burden"
✓ **Right:** Clearly define mutually exclusive categories or show total with breakdown

### 3. Assuming Linearity
❌ **Wrong:** Applying state average sales tax to all counties equally
✓ **Right:** Use actual county combined rates where available

### 4. Ignoring Household Composition
❌ **Wrong:** Including childcare costs in affordability for all households
✓ **Right:** Create personas (single, family with kids, retiree) or make conditional

### 5. ZIP Code Geography Errors
❌ **Wrong:** Treating ZIP codes as fixed geographic boundaries
✓ **Right:** Use ZCTA (ZIP Code Tabulation Areas) for statistical analysis

### 6. Overweighting Available Data
❌ **Wrong:** Using 50% weight for housing just because it has best data
✓ **Right:** Use empirical budget shares from Consumer Expenditure Survey

### 7. Opaque Methodology
❌ **Wrong:** Creating composite score with undocumented formula
✓ **Right:** Full transparency: show component weights, data sources, calculation method

---

## Next Actions

### For Project Team:
1. **Review this research** - Approve/modify recommended metrics and priority tiers
2. **Database design** - Extend Prisma schema for new affordability metrics
3. **ETL planning** - Assign Phase 1 data source integrations
4. **UI mockups** - Design affordability breakdown visualizations
5. **Methodology documentation** - Begin drafting public-facing methodology page

### For Data Engineering:
1. Start with **Tier 1, Phase 1** (HUD FMR, FHFA HPI, property taxes)
2. Create reusable ETL framework for annual/quarterly updates
3. Build data quality checks and validation tests
4. Set up automated refresh jobs for annual data sources

### For Product:
1. Define affordability "personas" (household types)
2. Design user-facing affordability score explanation
3. Plan comparison features (city A vs. city B affordability breakdown)
4. Consider affordability calculator widget (user inputs income, family size → get personalized score)

---

## Questions for Stakeholder Review

1. **Scope:** Do we want to implement all Tier 1 metrics, or start with subset?
2. **Personas:** Should we support multiple household types (single, family, retiree) or use single average?
3. **Weights:** Use BLS Consumer Expenditure weights as-is, or customize for "housing-focused" affordability?
4. **Geography:** County-level sufficient, or do we need ZIP-level for all metrics?
5. **Methodology:** Transparent component approach (recommended) or composite index only?
6. **Timeline:** 12-week implementation realistic, or prioritize faster MVP?

---

**Document Owner:** Agent 1 (Data Architecture Specialist)
**Full Research Report:** See `AFFORDABILITY_DATA_RESEARCH.md` for detailed analysis of each metric
**Status:** Research Complete - Ready for Implementation Planning
