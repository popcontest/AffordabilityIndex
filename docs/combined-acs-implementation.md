# Combined ACS Implementation: Rent vs Buy Calculator + Demographics

**Date:** January 5, 2026
**Decision:** Option B - Combined Approach
**Status:** APPROVED - Ready to implement
**Timeline:** 5 weeks

---

## Executive Summary

After discovering HUD FMR data is only 4% imported, we're pivoting to **one unified ACS ETL** that delivers BOTH features:

1. **Rent vs Buy Calculator** (using ACS median rent)
2. **Affordability Demographics** (3 metrics: rent, housing burden, poverty)

**Why This Approach Wins:**
- ✅ One ETL effort delivers two features
- ✅ ACS rent data has 95%+ coverage (vs 4% HUD FMR)
- ✅ Consistent data vintage/methodology across all metrics
- ✅ No duplicate ETL maintenance burden
- ✅ All data includes MOE for quality filtering
- ✅ Works for ZCTA pages immediately (no city mapping issues)

---

## What We're Building

### Feature 1: Rent vs Buy Calculator (Interactive)

**User Inputs:**
- Bedroom count (1BR, 2BR, 3BR)
- Down payment percentage (slider)
- Years planning to stay (slider)
- Mortgage rate (editable, pre-filled)

**Outputs:**
- Monthly cost comparison (rent vs buy)
- 5-year total cost comparison
- Breakeven analysis ("Buying becomes cheaper after 4.2 years")
- Equity building over time

**Data Source:** ACS B25064 (Median Gross Rent)

### Feature 2: Housing & Economic Context (Collapsible Section)

**Metrics Displayed:**
1. **Median Rent** - "Typical rent: $1,850/month (±$95)"
2. **Housing Cost Burden** - "32% of households spend 30%+ of income on housing"
3. **Poverty Rate** - "12.3% of residents below poverty line (±1.8%)"

**Display:** Collapsible section below Score Breakdown, collapsed by default

**Data Sources:**
- ACS B25064 (Median Gross Rent)
- ACS DP04 (Housing Cost Burden)
- ACS S1701 (Poverty Rate)

---

## ACS Data We'll Import

### Table Structure: `acs_snapshot`

```typescript
model AcsSnapshot {
  id        String   @id @default(cuid())
  geoType   GeoType  // CITY or ZCTA
  geoId     String   // cityId or zcta code
  vintage   String   // "2018-2022" (ACS 5-year period)
  asOfYear  Int      // 2022 (end year of 5-year period)

  // Median Gross Rent (B25064)
  medianRent      Float?
  medianRentMoe   Float?  // Margin of error

  // Housing Cost Burden (DP04_0136PE - % spending 30%+ on housing)
  housingBurdenPct    Float?
  housingBurdenPctMoe Float?

  // Poverty Rate (S1701_C03_001E - % below poverty level)
  povertyRatePct    Float?
  povertyRatePctMoe Float?

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([geoType, geoId, asOfYear])
  @@index([geoType, geoId])
  @@map("acs_snapshot")
}
```

### ACS API Endpoints

**For Cities (Census Places):**
```
https://api.census.gov/data/2022/acs/acs5?
  get=B25064_001E,B25064_001M,DP04_0136PE,DP04_0136PM,S1701_C03_001E,S1701_C03_001M
  &for=place:{placeGeoid}
```

**For ZCTAs:**
```
https://api.census.gov/data/2022/acs/acs5?
  get=B25064_001E,B25064_001M,DP04_0136PE,DP04_0136PM,S1701_C03_001E,S1701_C03_001M
  &for=zip%20code%20tabulation%20area:{zcta}
```

### Variable Mapping

| ACS Variable | Meaning | Our Field |
|---|---|---|
| B25064_001E | Median gross rent (estimate) | medianRent |
| B25064_001M | Median gross rent (MOE) | medianRentMoe |
| DP04_0136PE | % spending 30%+ on housing (estimate) | housingBurdenPct |
| DP04_0136PM | % spending 30%+ on housing (MOE) | housingBurdenPctMoe |
| S1701_C03_001E | Poverty rate (estimate) | povertyRatePct |
| S1701_C03_001M | Poverty rate (MOE) | povertyRatePctMoe |

