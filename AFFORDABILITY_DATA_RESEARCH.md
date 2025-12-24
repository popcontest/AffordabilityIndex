# Comprehensive Affordability Index Data Requirements
## Research Report - Agent 1 (Data Architecture Specialist)

**Date:** December 22, 2025
**Project:** Affordability Index - Data Enhancement Research
**Current State:** Simple home value / income ratio (too simplistic)
**Goal:** Identify comprehensive cost of living data sources for true affordability index

---

## Executive Summary

This report identifies **12 key affordability metrics** across housing, transportation, utilities, healthcare, childcare, food, insurance, and taxes. The research prioritizes free government data sources with county or finer geographic granularity.

### Recommended Core Metrics (Priority Tier 1)
1. **Housing Costs** - HUD Fair Market Rents, FHFA House Price Index
2. **Healthcare Costs** - Medicare GPCI, CMS geographic adjusters
3. **Transportation Costs** - BLS regional price parities, ACS commute data
4. **Property Taxes** - County assessor data, Tax Foundation compilations
5. **Childcare Costs** - DOL National Database of Childcare Prices
6. **Food Costs** - USDA food-at-home prices, BLS CPI regional data
7. **Utilities (Electricity/Gas)** - EIA utility service territory data
8. **Sales Tax** - State/county combined rates from Avalara/Tax Foundation

### Additional Metrics (Priority Tier 2-3)
9. **Auto Insurance** - Treasury FIO ZIP-level data, state rate databases
10. **Homeowners Insurance** - Treasury FIO ZIP-level data, natural disaster risk
11. **Income Taxes** - Tax Foundation state/local rates
12. **Broadband/Internet** - FCC county affordability benchmarks

---

## Detailed Metric Analysis

### 1. Housing Costs

#### Metric A: Fair Market Rents (Rental Housing)
**Importance:** Critical for renters; represents base housing cost plus essential utilities. Rental affordability directly impacts cost of living for ~36% of US households.

**Data Source:** U.S. Department of Housing and Urban Development (HUD)
**Dataset:** Fair Market Rents (FMR) & Small Area Fair Market Rents (SAFMR)

**Source URL:**
- Main: https://www.huduser.gov/portal/datasets/fmr.html
- SAFMR: https://www.huduser.gov/portal/datasets/fmr/smallarea/index.html
- API: https://hudgis-hud.opendata.arcgis.com/datasets/fair-market-rents

**Geography:**
- FMR: Metropolitan areas (530+ MSAs) and non-metropolitan counties
- SAFMR: ZIP code level for select metropolitan areas
- Can be mapped by county or county equivalent

**Update Frequency:** Annual (typically released October for following fiscal year)

**Access Method:**
- REST API via HUD eGIS Storefront
- CSV downloads
- ArcGIS Open Data portal

**Data Quality:**
- High quality, official government data
- Represents 40th percentile of gross rents (rent + utilities)
- Based on ACS survey data plus adjustments
- Complete coverage for all US metro and non-metro areas

**Implementation Difficulty:** **Easy**
- Well-documented API
- Standard geographic identifiers
- Annual update cadence manageable

---

#### Metric B: House Price Index (Homeowner Housing)
**Importance:** Complements existing Zillow ZHVI; provides government benchmark for home price trends. More conservative methodology than Zillow for validation.

**Data Source:** Federal Housing Finance Agency (FHFA)
**Dataset:** House Price Index (HPI) - Multiple variants (Purchase-Only, All-Transactions, Expanded-Data)

**Source URL:** https://www.fhfa.gov/data/hpi/datasets

**Geography:**
- National, Census division, State, Metro area (MSA)
- **County level** (quarterly)
- **ZIP code level** (quarterly)
- Census tract level

**Update Frequency:**
- Quarterly reports
- Monthly reports for larger geographies

**Access Method:**
- CSV file downloads by geography
- Excel files with time series data
- No formal API identified (file download system)

**Data Quality:**
- High quality, based on tens of millions of home sales
- Uses repeat-sales methodology (tracks same property over time)
- Covers transactions with conforming mortgages from Fannie Mae/Freddie Mac
- Expanded-Data includes FHA loans and county recorder data

**Implementation Difficulty:** **Easy**
- Straightforward file downloads
- Standard FIPS codes for counties
- Quarterly updates manageable
- Can use as validation/alternative to Zillow ZHVI

---

### 2. Healthcare Costs

**Metric Name:** Medicare Geographic Practice Cost Indices (GPCI)

**Importance:** Healthcare is typically 8-10% of household budgets. Medicare GPCI provides geographic adjusters for medical service costs, reflecting regional variation in physician labor, practice expenses, and malpractice insurance. While based on Medicare, these indices correlate with broader healthcare cost variations that affect all residents.

**Data Source:** Centers for Medicare & Medicaid Services (CMS)
**Dataset:** Geographic Practice Cost Indices for Medicare Physician Fee Schedule

**Source URL:**
- https://www.cms.gov/medicare/payment/fee-schedules/physician
- County/MSA comparisons: https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-geographic-comparisons/medicare-geographic-variation-by-national-state-county

