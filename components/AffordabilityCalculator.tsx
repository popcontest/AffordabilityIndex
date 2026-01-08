'use client';

import { useState } from 'react';
import { CheckIcon, AlertIcon } from './InsightIcon';
import { DisclaimerBox } from './DisclaimerBox';

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
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6" role="region" aria-labelledby="calculator-heading">
      <h3 id="calculator-heading" className="text-2xl font-bold text-gray-900 mb-4">
        Calculate What You Can Afford in {cityName}
      </h3>

      <form className="space-y-4 mb-6" onSubmit={(e) => e.preventDefault()}>
        {/* Income Input */}
        <div>
          <label htmlFor="income-input" className="block text-sm font-medium text-gray-700 mb-2">
            Your Annual Household Income
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">$</span>
            <input
              id="income-input"
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition text-lg font-semibold"
              placeholder="75000"
              step="1000"
              min="0"
              aria-describedby="income-description"
            />
          </div>
          <span id="income-description" className="sr-only">
            Enter your annual household income before taxes in dollars
          </span>
        </div>

        {/* Down Payment Slider */}
        <div>
          <label htmlFor="down-payment-slider" className="block text-sm font-medium text-gray-700 mb-2">
            Down Payment: {downPaymentPercent}%
          </label>
          <input
            id="down-payment-slider"
            type="range"
            min="3"
            max="30"
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-describedby="down-payment-description"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1" aria-hidden="true">
            <span>3% (FHA)</span>
            <span>20% (Conventional)</span>
            <span>30%</span>
          </div>
          <span id="down-payment-description" className="sr-only">
            Use arrow keys to adjust down payment percentage from 3% to 30%
          </span>
        </div>
      </form>

      {/* Results */}
      <div className="bg-white rounded-lg p-5 space-y-4" role="region" aria-live="polite" aria-atomic="true">
        <div className="border-b border-gray-200 pb-4">
          <div className="text-sm text-gray-600 mb-1">You can afford a home up to</div>
          <div className="text-4xl font-bold text-blue-600">
            ${Math.round(affordableHomePrice).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Based on 3.5x your annual income
          </div>
          <div className="text-xs text-gray-500 mt-1 bg-blue-50 p-2 rounded">
            <strong>Example:</strong> With ${income.toLocaleString()} income, a ${Math.round(affordableHomePrice).toLocaleString()} home means monthly payments of ~${Math.round(totalMonthlyPayment).toLocaleString()} (principal, interest, taxes, insurance)
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
        <div className={`p-4 rounded-lg ${canAffordMedian ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`} role="alert" aria-live="polite">
          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
            {canAffordMedian ? (
              <>
                <CheckIcon className="w-5 h-5 text-green-600" aria-hidden="true" />
                <span>Great news!</span>
              </>
            ) : (
              <>
                <AlertIcon className="w-5 h-5 text-yellow-600" aria-hidden="true" />
                <span>Stretch Budget</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-700">
            {canAffordMedian ? (
              <>
                You can afford <strong>{Math.round(percentOfHomesAffordable)}%</strong> of homes in this area.
                The median home (${medianHomeValue.toLocaleString()}) is well within your budget.
                <div className="mt-2 text-xs bg-green-100 p-2 rounded">
                  <strong>What this means:</strong> You'd have a comfortable financial cushion. Lenders typically want your housing payment to be under 28% of gross income (${Math.round((totalMonthlyPayment / income) * 12 * 100)}% in this case).
                </div>
              </>
            ) : (
              <>
                The median home (${medianHomeValue.toLocaleString()}) is {Math.round((medianHomeValue / affordableHomePrice - 1) * 100)}% above your comfortable budget.
                Consider lower-priced neighborhoods or increasing your down payment.
                <div className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                  <strong>Example:</strong> If you earn ${income.toLocaleString()} and buy the median home, you'd spend ~${Math.round((medianHomeValue / income) * 10) / 10}× your annual income, when most experts recommend staying under 3-4×.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <details className="text-sm">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
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
            <div className="text-xs bg-blue-50 p-2 rounded mt-2">
              <strong>Where your money goes:</strong> Principal & Interest make up {Math.round((monthlyPrincipalInterest / totalMonthlyPayment) * 100)}% of your payment, while property taxes and insurance add another {Math.round(((monthlyPropertyTax + monthlyInsurance) / totalMonthlyPayment) * 100)}%.
            </div>
          </div>
        </details>
      </div>

      {/* Calculator Assumptions */}
      <details className="mt-4 text-sm bg-blue-50 rounded-lg border border-blue-200">
        <summary className="cursor-pointer text-blue-700 hover:text-blue-900 font-medium p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
          Calculator Assumptions
        </summary>
        <div className="px-4 pb-4 space-y-3 text-gray-700">
          <div>
            <div className="font-medium text-gray-900 mb-1">Rates Used:</div>
            <ul className="space-y-1 text-xs ml-4 list-disc">
              <li>Interest rate: {(INTEREST_RATE * 100).toFixed(1)}% (national average)</li>
              <li>Property tax: {(PROPERTY_TAX_RATE * 100).toFixed(1)}% of home value annually</li>
              <li>Homeowners insurance: {(INSURANCE_RATE * 100).toFixed(1)}% of home value annually</li>
            </ul>
          </div>
          <div className="text-xs text-gray-600 italic">
            Note: Actual rates vary significantly by location. Consult local professionals for accurate estimates.
          </div>
        </div>
      </details>

      {/* What This Doesn't Include */}
      <details className="mt-3 text-sm bg-yellow-50 rounded-lg border border-yellow-200">
        <summary className="cursor-pointer text-yellow-800 hover:text-yellow-900 font-medium p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded">
          What This Doesn't Include
        </summary>
        <div className="px-4 pb-4 space-y-2 text-gray-700">
          <div className="text-xs">
            This calculator provides a rough estimate based on national averages. It does not account for:
          </div>
          <ul className="space-y-1 text-xs ml-4 list-disc">
            <li><strong>Closing costs</strong> (typically 2-5% of home price)</li>
            <li><strong>HOA fees</strong> (can add $200-500+/month in some communities)</li>
            <li><strong>Maintenance & repairs</strong> (budget 1-2% of home value annually)</li>
            <li><strong>Utilities</strong> (vary significantly by home size and location)</li>
            <li><strong>Debt-to-income ratio</strong> (lenders typically want total debt &lt; 43% of income)</li>
            <li><strong>Private Mortgage Insurance (PMI)</strong> (required if down payment &lt; 20%)</li>
          </ul>
          <div className="text-xs text-gray-600 italic mt-2">
            These costs vary significantly by location and property type. This calculator is for comparison purposes, not financial planning.
          </div>
        </div>
      </details>

      {/* Limitations Explanation */}
      <div className="mt-4 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="font-medium text-gray-900 mb-1">Important Limitations:</div>
        <ul className="space-y-1 ml-4 list-disc">
          <li>This is a <strong>rough estimate</strong> for initial budget planning</li>
          <li><strong>Actual affordability</strong> depends on credit score, employment history, and other factors</li>
          <li><strong>Consult mortgage lenders</strong> to determine actual qualification amounts</li>
          <li>Your personal financial situation (debts, savings, goals) affects true affordability</li>
        </ul>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        This calculator provides estimates only. Actual rates, taxes, and insurance vary.
      </div>

      <DisclaimerBox variant="calculator" />
    </div>
  );
}