---

## Implementation Phases

### Phase 1: Schema & Data Model (Week 1)

**Tasks:**
1. Add `AcsSnapshot` model to Prisma schema
2. Run migration: `npx prisma migrate dev --name add_acs_snapshot`
3. Generate Prisma client: `npx prisma generate`
4. Add data access functions to `lib/data.ts`:
   - `getAcsSnapshot(geoType, geoId): Promise<AcsSnapshot | null>`
   - `getAcsMetricsCv(snapshot): { rentCv, burdenCv, povertyCv }` (calculate coefficient of variation)

**Deliverables:**
- Schema updated
- Type-safe database access
- MOE calculation utilities

### Phase 2: ETL Script (Week 1-2)

**File:** `etl/import_acs_snapshot.py`

**Functions:**
```python
def fetch_acs_data_for_place(place_geoid: str, year: int = 2022) -> dict:
    """Fetch ACS data for a Census Place"""
    # Call Census API with retry logic
    # Parse response
    # Return dict with values + MOEs

def fetch_acs_data_for_zcta(zcta: str, year: int = 2022) -> dict:
    """Fetch ACS data for a ZCTA"""
    # Call Census API with retry logic
    # Parse response
    # Return dict with values + MOEs

def calculate_cv(estimate: float, moe: float) -> float:
    """Calculate coefficient of variation"""
    if estimate == 0:
        return float('inf')
    return (moe / 1.645) / estimate

def should_suppress_metric(estimate: float, moe: float, threshold: float = 0.30) -> bool:
    """Determine if metric should be suppressed due to high MOE"""
    cv = calculate_cv(estimate, moe)
    return cv > threshold

def import_acs_for_zctas(limit: int = None):
    """Import ACS data for all ZCTAs"""
    # Get all ZCTAs from database
    # For each ZCTA:
    #   - Fetch ACS data
    #   - Calculate CVs
    #   - Insert into acs_snapshot table
    #   - Log progress

def import_acs_for_cities_with_verified_mapping():
    """Import ACS data only for cities with verified Census Place GEOID mapping"""
    # Phase 1: Only import for cities where we have confirmed mapping
    # Phase 2: Expand coverage with manual verification
```

**CLI Wrapper:** `etl/import_acs_snapshot_cli.py`
```python
import argparse
from import_acs_snapshot import import_acs_for_zctas, import_acs_for_cities_with_verified_mapping

parser = argparse.ArgumentParser()
parser.add_argument('--geo-type', choices=['zcta', 'city'], required=True)
parser.add_argument('--limit', type=int, help='Limit number of geographies to import')
args = parser.parse_args()

if args.geo_type == 'zcta':
    import_acs_for_zctas(limit=args.limit)
elif args.geo_type == 'city':
    import_acs_for_cities_with_verified_mapping()
```

**Run Commands:**
```bash
# Test on 100 ZCTAs
python etl/import_acs_snapshot_cli.py --geo-type zcta --limit 100

# Import all ZCTAs (will take hours, run with nohup)
nohup python etl/import_acs_snapshot_cli.py --geo-type zcta > acs_import.log 2>&1 &

# Import cities (only verified mappings)
python etl/import_acs_snapshot_cli.py --geo-type city
```

**Deliverables:**
- Python ETL script with Census API integration
- MOE calculation and suppression logic
- CLI wrapper for running imports
- Progress logging

### Phase 3: Rent vs Buy Calculator Component (Week 3)

**File:** `components/RentVsBuyCalculator.tsx`