**Geography:**
- Medicare Payment Localities (varies by state)
- Metropolitan Statistical Areas (MSAs) in most states
- 37 states have single statewide GPCI
- California has 29 different localities (most granular)
- County-level Medicare cost data available separately

**Update Frequency:**
- GPCI updates every 3 years (most recent CY 2026, next CY 2029)
- Medicare geographic variation data updated annually

**Access Method:**
- CSV downloads from CMS data portal
- Federal Register publications for GPCI values
- Medicare Geographic Variation dashboard

**Data Quality:**
- High quality, based on extensive wage, rent, and insurance premium data
- Three components: Work GPCI (physician labor), Practice Expense GPCI (office costs), PLI GPCI (malpractice insurance)
- Significant variation: PLI ranges from 0.296 (Minnesota) to 2.529 (Miami)
- Well-established methodology used since 1992

**Implementation Difficulty:** **Medium**
- Data is reliable but geographic mapping requires understanding Medicare localities
- Not all states have sub-state variation
- 3-year update cycle means less frequent changes
- Need to map Medicare localities to counties/ZIPs

---

### 3. Transportation Costs

**Metric Name:** Transportation Cost Components (Commute Time + Vehicle Costs + Gas Prices)

**Importance:** Transportation is typically 15-20% of household budgets, second-largest expense after housing. Costs vary dramatically by geography due to commute distances, public transit availability, and fuel prices. Essential for true cost of living comparison.

**Data Source:** Multiple sources need to be combined:
- Census ACS: Commute time, mode, vehicles available
- BLS Consumer Expenditure Survey: Regional transportation spending
- BEA Regional Price Parities: Transportation component
- MIT Living Wage Calculator methodology uses these sources

**Source URL:**
- ACS Commute Data: https://www.census.gov/topics/employment/commuting.html
- BLS Consumer Expenditure: https://www.bls.gov/cex/tables.htm
- BEA RPP: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area

**Geography:**
- ACS commute data: Available at ZIP code, tract, place, county
- BLS Consumer Expenditure: 22 metro areas (2-year averages), 4 regions, state-level
- BEA RPP Transportation component: State and metro area (384 MSAs)
- **Experimental county-level RPP** available (research dataset, not official)

**Update Frequency:**
- ACS: Annual (1-year and 5-year estimates)
- BLS: Annual (metro data is 2-year rolling averages)
- BEA RPP: Annual

**Access Method:**
- ACS: Census API (data.census.gov)
- BLS: CSV downloads, limited API
- BEA: Interactive data tables, CSV downloads

**Data Quality:**
- ACS commute data: Excellent coverage, includes mean travel time
- BLS expenditure data: Limited to 22 metro areas, requires pooling 2 years
- Transportation COSTS (dollar amounts) harder to get than commute patterns
- BEA RPP provides good price adjusters but covers broader geography
- MIT Living Wage uses composite approach (recommended)

**Implementation Difficulty:** **Medium-Hard**
- Multiple data sources need integration
- ACS has commute patterns but not direct cost data at fine geography
- BLS has costs but limited to major metros
- May need to model/impute costs based on commute time + regional factors
- County-level experimental RPP useful but not official government statistic

---

### 4. Property Taxes

**Metric Name:** Effective Property Tax Rates

**Importance:** Property taxes represent a major ongoing housing cost for homeowners, averaging 1-2% of home value annually but ranging from 0.3% (Hawaii) to 2.5% (New Jersey). Critical for true homeownership affordability. Affects renters indirectly through landlord pass-through.

**Data Source:** Multiple sources:
- Tax Foundation (aggregates county data nationally)
- Individual state tax departments
- County assessor offices
- ATTOM Data Solutions (used by PropertyChecker)

**Source URL:**
- Tax Foundation: https://taxfoundation.org/data/all/state/property-taxes-by-state-county/
- State-specific examples:
  - Illinois: https://tax.illinois.gov/research/taxrates.html
  - Texas: https://www.texas.gov/living-in-texas/property-tax-directory/
  - Michigan: https://www.michigan.gov/taxes/property/estimator
  - Indiana: https://www.stats.indiana.edu/dms4/propertytaxes.asp

**Geography:**
- County level (national coverage via Tax Foundation)
- ZIP code level (available from some commercial providers)
- Tax district level (within counties, varies by state)

**Update Frequency:**
- Tax Foundation: Annual updates
- State databases: Varies, typically annual
- Property tax rates change annually but often stable year-to-year

**Access Method:**
- Tax Foundation: Interactive maps, CSV downloads
- State databases: Web lookup tools, downloadable files
- No single national API (fragmented by state)

**Data Quality:**
- Tax Foundation provides comprehensive county-level median property tax bills and effective rates
- Data sourced from Census Bureau and local government records
- Effective tax rates (tax bill / home value) more useful than nominal rates
- Quality varies by state recordkeeping practices
- Some states have complex assessment systems (e.g., California Prop 13)

