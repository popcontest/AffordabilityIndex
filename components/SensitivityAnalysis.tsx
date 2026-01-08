'use client';

import { formatCurrency } from '@/lib/viewModels';

interface SensitivityAnalysisProps {
  baseIncome: number;
  baseHomePrice: number;
  baseDownPaymentPercent: number;
  baseMonthlyPayment: number;
}

interface Scenario {
  label: string;
  description: string;
  monthlyPayment: number;
  percentChange: number;
  impact: 'positive' | 'neutral' | 'negative';
}

function ScenarioCard({ scenario, baseMonthlyPayment }: { scenario: Scenario; baseMonthlyPayment: number }) {
  const impactColors = {
    positive: 'bg-green-50 border-green-200',
    neutral: 'bg-gray-50 border-gray-200',
    negative: 'bg-red-50 border-red-200',
  };

  const impactTextColors = {
    positive: 'text-green-700',
    neutral: 'text-gray-700',
    negative: 'text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${impactColors[scenario.impact]}`}>
      <div className="text-xs font-semibold text-gray-600 mb-1">{scenario.label}</div>
      <div className="text-lg font-bold tabular-nums mb-1">
        {formatCurrency(scenario.monthlyPayment)}/mo
      </div>
      <div className="flex items-center gap-2 text-xs">
        {scenario.percentChange !== 0 && (
          <span className={`font-medium ${impactTextColors[scenario.impact]}`}>
            {scenario.percentChange > 0 ? '+' : ''}{scenario.percentChange.toFixed(1)}%
          </span>
        )}
        <span className="text-gray-600">{scenario.description}</span>
      </div>
    </div>
  );
}

export function SensitivityAnalysis({
  baseIncome,
  baseHomePrice,
  baseDownPaymentPercent,
  baseMonthlyPayment,
}: SensitivityAnalysisProps) {
  // Calculate scenarios
  const INTEREST_RATE = 0.062;
  const PROPERTY_TAX_RATE = 0.011;
  const INSURANCE_RATE = 0.005;
  const LOAN_YEARS = 30;

  // Helper to calculate monthly payment
  const calculatePayment = (
    homePrice: number,
    downPaymentPercent: number,
    interestRate: number,
    propertyTaxRate: number,
    insuranceRate: number
  ): number => {
    const downPayment = homePrice * (downPaymentPercent / 100);
    const loanAmount = homePrice - downPayment;
    const monthlyInterestRate = interestRate / 12;
    const numberOfPayments = LOAN_YEARS * 12;

    const monthlyPrincipalInterest = loanAmount *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    const monthlyPropertyTax = (homePrice * propertyTaxRate) / 12;
    const monthlyInsurance = (homePrice * insuranceRate) / 12;

    return monthlyPrincipalInterest + monthlyPropertyTax + monthlyInsurance;
  };

  // Scenario 1: Higher interest rate (7.5%)
  const scenario1Payment = calculatePayment(
    baseHomePrice,
    baseDownPaymentPercent,
    0.075, // 7.5% rate
    PROPERTY_TAX_RATE,
    INSURANCE_RATE
  );
  const scenario1Change = ((scenario1Payment - baseMonthlyPayment) / baseMonthlyPayment) * 100;

  // Scenario 2: Higher property taxes (20% increase)
  const scenario2Payment = calculatePayment(
    baseHomePrice,
    baseDownPaymentPercent,
    INTEREST_RATE,
    PROPERTY_TAX_RATE * 1.2, // 20% higher
    INSURANCE_RATE
  );
  const scenario2Change = ((scenario2Payment - baseMonthlyPayment) / baseMonthlyPayment) * 100;

  // Scenario 3: 10% raise (can afford 10% more home)
  const higherIncomeHomePrice = baseHomePrice * 1.1;
  const scenario3Payment = calculatePayment(
    higherIncomeHomePrice,
    baseDownPaymentPercent,
    INTEREST_RATE,
    PROPERTY_TAX_RATE,
    INSURANCE_RATE
  );
  const scenario3Change = ((scenario3Payment - baseMonthlyPayment) / baseMonthlyPayment) * 100;

  // Scenario 4: 20% down payment instead of current
  const scenario4Payment = calculatePayment(
    baseHomePrice,
    20,
    INTEREST_RATE,
    PROPERTY_TAX_RATE,
    INSURANCE_RATE
  );
  const scenario4Change = ((scenario4Payment - baseMonthlyPayment) / baseMonthlyPayment) * 100;

  const scenarios: Scenario[] = [
    {
      label: 'If Rates Rise to 7.5%',
      description: 'vs current 6.2%',
      monthlyPayment: scenario1Payment,
      percentChange: scenario1Change,
      impact: scenario1Change > 0 ? 'negative' : 'neutral',
    },
    {
      label: 'If Property Taxes +20%',
      description: 'higher than average',
      monthlyPayment: scenario2Payment,
      percentChange: scenario2Change,
      impact: scenario2Change > 0 ? 'negative' : 'neutral',
    },
    {
      label: 'If You Get a 10% Raise',
      description: 'buy 10% more home',
      monthlyPayment: scenario3Payment,
      percentChange: scenario3Change,
      impact: scenario3Change > 0 ? 'neutral' : 'positive',
    },
    {
      label: `If You Put 20% Down`,
      description: baseDownPaymentPercent < 20 ? `vs current ${baseDownPaymentPercent}%` : 'same as current',
      monthlyPayment: scenario4Payment,
      percentChange: scenario4Change,
      impact: scenario4Change < 0 ? 'positive' : 'neutral',
    },
  ];

  return (
    <details className="mt-4 text-sm bg-white rounded-lg border-2 border-gray-200">
      <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        What-If Scenarios
      </summary>
      <div className="px-4 pb-4 pt-2">
        <p className="text-gray-600 mb-4">
          See how changes in interest rates, taxes, or your income affect your monthly payment:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {scenarios.map((scenario, index) => (
            <ScenarioCard key={index} scenario={scenario} baseMonthlyPayment={baseMonthlyPayment} />
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
          <strong>💡 Tip:</strong> Interest rates fluctuate based on economic conditions. Locking in a rate now can protect against future increases.
          Consider getting pre-approved to understand your rate options.
        </div>
      </div>
    </details>
  );
}
