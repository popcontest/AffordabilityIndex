'use client';

import { CostBreakdown } from '@/lib/trueAffordability';
import { formatCurrency } from '@/lib/viewModels';
import { CheckIcon, AlertIcon, InfoIcon } from './InsightIcon';

interface PersonaScoreCardProps {
  personaType: string;
  personaLabel: string;
  personaDescription: string;
  breakdown: CostBreakdown;
  cityName: string;
}

export function PersonaScoreCard({
  personaType,
  personaLabel,
  personaDescription,
  breakdown,
  cityName,
}: PersonaScoreCardProps) {
  const {
    grossIncome,
    incomeTax,
    propertyTax,
    transportation,
    childcare,
    healthcare,
    netDisposableIncome,
    annualHousingCost,
    monthlyHousingCost,
    trueAffordabilityScore,
    affordabilityTier,
    annualLeftOver,
    monthlyLeftOver,
  } = breakdown;

  // Determine color and icon based on affordability tier
  const getTierStyle = () => {
    switch (affordabilityTier) {
      case 'excellent':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-800',
          icon: <CheckIcon className="w-6 h-6 text-green-600" />,
          label: 'Excellent',
        };
      case 'good':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-800',
          icon: <CheckIcon className="w-6 h-6 text-blue-600" />,
          label: 'Good',
        };
      case 'moderate':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          icon: <InfoIcon className="w-6 h-6 text-yellow-600" />,
          label: 'Moderate',
        };
      case 'challenging':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          text: 'text-orange-800',
          icon: <AlertIcon className="w-6 h-6 text-orange-600" />,
          label: 'Challenging',
        };
      case 'difficult':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          icon: <AlertIcon className="w-6 h-6 text-red-600" />,
          label: 'Difficult',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-800',
          icon: <InfoIcon className="w-6 h-6 text-gray-600" />,
          label: 'Unknown',
        };
    }
  };

  const tierStyle = getTierStyle();

  return (
    <div className={`rounded-lg border-2 ${tierStyle.border} ${tierStyle.bg} p-6 shadow-lg`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{personaLabel}</h3>
          <p className="text-sm text-gray-600 mt-1">{personaDescription}</p>
        </div>
        {tierStyle.icon}
      </div>

      {/* True Affordability Score */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <div className="text-5xl font-bold text-gray-900">
            {trueAffordabilityScore?.toFixed(1) || 'N/A'}
          </div>
          <div className={`text-lg font-semibold ${tierStyle.text}`}>
            {tierStyle.label}
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          True Affordability Score for {cityName}
        </div>
      </div>

      {/* Income & Costs */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Gross Income</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(grossIncome)}/yr
          </span>
        </div>

        <div className="pl-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>- Income Tax</span>
            <span>{formatCurrency(incomeTax)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>- Property Tax</span>
            <span>{formatCurrency(propertyTax)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>- Transportation</span>
            <span>{formatCurrency(transportation)}</span>
          </div>
          {childcare > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>- Childcare</span>
              <span>{formatCurrency(childcare)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>- Healthcare</span>
            <span>{formatCurrency(healthcare)}</span>
          </div>
        </div>

        <div className="flex justify-between border-t border-gray-200 pt-2">
          <span className="text-sm font-medium text-gray-700">Net Disposable Income</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(netDisposableIncome)}/yr
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Annual Housing Cost</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(annualHousingCost)}/yr
          </span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Monthly Payment</span>
          <span>{formatCurrency(monthlyHousingCost)}/mo</span>
        </div>
      </div>

      {/* Money Left Over */}
      <div className={`mt-4 p-4 rounded-lg border ${monthlyLeftOver >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="text-xs text-gray-600 mb-1">Money Left After Housing</div>
        <div className={`text-2xl font-bold ${monthlyLeftOver >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {formatCurrency(Math.abs(monthlyLeftOver))}/mo
        </div>
        <div className="text-xs text-gray-600 mt-1">
          ({formatCurrency(Math.abs(annualLeftOver))}/yr)
        </div>
        {monthlyLeftOver < 0 && (
          <div className="text-xs text-red-600 mt-2">
            Housing costs exceed disposable income - not affordable
          </div>
        )}
      </div>
    </div>
  );
}
