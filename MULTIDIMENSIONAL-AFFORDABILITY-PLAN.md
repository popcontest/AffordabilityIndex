# Multi-Dimensional Affordability Index - Implementation Plan

## Executive Summary

This plan expands the Affordability Index from a simple **Home Value / Income ratio** to a comprehensive **True Cost of Living Index** that measures real affordability across 8 key dimensions.

**Current State:** Home affordability ratio only
**Target State:** Comprehensive affordability score (0-100) across housing, taxes, healthcare, transportation, and more
**Timeline:** 8-12 weeks for full implementation
**Data Sources:** 12+ government and authoritative datasets

---

## 1. Affordability Dimensions

### Core Formula Evolution

**Current (V1):**
```
Affordability Ratio = Home Value / Median Household Income
```

**Proposed (V2 - Multi-Dimensional):**
```
True Affordability Score = Weighted Average of:
  1. Housing Cost Burden (35%)
  2. Tax Burden (20%)
  3. Healthcare Costs (15%)
  4. Transportation Costs (12%)
  5. Cost of Living Index (10%)
  6. Childcare Costs (5%)
  7. Utilities & Energy (2%)
  8. Food Costs (1%)
```

### Dimension 1: Housing Cost Burden (35% weight)

**What it measures:** Home ownership OR rental affordability

**Data Points:**
- Median home value (existing: Zillow ZHVI)
- Median gross rent (Census ACS Table B25064)
- Property taxes (Census ACS Tables B25090, B25082)
- Homeowner insurance costs (estimated from NAIC data)
- HOA fees (estimated, optional)

**Calculation:**
```python
# For Owners
monthly_housing_cost = (
    (home_value * mortgage_rate / 12) +  # Mortgage payment
    (home_value * property_tax_rate / 12) +  # Property taxes
    (home_value * 0.0035 / 12)  # Insurance estimate (0.35% annually)
)

# For Renters
monthly_housing_cost = median_gross_rent

# Burden Score
housing_burden_ratio = monthly_housing_cost / (median_income / 12)
housing_score = 100 * (1 - min(housing_burden_ratio / 0.50, 1))
# 0% burden = 100 score, 50%+ burden = 0 score
```

**Data Sources:**
- **Zillow ZHVI:** Home values (existing)
- **Census ACS B25064:** Median gross rent
- **Census ACS B25090:** Aggregate real estate taxes paid
- **Census ACS B25082:** Aggregate home value
- **NAIC (National Association of Insurance Commissioners):** Insurance cost estimates

---

### Dimension 2: Tax Burden (20% weight)

**What it measures:** State + local tax burden on typical household

**Data Points:**
- Property tax rate (from Dimension 1)
- State income tax rate (Tax Foundation)
- Local income tax rate (Tax Foundation)
- Sales tax rate - state + local (Tax Foundation)
- Effective total tax burden (calculated)

**Calculation:**
```python
# Property tax (annual)
property_tax = home_value * property_tax_rate

# State income tax (simplified - use marginal rate for median income)
state_income_tax = median_income * state_income_tax_rate

# Local income tax
local_income_tax = median_income * local_income_tax_rate

# Sales tax (estimate: 25% of income goes to taxable goods)
sales_tax = (median_income * 0.25) * combined_sales_tax_rate

# Total annual tax burden
total_tax = property_tax + state_income_tax + local_income_tax + sales_tax

# Tax burden ratio
tax_burden_ratio = total_tax / median_income

# Tax Score
tax_score = 100 * (1 - min(tax_burden_ratio / 0.30, 1))
# 0% burden = 100 score, 30%+ burden = 0 score
```