**Implementation Difficulty:** **Medium**
- Tax Foundation provides easiest national dataset at county level
- State-by-state collection would be comprehensive but labor-intensive
- ZIP-level data requires commercial sources or extensive scraping
- Annual updates are manageable
- Need to decide: nominal rates vs. effective rates vs. median tax bills

---

### 5. Childcare Costs

**Metric Name:** Childcare Prices by Provider Type and Child Age

**Importance:** Childcare is a critical expense for working families with young children, often rivaling or exceeding housing costs. National average reached $13,128 annually in 2024 (up from $11,582 in 2023). Essential for understanding family affordability, especially for dual-income households.

**Data Source:** U.S. Department of Labor, Women's Bureau
**Dataset:** National Database of Childcare Prices (NDCP)

**Source URL:**
- Main page: https://www.dol.gov/agencies/wb/topics/featured-childcare
- Data download: https://www.datalumos.org/datalumos/project/226943/version/V1/view
- Interactive map tool available on DOL website

**Geography:**
- **County level** (2,360 counties across 47 states)
- National and state aggregates also available
- Some states report only state/regional data (county-level uses imputation)

**Update Frequency:**
- Historical data: 2008-2022 (annual)
- Most recent official data: 2022 (adjusted to 2024 dollars)
- Future updates expected to continue annual cadence

**Access Method:**
- CSV download from DataLumos repository
- Interactive web maps on DOL site
- Data combined with ACS demographic characteristics

**Data Quality:**
- Most comprehensive federal source of county-level childcare prices
- Prices vary by:
  - Provider type (home-based vs. center-based)
  - Child age group (infant, toddler, preschool, school-age)
  - County size classification
- Price ranges widely: $4,810 to $17,171 (2022 dollars) depending on category
- Some counties use imputed/modeled estimates where direct data unavailable
- States differ in reporting granularity (some state-only, some county)

**Secondary Source:** Child Care Aware of America (CCAoA) state-level annual reports (2024/2025 data available but state-level only, not county)

**Implementation Difficulty:** **Easy-Medium**
- DOL database provides straightforward county-level file
- Data is 2-3 years delayed (2022 is most recent)
- Need to decide which provider type/age categories to include
- Could use median across categories or create weighted average
- Missing data for some counties requires handling strategy

---

### 6. Food Costs

**Metric Name:** Food-at-Home (Grocery) Prices by Region and Metro Area

**Importance:** Food represents 10-15% of household budgets. Grocery prices vary significantly by geography (not just restaurants). In 2024, metro area food-at-home inflation ranged from -0.2% (Denver) to +2.0% (Chicago, Philadelphia, San Diego). Essential component of basic cost of living.

**Data Source:** U.S. Department of Agriculture, Economic Research Service (USDA ERS)
**Primary Dataset:** Food-at-Home Monthly Area Prices (F-MAP)
**Secondary:** USDA Cost of Food Plans (Thrifty, Low-Cost, Moderate, Liberal)

**Source URL:**
- F-MAP Data: https://www.ers.usda.gov/data-products/food-at-home-monthly-area-prices
- Food Price Outlook: https://www.ers.usda.gov/data-products/food-price-outlook
- Cost of Food Plans: https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-reports-monthly-reports

**Geography:**
- **4 Census Regions** (Northeast, Midwest, South, West)
- **10 major metropolitan areas** (specific cities: Chicago, Los Angeles, New York, etc.)
- **National average**
- Note: Does NOT provide county or ZIP-level granularity
- BLS publishes CPI for food in 22+ metro areas (broader coverage than F-MAP)

**Update Frequency:**
- F-MAP: Monthly
- Cost of Food Plans: Monthly
- Food Price Outlook: Monthly forecasts

**Access Method:**
- Excel file downloads
- CSV files for historical time series
- No formal API

**Data Quality:**
- High quality, official USDA data
- F-MAP tracks unit prices and price indexes for 15 geographies
- Based on BLS CPI data for food categories
- 10-year trends available (useful for relative comparison)
- Limited geographic granularity (no county/ZIP level)
- Food-at-home vs. food-away-from-home tracked separately

**Implementation Difficulty:** **Easy-Medium**
- Data readily available and well-documented
- Major limitation: Only 4 regions + 10 metros (not county/ZIP)
- Would need to map counties to regions or nearest metro area
- Monthly updates more frequent than needed (could use annual averages)
- MIT Living Wage Calculator uses USDA Low-Cost Food Plan at county level (methodology not publicly detailed for county mapping)

**Alternative Approach:**
- Use BEA Regional Price Parities "goods" component (includes food), available at metro/state level
- Use regional factors to adjust national USDA food costs

---

### 7. Utilities (Electricity and Natural Gas)

**Metric Name:** Energy Costs - Electricity and Natural Gas Prices by Service Territory

**Importance:** Utilities represent 5-7% of household budgets and vary significantly by region due to energy sources, climate, and regulation. Essential for calculating true housing affordability (beyond mortgage/rent).

**Data Source:** U.S. Energy Information Administration (EIA)
**Datasets:**
- Form EIA-861: Electric utility service territories and sales
- Form EIA-176: Natural gas distribution utility data
- Electric Power Monthly: Retail price data

