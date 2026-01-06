# Rent vs Buy Calculator - Implementation Plan

**Created:** January 5, 2026
**Priority:** HIGH (Phase 1 before ACS demographics)
**Timeline:** 2-4 weeks

---

## Overview

Build an interactive Rent vs Buy Calculator that helps users compare the total cost of renting vs buying in a specific location. This is **higher value and lower risk** than adding generic demographics.

---

## Why This is Better Than Demographics

### Advantages Over ACS Community Snapshot

✅ **Uses Existing Data** - HUD FMR already in database (no new ETL needed)
✅ **Interactive** - Users engage, don't just read static data
✅ **Actionable** - Helps users make rent vs buy decision
✅ **Differentiates** - No competitor has this calculator with local data
✅ **SEO Value** - Targets "rent vs buy [city]" queries (medium search volume)
✅ **No Scope Creep** - Pure affordability tool, won't lead to feature bloat
✅ **Works on City Pages** - No city mapping issues like ACS data
✅ **Higher User Value** - Answers "should I rent or buy?" directly

---

## User Stories

**Primary:**
> "I'm considering moving to Austin. Home prices seem high, but so does rent.
> Which option makes more financial sense for me?"

**Secondary:**
> "I can afford a down payment, but will my monthly costs be lower if I buy vs rent?"

**Tertiary:**
> "How many years until buying becomes cheaper than renting (breakeven point)?"

---

## Data Sources (Already Available)

### From `AffordabilitySnapshot` Table

**Rent Data:**
- `hudFmr1Br` - 1 bedroom monthly rent (HUD Fair Market Rent)
- `hudFmr2Br` - 2 bedroom monthly rent
- `hudFmr3Br` - 3 bedroom monthly rent

**Buy Data:**
- `homeValue` - Median home value (Zillow ZHVI)
- `propertyTaxRate` - Effective property tax rate
- `propertyTaxCost` - Annual property tax estimate

**Context:**
- `medianIncome` - For affordability context

### Additional Data Needed (Calculated)

**For Buying:**
- Current mortgage rates (from `freddie_mac_rate` table or hardcoded default)
- Home insurance estimate (rule of thumb: 0.5-1% of home value annually)
- Maintenance/HOA (rule of thumb: 1% of home value annually)
- Closing costs (2-5% of home value, one-time)

**For Renting:**
- Renters insurance (much lower: ~$15-30/month)
- Utilities (if not included)

---

## Calculator Features

### Basic Calculator (MVP)

**User Inputs:**
1. **Bedroom Count** - 1BR, 2BR, or 3BR (selects appropriate HUD FMR)
2. **Down Payment** - Slider: 3.5%, 5%, 10%, 20% (FHA to conventional)
3. **Years Planning to Stay** - Slider: 1-10 years
4. **Mortgage Rate** - Pre-filled with current rate, editable

**Outputs:**
1. **Monthly Comparison**
   - Rent: $1,850/month
   - Buy: $2,200/month (mortgage + taxes + insurance + maintenance)

2. **5-Year Total Cost Comparison**
   - Renting: $111,000
   - Buying: $132,000 + equity gained ($45,000) = $87,000 net

3. **Breakeven Analysis**
   - "Buying becomes cheaper than renting after 4.2 years"

4. **Equity Building**
   - Year 1: $12,000 equity
   - Year 5: $65,000 equity
   - Year 10: $150,000 equity

### Advanced Features (Phase 2 - Optional)

**Additional Inputs:**
- Home appreciation rate (slider: 0-5% annually)
- Rent increase rate (slider: 0-5% annually)
- Tax bracket (affects mortgage interest deduction)
- Investment return rate (opportunity cost of down payment)

**Additional Outputs:**
- Net present value comparison
- Opportunity cost analysis ("$60k down payment could grow to $82k in 5 years at 7% return")
- Tax benefit calculation (mortgage interest + property tax deduction)

---

## Component Design

### RentVsBuyCalculator.tsx (Client Component)

