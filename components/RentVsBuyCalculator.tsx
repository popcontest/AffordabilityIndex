'use client';

/**
 * RentVsBuyCalculator - Interactive calculator comparing renting vs buying
 * Uses ACS median rent data and Zillow home values
 */

import { useState, useMemo } from 'react';

interface RentVsBuyCalculatorProps {
  medianRent: number;          // From ACS B25064 (monthly)
  medianHomeValue: number;     // From Zillow ZHVI
  propertyTaxRate: number;     // Effective rate (decimal, e.g., 0.012 = 1.2%)
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
  const [downPaymentPct, setDownPaymentPct] = useState(0.20); // 20%
  const [yearsToStay, setYearsToStay] = useState(5);
  const [mortgageRate, setMortgageRate] = useState(0.07); // 7%

  // Calculate monthly buy cost
  const monthlyBuy = useMemo(() => {
    const loanAmount = medianHomeValue * (1 - downPaymentPct);
    const monthlyRate = mortgageRate / 12;
    const numPayments = 360; // 30-year mortgage

    // Amortization formula
    const monthlyMortgage = loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const monthlyPropertyTax = (medianHomeValue * propertyTaxRate) / 12;
    const monthlyInsurance = (medianHomeValue * 0.006) / 12; // 0.6% of home value annually
    const monthlyMaintenance = (medianHomeValue * 0.01) / 12; // 1% of home value annually

    return monthlyMortgage + monthlyPropertyTax + monthlyInsurance + monthlyMaintenance;
  }, [medianHomeValue, downPaymentPct, mortgageRate, propertyTaxRate]);

  // Calculate total costs and breakeven
  const analysis = useMemo(() => {
    const downPayment = medianHomeValue * downPaymentPct;
    const closingCosts = medianHomeValue * 0.03; // 3% closing costs

    // Total rent cost over period
    const totalRent = medianRent * 12 * yearsToStay;

    // Total buy cost over period
    const monthlyBuyPayments = monthlyBuy * 12 * yearsToStay;
    const totalBuyCost = downPayment + closingCosts + monthlyBuyPayments;

    // Calculate equity gained
    // Simplified: principal paid down + appreciation
    const monthlyRate = mortgageRate / 12;
    const numPayments = yearsToStay * 12;
    const loanAmount = medianHomeValue * (1 - downPaymentPct);

    // Principal paid = total payments - interest paid
    let remainingBalance = loanAmount;
    let totalPrincipalPaid = 0;

    for (let i = 0; i < numPayments; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const monthlyMortgage = loanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, 360)) /
        (Math.pow(1 + monthlyRate, 360) - 1);
      const principalPayment = monthlyMortgage - interestPayment;
      totalPrincipalPaid += principalPayment;
      remainingBalance -= principalPayment;
    }

    const appreciation = medianHomeValue * 0.03 * yearsToStay; // 3% annual appreciation
    const equityGained = totalPrincipalPaid + appreciation;

    const netBuyCost = totalBuyCost - equityGained;

    // Find breakeven year
    let breakevenYears = 0;
    for (let year = 1; year <= 10; year++) {
      const rentCostAtYear = medianRent * 12 * year;
      const buyPaymentsAtYear = monthlyBuy * 12 * year;
      const buyTotalAtYear = downPayment + closingCosts + buyPaymentsAtYear;

      // Calculate equity at this year
      let principalAtYear = 0;
      let balance = loanAmount;
      for (let i = 0; i < year * 12; i++) {
        const interest = balance * monthlyRate;
        const monthlyMortgage = loanAmount *
          (monthlyRate * Math.pow(1 + monthlyRate, 360)) /
          (Math.pow(1 + monthlyRate, 360) - 1);
        const principal = monthlyMortgage - interest;
        principalAtYear += principal;
        balance -= principal;
      }
      const appreciationAtYear = medianHomeValue * 0.03 * year;
      const equityAtYear = principalAtYear + appreciationAtYear;
      const netBuyAtYear = buyTotalAtYear - equityAtYear;

      if (netBuyAtYear < rentCostAtYear) {
        breakevenYears = year;
        break;
      }
    }