**Data Sources:**
- **Tax Foundation:** State tax rates (https://taxfoundation.org/data/state-tax/)
- **Census ACS B25090/B25082:** Property tax data (existing)
- **Tax Foundation:** Sales tax rates by locality
- **Tax Foundation:** Local income tax rates (where applicable)

---

### Dimension 3: Healthcare Costs (15% weight)

**What it measures:** Regional healthcare affordability

**Data Points:**
- Medicare spending per capita (CMS Geographic Variation)
- Average insurance premium (Healthcare.gov marketplace data)
- Uninsured rate (Census ACS)
- Healthcare provider density (HRSA)

**Calculation:**
```python
# Use Medicare spending as proxy for regional healthcare costs
medicare_spending_per_capita  # From CMS data

# National average as baseline
national_avg_medicare = 12000  # Example baseline

# Regional healthcare cost index
healthcare_cost_index = medicare_spending_per_capita / national_avg_medicare

# Healthcare Score (inverted - lower costs = higher score)
healthcare_score = 100 * (1 / healthcare_cost_index)
# Regional cost = national avg → 100 score
# Regional cost = 2x national avg → 50 score
```

**Data Sources:**
- **CMS Medicare Geographic Variation:** County-level Medicare spending
  URL: https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-geographic-comparisons/medicare-geographic-variation-by-national-state-county
- **Healthcare.gov:** Marketplace premium data by county
- **Census ACS S2701:** Healthcare coverage statistics
- **HRSA (Health Resources & Services Administration):** Provider data

---

### Dimension 4: Transportation Costs (12% weight)

**What it measures:** Cost of getting around (car ownership + transit)

**Data Points:**
- Commute time (Census ACS B08303)
- % using public transit (Census ACS B08301)
- Gas prices (EIA - Energy Information Administration)
- Vehicle ownership rate (Census ACS B08201)
- Transit availability score (calculated)

**Calculation:**
```python
# Car ownership cost (AAA estimate: $10,000/year for avg vehicle)
car_ownership_cost = 10000  # National avg

# Adjust for gas prices
gas_price_multiplier = regional_gas_price / national_avg_gas_price

# Transit availability bonus
transit_score = pct_using_public_transit * 100

# Transportation cost estimate
if transit_score > 20:  # Good transit
    transport_cost = car_ownership_cost * 0.5  # Can reduce car dependence
else:
    transport_cost = car_ownership_cost * gas_price_multiplier

# Transportation Score
transport_cost_ratio = transport_cost / median_income
transport_score = 100 * (1 - min(transport_cost_ratio / 0.20, 1))
```

**Data Sources:**
- **Census ACS B08303:** Travel time to work
- **Census ACS B08301:** Means of transportation to work
- **Census ACS B08201:** Household size by vehicles available
- **EIA:** Regional gas prices (https://www.eia.gov/dnav/pet/pet_pri_gnd_dcus_nus_w.htm)
- **FTA (Federal Transit Administration):** Transit system data (optional)

---

### Dimension 5: Regional Price Parities (10% weight)

**What it measures:** Overall cost of goods and services

**Data Points:**
- BEA Regional Price Parities (RPP)
- Consumer Price Index adjustments

**Calculation:**
```python
# BEA RPP: 100 = national average
rpp = regional_price_parity  # e.g., 115 = 15% more expensive than national avg

# Cost of Living Score (inverted)
col_score = 100 * (100 / rpp)
# RPP = 100 (national avg) → 100 score
# RPP = 120 (20% higher) → 83 score
# RPP = 80 (20% lower) → 125 score (capped at 100)
```

**Data Sources:**
- **BEA Regional Price Parities:** Metro area and state RPPs
  URL: https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area
- **BEA API:** API access for programmatic downloads
  URL: https://apps.bea.gov/api/signup/index.cfm

---

### Dimension 6: Childcare Costs (5% weight)

**What it measures:** Cost of childcare for families

**Data Points:**
- Median childcare cost (Census ACS or ChildCare Aware)
- Childcare cost as % of income

**Calculation:**
```python
# Annual childcare cost (infant care)
annual_childcare_cost  # From data source

# Childcare burden ratio
childcare_ratio = annual_childcare_cost / median_income

# Childcare Score
childcare_score = 100 * (1 - min(childcare_ratio / 0.20, 1))
# 0% of income = 100 score, 20%+ of income = 0 score
```

**Data Sources:**
- **Child Care Aware of America:** State-by-state childcare cost reports
  URL: https://www.childcareaware.org/our-issues/research/the-us-and-the-high-price-of-child-care-directory/
- **Census ACS (potential future tables):** Childcare expenses
- **State agencies:** Licensing data with fee information

---

### Dimension 7: Utilities & Energy (2% weight)

**What it measures:** Cost of electricity, gas, water, internet

**Data Points:**
- Average electricity rate (EIA Form 861)
- Average natural gas rate (EIA)
- Typical monthly utility bill (estimated)

**Calculation:**
```python
# Annual utility cost estimate
annual_electricity = avg_kwh_usage * electricity_rate_per_kwh * 12
annual_gas = avg_therms * gas_rate_per_therm * 12
annual_water = 600  # National avg estimate
annual_internet = 60 * 12  # $60/mo avg

total_utilities = annual_electricity + annual_gas + annual_water + annual_internet

# Utilities Score
utilities_ratio = total_utilities / median_income
utilities_score = 100 * (1 - min(utilities_ratio / 0.05, 1))
```

**Data Sources:**
- **EIA Form 861:** Electricity prices by utility
  URL: https://www.eia.gov/electricity/data/eia861/
- **EIA Natural Gas:** Natural gas prices
  URL: https://www.eia.gov/dnav/ng/ng_pri_sum_dcu_nus_m.htm

---

### Dimension 8: Food Costs (1% weight)

**What it measures:** Regional variation in grocery prices

**Data Points:**
- BEA RPP food component (if available)
- USDA food cost estimates by region

**Calculation:**
```python
# Use BEA RPP as proxy (or national avg if unavailable)
food_cost_index = rpp  # From Dimension 5

# Food Score
food_score = 100 * (100 / food_cost_index)
```

**Data Sources:**
- **BEA RPP:** Includes food component
- **USDA:** Regional food cost estimates (https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-reports-monthly-reports)

---

## 2. Data Source Summary Table

| Dimension | Data Source | Update Frequency | API Available | Cost |
|-----------|-------------|------------------|---------------|------|
| **Housing - Home Values** | Zillow ZHVI | Monthly | Yes (Research downloads) | Free |
| **Housing - Rent** | Census ACS B25064 | Annual | Yes | Free |
| **Housing - Property Tax** | Census ACS B25090, B25082 | Annual | Yes | Free |
| **Taxes - Income Tax** | Tax Foundation | Annual | No (scrape or manual) | Free |
| **Taxes - Sales Tax** | Tax Foundation | Annual | No | Free |
| **Healthcare** | CMS Medicare Geographic Variation | Annual | Yes | Free |
| **Healthcare - Coverage** | Census ACS S2701 | Annual | Yes | Free |
| **Transportation - Commute** | Census ACS B08303, B08301 | Annual | Yes | Free |
| **Transportation - Gas** | EIA Gasoline Prices | Weekly | Yes | Free |
| **Cost of Living - RPP** | BEA Regional Price Parities | Annual | Yes | Free (API key required) |
| **Childcare** | Child Care Aware Reports | Annual | No (PDF reports) | Free |
| **Utilities - Electricity** | EIA Form 861 | Annual | Yes | Free |
| **Utilities - Gas** | EIA Natural Gas | Monthly | Yes | Free |

---

## 3. Database Schema Changes

### New Tables

#### `cost_dimension`
Stores individual dimension scores for each geography.

```sql
CREATE TABLE cost_dimension (
  id SERIAL PRIMARY KEY,
  geo_type TEXT NOT NULL,  -- 'CITY', 'ZIP'
  geo_id TEXT NOT NULL,    -- Place FIPS or ZIP code

  -- Core metrics
  snapshot_date DATE NOT NULL,

  -- Dimension 1: Housing (35%)
  median_home_value INTEGER,
  median_gross_rent INTEGER,
  property_tax_rate DECIMAL(5,4),
  monthly_housing_cost_own DECIMAL(10,2),
  monthly_housing_cost_rent DECIMAL(10,2),
  housing_burden_ratio_own DECIMAL(5,3),
  housing_burden_ratio_rent DECIMAL(5,3),
  housing_score_own DECIMAL(5,2),
  housing_score_rent DECIMAL(5,2),

  -- Dimension 2: Taxes (20%)
  state_income_tax_rate DECIMAL(5,3),
  local_income_tax_rate DECIMAL(5,3),
  sales_tax_rate DECIMAL(5,3),
  annual_tax_burden DECIMAL(10,2),
  tax_burden_ratio DECIMAL(5,3),
  tax_score DECIMAL(5,2),

  -- Dimension 3: Healthcare (15%)
  medicare_spending_per_capita DECIMAL(10,2),
  healthcare_cost_index DECIMAL(5,3),
  uninsured_rate DECIMAL(5,3),
  healthcare_score DECIMAL(5,2),

  -- Dimension 4: Transportation (12%)
  mean_commute_minutes DECIMAL(5,1),
  pct_public_transit DECIMAL(5,2),
  pct_drive_alone DECIMAL(5,2),
  vehicles_per_household DECIMAL(4,2),
  regional_gas_price DECIMAL(5,3),
  annual_transport_cost DECIMAL(10,2),
  transport_cost_ratio DECIMAL(5,3),
  transport_score DECIMAL(5,2),

  -- Dimension 5: Cost of Living (10%)
  regional_price_parity DECIMAL(6,2),
  col_score DECIMAL(5,2),

  -- Dimension 6: Childcare (5%)
  annual_childcare_cost DECIMAL(10,2),
  childcare_ratio DECIMAL(5,3),
  childcare_score DECIMAL(5,2),

  -- Dimension 7: Utilities (2%)
  avg_electricity_rate DECIMAL(6,4),
  avg_gas_rate DECIMAL(6,4),
  annual_utility_cost DECIMAL(10,2),
  utility_ratio DECIMAL(5,3),
  utility_score DECIMAL(5,2),

  -- Dimension 8: Food (1%)
  food_cost_index DECIMAL(5,3),
  food_score DECIMAL(5,2),

  -- Composite Score
  composite_score DECIMAL(5,2),
  composite_score_weighted DECIMAL(5,2),

  -- Metadata
  data_quality_flag TEXT,  -- 'complete', 'partial', 'estimated'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(geo_type, geo_id, snapshot_date)
);

CREATE INDEX idx_cost_dimension_lookup ON cost_dimension(geo_type, geo_id, snapshot_date DESC);
CREATE INDEX idx_cost_dimension_score ON cost_dimension(composite_score_weighted DESC);
```

#### `data_source_metadata`
Tracks data freshness and sources.

```sql
CREATE TABLE data_source_metadata (
  id SERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,  -- 'zillow_zhvi', 'census_acs', 'bea_rpp', etc.
  dimension TEXT NOT NULL,    -- 'housing', 'taxes', 'healthcare', etc.
  last_updated DATE NOT NULL,
  data_vintage TEXT,          -- e.g., '2023', '2022-2023 ACS 5-Year'
  next_update_expected DATE,
  update_frequency TEXT,      -- 'monthly', 'annual', 'quarterly'
  api_endpoint TEXT,
  notes TEXT,

  UNIQUE(source_name, dimension)
);
```

### Update Existing `affordability_snapshot` Table

Add composite score columns:

```sql
ALTER TABLE affordability_snapshot ADD COLUMN composite_score DECIMAL(5,2);
ALTER TABLE affordability_snapshot ADD COLUMN housing_score DECIMAL(5,2);
ALTER TABLE affordability_snapshot ADD COLUMN tax_score DECIMAL(5,2);
ALTER TABLE affordability_snapshot ADD COLUMN healthcare_score DECIMAL(5,2);
ALTER TABLE affordability_snapshot ADD COLUMN transport_score DECIMAL(5,2);
ALTER TABLE affordability_snapshot ADD COLUMN col_score DECIMAL(5,2);

-- Add foreign key reference to cost_dimension (optional)
ALTER TABLE affordability_snapshot ADD COLUMN cost_dimension_id INTEGER REFERENCES cost_dimension(id);
```

---

## 4. ETL Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up infrastructure for multi-source data ingestion

**Tasks:**
1. Create database schema (`cost_dimension`, `data_source_metadata`)
2. Set up data directory structure:
   ```
   /etl/data/
     /bea-rpp/
     /census-acs/
     /cms-healthcare/
     /tax-foundation/
     /eia-energy/
     /childcare-aware/
   ```
3. Create utility modules:
   - `etl/utils/census_api.py` - Census API wrapper
   - `etl/utils/bea_api.py` - BEA API wrapper
   - `etl/utils/data_quality.py` - Data validation functions

**Deliverables:**
- Database migration script (`migrations/004_cost_dimensions.sql`)
- Python utility modules

---

### Phase 2: Data Acquisition (Week 3-4)

**Goal:** Download all data sources

#### Task 2.1: BEA Regional Price Parities
```python
# etl/import_bea_rpp.py
import requests
import pandas as pd

BEA_API_KEY = os.getenv('BEA_API_KEY')  # Register at https://apps.bea.gov/api/signup/

def fetch_bea_rpp(year=2023):
    """Fetch RPP data for all metro areas and states."""
    url = f"https://apps.bea.gov/api/data"
    params = {
        'UserID': BEA_API_KEY,
        'method': 'GetData',
        'datasetname': 'Regional',
        'TableName': 'SARPP',
        'LineCode': '1',  # All items RPP
        'Year': year,
        'ResultFormat': 'JSON'
    }

    response = requests.get(url, params=params)
    data = response.json()

    # Parse and save to CSV
    df = parse_bea_response(data)
    df.to_csv(f'etl/data/bea-rpp/rpp_{year}.csv', index=False)

    return df
```

**Data Downloads:**
1. BEA RPP for metro areas and states (2023)
2. Census ACS B25064 (median rent) - all places and ZCTAs
3. Census ACS B08303, B08301, B08201 (transportation)
4. CMS Medicare Geographic Variation - county level
5. Tax Foundation property tax data (scrape or manual download)
6. Tax Foundation income/sales tax rates
7. EIA electricity and gas prices
8. Child Care Aware state reports (manual download PDFs)

**Deliverables:**
- 8 import scripts (`import_bea_rpp.py`, `import_healthcare.py`, etc.)
- Downloaded datasets in `/etl/data/`

---

### Phase 3: Data Normalization (Week 5-6)

**Goal:** Map all datasets to common geography (Place FIPS, ZCTA, County FIPS)

**Challenge:** Data comes at different geographic levels:
- BEA RPP: Metro areas + states
- Census ACS: Places, ZCTAs, counties
- CMS Healthcare: Counties
- Tax Foundation: States (some county-level for property taxes)

**Solution:** Create geographic crosswalks

```python
# etl/geo_crosswalk.py

# ZCTA → County mapping (from HUD USPS Crosswalk)
zcta_to_county = pd.read_csv('etl/data/crosswalks/ZIP_COUNTY_032024.csv')

# Place → County mapping (from Census TIGER)
place_to_county = pd.read_csv('etl/data/crosswalks/place_to_county.csv')

# County → Metro mapping (from Census CBSA definitions)
county_to_metro = pd.read_csv('etl/data/crosswalks/county_to_cbsa.csv')

def map_rpp_to_place(place_fips):
    """Map BEA metro RPP to Census place."""
    county = place_to_county[place_fips]
    metro = county_to_metro[county]
    rpp = bea_rpp[metro]  # Use metro RPP
    return rpp if rpp else bea_rpp[state]  # Fall back to state RPP
```

**Deliverables:**
- Crosswalk CSV files
- Mapping functions for each data source

---

### Phase 4: Score Calculation (Week 7)

**Goal:** Calculate dimension scores and composite score

```python
# etl/calculate_composite_scores.py

WEIGHTS = {
    'housing': 0.35,
    'tax': 0.20,
    'healthcare': 0.15,
    'transport': 0.12,
    'col': 0.10,
    'childcare': 0.05,
    'utilities': 0.02,
    'food': 0.01
}

def calculate_housing_score(row):
    """Calculate housing dimension score."""
    if row['median_home_value'] is None:
        return None

    # Monthly mortgage + property tax + insurance
    monthly_cost = (
        (row['median_home_value'] * 0.07 / 12) +  # 7% mortgage rate
        (row['median_home_value'] * row['property_tax_rate'] / 12) +
        (row['median_home_value'] * 0.0035 / 12)  # Insurance
    )

    monthly_income = row['median_income'] / 12
    burden_ratio = monthly_cost / monthly_income

    # Score: 100 if 0% burden, 0 if 50%+ burden
    score = max(0, min(100, 100 * (1 - burden_ratio / 0.50)))

    return score

def calculate_composite_score(row):
    """Calculate weighted composite score."""
    scores = {
        'housing': row['housing_score'],
        'tax': row['tax_score'],
        'healthcare': row['healthcare_score'],
        'transport': row['transport_score'],
        'col': row['col_score'],
        'childcare': row['childcare_score'],
        'utilities': row['utility_score'],
        'food': row['food_score']
    }

    # Filter out None values
    valid_scores = {k: v for k, v in scores.items() if v is not None}

    # Recalculate weights for missing dimensions
    total_weight = sum(WEIGHTS[k] for k in valid_scores.keys())
    adjusted_weights = {k: WEIGHTS[k] / total_weight for k in valid_scores.keys()}

    # Weighted average
    composite = sum(valid_scores[k] * adjusted_weights[k] for k in valid_scores.keys())

    return composite
```

**Deliverables:**
- Score calculation module
- Data quality flags for partial data

---

### Phase 5: Database Population (Week 8)

**Goal:** Populate `cost_dimension` table

```python
# etl/populate_cost_dimensions.py

def populate_all_dimensions():
    """Master ETL pipeline."""

    # Load all data sources
    rpp_data = pd.read_csv('etl/data/bea-rpp/rpp_2023.csv')
    rent_data = fetch_census_acs('B25064', year=2023)
    healthcare_data = pd.read_csv('etl/data/cms/medicare_geo_2023.csv')
    transport_data = fetch_census_acs(['B08303', 'B08301', 'B08201'], year=2023)
    # ... load other sources

    # Merge all dimensions by geography
    for geo_type in ['CITY', 'ZIP']:
        geos = get_geographies(geo_type)

        for geo in geos:
            row = {
                'geo_type': geo_type,
                'geo_id': geo['id'],
                'snapshot_date': '2024-01-01',
            }

            # Populate each dimension
            row.update(get_housing_data(geo))
            row.update(get_tax_data(geo))
            row.update(get_healthcare_data(geo))
            row.update(get_transport_data(geo))
            row.update(get_rpp_data(geo, rpp_data))
            row.update(get_childcare_data(geo))
            row.update(get_utilities_data(geo))

            # Calculate scores
            row['housing_score'] = calculate_housing_score(row)
            row['tax_score'] = calculate_tax_score(row)
            # ... calculate other scores

            row['composite_score'] = calculate_composite_score(row)

            # Insert into database
            insert_cost_dimension(row)

    print("Cost dimensions populated successfully!")
```

**Deliverables:**
- Populated `cost_dimension` table
- Data quality report (% complete data per geography)

---

## 5. API & UI Updates

### API Endpoints

#### New Endpoints

**`GET /api/v1/affordability/[geoId]/dimensions`**
```typescript
// Response
{
  "geoId": "2507000",  // Boston MA
  "geoType": "CITY",
  "geoName": "Boston, MA",
  "snapshotDate": "2024-01-01",
  "dimensions": {
    "housing": {
      "score": 45.2,
      "rank": 1234,
      "percentile": 35,
      "details": {
        "medianHomeValue": 785000,
        "medianRent": 2800,
        "propertyTaxRate": 0.0115,
        "monthlyHousingCostOwn": 5890,
        "housingBurdenRatio": 0.52
      }
    },
    "tax": {
      "score": 62.1,
      "rank": 890,
      "percentile": 55,
      "details": {
        "stateTaxRate": 0.05,
        "salesTaxRate": 0.0625,
        "annualTaxBurden": 18540,
        "taxBurdenRatio": 0.19
      }
    },
    // ... other dimensions
  },
  "compositeScore": 58.3,
  "compositeRank": 1045,
  "compositePercentile": 48,
  "dataQuality": "complete"
}
```

**`GET /api/v1/rankings/composite`**
```typescript
// Response
{
  "rankings": [
    {
      "rank": 1,
      "geoId": "4805000",  // Example: Somewhere in Texas
      "geoName": "Austin, TX",
      "compositeScore": 87.5,
      "topDimensions": ["housing", "tax", "transport"],
      "population": 974447
    },
    // ... more results
  ],
  "totalResults": 2847,
  "filters": {
    "minPopulation": 50000,
    "state": null
  }
}
```

### UI Components

#### New Page: `/affordability-explained`

Methodology page explaining:
- The 8 dimensions
- How scores are calculated
- Data sources with links
- Weightings and rationale
- Caveats and limitations

#### Updated City/ZIP Pages

Add new sections:
```tsx
// Component: DimensionBreakdown.tsx
<DimensionBreakdown>
  <DimensionCard
    name="Housing"
    score={45.2}
    weight={35}
    rank={1234}
    icon={<HomeIcon />}
  />
  <DimensionCard
    name="Taxes"
    score={62.1}
    weight={20}
    rank={890}
    icon={<TaxIcon />}
  />
  {/* ... other dimensions */}
</DimensionBreakdown>

// Component: ScoreRadar.tsx
<ScoreRadar
  dimensions={[
    {name: "Housing", score: 45.2},
    {name: "Taxes", score: 62.1},
    // ... etc
  ]}
/>
```

#### Updated Rankings Page

Add dimension filters:
```tsx
<FilterBar>
  <Select name="primaryDimension">
    <option value="composite">Overall Affordability</option>
    <option value="housing">Best Housing Affordability</option>
    <option value="tax">Lowest Tax Burden</option>
    <option value="healthcare">Most Affordable Healthcare</option>
    {/* ... other dimensions */}
  </Select>
</FilterBar>
```

---

## 6. Implementation Timeline

### Week 1-2: Foundation
- [ ] Database schema design
- [ ] Create migration scripts
- [ ] Set up data directory structure
- [ ] Build utility modules (Census API, BEA API)

### Week 3-4: Data Acquisition
- [ ] Download BEA RPP data
- [ ] Download Census ACS tables (rent, transportation)
- [ ] Download CMS healthcare data
- [ ] Scrape/download Tax Foundation data
- [ ] Download EIA energy price data
- [ ] Manual download childcare reports

### Week 5-6: Data Normalization
- [ ] Create geographic crosswalks
- [ ] Build mapping functions (metro→place, county→ZCTA)
- [ ] Normalize all datasets to common schema
- [ ] Validate data quality

### Week 7: Score Calculation
- [ ] Implement dimension score functions
- [ ] Implement composite score function
- [ ] Test calculations on sample data
- [ ] Generate data quality report

### Week 8: Database Population
- [ ] Run ETL pipeline for all geographies
- [ ] Populate `cost_dimension` table
- [ ] Update `affordability_snapshot` with composite scores
- [ ] Create indexes for performance

### Week 9-10: API Development
- [ ] Build `/api/v1/affordability/[id]/dimensions` endpoint
- [ ] Build `/api/v1/rankings/composite` endpoint
- [ ] Add dimension filtering to existing endpoints
- [ ] Write API documentation

### Week 11-12: UI Development
- [ ] Create DimensionBreakdown component
- [ ] Create ScoreRadar chart component
- [ ] Update city/ZIP pages with new data
- [ ] Update rankings page with dimension filters
- [ ] Create affordability methodology page
- [ ] Add data source attributions

---

## 7. Success Metrics

### Data Coverage Goals
- **95%+** of cities with population > 50k have complete data (all 8 dimensions)
- **80%+** of ZCTAs have at least 6 dimensions populated
- **100%** of states have complete state-level tax data

### Performance Goals
- Composite score calculation: < 100ms per geography
- Full ETL pipeline: < 4 hours for all geographies
- API response time: < 200ms for dimension breakdown

### User Engagement Goals (3 months post-launch)
- **50%** of users view dimension breakdown on city pages
- **30%** of users filter rankings by specific dimension
- **20%** increase in time-on-site (richer data = more engagement)

---

## 8. Future Enhancements (V3)

### Additional Dimensions to Consider
- **Climate/Weather Score** (NOAA data)
- **Safety Score** (FBI UCR crime data)
- **Education Quality** (school ratings, college access)
- **Job Market Strength** (unemployment, wage growth, industry diversity)
- **Walkability/Bikeability** (Walk Score API)
- **Air Quality** (EPA AQI data)
- **Natural Disaster Risk** (FEMA flood zones, wildfire risk)

### Personalization
- Custom dimension weights based on user preferences
- Household-specific calculations (family size, income, profession)
- "Your affordability score" calculator

### Predictive Analytics
- Forecast composite score changes (next 1-5 years)
- Identify "rising stars" (improving affordability)
- Alert users to emerging affordable markets

---

## 9. Risks & Mitigations

### Risk 1: Data Availability
**Risk:** Some data sources lack city/ZIP granularity (e.g., childcare costs often state-level only)

**Mitigation:**
- Use state-level data as fallback
- Clearly flag data quality ("estimated" vs "measured")
- Prioritize dimensions with best city-level coverage

### Risk 2: Data Freshness
**Risk:** Different update cycles (monthly, annual) create temporal misalignment

**Mitigation:**
- Timestamp each dimension's vintage
- Show data freshness indicators in UI
- Use "best available" data for each dimension

### Risk 3: Calculation Complexity
**Risk:** Users may not understand composite score methodology

**Mitigation:**
- Detailed methodology page
- Interactive "adjust weights" tool
- Show both simple ratio (V1) and composite score (V2)

### Risk 4: API Rate Limits
**Risk:** Census API, BEA API have rate limits

**Mitigation:**
- Batch requests intelligently
- Cache downloaded data locally
- Use multi-year ACS estimates (more stable)

---

## 10. Next Steps

**Immediate Actions:**
1. Review this plan with stakeholders
2. Sign up for BEA API key (https://apps.bea.gov/api/signup/)
3. Create database migration PR
4. Start Phase 1: Foundation (Week 1-2)

**Questions to Resolve:**
1. Should we display both V1 (simple ratio) and V2 (composite score) to users?
2. Which dimensions should we prioritize if data coverage is incomplete?
3. Do we want to allow users to customize dimension weights?

---

*Document Version: 1.0*
*Created: 2025-12-22*
*Owner: Affordability Index Team*