```tsx
'use client';

import { useState, useMemo } from 'react';

interface RentVsBuyCalculatorProps {
  // Pre-populated from database
  hudFmr1Br: number | null;
  hudFmr2Br: number | null;
  hudFmr3Br: number | null;
  medianHomeValue: number;
  propertyTaxRate: number;
  cityName: string;
  stateAbbr: string;
}

export function RentVsBuyCalculator({
  hudFmr1Br,
  hudFmr2Br,
  hudFmr3Br,
  medianHomeValue,
  propertyTaxRate,
  cityName,
  stateAbbr,
}: RentVsBuyCalculatorProps) {
  // User inputs
  const [bedrooms, setBedrooms] = useState<1 | 2 | 3>(2);
  const [downPaymentPct, setDownPaymentPct] = useState(0.20); // 20%
  const [yearsToStay, setYearsToStay] = useState(5);
  const [mortgageRate, setMortgageRate] = useState(0.07); // 7%

  // Calculated values
  const monthlyRent = useMemo(() => {
    if (bedrooms === 1) return hudFmr1Br;
    if (bedrooms === 2) return hudFmr2Br;
    return hudFmr3Br;
  }, [bedrooms, hudFmr1Br, hudFmr2Br, hudFmr3Br]);

  const { monthlyBuy, breakdown } = useMemo(() => {
    // Calculate mortgage payment, property tax, insurance, maintenance
    // ...
  }, [medianHomeValue, downPaymentPct, mortgageRate, propertyTaxRate]);

  const { totalCostRent, totalCostBuy, equityGained, breakevenYears } = useMemo(() => {
    // Calculate total costs over yearsToStay period
    // ...
  }, [monthlyRent, monthlyBuy, yearsToStay, medianHomeValue, mortgageRate]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold mb-4">Rent vs Buy Calculator</h3>

      {/* User Inputs */}
      <div className="space-y-4 mb-6">
        {/* Bedroom selector */}
        {/* Down payment slider */}
        {/* Years to stay slider */}
        {/* Mortgage rate input */}
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monthly comparison */}
        {/* Total cost comparison */}
        {/* Breakeven analysis */}
        {/* Equity building */}
      </div>
    </div>
  );
}
```

---

## Calculation Formulas

### Monthly Rent Cost
```
monthlyRent = hudFmr[bedrooms] (from database)
rentersInsurance = 25 // $25/month average
totalMonthlyRent = monthlyRent + rentersInsurance
```

### Monthly Buy Cost
```
loanAmount = medianHomeValue * (1 - downPaymentPct)
monthlyRate = annualMortgageRate / 12
numPayments = 30 * 12 // 30-year mortgage

monthlyMortgage = loanAmount * (monthlyRate * (1 + monthlyRate)^numPayments) / ((1 + monthlyRate)^numPayments - 1)

monthlyPropertyTax = (medianHomeValue * propertyTaxRate) / 12
monthlyInsurance = (medianHomeValue * 0.006) / 12 // 0.6% of home value
monthlyMaintenance = (medianHomeValue * 0.01) / 12 // 1% of home value

totalMonthlyBuy = monthlyMortgage + monthlyPropertyTax + monthlyInsurance + monthlyMaintenance
```

### Total Cost Over Time
```
totalRentCost = monthlyRent * 12 * years

totalBuyCost = (monthlyBuy * 12 * years) + closingCosts + downPayment

closingCosts = medianHomeValue * 0.03 // 3% of home value

// Calculate equity (principal paid down + appreciation)
principalPaidDown = sum of principal payments over years
appreciation = medianHomeValue * 0.03 * years // 3% annual appreciation
equityGained = principalPaidDown + appreciation

netBuyCost = totalBuyCost - equityGained
```

### Breakeven Point
```
// Year when cumulative cost of buying < cumulative cost of renting
for year in 1..10:
  if netBuyCost(year) < totalRentCost(year):
    return year
```

---

## Page Integration

### City Pages (app/[state]/[place]/page.tsx)

**Placement:** After ScoreBreakdownPanel, before Nearby Alternatives

```tsx
{/* Rent vs Buy Calculator */}
{snapshot?.hudFmr2Br && (
  <section>
    <RentVsBuyCalculator
      hudFmr1Br={snapshot.hudFmr1Br}
      hudFmr2Br={snapshot.hudFmr2Br}
      hudFmr3Br={snapshot.hudFmr3Br}
      medianHomeValue={metrics.homeValue || 0}
      propertyTaxRate={snapshot.propertyTaxRate || 0.012}
      cityName={city.name}
      stateAbbr={city.stateAbbr}
    />
  </section>
)}
```

### ZIP Pages (app/zip/[zip]/page.tsx)

**Same placement and integration**

---

## Data Availability Check

### Query to Check HUD FMR Coverage

```sql
SELECT
  COUNT(*) as total_snapshots,
  COUNT(CASE WHEN "hudFmr2Br" IS NOT NULL THEN 1 END) as with_rent_data,
  (COUNT(CASE WHEN "hudFmr2Br" IS NOT NULL THEN 1 END)::float / COUNT(*)::float * 100) as coverage_pct
FROM affordability_snapshot
WHERE "geoType" IN ('CITY', 'ZCTA');
```

**Expected Coverage:** Should be high (HUD FMR covers most metro areas and ZCTAs)

---

## SEO Optimization

### Target Queries
- "rent vs buy calculator [city]"
- "should I rent or buy in [city]"
- "cost of renting vs buying [city]"
- "is it cheaper to rent or buy in [city]"

### Schema Markup

```tsx
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": `Rent vs Buy Calculator - ${cityName}, ${stateAbbr}`,
  "description": `Compare the cost of renting vs buying a home in ${cityName}. See monthly payments, total costs, and breakeven analysis.`,
  "applicationCategory": "FinanceApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```

### FAQ Schema

