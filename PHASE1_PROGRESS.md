# Phase 1 Implementation Progress

**Started:** December 22, 2025
**Status:** Database Schema Complete ✅

---

## Phase 1 Goal: Enhanced Housing Affordability

Add rental affordability and property tax data to complement existing home price metrics.

### Target Metrics:
1. **HUD Fair Market Rents** - Monthly rental costs by bedroom count
2. **FHFA House Price Index** - Quarterly home price trends
3. **Property Tax Rates** - Effective tax rates by location

---

## Progress Summary

### ✅ Completed Tasks

1. **Database Schema Updates**
   - Added 5 new fields to `AffordabilitySnapshot` model:
     - `hudFmr1Br` (Float) - 1-bedroom Fair Market Rent
     - `hudFmr2Br` (Float) - 2-bedroom Fair Market Rent
     - `hudFmr3Br` (Float) - 3-bedroom Fair Market Rent
     - `fhfaHpi` (Float) - FHFA House Price Index
     - `propertyTaxRate` (Float) - Effective property tax rate (decimal)

2. **Database Migration**
   - Applied schema changes via `prisma db push`
   - Database now in sync with schema
   - All existing data preserved

3. **Prisma Client Regeneration**
   - TypeScript types updated to include new fields
   - Ready for ETL implementation

---

## 🚧 Next Steps

### Immediate: ETL Script Creation (Estimated 20-30 hours)

#### 1. HUD Fair Market Rents (`etl/import_hud_fmr.py`)
**Data Source:** https://www.huduser.gov/portal/datasets/fmr.html
**Implementation Plan:**
- Use HUD's FMR API to fetch current year data
- Map FMR data to cities via county FIPS codes
- Store 1BR, 2BR, 3BR monthly rents in `affordability_snapshot`
- Handle Small Area FMR (SAFMR) for select metro areas

**Expected Coverage:** 90%+ counties

#### 2. FHFA House Price Index (`etl/import_fhfa_hpi.py`)
**Data Source:** https://www.fhfa.gov/data/hpi/datasets
**Implementation Plan:**
- Download quarterly HPI files (county and ZIP level)
- Parse CSV files and extract latest quarter
- Join to cities via county FIPS
- Store HPI value (baseline year = 100)

**Expected Coverage:** 80%+ counties

#### 3. Property Tax Rates (`etl/import_property_tax.py`)
**Data Source:** https://taxfoundation.org/data/all/state/property-taxes-by-state-county/
**Implementation Plan:**
- Export Tax Foundation interactive map data
- Parse county-level property tax rates
- Calculate effective rate (median paid / median home value)
- Join to cities via county FIPS

**Expected Coverage:** 95%+ counties

---

## Database Schema Reference

```prisma
model AffordabilitySnapshot {
  id       String   @id @default(cuid())
  geoType  GeoType
  geoId    String   @db.VarChar(16)
  asOfDate DateTime @db.Date

  // Original metrics
  homeValue    Float?
  medianIncome Float?
  simpleRatio  Float? // homeValue / income (legacy)

  // PHASE 1: Enhanced Housing Metrics
  hudFmr1Br       Float? // HUD Fair Market Rent - 1 bedroom (monthly)
  hudFmr2Br       Float? // HUD Fair Market Rent - 2 bedroom (monthly)
  hudFmr3Br       Float? // HUD Fair Market Rent - 3 bedroom (monthly)
  fhfaHpi         Float? // FHFA House Price Index (baseline year = 100)
  propertyTaxRate Float? // Effective property tax rate (decimal, e.g., 0.012 = 1.2%)

  // ... other fields
}
```

---

## Success Metrics (Phase 1 Completion)

- [ ] HUD FMR data imported for 90%+ of counties
- [ ] FHFA HPI data imported for 80%+ of counties
- [ ] Property tax rates imported for 95%+ of counties
- [ ] All three metrics joined to cities in `affordability_snapshot`
- [ ] UI updated to display rental vs. ownership affordability
- [ ] Property tax burden shown as % of home value
- [ ] Phase 1 launch blog post published

---

## Timeline

- **Week 1:** ETL script creation and testing (HUD FMR, FHFA HPI, Property Tax)
- **Week 2:** Data import, validation, and UI updates
- **Total Phase 1:** 2 weeks (40-60 hours estimated)

---

## Files Modified

- ✅ `apps/web/prisma/schema.prisma` - Added Phase 1 fields
- ⏳ `etl/import_hud_fmr.py` - To be created
- ⏳ `etl/import_fhfa_hpi.py` - To be created
- ⏳ `etl/import_property_tax.py` - To be created
- ⏳ `apps/web/lib/data.ts` - Will add query functions for new metrics
- ⏳ `apps/web/components/*` - Will create UI components for Phase 1 display

---

**Last Updated:** December 22, 2025
