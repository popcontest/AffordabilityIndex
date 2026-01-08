/**
 * True Affordability Score Calculation Library
 *
 * Calculates real affordability by accounting for ALL location-based costs:
 * - State/local income taxes
 * - Property taxes
 * - Transportation costs
 * - Childcare costs (if applicable)
 * - Healthcare premiums
 *
 * Formula: True Affordability = Net Disposable Income ÷ Annual Housing Cost
 *
 * Where higher score = more money left over after housing + all fixed costs
 */

import { GeoType } from '@prisma/client';
import { prisma } from './prisma';

// ====================
// TYPES
// ====================

export type HouseholdType = 'single' | 'couple' | 'family' | 'emptyNester' | 'retiree' | 'remote';

export interface AffordabilityInputs {
  // Location
  geoType: GeoType;
  geoId: string;

  // Financial inputs
  annualIncome?: number;           // Override median income
  downPaymentPct?: number;         // Default: 20%
  mortgageRate?: number;           // Default: current market rate

  // Household composition
  householdType?: HouseholdType;   // Default: 'single'
  numChildren?: number;            // Default: 0
  childAges?: number[];            // For more accurate childcare costs

  // Lifestyle factors
  needsCar?: boolean;              // Default: based on location transit score
  workFromHome?: boolean;          // Reduces transportation costs
}

export interface CostBreakdown {
  grossIncome: number;

  // Fixed costs (annual)
  incomeTax: number;
  propertyTax: number;
  transportation: number;
  childcare: number;
  healthcare: number;

  // NEW: Total other expenses
  otherExpenses: number;        // Sum of all fixed costs except housing
  monthlyOtherExpenses: number;  // otherExpenses / 12

  // Net available
  netDisposableIncome: number;

  // Housing costs (FIXED: mortgage + insurance only, NO property tax)
  annualHousingCost: number;
  monthlyHousingCost: number;

  // Total fixed costs (NEW)
  annualFixedCosts: number;      // otherExpenses + annualHousingCost
  monthlyFixedCosts: number;     // annualFixedCosts / 12

  // Final score
  trueAffordabilityScore: number;
  affordabilityTier: string;

  // Money left over
  annualLeftOver: number;
  monthlyLeftOver: number;
}

export interface PersonaScores {
  single: number;
  couple: number;
  family: number;
  emptyNester: number;
  retiree: number;
  remote: number;
}

// ====================
// CONSTANTS
// ====================

const DEFAULT_DOWN_PAYMENT = 0.20;  // 20%
const DEFAULT_MORTGAGE_RATE = 0.07; // 7.0% (update periodically)
const CURRENT_YEAR = 2024;

// National averages (used as fallbacks)
const NATIONAL_AVG_PROPERTY_TAX_RATE = 0.011; // 1.1%
const NATIONAL_AVG_TRANSPORTATION = 11600;
const NATIONAL_AVG_HEALTHCARE_INDIVIDUAL = 7400;
const NATIONAL_AVG_HEALTHCARE_FAMILY = 20000;

// Homeowners insurance estimate (% of home value)
const HOME_INSURANCE_RATE = 0.006; // 0.6% of home value annually

// ====================
// HELPER FUNCTIONS
// ====================

/**
 * Calculate monthly mortgage payment (P&I only)
 */
function calculateMonthlyMortgage(
  loanAmount: number,
  annualRate: number,
  years: number = 30
): number {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;

  if (monthlyRate === 0) return loanAmount / numPayments;

  const payment = loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return payment;
}

/**
 * Interpolate effective tax rate based on income
 */
function interpolateIncomeTaxRate(
  income: number,
  taxRates: {
    effectiveRateAt50k: number;
    effectiveRateAt75k: number;
    effectiveRateAt100k: number;
    effectiveRateAt150k: number;
    effectiveRateAt200k: number;
  }
): number {
  // Linear interpolation between bracket points
  if (income <= 50000) {
    return (income / 50000) * taxRates.effectiveRateAt50k;
  } else if (income <= 75000) {
    const ratio = (income - 50000) / 25000;
    return taxRates.effectiveRateAt50k +
           ratio * (taxRates.effectiveRateAt75k - taxRates.effectiveRateAt50k);
  } else if (income <= 100000) {
    const ratio = (income - 75000) / 25000;
    return taxRates.effectiveRateAt75k +
           ratio * (taxRates.effectiveRateAt100k - taxRates.effectiveRateAt75k);
  } else if (income <= 150000) {
    const ratio = (income - 100000) / 50000;
    return taxRates.effectiveRateAt100k +
           ratio * (taxRates.effectiveRateAt150k - taxRates.effectiveRateAt100k);
  } else if (income <= 200000) {
    const ratio = (income - 150000) / 50000;
    return taxRates.effectiveRateAt150k +
           ratio * (taxRates.effectiveRateAt200k - taxRates.effectiveRateAt150k);
  } else {
    // Above $200k, use top rate + small increment
    return taxRates.effectiveRateAt200k + ((income - 200000) / 1000000) * 0.5;
  }
}

