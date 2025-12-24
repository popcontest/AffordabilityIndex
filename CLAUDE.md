# Affordability Index

## Project Scope

Affordability Index is a public web application that visualizes home affordability across US geographies by calculating the ratio of home values to median household income.

**MVP Coverage:**
- Census Place (cities/towns)
- ZCTA (ZIP Code Tabulation Areas)

## Core Metric

**Affordability Ratio = Home Value / Median Household Income**

A higher ratio indicates lower affordability (homes are more expensive relative to income).

### Example
- Median Home Value: $500,000
- Median Household Income: $100,000
- Affordability Ratio: 5.0 (homes cost 5× annual income)

## Data Sources

### Home Values
**Source:** Zillow Home Value Index (ZHVI)
- **Place Data:** Zillow Research ZHVI for Cities/Towns
- **ZIP/ZCTA Data:** Zillow Research ZHVI for ZIP codes (where available)
- **Attribution:** Data provided by Zillow Research (zillow.com/research/data/)
- **Update Frequency:** Monthly (typically released mid-month for prior month)
- **Metric:** ZHVI represents the typical home value for a given geography

### Income Data
**Source:** US Census Bureau American Community Survey (ACS)
- **Table:** B19013 (Median Household Income in the Past 12 Months)
- **API:** Census API (api.census.gov)
- **Attribution:** US Census Bureau, American Community Survey
- **Update Frequency:** Annual (ACS 5-year estimates are most stable)
- **Vintages:** Use most recent available 5-year estimates

## Geography Definitions

### Census Place
A Census Place is a concentration of population identified by the US Census Bureau. Places include incorporated municipalities (cities, towns, villages) and census-designated places (CDPs).

- **Identifier:** 7-digit place GEOID (SSFPPP: state FIPS + place code)
- **Naming:** Include state abbreviation for disambiguation

### ZCTA (ZIP Code Tabulation Area)
ZCTAs are generalized areal representations of USPS ZIP code delivery areas, created by the Census Bureau for statistical purposes.

- **Identifier:** 5-digit ZCTA code
- **Important:** ZCTA ≠ ZIP code (boundaries may differ; rural ZIPs may not have ZCTAs)

## Important Caveats

### 1. ZIP vs ZCTA
**User-facing copy must be explicit:**
- Use "ZIP area" or "ZIP/ZCTA" in UI
- Clarify in documentation that we use ZCTA boundaries
- Link to Census explainer: https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html

### 2. Margin of Error (MOE)
ACS estimates include margins of error. For production:
- Store MOE values when available
- Consider displaying confidence intervals for income data
- Smaller geographies (small towns, rural ZCTAs) have higher MOE

### 3. Temporal Mismatch
- Zillow ZHVI: Current/monthly snapshot
- ACS Income: Multi-year average (5-year estimates lag 1-2 years)
- The ratio combines different time periods; document this clearly

### 4. Coverage Gaps
- Not all Places have Zillow ZHVI data (rural, small towns)
- Not all ZIP codes map to ZCTAs
- Some geographies may lack income data (insufficient sample size)

### 5. Interpretation Limits
The ratio is a **relative metric**, not a mortgage affordability calculator:
- Does not account for: interest rates, down payment, property taxes, household debt
- Use for geographic comparison, not individual financial planning

## Update Cadence

**Planned Frequency:**
- Zillow ZHVI: Monthly refresh
- ACS Income: Annual refresh (when new 5-year estimates release, typically December)

**Snapshot Strategy:**
- Store timestamped snapshots in `MetricSnapshot` table
- Allow comparison over time (future feature)

## Data Attribution

### UI Footer
```
Home value data: Zillow Research (zillow.com/research/data/)
Income data: US Census Bureau, American Community Survey
```

### Methodology Page (Future)
- Link to Zillow ZHVI methodology
- Link to ACS documentation
- Explain ratio calculation and caveats

## Tech Stack

- **Frontend/API:** Next.js (TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **ETL:** Python (DuckDB, pandas, requests)
- **Hosting:** TBD (Vercel + managed Postgres recommended)

## Repository Structure

```
/apps/web       - Next.js application
/etl            - Python ETL scripts
/docs           - Additional documentation
```

## Development Status

**Current Phase:** MVP Scaffolding
- [x] Repository structure
- [x] Basic Next.js app
- [x] Database schema
- [ ] ETL implementation (data fetch)
- [ ] Search/detail pages
- [ ] Data visualization

---

*Last updated: 2025-12-16*