    return {
      totalRent,
      totalBuyCost,
      netBuyCost,
      equityGained,
      breakevenYears: breakevenYears || 10, // Default to 10+ if never breaks even
      downPayment,
      closingCosts,
    };
  }, [medianRent, monthlyBuy, yearsToStay, medianHomeValue, mortgageRate, downPaymentPct]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Rent vs Buy Analysis</h2>
        <p className="text-sm text-gray-500 mt-0.5">Compare the cost of renting vs buying in {cityName}</p>
      </div>

      {/* User Inputs */}
      <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Down Payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Down Payment: {(downPaymentPct * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.035"
              max="0.50"
              step="0.005"
              value={downPaymentPct}
              onChange={(e) => setDownPaymentPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3.5%</span>
              <span className="font-medium">${(medianHomeValue * downPaymentPct).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span>50%</span>
            </div>
          </div>

          {/* Years to Stay */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Years to Stay: {yearsToStay}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={yearsToStay}
              onChange={(e) => setYearsToStay(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 year</span>
              <span>10 years</span>
            </div>
          </div>

          {/* Mortgage Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mortgage Rate: {(mortgageRate * 100).toFixed(2)}%
            </label>
            <input
              type="number"
              min="3"
              max="12"
              step="0.125"
              value={(mortgageRate * 100).toFixed(2)}
              onChange={(e) => setMortgageRate(parseFloat(e.target.value) / 100)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="text-xs text-gray-500 mt-1">30-year fixed</div>
          </div>
        </div>
      </div>

      {/* Results Comparison */}
      <div className="px-6 py-5">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Renting */}
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="font-semibold text-gray-900">Renting</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  ${medianRent.toLocaleString()}<span className="text-lg text-gray-600">/mo</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Median rent (ACS)</div>
              </div>
              <div className="pt-3 border-t border-blue-200">
                <div className="text-sm text-gray-600">Total over {yearsToStay} years:</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  ${analysis.totalRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                No equity gained • Flexibility to move
              </div>
            </div>
          </div>

          {/* Buying */}
          <div className="bg-green-50 rounded-lg p-5 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="font-semibold text-gray-900">Buying</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  ${Math.round(monthlyBuy).toLocaleString()}<span className="text-lg text-gray-600">/mo</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">Mortgage + taxes + insurance + maintenance</div>
              </div>
              <div className="pt-3 border-t border-green-200">
                <div className="text-sm text-gray-600">Total over {yearsToStay} years:</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  ${analysis.totalBuyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm font-medium text-green-700 mt-2">
                  Equity gained: ${analysis.equityGained.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Net cost: ${analysis.netBuyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Build equity • Fixed monthly payment
              </div>
            </div>
          </div>
        </div>

        {/* Breakeven Analysis */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 mb-1">Breakeven Point</div>
              {analysis.breakevenYears < 10 ? (
                <div className="text-sm text-gray-900">
                  Buying becomes cheaper than renting after{' '}
                  <span className="text-lg font-bold text-green-700">{analysis.breakevenYears.toFixed(1)} years</span>
                </div>
              ) : (
                <div className="text-sm text-gray-900">
                  Renting is cheaper for the full <span className="font-semibold">10-year period</span> analyzed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Based on ACS median rent (${medianRent.toLocaleString()}/mo) and Zillow median home value (${medianHomeValue.toLocaleString()}).
          Assumes {(downPaymentPct * 100).toFixed(0)}% down, {(mortgageRate * 100).toFixed(2)}% mortgage rate, 3% annual appreciation,
          0.6% home insurance, 1% maintenance. For illustration only. Does not constitute financial advice.
        </p>
      </div>
    </div>
  );
}