```tsx
'use client';

import { useState, useMemo } from 'react';

interface RentVsBuyCalculatorProps {
  medianRent: number;          // From ACS
  medianHomeValue: number;     // From Zillow
  propertyTaxRate: number;     // From affordability_snapshot
  cityName: string;
  stateAbbr: string;
}

export function RentVsBuyCalculator({
  medianRent,
  medianHomeValue,
  propertyTaxRate,
  cityName,
  stateAbbr,
}: RentVsBuyCalculatorProps) {
  // User inputs
  const [downPaymentPct, setDownPaymentPct] = useState(0.20);
  const [yearsToStay, setYearsToStay] = useState(5);
  const [mortgageRate, setMortgageRate] = useState(0.07);

  // Calculations
  const monthlyBuy = useMemo(() => {
    const loanAmount = medianHomeValue * (1 - downPaymentPct);
    const monthlyRate = mortgageRate / 12;
    const numPayments = 360;

    const monthlyMortgage = loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const monthlyPropertyTax = (medianHomeValue * propertyTaxRate) / 12;
    const monthlyInsurance = (medianHomeValue * 0.006) / 12;
    const monthlyMaintenance = (medianHomeValue * 0.01) / 12;

    return monthlyMortgage + monthlyPropertyTax + monthlyInsurance + monthlyMaintenance;
  }, [medianHomeValue, downPaymentPct, mortgageRate, propertyTaxRate]);

  const { totalRent, totalBuy, equityGained, breakevenYears } = useMemo(() => {
    // Calculate total costs and breakeven
    // ...
  }, [medianRent, monthlyBuy, yearsToStay, medianHomeValue, mortgageRate, downPaymentPct]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold mb-4">Rent vs Buy Analysis</h3>

      {/* Inputs */}
      <div className="space-y-4 mb-6">
        {/* Down payment slider */}
        {/* Years to stay slider */}
        {/* Mortgage rate input */}
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold">Renting</h4>
          <div className="text-3xl font-bold text-blue-600">
            ${medianRent.toLocaleString()}<span className="text-lg">/mo</span>
          </div>
          <div className="text-sm text-gray-600">
            Total over {yearsToStay} years: ${totalRent.toLocaleString()}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Buying</h4>
          <div className="text-3xl font-bold text-green-600">
            ${Math.round(monthlyBuy).toLocaleString()}<span className="text-lg">/mo</span>
          </div>
          <div className="text-sm text-gray-600">
            Total over {yearsToStay} years: ${totalBuy.toLocaleString()}
          </div>
          <div className="text-sm font-medium text-green-700">
            Equity gained: ${equityGained.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Breakeven analysis */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700">
          Buying becomes cheaper than renting after <span className="text-lg font-bold text-gray-900">{breakevenYears.toFixed(1)} years</span>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-gray-500">
        Based on ACS median rent and Zillow median home value.
        Assumes {(downPaymentPct * 100).toFixed(0)}% down, {(mortgageRate * 100).toFixed(1)}% mortgage rate,
        3% annual appreciation. For illustration only.
      </p>
    </div>
  );
}
```

**Deliverables:**
- Interactive calculator component
- Responsive design (mobile-friendly)
- Clear input controls (sliders, number inputs)
- Visual comparison of rent vs buy
- Breakeven analysis display

### Phase 4: Demographics Display Component (Week 3-4)

**File:** `components/HousingEconomicContext.tsx`

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface HousingEconomicContextProps {
  medianRent: number;
  medianRentMoe: number;
  housingBurdenPct: number;
  housingBurdenPctMoe: number;
  povertyRatePct: number;
  povertyRatePctMoe: number;
  stateComparison?: {
    medianRent?: number;
    housingBurdenPct?: number;
    povertyRatePct?: number;
  };
  vintage: string; // "2018-2022"
}