**Source URL:**
- Electricity: https://www.eia.gov/electricity/
- Electric Sales, Revenue, Price: https://www.eia.gov/electricity/sales_revenue_price/
- Form 861 (Service Territory): https://www.eia.gov/electricity/data/eia861/
- Natural Gas: https://www.eia.gov/naturalgas/

**Geography:**
- **State level**: Comprehensive price data
- **Utility service territory**: County-level service area maps in Form 861
- **Not available**: ZIP code or county-specific pricing
- Utilities often serve multiple counties; prices vary by utility not by county

**Update Frequency:**
- Form EIA-861: Annual
- Electric Power Monthly: Monthly
- Natural Gas data: Monthly/Annual

**Access Method:**
- Excel/CSV downloads
- Interactive data browser
- Bulk file downloads
- No formal REST API for pricing by geography

**Data Quality:**
- High quality, mandatory reporting by utilities
- Average retail price per kWh by state (reliable)
- Service territory data shows which utilities serve which counties
- Pricing NOT provided at county level directly
- Would need to match county → utility → average rate
- Seasonal variation in both price and consumption
- Climate differences mean same price ≠ same cost (heating/cooling degree days matter)

**Implementation Difficulty:** **Medium-Hard**
- State-level data is easy
- County-level requires matching counties to utilities via Form 861 service territory file
- Utilities may have different rate schedules within service area
- EIA doesn't publish ZIP/county prices directly
- Alternative: Use state averages as proxy
- Natural gas service territory data NOT published by EIA (unlike electricity)

**Workaround:**
- Use MIT Living Wage methodology: HUD utility allowance schedules (county-level estimates for electricity, gas, water/sewer)
- HUD publishes utility allowances for Housing Choice Voucher program

---

### 8. Sales Tax

**Metric Name:** Combined State and Local Sales Tax Rates

**Importance:** Sales tax affects all consumer purchases and varies from 0% (no sales tax states) to 10%+ (parts of Louisiana, Tennessee). Represents hidden cost of living that compounds across all taxable purchases. Critical for true cost comparison.

**Data Source:** Multiple sources:
- Avalara (commercial but provides free rate tables)
- Tax Foundation (nonprofit research)
- State revenue department databases

**Source URL:**
- Avalara rates: https://www.avalara.com/taxrates/en/download-tax-tables.html
- Tax Foundation: https://taxfoundation.org/data/state-tax/
- TaxCloud calculator: https://taxcloud.com/sales-tax-calculator/

**Geography:**
- **State level**: Base sales tax rate
- **County level**: Combined state + county rate
- **City level**: Combined state + county + city rate
- **ZIP code level**: Available but imperfect (multiple rates per ZIP common)
- Tax rates can vary within a county or city

**Update Frequency:**
- Monthly updates (rates change frequently)
- Avalara updates at end of each month for upcoming month
- Tax Foundation annual summaries

**Access Method:**
- Avalara: Free monthly email delivery of CSV files by state
- Tax Foundation: Interactive maps, downloadable data
- APIs available from Avalara/TaxJar (commercial services)
- No official government API for national data

**Data Quality:**
- Avalara and Tax Foundation data generally accurate
- Challenge: Over 12,000 sales tax jurisdictions in US
- Multiple rates per ZIP code is common (need street address for precision)
- Special district taxes (stadium, transit, etc.) add complexity
- Rate changes are frequent
- Combined rate = state + county + city + special district

**Implementation Difficulty:** **Medium**
- State-level average rates: Easy
- County-level combined rates: Easy (Avalara provides this)
- ZIP-level: Moderate complexity (multiple rates per ZIP)
- Monthly updates create maintenance burden
- May want to use county average or population-weighted ZIP average
- Free data available but commercial APIs more reliable for real-time

---

### 9. Auto Insurance

**Metric Name:** Average Auto Insurance Premiums by Geography

**Importance:** Auto insurance is mandatory in most states and costs vary dramatically by location (3x+ difference between cheapest and most expensive areas). ZIP code is one of the strongest rating factors. Represents significant recurring expense for vehicle owners.

**Data Source:**
- Primary: U.S. Treasury, Federal Insurance Office (FIO) - Auto insurance data
- Secondary: National Association of Insurance Commissioners (NAIC)
- Commercial: Insurance comparison sites (Bankrate, The Zebra, Insurify)

**Source URL:**
- NAIC Data: https://content.naic.org/ (various reports)
- State averages: https://www.bankrate.com/insurance/car/states/
- Geographic rating methodology: https://content.naic.org/sites/default/files/call_materials/Geographic Rating - NAIC Summit 06.18.pdf

**Geography:**
- **State level**: Comprehensive average premium data available
- **ZIP code level**: Commercial providers offer estimates
- **City level**: Insurance comparison sites provide city averages
- Actual rating uses proprietary "territories" defined by each insurer
- 4 states restrict ZIP code use: CA, CT, MA, NJ (special rules)

**Update Frequency:**
- NAIC annual reports
- Commercial sites: Updated regularly (quarterly/annually)
- Rates change annually or more frequently

