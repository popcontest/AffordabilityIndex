# Composite Index Technical Appendix

**Version:** 1.0
**Date:** 2025-12-22
**Companion to:** COMPOSITE_INDEX_METHODOLOGY.md

This document provides detailed mathematical formulas, calculation examples, and implementation pseudocode for the True Affordability Score (TAS) system.

---

## Table of Contents

1. [Mathematical Definitions](#mathematical-definitions)
2. [Detailed Cost Calculations by Category](#detailed-cost-calculations-by-category)
3. [Persona Weight Matrices](#persona-weight-matrices)
4. [Percentile Calculation Algorithms](#percentile-calculation-algorithms)
5. [Missing Data Imputation Procedures](#missing-data-imputation-procedures)
6. [Implementation Pseudocode](#implementation-pseudocode)
7. [Validation Test Cases](#validation-test-cases)

---

## Mathematical Definitions

### Core Variables

Let:
- `I` = Median household income for location
- `C_h` = Annual housing cost (mortgage/rent + property tax + insurance)
- `C_t` = Annual transportation cost
- `C_tax` = Annual tax cost (state + local income + sales)
- `C_f` = Annual food cost
- `C_hc` = Annual healthcare cost
- `C_u` = Annual utility cost
- `C_cc` = Annual childcare cost
- `C_o` = Annual other necessities cost

### Weight Vectors by Persona

#### Family (2 Adults, 2 Children) - Baseline
```
W_family = {
  w_h:   0.33,  // Housing
  w_t:   0.17,  // Transportation
  w_tax: 0.15,  // Taxes
  w_f:   0.13,  // Food
  w_hc:  0.08,  // Healthcare
  w_u:   0.06,  // Utilities
  w_cc:  0.05,  // Childcare
  w_o:   0.03   // Other
}
```

#### Single Adult
```
W_single = {
  w_h:   0.35,  // +2% from childcare
  w_t:   0.19,  // +2% from childcare
  w_tax: 0.15,
  w_f:   0.10,  // -3% (smaller household)
  w_hc:  0.09,  // +1%
  w_u:   0.05,  // -1% (smaller dwelling)
  w_cc:  0.00,  // N/A
  w_o:   0.07   // +4% (more discretionary)
}
```

#### Couple (No Children)
```
W_couple = {
  w_h:   0.34,  // +1% from childcare
  w_t:   0.18,  // +1% from childcare
  w_tax: 0.15,
  w_f:   0.12,  // -1%
  w_hc:  0.10,  // +2% (two adults)
  w_u:   0.06,
  w_cc:  0.00,  // N/A
  w_o:   0.05   // +2%
}
```

#### Retiree (65+)
```
W_retiree = {
  w_h:   0.35,  // +2%
  w_t:   0.12,  // -5% (less commuting)
  w_tax: 0.12,  // -3% (lower income)
  w_f:   0.13,
  w_hc:  0.15,  // +7% (Medicare + supplemental)
  w_u:   0.07,  // +1% (home more often)
  w_cc:  0.00,  // N/A
  w_o:   0.06   // +3%
}
```

### True Affordability Score (TAS)

**Formula:**
```
TAS = DIR × 100

Where DIR (Disposable Income Ratio) =
  (I - C_total) / I

And C_total = C_h + C_t + C_tax + C_f + C_hc + C_u + C_cc + C_o
```

**Alternative Formulation (for weighted components):**

If costs are expressed as fractions of income:
```
r_h = C_h / I    (housing burden ratio)
r_t = C_t / I    (transportation burden ratio)
...

TAS = (1 - Σ r_i) × 100
    = (1 - r_h - r_t - r_tax - r_f - r_hc - r_u - r_cc - r_o) × 100
```

**Properties:**
- Domain: TAS ∈ (-∞, 100]
- Realistic range: TAS ∈ [-20, 50]
- Interpretation:
  - TAS = 30 → 30% of income remains after essentials
  - TAS = 0 → 0% remains (break-even)
  - TAS = -10 → Costs exceed income by 10%

---

## Detailed Cost Calculations by Category

### 1. Housing Cost (C_h)

#### For Homeowners (Mortgage Scenario)

**Inputs:**
- `P` = Median home value (Zillow ZHVI)
- `D` = Down payment percentage (default: 0.20 for 20%)
- `r` = Annual mortgage interest rate (default: 0.07 for 7%)
- `n` = Loan term in years (default: 30)
- `τ_p` = Property tax rate (effective rate as decimal)
- `τ_i` = Home insurance rate (default: 0.005 = 0.5% of home value annually)

**Calculations:**

Loan amount:
```
L = P × (1 - D)
```

Monthly mortgage payment (principal + interest):
```
r_m = r / 12  (monthly rate)
N = n × 12    (total months)

M = L × [r_m × (1 + r_m)^N] / [(1 + r_m)^N - 1]
```

Annual mortgage payments:
```
C_mortgage = M × 12
```

Annual property tax:
```
C_prop_tax = P × τ_p
```

Annual home insurance:
```
C_insurance = P × τ_i
```

**Total Annual Housing Cost:**
```
C_h = C_mortgage + C_prop_tax + C_insurance
```

**Example (Seattle Family):**
```
P = $650,000
D = 0.10 (10% down)
r = 0.07 (7% annual)
τ_p = 0.010 (1.0% property tax)
τ_i = 0.005 (0.5% insurance)

L = $650,000 × 0.90 = $585,000
r_m = 0.07 / 12 = 0.005833
N = 30 × 12 = 360

M = $585,000 × [0.005833 × (1.005833)^360] / [(1.005833)^360 - 1]
  = $585,000 × [0.005833 × 7.918] / [6.918]
  = $585,000 × 0.027013 / 6.918
  ≈ $3,894.32

C_mortgage = $3,894.32 × 12 = $46,732
C_prop_tax = $650,000 × 0.01 = $6,500
C_insurance = $650,000 × 0.005 = $3,250

C_h = $46,732 + $6,500 + $3,250 = $56,482

But for Example 2, we used $38,000 (likely assuming lower down payment scenario
or different mortgage terms). Adjust as needed for actual calculation.
```

#### For Renters

**Inputs:**
- `R_m` = Median gross rent (Census ACS B25064)
- `τ_i` = Renter's insurance (default: $200/year)

**Calculation:**
```
C_h = (R_m × 12) + τ_i
```

**Example (Fort Wayne Single Adult):**
```
R_m = $800/month
τ_i = $200/year

C_h = ($800 × 12) + $200 = $9,600 + $200 = $9,800
```

---

### 2. Transportation Cost (C_t)

#### For Car-Dependent Areas (2-Car Household)

**Inputs:**
- `N_cars` = Number of cars (default: 2 for family, 1 for single)
- `C_car_base` = National average annual car cost (AAA data: ~$10,000/car in 2024)
- `RPP_t` = Regional price parity for transportation (BEA data)
- `miles_annual` = Annual miles driven (default: 12,000/car)
- `mpg` = Fuel efficiency (default: 25 mpg)
- `gas_price` = Regional gas price ($/gallon)

**Simplified Formula (AAA Method):**
```
C_t = N_cars × C_car_base × (RPP_t / 100)

Where C_car_base includes:
- Fuel: $1,500
- Insurance: $1,400
- Maintenance: $1,200
- Depreciation: $3,500
- Finance charges: $800
- Registration/fees: $600
Total: ~$9,000-$12,000 depending on vehicle type
```

**Detailed Formula (Per-Mile Method):**
```
C_fuel = N_cars × miles_annual × (gas_price / mpg)
C_insurance = N_cars × avg_insurance_premium_regional
C_maintenance = N_cars × 0.10 × avg_vehicle_value
C_depreciation = N_cars × 0.15 × purchase_price / 5  (5-year depreciation)
C_registration = N_cars × state_registration_fee

C_t = C_fuel + C_insurance + C_maintenance + C_depreciation + C_registration
```

**Example (Raleigh Family):**
```
N_cars = 2
C_car_base = $10,000 (AAA 2024 average)
RPP_t = 95 (NC is slightly below national average)

C_t = 2 × $10,000 × (95 / 100) = $19,000 × 0.95 = $18,050

But methodology example used $11,000 (possibly using lower miles or one car).
Adjust based on actual regional data.
```

#### For Transit-Rich Areas (Mixed Mode)

**Inputs:**
- `pct_transit` = Percentage of households using transit (Census ACS)
- `C_transit_annual` = Annual transit pass cost
- `pct_car` = Percentage using cars (1 - pct_transit)
- `C_car_partial` = Reduced car cost (fewer miles)

**Formula:**
```
C_t = (pct_transit × C_transit_annual) + (pct_car × C_car_partial)
```

**Example (Seattle with some transit use):**
```
pct_transit = 0.20 (20% use transit for primary commute)
C_transit_annual = $1,200 (ORCA annual pass)
pct_car = 0.80
C_car_partial = $8,000 (lower miles, one car)

C_t = (0.20 × $1,200) + (0.80 × $8,000)
    = $240 + $6,400 = $6,640

But for two-car household, add second car:
C_t = $6,640 + $8,000 = $14,640

Methodology example used $12,000 (blended estimate).
```

---

### 3. Tax Cost (C_tax)

#### Components:
1. State income tax
2. Local income tax (if applicable)
3. Sales tax (effective rate on taxable consumption)

**Inputs:**
- `I` = Household income
- `τ_state` = State income tax rate (marginal or effective for income level)
- `τ_local` = Local income tax rate
- `τ_sales` = Combined state + local sales tax rate
- `pct_taxable` = Percentage of income subject to sales tax (default: 0.25)

**Formula:**

State income tax:
```
C_state_tax = I × τ_state
```

Local income tax (if applicable):
```
C_local_tax = I × τ_local
```

Estimated sales tax:
```
C_sales_tax = I × pct_taxable × τ_sales
```

**Total Tax Cost:**
```
C_tax = C_state_tax + C_local_tax + C_sales_tax
```

**Example 1 (Raleigh, NC - Family with $75k income):**
```
I = $75,000
τ_state = 0.0475 (NC flat rate 4.75%)
τ_local = 0 (NC has no local income tax)
τ_sales = 0.07 (7% combined sales tax)
pct_taxable = 0.30 (assume 30% of income on taxable goods)

C_state_tax = $75,000 × 0.0475 = $3,562.50
C_local_tax = $0
C_sales_tax = $75,000 × 0.30 × 0.07 = $1,575

C_tax = $3,562.50 + $0 + $1,575 = $5,137.50

Methodology example used $6,500 (possibly including federal payroll or higher consumption rate).
```

**Example 2 (Seattle, WA - No State Income Tax):**
```
I = $110,000
τ_state = 0 (WA has no state income tax)
τ_local = 0
τ_sales = 0.105 (10.5% - one of highest in US)
pct_taxable = 0.30

C_state_tax = $0
C_local_tax = $0
C_sales_tax = $110,000 × 0.30 × 0.105 = $3,465

C_tax = $3,465

But methodology example used $8,500. Possibly including:
- Federal payroll taxes (FICA): $110k × 0.0765 = $8,415
Total including FICA: $3,465 + $8,415 = $11,880

Clarification needed: Should we include federal payroll taxes?
Recommendation: YES, include FICA (7.65%) as it's unavoidable.

Revised formula:
C_tax = (I × 0.0765) + C_state_tax + C_local_tax + C_sales_tax
```

---

### 4. Food Cost (C_f)

**Inputs:**
- `N_adults` = Number of adults in household
- `N_children` = Number of children
- `age_child_1`, `age_child_2` = Ages of children
- `USDA_plan` = Food plan level (thrifty, low-cost, moderate, liberal)
- `RPP_food` = Regional price parity for food (BEA data, or default to all-items RPP)

**Base Costs (USDA Moderate Plan, 2024 Monthly):**
- Adult male (19-50): $350/month
- Adult female (19-50): $300/month
- Child (3-5 years): $180/month
- Child (6-8 years): $240/month
- Child (9-11 years): $280/month

**Formula:**
```
C_f_base = (monthly_adult_male + monthly_adult_female + Σ monthly_children) × 12

C_f = C_f_base × (RPP_food / 100)
```

**Example (Raleigh Family: 2 adults, children age 3 and 7):**
```
Adult male: $350/mo
Adult female: $300/mo
Child age 3: $180/mo
Child age 7: $240/mo

C_f_base = ($350 + $300 + $180 + $240) × 12
         = $1,070 × 12 = $12,840

RPP_food = 98 (NC slightly below national average)

C_f = $12,840 × (98 / 100) = $12,583.20

Methodology example used $9,500 (possibly using low-cost plan instead of moderate).
```

**Scaling for Single Adult:**
```
C_f_base = $350 × 12 = $4,200
RPP_food = 95 (Indiana)
C_f = $4,200 × 0.95 = $3,990 ≈ $4,000
```

---

### 5. Healthcare Cost (C_hc)

**Components:**
1. Insurance premiums (employer-sponsored, marketplace, or Medicare)
2. Out-of-pocket expenses (deductibles, copays, prescriptions)

**Inputs:**
- `household_type` = single, couple, family
- `age_adults` = Average age of adults
- `employer_sponsored` = Boolean (true if employer plan, false if marketplace)
- `premium_region` = Regional premium multiplier
- `deductible` = Plan deductible
- `utilization_rate` = Expected healthcare use (0-1 scale)

**Formula (Marketplace Plans):**

Annual premium (before subsidies):
```
C_premium_base = {
  single:  $5,000
  couple:  $10,000
  family:  $15,000
}  (2024 silver plan averages)

C_premium = C_premium_base × premium_region
```

Annual out-of-pocket (estimated):
```
C_oop_base = {
  single:  $1,200
  couple:  $2,000
  family:  $3,000
}  (typical spending beyond premiums)

C_oop = C_oop_base × utilization_rate
```

**Total Healthcare Cost:**
```
C_hc = C_premium + C_oop
```

**Example (Raleigh Family):**
```
C_premium_base = $15,000 (family silver plan)
premium_region = 0.90 (NC below national average)
C_oop_base = $3,000
utilization_rate = 0.80

C_premium = $15,000 × 0.90 = $13,500
C_oop = $3,000 × 0.80 = $2,400

C_hc = $13,500 + $2,400 = $15,900

Methodology example used $6,000 (likely employer-sponsored with cost sharing).

Revised for employer plan:
Employee premium share = $15,000 × 0.30 = $4,500
C_hc = $4,500 + $2,400 = $6,900 ≈ $6,000
```

**For Retirees (Medicare + Supplemental):**
```
C_medicare_B = $174.70/month × 12 = $2,096.40 (2024 Part B premium)
C_medigap = $200/month × 12 = $2,400 (supplemental plan)
C_part_D = $40/month × 12 = $480 (prescription drug coverage)
C_oop_senior = $2,000 (dental, vision, copays not covered)

C_hc = $2,096 + $2,400 + $480 + $2,000 = $6,976 ≈ $7,000
```

---

### 6. Utility Cost (C_u)

**Components:**
1. Electricity
2. Natural gas (heating)
3. Water/sewer

**Inputs:**
- `kwh_annual` = Annual electricity usage (kWh)
- `rate_electric` = Regional electricity rate ($/kWh)
- `therm_annual` = Annual natural gas usage (therms)
- `rate_gas` = Regional gas rate ($/therm)
- `water_monthly` = Average monthly water/sewer bill
- `household_size` = Number of people (affects usage)

**Formula:**

Electricity:
```
C_electric = kwh_annual × rate_electric
```

Natural gas:
```
C_gas = therm_annual × rate_gas
```

Water/sewer:
```
C_water = water_monthly × 12
```

**Total Utility Cost:**
```
C_u = C_electric + C_gas + C_water
```

**Example (Raleigh Family in 2,000 sq ft home):**
```
kwh_annual = 12,000 (national average for family)
rate_electric = $0.12/kWh (NC average)
therm_annual = 400 (moderate heating needs)
rate_gas = $1.20/therm
water_monthly = $60

C_electric = 12,000 × $0.12 = $1,440
C_gas = 400 × $1.20 = $480
C_water = $60 × 12 = $720

C_u = $1,440 + $480 + $720 = $2,640

Methodology example used $2,200 (close match).
```

**Single Adult in 1BR Apartment:**
```
kwh_annual = 5,000 (smaller space)
rate_electric = $0.13/kWh
therm_annual = 200
rate_gas = $1.20/therm
water_monthly = $45 (lower usage)

C_electric = 5,000 × $0.13 = $650
C_gas = 200 × $1.20 = $240
C_water = $45 × 12 = $540

C_u = $650 + $240 + $540 = $1,430

Methodology example used $1,800 (1BR Fort Wayne).
```

---

### 7. Childcare Cost (C_cc)

**Inputs:**
- `N_infants` = Number of children 0-2 years (most expensive)
- `N_preschool` = Number of children 3-5 years
- `N_school_age` = Number of children 6-12 years (after-school care)
- `region` = State or metro area
- `childcare_type` = center-based, home-based, family care

**Base Costs (National Averages, 2024):**
- Infant (0-2): $1,200/month
- Preschool (3-5): $900/month
- School-age (6-12): $400/month (after-school)

**Regional Multipliers (examples):**
- Massachusetts: 1.8× (highest)
- Washington: 1.4×
- North Carolina: 1.0× (national average)
- Alabama: 0.7× (lowest)
- Mississippi: 0.6×

**Formula:**
```
C_cc_base = (N_infants × $1,200 + N_preschool × $900 + N_school_age × $400) × 12

C_cc = C_cc_base × regional_multiplier
```

**Example (Raleigh Family: Age 3 and Age 7):**
```
N_infants = 0
N_preschool = 1 (age 3)
N_school_age = 1 (age 7)

C_cc_base = (0 × $1,200 + 1 × $900 + 1 × $400) × 12
          = $1,300 × 12 = $15,600

regional_multiplier = 1.0 (NC)

C_cc = $15,600 × 1.0 = $15,600

Methodology example used $10,000 (possibly part-time or family care).
```

**Example (Seattle Family: Same ages):**
```
C_cc_base = $15,600 (same calculation)
regional_multiplier = 1.4 (WA is expensive)

C_cc = $15,600 × 1.4 = $21,840

Methodology example used $15,000 (potentially lower due to employer backup care or subsidies).
```

**For Single/Couple/Retiree:**
```
C_cc = $0 (N/A)
```

---

### 8. Other Necessities Cost (C_o)

**Components:**
- Apparel and services
- Personal care products
- Household supplies (cleaning, paper goods)
- Basic phone/internet (essential communication)
- Minimal personal expenses

**Inputs:**
- `household_size` = Number of people
- `base_per_person` = $600-800/year per person
- `RPP_services` = Regional price parity for services

**Formula:**
```
C_o_base = household_size × $700

C_o = C_o_base × (RPP_services / 100)
```

**Example (Raleigh Family of 4):**
```
household_size = 4
C_o_base = 4 × $700 = $2,800
RPP_services = 98

C_o = $2,800 × 0.98 = $2,744

Methodology example used $2,300 (slightly lower, reasonable).
```

**Example (Single Adult):**
```
household_size = 1
C_o_base = 1 × $700 = $700
RPP_services = 95

C_o = $700 × 0.95 = $665

Add internet ($60/mo) + phone ($50/mo):
C_o = $665 + $720 + $600 = $1,985 ≈ $2,000

Methodology example used $2,500 for Fort Wayne single adult.
```

---

## Persona Weight Matrices

### Weight Matrix Table

| Category | Family | Single | Couple | Retiree |
|----------|--------|--------|--------|---------|
| Housing | 33% | 35% | 34% | 35% |
| Transportation | 17% | 19% | 18% | 12% |
| Taxes | 15% | 15% | 15% | 12% |
| Food | 13% | 10% | 12% | 13% |
| Healthcare | 8% | 9% | 10% | 15% |
| Utilities | 6% | 5% | 6% | 7% |
| Childcare | 5% | 0% | 0% | 0% |
| Other | 3% | 7% | 5% | 6% |
| **Total** | **100%** | **100%** | **100%** | **100%** |

### Application in Code

When calculating TAS for a given persona, retrieve the appropriate weight vector:

```javascript
const WEIGHTS = {
  family: {
    housing: 0.33,
    transportation: 0.17,
    taxes: 0.15,
    food: 0.13,
    healthcare: 0.08,
    utilities: 0.06,
    childcare: 0.05,
    other: 0.03
  },
  single: {
    housing: 0.35,
    transportation: 0.19,
    taxes: 0.15,
    food: 0.10,
    healthcare: 0.09,
    utilities: 0.05,
    childcare: 0.00,
    other: 0.07
  },
  couple: {
    housing: 0.34,
    transportation: 0.18,
    taxes: 0.15,
    food: 0.12,
    healthcare: 0.10,
    utilities: 0.06,
    childcare: 0.00,
    other: 0.05
  },
  retiree: {
    housing: 0.35,
    transportation: 0.12,
    taxes: 0.12,
    food: 0.13,
    healthcare: 0.15,
    utilities: 0.07,
    childcare: 0.00,
    other: 0.06
  }
};
```

**Note:** Weights are for **communication and display purposes** (showing relative importance). The actual TAS calculation uses **absolute dollar amounts**, not weighted costs.

---

## Percentile Calculation Algorithms

### Method 1: Simple Percentile Rank

**Input:** Array of TAS scores for all locations, and target location's TAS

**Formula:**
```
percentile = (count of locations with TAS < target_TAS) / (total locations) × 100
```

**Pseudocode:**
```python
def calculate_percentile(target_tas: float, all_tas_scores: list[float]) -> int:
    """
    Calculate percentile rank for a location's TAS score.
    Higher TAS = more affordable = higher percentile.
    """
    if not all_tas_scores:
        return None

    # Count locations with worse (lower) TAS
    worse_count = sum(1 for score in all_tas_scores if score < target_tas)

    # Percentile calculation
    percentile = (worse_count / len(all_tas_scores)) * 100

    # Round to nearest integer
    return round(percentile)
```

**Example:**
```
All TAS scores: [10, 15, 20, 25, 28, 30, 32, 35, 40]
Target location: 28

Worse scores (< 28): [10, 15, 20, 25] = 4 locations
Total locations: 9

Percentile = (4 / 9) × 100 = 44.4% → 44th percentile

Interpretation: "More affordable than 44% of locations"
```

### Method 2: Interpolated Percentile (More Precise)

For ties and edge cases:

```python
def calculate_percentile_interpolated(target_tas: float, all_tas_scores: list[float]) -> float:
    """
    Calculate percentile with interpolation for ties.
    """
    sorted_scores = sorted(all_tas_scores)
    n = len(sorted_scores)

    # Count scores strictly less than target
    count_below = sum(1 for score in sorted_scores if score < target_tas)

    # Count scores equal to target
    count_equal = sum(1 for score in sorted_scores if score == target_tas)

    # Percentile = (count_below + 0.5 × count_equal) / n × 100
    percentile = ((count_below + 0.5 * count_equal) / n) * 100

    return round(percentile, 1)
```

**Why interpolation?**
If 3 locations have TAS = 28, they should be ranked at the midpoint of their tied range, not all at the bottom.

---

## Missing Data Imputation Procedures

### Tier 1: Exact Match (Preferred)

**Goal:** Use data for the exact location (city, ZIP, or county).

**Query:**
```sql
SELECT housing_cost, healthcare_cost, transportation_cost, ...
FROM cost_basket
WHERE county_fips = ?location_county_fips
  AND household_type = ?persona
  AND version = ?latest_version
LIMIT 1;
```

**If found:** Use all values directly. Mark `data_quality_flag = 'complete'`.

---

### Tier 2: Regional Fallback

**Goal:** If county data missing, use metro or state average.

**Procedure:**

1. **Try Metro Area Average:**
```sql
SELECT AVG(housing_cost), AVG(healthcare_cost), ...
FROM cost_basket
WHERE metro_area = ?location_metro
  AND household_type = ?persona
  AND version = ?latest_version
GROUP BY metro_area;
```

2. **If metro unavailable, try State Average:**
```sql
SELECT AVG(housing_cost), AVG(healthcare_cost), ...
FROM cost_basket
WHERE state_abbr = ?location_state
  AND household_type = ?persona
  AND version = ?latest_version
GROUP BY state_abbr;
```

**If found:** Use regional average. Mark `data_quality_flag = 'partial'`.

---

### Tier 3: Imputation with RPP Adjustment

**Goal:** If category data missing entirely, estimate using national median × regional price parity.

**Procedure:**

1. Get national median for category:
```sql
SELECT MEDIAN(healthcare_cost)
FROM cost_basket
WHERE household_type = ?persona
  AND version = ?latest_version;
```

2. Get regional price parity for location:
```sql
SELECT all_items_rpp, services_rpp, goods_rpp
FROM regional_price_parity
WHERE state_abbr = ?location_state
  AND as_of_year = ?current_year;
```

3. Apply RPP adjustment:
```
estimated_cost = national_median × (rpp / 100)
```

**Category-specific RPP mapping:**
- Housing: Use `rent_rpp` (if available) or `all_items_rpp`
- Healthcare: Use `services_rpp`
- Food: Use `goods_rpp`
- Utilities: Use `all_items_rpp`
- Transportation: Use `all_items_rpp`

**Example:**
```
National median healthcare (family): $8,000
North Carolina all_items_rpp: 92.5

Estimated NC healthcare: $8,000 × (92.5 / 100) = $7,400
```

**Mark:** `data_quality_flag = 'estimated'`

---

### Tier 4: Similar Location Imputation (KNN)

**Goal:** For locations with very sparse data, use k-nearest neighbors based on demographic similarity.

**Similarity Metrics:**
- Population size (log scale)
- Median income
- Region (Northeast, Southeast, Midwest, etc.)
- Metro vs rural classification

**Procedure:**

1. Calculate similarity score:
```python
def similarity_score(loc_a, loc_b):
    pop_diff = abs(log(loc_a.population) - log(loc_b.population))
    income_diff = abs(loc_a.income - loc_b.income) / max(loc_a.income, loc_b.income)
    region_match = 1 if loc_a.region == loc_b.region else 0

    score = (1 - pop_diff/10) + (1 - income_diff) + region_match
    return score
```

2. Find k=5 most similar locations with complete data.

3. Average costs across neighbors:
```python
imputed_cost = mean([neighbor.healthcare_cost for neighbor in top_5_neighbors])
```

**Mark:** `data_quality_flag = 'estimated_knn'`

---

### Data Quality Flag Display

**UI Communication:**

```
Affordability Score: 28% (Good)
Data Quality: Complete ✓

All 8 cost categories based on local data.
```

```
Affordability Score: 25% (Moderate)
Data Quality: Partial ⚠

6 of 8 categories from local data.
2 categories estimated from state averages.
[View details]
```

```
Affordability Score: 30% (Good)
Data Quality: Estimated ℹ

4 of 8 categories estimated from regional data.
Use with caution for financial planning.
[See methodology]
```

---

## Implementation Pseudocode

### Main TAS Calculation Function

```typescript
interface CostBreakdown {
  housing: number;
  transportation: number;
  taxes: number;
  food: number;
  healthcare: number;
  utilities: number;
  childcare: number;
  other: number;
  total: number;
}

interface TASResult {
  score: number;
  percentile: number;
  disposableIncome: number;
  costBreakdown: CostBreakdown;
  dataQuality: 'complete' | 'partial' | 'estimated';
  persona: string;
}

async function calculateTrueAffordabilityScore(
  locationId: string,
  geoType: 'CITY' | 'ZCTA' | 'PLACE',
  persona: 'family' | 'single' | 'couple' | 'retiree'
): Promise<TASResult> {

  // 1. Get median income for location
  const income = await getMedianIncome(locationId, geoType);

  if (!income) {
    throw new Error(`No income data for ${locationId}`);
  }

  // 2. Get cost breakdown (with imputation if needed)
  const costs = await getCostBreakdown(locationId, geoType, persona);

  // 3. Calculate total costs
  const totalCosts =
    costs.housing +
    costs.transportation +
    costs.taxes +
    costs.food +
    costs.healthcare +
    costs.utilities +
    costs.childcare +
    costs.other;

  // 4. Calculate TAS
  const disposableIncome = income - totalCosts;
  const tas = (disposableIncome / income) * 100;

  // 5. Calculate percentile rank
  const allScores = await getAllTASScores(persona);
  const percentile = calculatePercentile(tas, allScores);

  // 6. Determine data quality
  const dataQuality = determineDataQuality(costs);

  return {
    score: Math.round(tas * 10) / 10, // Round to 1 decimal
    percentile,
    disposableIncome,
    costBreakdown: {
      ...costs,
      total: totalCosts
    },
    dataQuality,
    persona
  };
}
```

### Cost Breakdown Function with Imputation

```typescript
async function getCostBreakdown(
  locationId: string,
  geoType: string,
  persona: string
): Promise<CostBreakdown & { imputationFlags: Record<string, string> }> {

  const breakdown: Partial<CostBreakdown> = {};
  const imputationFlags: Record<string, string> = {};

  // Get county/metro/state context for location
  const locationMeta = await getLocationMetadata(locationId, geoType);

  // Housing cost
  const housing = await getHousingCost(locationId, geoType, persona);
  if (housing.source === 'exact') {
    breakdown.housing = housing.value;
    imputationFlags.housing = 'exact';
  } else if (housing.source === 'metro_avg') {
    breakdown.housing = housing.value;
    imputationFlags.housing = 'metro_avg';
  } else {
    // Fallback to state average
    breakdown.housing = await getStateAvgHousing(locationMeta.state, persona);
    imputationFlags.housing = 'state_avg';
  }

  // Transportation cost
  const transportation = await getTransportationCost(locationId, persona);
  // ... similar imputation logic

  // Taxes
  const taxes = await calculateTaxCost(locationMeta, persona, income);
  imputationFlags.taxes = 'calculated'; // Always calculated, not imputed

  // Food
  const food = await getFoodCost(locationMeta, persona);
  // ... imputation logic

  // Healthcare
  const healthcare = await getHealthcareCost(locationMeta.state, persona);
  // ... imputation logic

  // Utilities
  const utilities = await getUtilityCost(locationMeta, persona);
  // ... imputation logic

  // Childcare
  if (persona === 'family') {
    const childcare = await getChildcareCost(locationMeta, persona);
    breakdown.childcare = childcare.value;
    imputationFlags.childcare = childcare.source;
  } else {
    breakdown.childcare = 0;
    imputationFlags.childcare = 'n/a';
  }

  // Other
  const other = await getOtherCost(locationMeta, persona);
  breakdown.other = other.value;
  imputationFlags.other = other.source;

  return {
    ...breakdown as CostBreakdown,
    imputationFlags
  };
}
```

### Data Quality Determination

```typescript
function determineDataQuality(costs: { imputationFlags: Record<string, string> }): 'complete' | 'partial' | 'estimated' {
  const flags = Object.values(costs.imputationFlags);

  const exactCount = flags.filter(f => f === 'exact' || f === 'calculated').length;
  const totalCategories = flags.length;

  if (exactCount === totalCategories) {
    return 'complete';
  } else if (exactCount >= totalCategories * 0.75) {
    return 'partial';  // 75%+ exact
  } else {
    return 'estimated';  // <75% exact
  }
}
```

---

## Validation Test Cases

### Test Case 1: Known Benchmark (MIT Living Wage)

**Location:** Raleigh, NC (Wake County)
**Household:** 2 adults, 2 children
**Year:** 2024

**MIT Living Wage Calculator Results:**
- Required annual income (before taxes): $96,109
- Housing: $1,468/mo = $17,616/year
- Food: $1,114/mo = $13,368/year
- Childcare: $1,833/mo = $21,996/year
- Transportation: $1,405/mo = $16,860/year
- Healthcare: $886/mo = $10,632/year
- Other: $695/mo = $8,340/year
- Taxes: $1,606/mo = $19,272/year (estimated)
- **Total:** $8,009/mo = $96,109/year

**Our TAS Calculation:**
```
Median Income (Raleigh): $75,000 (actual ACS data)
Total Costs (our methodology): $68,000 (from Example 3)

MIT Total: $96,109
Our Total: $68,000

Difference: $28,109 (41% higher in MIT)
```

**Why the difference?**
- MIT calculates **living wage** (what you need to earn)
- We use **median income** (what people actually earn)
- MIT uses current market costs (childcare $1,833/mo is high end)
- We use averages across cost sources

**Validation:**
If median income is $75k but living wage is $96k, then:
```
TAS = ($75,000 - $96,109) / $75,000 = -28%
```

This would indicate Raleigh is **unaffordable for median household with 2 kids** - which aligns with reality for many families.

**Adjustment:** Our $68k estimate may be too low. Use MIT as upper bound, ours as lower bound.

---

### Test Case 2: Extreme High Cost (San Francisco)

**Expected Properties:**
- Very high housing (ZHVI $1.2M+)
- Very high childcare ($2,500/mo)
- No state income tax savings (CA has high income tax)
- High food, healthcare, utilities (BEA RPP ~120)

**Expected TAS:**
```
Median Income: $120,000
Housing: $60,000 (mortgage on $1M home)
Childcare: $30,000 (two kids)
Transportation: $12,000
Taxes: $18,000 (CA high state tax)
Food: $15,000 (120% RPP)
Healthcare: $10,000
Utilities: $4,000
Other: $3,000
Total: $152,000

TAS = ($120,000 - $152,000) / $120,000 = -27%
```

**Validation:**
- Should rank in bottom 5% of locations
- Should be flagged as "Unaffordable"
- Aligns with anecdotal evidence (SF is extremely expensive)

---

### Test Case 3: Moderate Midwest City (Indianapolis)

**Expected Properties:**
- Moderate housing (ZHVI ~$250k)
- Moderate all other costs
- Should be near national median TAS

**Expected TAS:**
```
Median Income: $60,000
Housing: $16,000
Transportation: $10,000
Taxes: $5,000 (IN has low state tax)
Food: $9,000
Healthcare: $7,000
Utilities: $2,500
Childcare: $10,000
Other: $2,500
Total: $62,000

TAS = ($60,000 - $62,000) / $60,000 = -3%
```

**Validation:**
- Should rank around 40-60th percentile
- Slightly unaffordable for median family, but close to break-even
- Aligns with Indianapolis being "affordable but not cheap"

---

### Test Case 4: Low-Cost Rural Area (Huntington, WV)

**Expected Properties:**
- Very low housing (ZHVI ~$130k)
- Low income (median ~$45k)
- Low all costs except healthcare (Appalachia has health challenges)

**Expected TAS:**
```
Median Income: $45,000
Housing: $9,000
Transportation: $9,000 (car-dependent)
Taxes: $3,500
Food: $7,500
Healthcare: $6,500
Utilities: $2,200
Childcare: $6,000 (low regional rates)
Other: $2,000
Total: $45,700

TAS = ($45,000 - $45,700) / $45,000 = -1.6%
```

**Validation:**
- Despite low costs, low income means break-even
- Should rank around 50th percentile (neither great nor terrible)
- Shows limitation of simple "low cost = affordable" assumption

---

## Summary

This technical appendix provides:

1. **Precise mathematical formulas** for all 8 cost categories
2. **Persona-specific weight matrices** for different household types
3. **Percentile calculation algorithms** with code examples
4. **Missing data imputation** procedures (4-tier fallback)
5. **Implementation pseudocode** in TypeScript
6. **Validation test cases** against known benchmarks

**Next Steps:**
1. Implement calculation functions in `apps/web/lib/affordability.ts`
2. Populate database with cost data for all categories
3. Run validation tests against MIT Living Wage and EPI Family Budget
4. Adjust formulas/weights based on validation results
5. Deploy to staging environment for user testing

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Companion Document:** COMPOSITE_INDEX_METHODOLOGY.md
