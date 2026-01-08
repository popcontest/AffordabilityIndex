'use client';

import { CostBreakdown } from '@/lib/trueAffordability';
import { formatCurrency } from '@/lib/viewModels';

interface CostBreakdownChartProps {
  breakdown: CostBreakdown;
  personaLabel: string;
}

export function CostBreakdownChart({ breakdown, personaLabel }: CostBreakdownChartProps) {
  const {
    grossIncome,
    incomeTax,
    propertyTax,
    transportation,
    childcare,
    healthcare,
    annualHousingCost,
    annualLeftOver,
  } = breakdown;

  // Calculate percentages
  const costs = [
    { label: 'Income Tax', amount: incomeTax, color: 'bg-red-500' },
    { label: 'Property Tax', amount: propertyTax, color: 'bg-orange-500' },
    { label: 'Housing Cost', amount: annualHousingCost, color: 'bg-blue-500' },
    { label: 'Transportation', amount: transportation, color: 'bg-yellow-500' },
    { label: 'Childcare', amount: childcare, color: 'bg-purple-500', hide: childcare === 0 },
    { label: 'Healthcare', amount: healthcare, color: 'bg-pink-500' },
    { label: 'Left Over', amount: Math.max(0, annualLeftOver), color: 'bg-green-500' },
  ].filter((cost) => !cost.hide);

  const total = costs.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Cost Breakdown: {personaLabel}
      </h3>

      {/* Stacked Bar Chart */}
      <div className="mb-6" role="img" aria-label={`Cost breakdown chart showing ${costs.length} categories for ${personaLabel}`}>
        <div className="flex h-12 rounded-lg overflow-hidden border border-gray-300">
          {costs.map((cost, index) => {
            const percentage = (cost.amount / total) * 100;
            if (percentage < 0.5) return null; // Hide very small segments

            return (
              <div
                key={index}
                className={`${cost.color} relative group`}
                style={{ width: `${percentage}%` }}
                title={`${cost.label}: ${formatCurrency(cost.amount)} (${percentage.toFixed(1)}%)`}
                role="img"
                aria-label={`${cost.label}: ${formatCurrency(cost.amount)}, ${percentage.toFixed(1)}% of total`}
              >
                {percentage > 8 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white" aria-hidden="true">
                    {percentage.toFixed(0)}%
                  </div>
                )}
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {cost.label}: {formatCurrency(cost.amount)}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {costs.map((cost, index) => {
          const percentage = (cost.amount / total) * 100;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${cost.color} flex-shrink-0`}></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {cost.label}
                </div>
                <div className="text-xs text-gray-600">
                  {formatCurrency(cost.amount)} ({percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium text-gray-700">Gross Income</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(grossIncome)}</span>
        </div>
        {annualLeftOver < 0 && (
          <div className="mt-2 text-sm text-red-600">
            Deficit: {formatCurrency(Math.abs(annualLeftOver))}/yr
          </div>
        )}
      </div>
    </div>
  );
}