**Access Method:**
- NAIC: PDF reports, data supplements
- Commercial sites: Web scraping or subscription APIs
- No comprehensive free government database at ZIP level
- State insurance departments may have average rate data

**Data Quality:**
- State-level averages: Good quality from NAIC and commercial sources
- ZIP-level data: Available from commercial providers but methodology varies
- Factors beyond geography affect rates (age, vehicle, driving record)
- Commercial sites use quotes for representative profiles
- Most expensive ZIP: 11212 (Brooklyn, NY)
- Cheapest states: Vermont, Idaho; Most expensive: Florida, Louisiana

**Implementation Difficulty:** **Medium-Hard**
- State-level data: Easy to obtain
- County/ZIP data: Requires commercial sources or extensive scraping
- No single authoritative free government source at fine geography
- Could use state averages as reasonable proxy
- If needed at ZIP level, would require partnership with data provider
- NAIC provides methodology but not granular rates

---

### 10. Homeowners Insurance

**Metric Name:** Homeowners Insurance Premiums by Geography and Risk

**Importance:** Homeowners insurance is required by mortgage lenders and costs have risen 150%+ in high-risk areas (California wildfire zones, Florida hurricane zones). Climate-related risks creating affordability crisis in some regions. Essential for true homeownership costs.

**Data Source:** U.S. Department of the Treasury, Federal Insurance Office (FIO)
**Dataset:** National Homeowners Insurance Data (2018-2022)

**Source URL:**
- Treasury report: https://home.treasury.gov/news/press-releases/jy2791
- Public data release: Aggregated ZIP code level data from 330+ insurers, 246M policies

**Geography:**
- **ZIP code level** (aggregated data publicly available)
- Covers 2018-2022 period
- Data includes premiums, claims, loss ratios by ZIP

**Update Frequency:**
- One-time historical release (2018-2022 data released in 2024)
- Future updates unknown (depends on Treasury FIO)

**Access Method:**
- CSV downloads from Treasury data release
- Most comprehensive public homeowners insurance dataset ever released

**Data Quality:**
- Extremely high quality: 330+ insurers, 246M policies
- ZIP-level aggregation (not individual policy data)
- Includes climate risk correlation data
- Shows dramatic variation: Highest risk ZIPs have $24k avg claim severity vs $19k for lowest risk
- Premium increases correlate with climate disaster risk
- 1 std dev increase in disaster risk = $300 premium increase (2018) to $500 (2023)

**Secondary Sources:**
- NBER research using CoreLogic wildfire risk data
- State insurance department filings
- Commercial providers: Policygenius, MoneyGeek (use aggregated quotes)

**Implementation Difficulty:** **Easy-Medium**
- Treasury FIO data provides ZIP-level historical data (2018-2022)
- Data is backward-looking (not current rates)
- One-time release (unclear if will be updated)
- Could supplement with state insurance department data
- Climate risk data (FEMA flood zones, wildfire risk) could enhance
- Commercial sources available for current quotes but less comprehensive

**Note:** This is a unique opportunity - government just released unprecedented ZIP-level insurance data in 2024.

---

### 11. Income Taxes

**Metric Name:** State and Local Income Tax Rates and Burdens

**Importance:** Income taxes reduce take-home pay and vary dramatically by state (0% in 8 states to 13.3% in California). Local income taxes add another layer in 10 states. Critical for understanding actual purchasing power and affordability.

**Data Source:** Tax Foundation
**Dataset:** State Individual Income Tax Rates and Brackets

**Source URL:**
- Main data: https://taxfoundation.org/data/all/state/state-income-tax-rates/
- Facts & Figures: https://taxfoundation.org/data/all/state/2025-state-tax-data/
- State Tax Index: https://taxfoundation.org/statetaxindex/

**Geography:**
- **State level**: Comprehensive coverage (all 50 states)
- **County/City level**: 10 states have local income taxes (rates vary by jurisdiction)
- Examples: Maryland counties (up to 3.3%), Ohio cities, Pennsylvania local earned income tax

**Update Frequency:**
- Annual updates (Tax Foundation publishes yearly)
- Major rate changes occur at start of calendar/fiscal year
- Brackets adjusted for inflation in many states

**Access Method:**
- Interactive web tables
- PDF publications (Facts & Figures)
- Excel downloads available for some datasets
- No formal API

**Data Quality:**
- High quality, Tax Foundation is authoritative nonprofit source
- Comprehensive coverage of all state tax structures
- Includes: Marginal rates, brackets, standard deductions, personal exemptions
- Local income tax data less centralized (need state-by-state research)
- Complexity: Progressive brackets mean single rate doesn't capture burden
- Actual tax burden depends on income level

**Implementation Difficulty:** **Medium**
- State-level rates: Easy to obtain and integrate
- Local income taxes: Harder, only 10 states but county/city variation
- Challenge: Need to model tax burden for representative income levels
- Marginal rate vs. effective rate calculation required
- Could use Tax Foundation's effective rate estimates for median household income
- Some states have complex structures (e.g., NH taxes only interest/dividends, ending 2025)