```tsx
{
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": `Is it cheaper to rent or buy in ${cityName}?`,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": `The average rent for a 2-bedroom in ${cityName} is $${hudFmr2Br}/month.
               Buying a median home at $${medianHomeValue.toLocaleString()} with 20% down
               results in monthly payments of approximately $${monthlyBuy}/month including
               mortgage, taxes, and insurance. Use our calculator above to see the breakeven point.`
    }
  }]
}
```

---

## Success Metrics

**After 3 Months:**
- ✅ 30%+ of city/ZIP page visitors interact with calculator
- ✅ Average time on page increases by 20%+
- ✅ Bounce rate decreases or stays flat
- ✅ SEO: Rank in top 20 for "rent vs buy [city]" for top 50 cities
- ✅ Zero scope creep requests ("add [unrelated feature]")

**User Feedback Signals:**
- Positive: "This calculator helped me decide to buy/rent"
- Negative: "Calculator doesn't account for [edge case]"

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)

**Tasks:**
1. Create RentVsBuyCalculator component with basic inputs
2. Implement calculation formulas
3. Build results display (monthly comparison, total cost, breakeven)
4. Add to city and ZIP pages (conditional on data availability)
5. Test on 20 sample cities/ZIPs

**Deliverables:**
- Working calculator on city and ZIP pages
- Basic styling matching existing site design
- Mobile-responsive layout

### Phase 2: Polish & SEO (Week 3)

**Tasks:**
1. Add schema markup for rich results
2. Improve visual design (charts/graphs for comparison)
3. Add explanatory tooltips for each input/output
4. Add "Share Results" feature (URL with calculator state)
5. Add FAQ section for common questions

**Deliverables:**
- Polished UI with visual comparisons
- SEO-optimized with schema markup
- Shareable calculator results

### Phase 3: Advanced Features (Week 4 - Optional)

**Tasks:**
1. Add appreciation rate slider
2. Add rent increase rate slider
3. Add tax benefit calculation (mortgage interest deduction)
4. Add opportunity cost analysis (down payment investment alternative)
5. Add scenario comparison (compare 3 scenarios side-by-side)

**Deliverables:**
- Advanced calculator with multiple scenarios
- Investment opportunity cost comparison
- Tax benefit analysis

---

## Testing Plan

### Unit Tests
- Mortgage payment calculation
- Equity calculation
- Breakeven point calculation
- Edge cases (0% down, 100% down, etc.)

### Integration Tests
- Calculator appears on city pages with rent data
- Calculator hidden on pages without rent data
- User inputs persist during interaction
- Responsive layout on mobile

### Manual Testing
- Test on 20 diverse cities (high/low COL, different states)
- Verify breakeven calculations are reasonable
- Check edge cases (very high rent, very low home values)
- Mobile usability testing

---

## Risk Mitigation

### Data Quality Risks

**Risk:** HUD FMR data missing for some locations
**Mitigation:** Only show calculator if hudFmr2Br is not null

**Risk:** HUD FMR doesn't match actual market rents
**Mitigation:** Add disclaimer: "Based on HUD Fair Market Rents, which may differ from actual market rates"

### Calculation Risks

**Risk:** Oversimplified assumptions (3% appreciation, 1% maintenance)
**Mitigation:** Add "Assumptions" tooltip explaining estimates; allow users to adjust in Phase 3

**Risk:** Tax benefits calculation complex (varies by bracket)
**Mitigation:** Defer to Phase 3; show simplified version or omit

### Scope Creep Risks

**Risk:** Users request "compare 10 properties," "add HOA calculator," "add renovation costs"
**Mitigation:** Keep focused on rent vs buy decision; point users to specialized tools for complex scenarios

---

## Next Steps

1. ✅ **Approve Implementation Plan** (this document)
2. Build RentVsBuyCalculator component (Week 1)
3. Integrate into city and ZIP pages (Week 1)
4. Test and iterate (Week 2)
5. Polish and add SEO (Week 3)
6. Deploy to production
7. Monitor user engagement and feedback
8. **Then** re-evaluate ACS demographics value (Phase 2)

---

## Comparison to ACS Demographics

| Factor | Rent vs Buy Calculator | ACS Demographics |
|--------|----------------------|------------------|
| **User Value** | High (actionable decision) | Medium (informational) |
| **Implementation Time** | 2-4 weeks | 4-6 weeks |
| **Data Availability** | ✅ Already have it | ❌ Need new ETL |
| **City Mapping Issue** | ✅ No issue | ❌ Blocker for city pages |
| **Scope Creep Risk** | Low | High |
| **SEO Value** | Medium ("rent vs buy") | Low-Medium (thin content risk) |
| **Maintenance Burden** | Low (annual HUD updates) | Medium (annual ACS + MOE handling) |
| **Differentiation** | High (unique feature) | Low (commoditized data) |

**Winner:** Rent vs Buy Calculator

---

**Status:** APPROVED - Ready to implement
**Next Action:** Build RentVsBuyCalculator component