/**
 * Get affordability tier based on score
 */
function getAffordabilityTier(score: number): string {
  if (score >= 2.5) return 'Extremely Comfortable';
  if (score >= 2.0) return 'Very Comfortable';
  if (score >= 1.5) return 'Comfortable';
  if (score >= 1.0) return 'Tight';
  if (score >= 0.5) return 'Very Tight';
  return 'Unaffordable';
}

/**
 * Calculate childcare costs based on number and ages of children
 */
function calculateChildcareCost(
  numChildren: number,
  childAges: number[] | undefined,
  childcareCostData: {
    infantCost: number | null;
    toddlerCost: number | null;
    preschoolCost: number | null;
    schoolAgeCost: number | null;
    avgAnnualCost: number;
  }
): number {
  if (numChildren === 0) return 0;

  // If ages provided, calculate exact cost
  if (childAges && childAges.length > 0) {
    return childAges.reduce((total, age) => {
      if (age < 1) return total + (childcareCostData.infantCost || childcareCostData.avgAnnualCost);
      if (age < 3) return total + (childcareCostData.toddlerCost || childcareCostData.avgAnnualCost);
      if (age < 5) return total + (childcareCostData.preschoolCost || childcareCostData.avgAnnualCost);
      if (age < 12) return total + (childcareCostData.schoolAgeCost || childcareCostData.avgAnnualCost * 0.8);
      return total; // School age kids (12+) don't need childcare
    }, 0);
  }

  // Otherwise use average
  return numChildren * childcareCostData.avgAnnualCost;
}

// ====================
// MAIN CALCULATION FUNCTION
// ====================

export async function calculateTrueAffordability(
  inputs: AffordabilityInputs
): Promise<CostBreakdown> {
  const {
    geoType,
    geoId,
    annualIncome,
    downPaymentPct = DEFAULT_DOWN_PAYMENT,
    mortgageRate = DEFAULT_MORTGAGE_RATE,
    householdType = 'single',
    numChildren = 0,
    childAges,
    needsCar,
    workFromHome = false,
  } = inputs;

  // 1. Get location data (home value, median income)
  const snapshot = await prisma.metricSnapshot.findFirst({
    where: {
      geoType,
      geoId,
      homeValue: { not: null },
      income: { not: null },
    },
    orderBy: { asOfDate: 'desc' },
  });

  if (!snapshot || !snapshot.homeValue || !snapshot.income) {
    throw new Error('No affordability data available for this location');
  }

  const homeValue = snapshot.homeValue;
  const medianIncome = snapshot.income;
  const income = annualIncome || medianIncome;

  // 2. Get state abbreviation for cost lookups
  let stateAbbr: string;
  if (geoType === 'CITY') {
    const city = await prisma.geoCity.findUnique({ where: { cityId: geoId } });
    stateAbbr = city?.stateAbbr || '';
  } else if (geoType === 'ZCTA') {
    const zcta = await prisma.geoZcta.findUnique({ where: { zcta: geoId } });
    stateAbbr = zcta?.stateAbbr || '';
  } else {
    const place = await prisma.geoPlace.findUnique({ where: { placeGeoid: geoId } });
    stateAbbr = place?.stateAbbr || '';
  }

  // 3. Get income tax data
  const incomeTaxData = await prisma.incomeTaxRate.findFirst({
    where: {
      stateAbbr,
      localJurisdiction: null, // TODO: Add city-specific tax lookup
      taxYear: CURRENT_YEAR + 1, // Use 2025 data
    },
  });

  const effectiveTaxRate = incomeTaxData
    ? interpolateIncomeTaxRate(income, incomeTaxData)
    : 0;
  const incomeTax = (income * effectiveTaxRate) / 100;

  // 4. Get property tax data
  const propertyTaxData = await prisma.propertyTaxRate.findFirst({
    where: { geoType, geoId, asOfYear: CURRENT_YEAR },
  });

  const propertyTaxRate = propertyTaxData
    ? propertyTaxData.effectiveRate  // Already stored as decimal (e.g., 0.007 for 0.7%)
    : NATIONAL_AVG_PROPERTY_TAX_RATE;
  const propertyTax = homeValue * propertyTaxRate;

  // 5. Get transportation costs
  const transportationData = await prisma.transportationCost.findFirst({
    where: {
      stateAbbr,
      asOfYear: CURRENT_YEAR,
    },
    orderBy: [
      // Prefer metro-specific data over state average
      { metroArea: 'asc' },
    ],
  });

  let transportation = NATIONAL_AVG_TRANSPORTATION;
  if (transportationData) {
    // Adjust based on work-from-home status
    const baseCost = transportationData.estimatedAvgCost;
    transportation = workFromHome ? baseCost * 0.6 : baseCost; // WFH saves ~40% on commute
  }

  // 6. Get childcare costs
  let childcare = 0;
  if (numChildren > 0) {
    const childcareData = await prisma.childcareCost.findFirst({
      where: {
        geoLevel: 'state',
        geoId: stateAbbr,
        asOfYear: CURRENT_YEAR,
      },
    });

    if (childcareData) {
      childcare = calculateChildcareCost(numChildren, childAges, childcareData);
    }
  }

  // 7. Get healthcare costs
  const healthcareData = await prisma.healthcareCost.findFirst({
    where: {
      stateAbbr,
      region: null, // State-level data
      asOfYear: CURRENT_YEAR,
    },
  });

  const isFamily = householdType === 'family' || householdType === 'couple' || numChildren > 0;
  const healthcare = healthcareData
    ? (isFamily ? healthcareData.familyPremium : healthcareData.individualPremium)
    : (isFamily ? NATIONAL_AVG_HEALTHCARE_FAMILY : NATIONAL_AVG_HEALTHCARE_INDIVIDUAL);

  // 8. Calculate net disposable income
  const netDisposableIncome = income - incomeTax - propertyTax - transportation - childcare - healthcare;

  // 9. Calculate other expenses total (NEW)
  const otherExpenses = incomeTax + propertyTax + transportation + childcare + healthcare;
  const monthlyOtherExpenses = otherExpenses / 12;

  // 10. Calculate annual housing cost (FIXED: mortgage + insurance only, NO property tax)
  const downPayment = homeValue * downPaymentPct;
  const loanAmount = homeValue - downPayment;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, mortgageRate);
  const monthlyInsurance = (homeValue * HOME_INSURANCE_RATE) / 12;
  const monthlyHousingCost = monthlyPI + monthlyInsurance;  // NO property tax
  const annualHousingCost = monthlyHousingCost * 12;

  // 11. Calculate total fixed costs (NEW)
  const annualFixedCosts = otherExpenses + annualHousingCost;
  const monthlyFixedCosts = annualFixedCosts / 12;

  // 12. Calculate True Affordability Score
  const trueAffordabilityScore = netDisposableIncome / annualHousingCost;
  const affordabilityTier = getAffordabilityTier(trueAffordabilityScore);

  // 13. Calculate money left over
  const annualLeftOver = netDisposableIncome - annualHousingCost;
  const monthlyLeftOver = annualLeftOver / 12;

  return {
    grossIncome: income,
    incomeTax,
    propertyTax,
    transportation,
    childcare,
    healthcare,
    otherExpenses,           // NEW
    monthlyOtherExpenses,    // NEW
    netDisposableIncome,
    annualHousingCost,
    monthlyHousingCost,
    annualFixedCosts,        // NEW
    monthlyFixedCosts,       // NEW
    trueAffordabilityScore,
    affordabilityTier,
    annualLeftOver,
    monthlyLeftOver,
  };
}