**Approach Recommendation:**
- Use state-level effective tax rates for median income household
- Flag the 10 states with local income taxes and add county rates where applicable
- Acknowledge limitation: Progressive taxation means burden varies by income level

---

### 12. Broadband / Internet Access

**Metric Name:** Broadband Internet Affordability and Pricing

**Importance:** Internet access is essential infrastructure for work, education, and daily life (especially post-COVID). Costs vary by region and provider competition. Affordability benchmarks show households at 10th income percentile must spend 5-11% of income for basic broadband. Included in MIT Living Wage Calculator as essential expense.

**Data Source:** Federal Communications Commission (FCC)
**Datasets:**
- Broadband Consumer Labels (pricing transparency)
- Form 477 County Data (historical through June 2024)
- FCC Urban Rate Survey (affordability benchmarks)

**Source URL:**
- Broadband Data Collection: https://www.fcc.gov/BroadbandData
- Form 477 County Data: https://www.fcc.gov/form-477-county-data-internet-access-services
- Consumer Labels: https://www.fcc.gov/broadbandlabels
- Urban Rate Survey: Released annually for federal subsidy programs

**Geography:**
- **County level**: Form 477 provides connection counts by county
- **State/Regional**: Pricing averages by region
- FCC pricing benchmarks show county-level affordability thresholds
- Range: $28.52/month (Issaquena County, MS) to $261.37/month (Loudoun County, VA)

**Update Frequency:**
- Form 477: Historical data through June 2024
- Urban Rate Survey: Annual (2026 benchmark: $96/month for 100/20 Mbps, up from $85.85)
- Consumer Labels: Required as of October 2024 (ongoing)

**Access Method:**
- Form 477: CSV downloads
- FCC reports: PDF publications
- No comprehensive API for county-level pricing

**Data Quality:**
- Coverage data (availability): Good quality from new Broadband Data Collection
- Pricing data: Less granular geographically
- FCC urban rate survey shows national/regional benchmarks, not county prices
- Pew Research provides county-level affordability analysis (based on 2.5% of income threshold)
- Affordability thresholds vary: $84.79/month (South) to $107.65/month (Northeast)
- Actual prices vary by provider and competitive landscape

**Implementation Difficulty:** **Medium**
- County-level availability data: Easy (Form 477)
- County-level pricing data: Harder (not directly published)
- Could use regional averages from FCC Urban Rate Survey
- Could use Pew's county affordability threshold methodology (2.5% of median income)
- Consumer Labels program creates transparency but data not centrally aggregated yet
- Commercial alternatives: BroadbandNow, other market research

**Approach Recommendation:**
- Use FCC regional pricing benchmarks (4 Census regions)
- Apply to counties within regions
- Or calculate affordability threshold as % of median income (Pew methodology)
- Acknowledge: Provider competition and rural/urban divide create significant intra-county variation

---

## Additional Metrics Considered (Not Recommended for MVP)

### Water and Sewer Utilities
- **Source:** American Water Works Association (AWWA) Rate Survey
- **Geography:** 500 utilities across all 50 states (city/utility level, not county)
- **Limitation:** Subscription required ($), limited geographic coverage, not systematic county coverage
- **Why excluded:** No free comprehensive county/ZIP dataset; utilities vary widely even within counties

### Crime/Safety (Insurance Impact)
- **Source:** FBI Uniform Crime Reporting (UCR) / Crime Data Explorer
- **Geography:** Agency-level (18,000+ agencies), NOT county/ZIP systematic
- **Limitation:** Experts recommend against using aggregated county-level UCR data (highly flawed)
- **Why excluded:** No reliable county-level dataset; primarily affects insurance rates (already captured)

### School Quality / Education Costs
- **Source:** NCES Common Core of Data, EDGE geographic data
- **Geography:** School district level, can be mapped to counties/ZIPs
- **Limitation:** Quality metrics subjective; K-12 public education is "free" (funded by property taxes already captured)
- **Why excluded:** Education spending already in tax burden; quality is subjective and politicized

---

## Priority Tier Recommendations

### Tier 1: Must Have (Immediately Available, High Quality, Critical)
These should be implemented first as they represent the core affordability components with excellent free government data:

1. **Housing - Rental (HUD FMR)** - Metro/county level, annual, API available, ZIP-level for select metros
2. **Housing - Ownership (FHFA HPI)** - County/ZIP quarterly, complements existing Zillow data
3. **Property Taxes (Tax Foundation)** - County level annual, comprehensive national coverage
4. **Childcare (DOL NDCP)** - County level annual (through 2022), critical for families
5. **Sales Tax (Avalara/Tax Foundation)** - County level monthly, free data available
6. **Homeowners Insurance (Treasury FIO)** - ZIP level 2018-2022, unprecedented dataset

**Implementation Priority:** Start here. These six metrics dramatically improve affordability index and all have accessible free data.

---

### Tier 2: Should Have (Available but Requires More Work)
These metrics are important and data exists, but require more complex integration or have geographic limitations:

7. **Food Costs (USDA/BLS)** - Regional/metro only (not county), but essential expense
8. **Healthcare (Medicare GPCI)** - Metro/locality level, 3-year update cycle, mapping complexity
9. **Transportation (Composite)** - Requires combining ACS commute + BLS/BEA regional factors
10. **Income Taxes (Tax Foundation)** - State level easy, local taxes in 10 states add complexity
11. **Auto Insurance** - State level easy, ZIP level requires commercial data

**Implementation Priority:** Add after Tier 1 is stable. May require modeling/imputation for finer geographies.

---

### Tier 3: Nice to Have (Lower Priority or Harder to Obtain)
These would enhance the index but have significant data access challenges or questionable value-add:

12. **Utilities - Electric/Gas (EIA)** - State level easy, county requires service territory mapping
13. **Broadband (FCC)** - Regional benchmarks available, county pricing requires modeling
14. **Water/Sewer (AWWA)** - Limited coverage, subscription required, not systematic
15. **Crime/Safety** - Flawed county data, already reflected in insurance costs

**Implementation Priority:** Consider for future enhancement after Tier 1-2 are complete.

---

## Composite Index Methodology Recommendations

### Approach 1: MIT Living Wage Model
MIT's Living Wage Calculator uses 8 basic needs categories with county-level granularity:
- Housing (HUD FMR)
- Food (USDA Low-Cost Food Plan)
- Childcare (market rate surveys)
- Healthcare (MEPS-IC data)
- Transportation (BLS Consumer Expenditure)
- Broadband (assumed essential)
- Civic engagement (assumed % of income)
- Other necessities (BLS Consumer Expenditure)
- Plus: Taxes (income, payroll, sales, property calculated for each county)

**Advantage:** Well-established academic methodology, county-level output
**Limitation:** Some data sources not publicly documented; requires replication of methodology

---

### Approach 2: BEA Regional Price Parities (RPP)
BEA publishes RPPs for states and 384 metro areas (experimental county-level available):
- Composite price index covering all consumption goods/services
- Adjusted for regional cost differences
- Published annually

**Advantage:** Single composite metric, official government statistic, metro-level reliable
**Limitation:** County-level is experimental/unofficial; black box (less transparent than component approach)

---

### Approach 3: C2ER Cost of Living Index Model
C2ER (Council for Community and Economic Research) uses 6 component indices:
- Groceries (~60 items)
- Housing (rent and ownership)
- Utilities (electricity, gas, water)
- Transportation (vehicle costs, gas)
- Healthcare (services, prescriptions)
- Miscellaneous goods/services

**Advantage:** Transparent methodology, long historical track record (since 1968)
**Limitation:** Only 250-272 participating cities (not comprehensive coverage); requires data collection partnerships

---

### Recommended Approach for Affordability Index:
**Hybrid Component Model** with transparent data sources:

**Core Formula:**
```
Affordability Score = Weighted sum of:
  - Housing (30% weight): Existing ZHVI + HUD FMR
  - Transportation (18% weight): Modeled from ACS + regional factors
  - Food (13% weight): USDA regional data
  - Healthcare (8% weight): Medicare GPCI as adjustor
  - Childcare (10% weight, conditional on family type): DOL NDCP
  - Property Taxes (5% weight): Tax Foundation county data
  - Other Taxes (6% weight): Sales tax + income tax
  - Insurance (5% weight): Treasury FIO data (home+auto)
  - Utilities (5% weight): EIA state/regional averages

All normalized to median household income
```

**Weights based on:** BLS Consumer Expenditure Survey average budget shares
**Geographic target:** County-level (with selected ZIP-level components)
**Philosophy:** Transparent, free government data, replicable methodology

---

## Implementation Roadmap

### Phase 1: Enhanced Housing Affordability (Weeks 1-2)
- Add HUD Fair Market Rents (rental housing costs)
- Add FHFA House Price Index (validate/complement Zillow)
- Add Tax Foundation property tax rates
- **Output:** Housing affordability now includes ownership, rental, and property tax burden

### Phase 2: Critical Household Expenses (Weeks 3-4)
- Add DOL childcare costs (family affordability)
- Add Treasury FIO homeowners insurance (climate risk)
- Add Avalara sales tax rates
- **Output:** Major household expenses beyond housing captured

### Phase 3: Regional Cost Adjusters (Weeks 5-6)
- Add USDA food price regions
- Add Medicare GPCI healthcare adjusters
- Add Tax Foundation income tax rates
- **Output:** Geographic cost variation for basic necessities

### Phase 4: Transportation & Insurance (Weeks 7-8)
- Model transportation costs from ACS commute data + BLS regional factors
- Add auto insurance state averages (or ZIP if available)
- **Output:** Second-largest expense category (transportation) included

### Phase 5: Utilities & Refinement (Weeks 9-10)
- Add EIA electricity/gas regional averages
- Add FCC broadband affordability thresholds
- Calibrate weights based on Consumer Expenditure Survey
- **Output:** Comprehensive cost of living index complete

### Phase 6: Validation & Documentation (Weeks 11-12)
- Compare output to MIT Living Wage Calculator (county overlap)
- Compare output to BEA Regional Price Parities (metro overlap)
- Compare output to C2ER COLI (participating city overlap)
- Document methodology page
- Create data attribution page
- **Output:** Production-ready comprehensive affordability index

