'use client';

import { useState } from 'react';
import { CheckIcon, AlertIcon } from './InsightIcon';

interface AffordabilityCalculatorProps {
  medianHomeValue: number;
  medianIncome: number;
  cityName: string;
  stateAbbr: string;
}

export function AffordabilityCalculator({
  medianHomeValue,
  medianIncome,
  cityName,
  stateAbbr,
}: AffordabilityCalculatorProps) {
  const [income, setIncome] = useState(medianIncome);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);

  // Constants
  const INTEREST_RATE = 0.062; // 6.2% annual rate (current average)
  const PROPERTY_TAX_RATE = 0.011; // 1.1% annual (national average)
  const INSURANCE_RATE = 0.005; // 0.5% annual (estimate)
  const HOA_MONTHLY = 0; // Assume no HOA for now

  // Calculate what they can afford (3.5x income rule of thumb)
  const affordableHomePrice = income * 3.5;
  const downPayment = affordableHomePrice * (downPaymentPercent / 100);
  const loanAmount = affordableHomePrice - downPayment;

  // Monthly payment calculation
  const monthlyInterestRate = INTEREST_RATE / 12;
  const numberOfPayments = 30 * 12; // 30-year mortgage

  const monthlyPrincipalInterest = loanAmount *
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  const monthlyPropertyTax = (affordableHomePrice * PROPERTY_TAX_RATE) / 12;
  const monthlyInsurance = (affordableHomePrice * INSURANCE_RATE) / 12;
  const totalMonthlyPayment = monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance + HOA_MONTHLY;

  // Compare to median home value
  const percentOfMedian = (affordableHomePrice / medianHomeValue) * 100;
  const canAffordMedian = affordableHomePrice >= medianHomeValue;

  // Estimate percentage of homes they can afford (simplified)
  const percentOfHomesAffordable = Math.min(100, Math.max(5, percentOfMedian));

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Calculate What You Can Afford in {cityName}
      </h3>

      <div className="space-y-4 mb-6">
        {/* Income Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Annual Household Income
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-lg font-semibold"
              placeholder="75000"
              step="1000"
              min="0"
            />
          </div>
        </div>

        {/* Down Payment Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Down Payment: {downPaymentPercent}%
          </label>
          <input
            type="range"
            min="3"
            max="30"
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>3% (FHA)</span>
            <span>20% (Conventional)</span>
            <span>30%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg p-5 space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <div className="text-sm text-gray-600 mb-1">You can afford a home up to</div>
          <div className="text-4xl font-bold text-blue-600">
            ${Math.round(affordableHomePrice).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Based on 3.5x your annual income
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Monthly Payment</div>
            <div className="text-2xl font-bold text-gray-900">
              ${Math.round(totalMonthlyPayment).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              P&I: ${Math.round(monthlyPrincipalInterest).toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Down Payment</div>
            <div className="text-2xl font-bold text-gray-900">
              ${Math.round(downPayment).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {downPaymentPercent}% of purchase price
            </div>
          </div>
        </div>

        {/* Affordability Assessment */}
        <div className={`p-4 rounded-lg ${canAffordMedian ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
            {canAffordMedian ? (
              <>
                <CheckIcon className="w-5 h-5 text-green-600" />
                <span>Great news!</span>
              </>
            ) : (
              <>
                <AlertIcon className="w-5 h-5 text-yellow-600" />
                <span>Stretch Budget</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-700">
            {canAffordMedian ? (
              <>
                You can afford <strong>{Math.round(percentOfHomesAffordable)}%</strong> of homes in this area.
                The median home (${medianHomeValue.toLocaleString()}) is well within your budget.
              </>
            ) : (
              <>
                The median home (${medianHomeValue.toLocaleString()}) is {Math.round((medianHomeValue / affordableHomePrice - 1) * 100)}% above your comfortable budget.
                Consider lower-priced neighborhoods or increasing your down payment.
              </>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
            View payment breakdown
          </summary>
          <div className="mt-3 space-y-2 text-gray-600 pl-4">
            <div className="flex justify-between">
              <span>Principal & Interest</span>
              <span className="font-medium">${Math.round(monthlyPrincipalInterest).toLocaleString()}/mo</span>
            </div>
            <div className="flex justify-between">
              <span>Property Tax (est.)</span>
              <span className="font-medium">${Math.round(monthlyPropertyTax).toLocaleString()}/mo</span>
            </div>
            <div className="flex justify-between">
              <span>Home Insurance (est.)</span>
              <span className="font-medium">${Math.round(monthlyInsurance).toLocaleString()}/mo</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Assuming {(INTEREST_RATE * 100).toFixed(2)}% interest rate, 30-year fixed mortgage
            </div>
          </div>
        </details>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        This calculator provides estimates only. Actual rates, taxes, and insurance vary.
      </div>
    </div>
  );
}
