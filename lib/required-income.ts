/**
 * Required Family Income Calculator
 *
 * Calculates the annual income needed for a family to live comfortably
 * in a given location based on housing, living expenses, and taxes.
 */

import { prisma } from './prisma';
import type { GeoType } from '@prisma/client';

export interface RequiredIncomeData {
  requiredAnnualIncome: number;
  breakdown: {
    housing: number;        // Annual housing cost (mortgage + property tax)
    livingExpenses: number; // Annual non-housing essentials
    taxes: number;          // Annual tax burden
  };
  assumptions: {
    homeValue: number;
    mortgageRate: number;
    downPaymentPct: number;
    householdType: string;
  };
  comparison?: {
    medianIncome: number;
    gap: number; // Positive = affordable, Negative = expensive
    gapPercent: number;
  };
}

/**
 * Calculate required annual income for a geography
 *
 * @param geoType - Geography type
 * @param geoId - Geography ID
 * @param householdType - Household composition (default: 2_adults_2_kids)
 * @returns Required income data or null if insufficient data
 */
export async function calculateRequiredIncome(
  geoType: GeoType,
  geoId: string,
  householdType: string = '2_adults_2_kids'
): Promise<RequiredIncomeData | null> {
  // Get basic affordability data
  const snapshot = await prisma.affordabilitySnapshot.findFirst({
    where: { geoType, geoId },
    orderBy: { asOfDate: 'desc' },
  });

  if (!snapshot || !snapshot.homeValue || !snapshot.medianIncome) {
    return null;
  }

  // Get county FIPS for MIT Living Wage lookup
  const countyFips = await getCountyFips(geoType, geoId);

  // Try to get MIT Living Wage cost basket (optional fallback)
  let costBasket = null;
  if (countyFips) {
    costBasket = await prisma.costBasket.findFirst({
      where: {
        countyFips,
        householdType,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Calculate housing costs
  const MORTGAGE_RATE = 0.07; // 7% (could fetch from freddie_mac_rate table)
  const DOWN_PAYMENT_PCT = 0.20; // 20%

  const loanAmount = snapshot.homeValue * (1 - DOWN_PAYMENT_PCT);
  const monthlyRate = MORTGAGE_RATE / 12;
  const numPayments = 360; // 30 years

  const monthlyMortgage = loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const propertyTaxRate = snapshot.propertyTaxRate || 0.012; // Default 1.2%
  const annualPropertyTax = snapshot.homeValue * propertyTaxRate;
  const monthlyPropertyTax = annualPropertyTax / 12;

  const annualHousingCost = (monthlyMortgage + monthlyPropertyTax) * 12;

  // Living expenses (non-housing from MIT Living Wage, or use national average fallback)
  let annualLivingExpenses: number;
  if (costBasket) {
    // Use actual MIT Living Wage data when available
    const housingCostInBasket = costBasket.housing || 0;
    annualLivingExpenses = costBasket.totalAnnual - housingCostInBasket;
  } else {
    // Fallback: Use simplified national average for family of 4 non-housing expenses
    // Based on typical US household spending: food ($12k), transportation ($11k),
    // healthcare ($5k), childcare ($10k), utilities ($3k), other ($5k) ≈ $46k/year
    const FALLBACK_LIVING_EXPENSES = {
      '1_adult_0_kids': 15000,
      '1_adult_1_kid': 25000,
      '1_adult_2_kids': 32000,
      '2_adults_0_kids': 25000,
      '2_adults_1_kid': 35000,
      '2_adults_2_kids': 46000,
      '2_adults_3_kids': 55000,
    };
    annualLivingExpenses = FALLBACK_LIVING_EXPENSES[householdType as keyof typeof FALLBACK_LIVING_EXPENSES] || 46000;
  }

  // Get state for tax calculation
  const stateAbbr = await getStateAbbr(geoType, geoId);

  // Estimate tax burden (simplified)
  // For a more accurate calculation, we'd iterate to find the income that covers everything after taxes
  // For now, use a simplified approach: assume 25% effective tax rate
  const EFFECTIVE_TAX_RATE = 0.25; // Combined federal, state, local, FICA

  // Required pre-tax income = (Housing + Living) / (1 - Tax Rate)
  const requiredAnnualIncome = (annualHousingCost + annualLivingExpenses) / (1 - EFFECTIVE_TAX_RATE);
  const annualTaxes = requiredAnnualIncome * EFFECTIVE_TAX_RATE;

  const result: RequiredIncomeData = {
    requiredAnnualIncome: Math.round(requiredAnnualIncome),
    breakdown: {
      housing: Math.round(annualHousingCost),
      livingExpenses: Math.round(annualLivingExpenses),
      taxes: Math.round(annualTaxes),
    },
    assumptions: {
      homeValue: snapshot.homeValue,
      mortgageRate: MORTGAGE_RATE,
      downPaymentPct: DOWN_PAYMENT_PCT,
      householdType,
    },
  };

  // Add comparison to median income
  if (snapshot.medianIncome) {
    const gap = snapshot.medianIncome - requiredAnnualIncome;
    result.comparison = {
      medianIncome: snapshot.medianIncome,
      gap,
      gapPercent: (gap / requiredAnnualIncome) * 100,
    };
  }

  return result;
}

/**
 * Get county FIPS for a geography
 */
async function getCountyFips(geoType: GeoType, geoId: string): Promise<string | null> {
  if (geoType === 'CITY') {
    const city = await prisma.geoCity.findUnique({
      where: { cityId: geoId },
      select: { countyFips: true },
    });
    return city?.countyFips || null;
  } else if (geoType === 'PLACE') {
    const place = await prisma.geoPlace.findUnique({
      where: { placeGeoid: geoId },
      select: { stateFips: true, countyFips: true },
    });
    if (place?.stateFips && place?.countyFips) {
      return place.stateFips + place.countyFips;
    }
  } else if (geoType === 'ZCTA') {
    // ZCTAs don't have direct county mapping - would need geocoding
    // For now, return null
    return null;
  }
  return null;
}

/**
 * Get state abbreviation for a geography
 */
async function getStateAbbr(geoType: GeoType, geoId: string): Promise<string | null> {
  if (geoType === 'CITY') {
    const city = await prisma.geoCity.findUnique({
      where: { cityId: geoId },
      select: { stateAbbr: true },
    });
    return city?.stateAbbr || null;
  } else if (geoType === 'PLACE') {
    const place = await prisma.geoPlace.findUnique({
      where: { placeGeoid: geoId },
      select: { stateAbbr: true },
    });
    return place?.stateAbbr || null;
  } else if (geoType === 'ZCTA') {
    const zcta = await prisma.geoZcta.findUnique({
      where: { zcta: geoId },
      select: { stateAbbr: true },
    });
    return zcta?.stateAbbr || null;
  }
  return null;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