---

## Data Refresh Strategy

### Annual Refresh (High Priority)
- HUD Fair Market Rents (October release)
- FHFA House Price Index (Quarterly, use Q4)
- Tax Foundation property taxes (annual)
- DOL childcare costs (when updated, currently 2022)
- Treasury FIO insurance data (if released again)
- BLS/USDA food price data
- Income tax rates (January)

### Quarterly Refresh (Medium Priority)
- FHFA HPI quarterly data
- Zillow ZHVI (existing)

### Monthly Refresh (Low Priority)
- Sales tax rates (if using Avalara feed)
- Food prices (if displaying current snapshot)

### Multi-Year Refresh (Stable Data)
- Medicare GPCI (every 3 years)
- BEA Regional Price Parities (annual but stable)

---

## Key Challenges & Mitigation Strategies

### Challenge 1: Geographic Granularity Mismatch
**Issue:** Different datasets at state, metro, county, ZIP levels
**Mitigation:**
- Standardize on county as base geography
- Use metro/state data with county mapping where needed
- Document assumptions when applying regional averages to counties
- Flag data quality/confidence in UI

### Challenge 2: Temporal Mismatch
**Issue:** Data vintages vary (2022 childcare, 2024 housing, 2025 income)
**Mitigation:**
- Use inflation adjusters (CPI) to normalize to common year
- Document data vintages clearly
- Accept that composite index represents "recent period average" not point-in-time

### Challenge 3: Missing Data / Coverage Gaps
**Issue:** Not all counties have all metrics (rural areas, small populations)
**Mitigation:**
- Use state/regional averages as fallback
- Flag imputed values in database
- Consider excluding geographies with too many gaps
- Transparency about data completeness in UI

### Challenge 4: Household Composition Variation
**Issue:** Childcare costs only apply to families with young children; healthcare costs vary by age
**Mitigation:**
- Create multiple affordability "personas" (single adult, family with 2 kids, retiree, etc.)
- Allow users to filter/select relevant household type
- Show both universal costs (housing, food) and conditional costs (childcare)

### Challenge 5: Weights and Methodology Debates
**Issue:** Different households have different spending patterns
**Mitigation:**
- Use BLS Consumer Expenditure Survey national averages as default weights
- Document methodology transparently
- Consider allowing advanced users to customize weights
- Cite established methodologies (MIT Living Wage, BEA RPP)

---

## Data Attribution Requirements

All identified free government data sources require attribution. Recommended attribution page should include:

**Housing:**
- "Rental cost data: U.S. Department of Housing and Urban Development, Fair Market Rents"
- "Home price data: Federal Housing Finance Agency, House Price Index"
- "Home price data: Zillow Research (zillow.com/research/data/)"

**Income & Demographics:**
- "Income data: U.S. Census Bureau, American Community Survey"

**Childcare:**
- "Childcare cost data: U.S. Department of Labor, Women's Bureau, National Database of Childcare Prices"

**Food:**
- "Food price data: U.S. Department of Agriculture, Economic Research Service"

**Taxes:**
- "Tax data: Tax Foundation (taxfoundation.org)"

**Healthcare:**
- "Healthcare cost indices: Centers for Medicare & Medicaid Services"

**Insurance:**
- "Homeowners insurance data: U.S. Department of the Treasury, Federal Insurance Office"

**Utilities:**
- "Energy price data: U.S. Energy Information Administration"

**Transportation:**
- "Commute data: U.S. Census Bureau, American Community Survey"
- "Transportation costs: U.S. Bureau of Labor Statistics, Consumer Expenditure Survey"

---

## Conclusion

This research identifies **12 key metrics** across 8 major affordability categories, with **6 Tier 1 metrics** ready for immediate implementation using free, high-quality government data at county or finer geographic granularity.

The recommended approach is a **transparent component-based index** that combines:
- Existing home value / income ratio (current baseline)
- 6 Tier 1 additions: Rental housing (HUD), home prices (FHFA), property taxes, childcare, sales taxes, homeowners insurance
- 5 Tier 2 enhancements: Food, healthcare, transportation, income taxes, auto insurance
- 3 Tier 3 optional: Utilities, broadband, water/sewer

This would create a **comprehensive cost of living affordability index** comparable to MIT Living Wage Calculator and C2ER COLI, but with:
- Complete US coverage (not just participating cities)
- Free government data sources (sustainable, no licensing)
- County-level granularity (with select ZIP-level components)
- Transparent, replicable methodology
- Regular update cadence

**Next Steps:**
1. Review and approve metrics selection
2. Begin Phase 1 implementation (housing components)
3. Design database schema for multi-component affordability scores
4. Create ETL pipelines for Tier 1 data sources
5. Develop UI for displaying component breakdowns and composite scores

---

**Research completed by:** Agent 1 (Data Architecture Specialist)
**Date:** December 22, 2025
**Total metrics researched:** 15
**Recommended for implementation:** 12 (tiered priority)
**Primary sources cited:** 20+ government agencies and authoritative nonprofits