// ====================
// PERSONA CALCULATORS
// ====================

export async function calculatePersonaScores(
  geoType: GeoType,
  geoId: string
): Promise<PersonaScores> {
  // Single person (no kids, individual healthcare)
  const single = await calculateTrueAffordability({
    geoType,
    geoId,
    householdType: 'single',
    numChildren: 0,
  });

  // Couple with no kids (dual income, family healthcare)
  const couple = await calculateTrueAffordability({
    geoType,
    geoId,
    annualIncome: undefined, // Use median × 1.8 for dual income
    householdType: 'couple',
    numChildren: 0,
  });

  // Family with 2 young kids (highest childcare costs)
  const family = await calculateTrueAffordability({
    geoType,
    geoId,
    householdType: 'family',
    numChildren: 2,
    childAges: [1, 3], // Infant + toddler (most expensive)
  });

  // Empty nesters (higher income, no childcare)
  const emptyNester = await calculateTrueAffordability({
    geoType,
    geoId,
    annualIncome: undefined, // Use median × 1.3 (peak earning years)
    householdType: 'emptyNester',
    numChildren: 0,
  });

  // Retiree (fixed income, Medicare)
  const retiree = await calculateTrueAffordability({
    geoType,
    geoId,
    annualIncome: 50000, // Typical retirement income
    householdType: 'retiree',
    numChildren: 0,
    workFromHome: true, // No commute
  });

  // Remote worker (median tech income, no commute)
  const remote = await calculateTrueAffordability({
    geoType,
    geoId,
    annualIncome: 95000, // Median remote tech worker
    householdType: 'remote',
    numChildren: 0,
    workFromHome: true,
  });

  return {
    single: single.trueAffordabilityScore,
    couple: couple.trueAffordabilityScore,
    family: family.trueAffordabilityScore,
    emptyNester: emptyNester.trueAffordabilityScore,
    retiree: retiree.trueAffordabilityScore,
    remote: remote.trueAffordabilityScore,
  };
}

// ====================
// EXPORTS
// ====================

export {
  calculateMonthlyMortgage,
  interpolateIncomeTaxRate,
  getAffordabilityTier,
  calculateChildcareCost,
};