export function HousingEconomicContext({
  medianRent,
  medianRentMoe,
  housingBurdenPct,
  housingBurdenPctMoe,
  povertyRatePct,
  povertyRatePctMoe,
  stateComparison,
  vintage,
}: HousingEconomicContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate coefficient of variation for reliability flags
  const rentCv = (medianRentMoe / 1.645) / medianRent;
  const burdenCv = (housingBurdenPctMoe / 1.645) / housingBurdenPct;
  const povertyCv = (povertyRatePctMoe / 1.645) / povertyRatePct;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Housing & Economic Context
          </h3>
          <span className="text-sm text-gray-500">
            ({vintage} ACS data)
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Economic factors that affect affordability in this area
          </p>

          {/* Median Rent */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium text-gray-700">Median Rent</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${medianRent.toLocaleString()}<span className="text-base">/mo</span>
                </div>
                <div className="text-xs text-gray-500">
                  ±${medianRentMoe.toLocaleString()}
                  {rentCv > 0.15 && rentCv < 0.30 && <span className="ml-2 text-amber-600">⚠ Moderate confidence</span>}
                </div>
              </div>
              {stateComparison?.medianRent && (
                <div className="text-sm text-gray-600">
                  vs ${stateComparison.medianRent.toLocaleString()} state avg
                </div>
              )}
            </div>

            {/* Housing Cost Burden */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium text-gray-700">Housing Cost Burden</div>
                <div className="text-2xl font-bold text-gray-900">
                  {housingBurdenPct.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  of households spend 30%+ on housing
                  {burdenCv > 0.15 && burdenCv < 0.30 && <span className="ml-2 text-amber-600">⚠</span>}
                </div>
              </div>
              {stateComparison?.housingBurdenPct && (
                <div className="text-sm text-gray-600">
                  vs {stateComparison.housingBurdenPct.toFixed(1)}% state avg
                </div>
              )}
            </div>
          </div>

          {/* Poverty Rate */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium text-gray-700">Poverty Rate</div>
                <div className="text-2xl font-bold text-gray-900">
                  {povertyRatePct.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  of residents below poverty line
                  {povertyCv > 0.15 && povertyCv < 0.30 && <span className="ml-2 text-amber-600">⚠</span>}
                </div>
              </div>
              {stateComparison?.povertyRatePct && (
                <div className="text-sm text-gray-600">
                  vs {stateComparison.povertyRatePct.toFixed(1)}% state avg
                </div>
              )}
            </div>
          </div>

          {/* Attribution */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Source: U.S. Census Bureau American Community Survey {vintage} 5-year estimates.
              Margins of error shown for reference. {' '}
              <button className="text-blue-600 hover:underline">
                Learn about data quality
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Deliverables:**
- Collapsible section (collapsed by default)
- MOE display with quality flags
- State comparisons (if available)
- Mobile-responsive layout
- Attribution and data quality link

### Phase 5: Page Integration (Week 4)

**Update:** `app/zip/[zip]/page.tsx`

```tsx
import { RentVsBuyCalculator } from '@/components/RentVsBuyCalculator';
import { HousingEconomicContext } from '@/components/HousingEconomicContext';
import { getAcsSnapshot } from '@/lib/data';

export default async function ZipPage({ params }: { params: { zip: string } }) {
  // ... existing code to fetch zcta, metrics, etc.

  // Fetch ACS data
  const acsData = await getAcsSnapshot('ZCTA', params.zip);

  return (
    <main>
      {/* Existing: ScoreHero, ScoreBreakdown, etc. */}

      {/* NEW: Rent vs Buy Calculator (if rent data available) */}
      {acsData?.medianRent && metrics?.homeValue && (
        <section className="mb-8">
          <RentVsBuyCalculator
            medianRent={acsData.medianRent}
            medianHomeValue={metrics.homeValue}
            propertyTaxRate={snapshot?.propertyTaxRate || 0.012}
            cityName={cityDisplay}
            stateAbbr={zcta.stateAbbr}
          />
        </section>
      )}

      {/* NEW: Housing & Economic Context (if data available and passes CV filters) */}
      {acsData && shouldShowDemographics(acsData) && (
        <section className="mb-8">
          <HousingEconomicContext
            medianRent={acsData.medianRent!}
            medianRentMoe={acsData.medianRentMoe!}
            housingBurdenPct={acsData.housingBurdenPct!}
            housingBurdenPctMoe={acsData.housingBurdenPctMoe!}
            povertyRatePct={acsData.povertyRatePct!}
            povertyRatePctMoe={acsData.povertyRatePctMoe!}
            vintage={acsData.vintage}
          />
        </section>
      )}

      {/* Existing: Nearby Alternatives, Calculator, etc. */}
    </main>
  );
}

function shouldShowDemographics(acsData: AcsSnapshot): boolean {
  // Check if metrics pass CV thresholds
  const rentCv = acsData.medianRentMoe ? (acsData.medianRentMoe / 1.645) / (acsData.medianRent || 1) : 1;
  const burdenCv = acsData.housingBurdenPctMoe ? (acsData.housingBurdenPctMoe / 1.645) / (acsData.housingBurdenPct || 1) : 1;
  const povertyCv = acsData.povertyRatePctMoe ? (acsData.povertyRatePctMoe / 1.645) / (acsData.povertyRatePct || 1) : 1;

  // Show if at least 2 of 3 metrics pass CV < 30% threshold
  const passingMetrics = [rentCv < 0.30, burdenCv < 0.30, povertyCv < 0.30].filter(Boolean).length;
  return passingMetrics >= 2;
}
```

**Update:** `app/[state]/[place]/page.tsx` (same integration for city pages, conditional on city mapping)

**Deliverables:**
- Rent vs Buy Calculator integrated
- Demographics section integrated
- Conditional rendering based on data availability
- CV threshold filtering

### Phase 6: Testing & Deployment (Week 5)

**Testing:**
1. Unit tests for CV calculation
2. Unit tests for rent vs buy math
3. Integration tests for ACS data fetching
4. Manual testing on 20 diverse ZCTAs
5. Mobile responsiveness testing
6. Edge case testing (NULL data, high MOE, etc.)

**Deployment:**
1. Run ACS import for all ZCTAs
2. Deploy frontend changes
3. Monitor for errors
4. Track user engagement metrics
5. Collect feedback

**Deliverables:**
- Comprehensive test coverage
- Production deployment
- Monitoring dashboards
- User feedback collection

---

## Success Metrics

**After 3 Months:**

**Rent vs Buy Calculator:**
- ✅ 25%+ of page visitors interact with calculator
- ✅ Average session duration increases 15%+
- ✅ Bounce rate stays flat or decreases
- ✅ Rank in top 30 for "rent vs buy [city]" (50 major cities)

**Demographics Section:**
- ✅ 15%+ of visitors expand the section
- ✅ Zero scope creep requests ("add crime/schools/etc")
- ✅ No negative impact on page performance
- ✅ No user complaints about data quality

---

## Data Quality Safeguards

### CV Thresholds (Consistent Across Features)

```
CV = (MOE / 1.645) / estimate

CV < 15%: Reliable - show normally
CV 15-30%: Moderate - show with ⚠ warning
CV > 30%: Unreliable - suppress metric entirely
```

### Population Thresholds

**ZCTAs:**
- Pop ≥ 5,000: Show all metrics (if CV passes)
- Pop 2,000-4,999: Show with warning banner
- Pop < 500: Don't import (ETL filter)

**Cities (when mapping is solved):**
- Pop ≥ 10,000: Show all metrics (if CV passes)
- Pop 5,000-9,999: Show with warning banner
- Pop < 1,000: Suppress ACS section entirely

---

## Timeline Summary

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1 | Schema + ETL foundation | Database ready, ETL script 50% done |
| 2 | Complete ETL + Test imports | ETL complete, 100 ZCTAs imported successfully |
| 3 | Build Calculator + Demographics UI | Components complete, locally testable |
| 4 | Page integration + Testing | Features integrated, tests passing |
| 5 | Full import + Deployment | Production ready, monitoring active |

---

## Risk Mitigation

### Risk 1: City Mapping Still Unsolved
**Mitigation:** Phase 1 = ZCTA pages only. Users can still access data by browsing ZIP pages.

### Risk 2: Census API Rate Limiting
**Mitigation:** Add retry logic with exponential backoff. Run imports overnight. Batch requests where possible.

### Risk 3: High MOE for Small Geographies
**Mitigation:** CV-based suppression at 30% threshold. Clear warnings for CV 15-30%. Population thresholds filter out smallest areas.

### Risk 4: Scope Creep After Launch
**Mitigation:** Document explicit exclusions. Canned responses ready. Annual review to check for mission drift.

---

## Next Steps

1. ✅ Decision approved (Option B)
2. Update Prisma schema (add AcsSnapshot model)
3. Build ETL Python script
4. Test import on 100 ZCTAs
5. Build RentVsBuyCalculator component
6. Build HousingEconomicContext component
7. Integrate into ZCTA pages
8. Full ZCTA import (63,600 geographies)
9. Deploy to production
10. Monitor & iterate

---

**Status:** READY TO BEGIN IMPLEMENTATION
**First Action:** Update Prisma schema with AcsSnapshot model
