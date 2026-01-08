'use client';

import { CostBreakdown } from '@/lib/trueAffordability';
import { formatCurrency } from '@/lib/viewModels';

interface PersonaComparison {
  type: string;
  label: string;
  breakdown: CostBreakdown;
}

interface PersonaComparisonChartProps {
  personas: PersonaComparison[];
  cityName: string;
  showAll?: boolean;
}

interface CostBarProps {
  label: string;
  amount: number;
  colorClass: string;
  isInflow?: boolean;
  breakdown?: Array<{ label: string; amount: number; colorClass: string }>;
  subtitle?: string;
}

function CostBar({ label, amount, colorClass, isInflow = false, breakdown, subtitle }: CostBarProps) {
  const displayAmount = isInflow ? amount : -amount;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${isInflow ? 'text-green-600' : 'text-gray-900'}`}>
          {isInflow ? '+' : ''}{formatCurrency(displayAmount)}
        </span>
      </div>
      {/* Progress bar */}
      <div className="relative h-6 bg-gray-100 rounded-md overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: '100%' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700">
            {isInflow ? 'Gross' : formatCurrency(displayAmount)}
          </span>
        </div>
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 pl-2">{subtitle}</div>
      )}
      {/* Breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="ml-4 space-y-2 mt-2">
          {breakdown.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-600">{item.label}</span>
                <span className="text-xs font-medium text-gray-700 tabular-nums">
                  {formatCurrency(-item.amount)}
                </span>
              </div>
              <div className="relative h-3 bg-gray-50 rounded overflow-hidden">
                <div
                  className={`h-full ${item.colorClass} transition-all duration-500`}
                  style={{ width: `${Math.abs(item.amount / amount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PersonaComparisonChart({ personas, cityName, showAll = false }: PersonaComparisonChartProps) {
  // Show either all personas or just the first one
  const displayPersonas = showAll ? personas : [personas[0]];

  if (displayPersonas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900">
          Affordability by Household Type
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {showAll
            ? `Compare true affordability across different household profiles in ${cityName}`
            : `True affordability for ${displayPersonas[0].label} in ${cityName}`
          }
        </p>
      </div>

      <div className="p-6 space-y-6">
        {displayPersonas.map((persona) => {
          const { breakdown, label } = persona;
          const isAffordable = breakdown.monthlyLeftOver >= 0;

          // Calculate percentage breakdown for other expenses
          const otherExpenseBreakdown = [
            {
              label: 'Essentials',
              amount: breakdown.monthlyOtherExpenses * 0.6,
              colorClass: 'bg-red-400/70',
            },
            {
              label: 'Taxes',
              amount: breakdown.monthlyOtherExpenses * 0.25,
              colorClass: 'bg-orange-400/70',
            },
            {
              label: 'Transportation',
              amount: breakdown.monthlyOtherExpenses * 0.15,
              colorClass: 'bg-yellow-400/70',
            },
          ];

          return (
            <div key={persona.type} className="space-y-4">
              {/* Household Type Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{label}</h4>
                  <p className="text-sm text-gray-500">
                    Annual Income: {formatCurrency(breakdown.grossIncome)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${isAffordable ? 'text-green-600' : 'text-red-600'}`}>
                    {breakdown.trueAffordabilityScore?.toFixed(1) || 'N/A'}
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      breakdown.affordabilityTier === 'excellent'
                        ? 'bg-green-100 text-green-800'
                        : breakdown.affordabilityTier === 'good'
                        ? 'bg-blue-100 text-blue-800'
                        : breakdown.affordabilityTier === 'moderate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : breakdown.affordabilityTier === 'challenging'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {breakdown.affordabilityTier || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Bars */}
              <div className="space-y-3">
                <CostBar
                  label="Gross Income"
                  amount={breakdown.grossIncome / 12}
                  colorClass="bg-green-500"
                  isInflow={true}
                  subtitle="Monthly pre-tax income"
                />

                <CostBar
                  label="Other Expenses"
                  amount={breakdown.monthlyOtherExpenses}
                  colorClass="bg-red-400/70"
                  breakdown={otherExpenseBreakdown}
                  subtitle="Essentials, taxes, transportation"
                />

                <CostBar
                  label="Monthly Housing Cost"
                  amount={breakdown.monthlyHousingCost}
                  colorClass="bg-blue-400/70"
                  subtitle="Mgage (P&I), insurance, taxes"
                />

                <CostBar
                  label="Left Over"
                  amount={breakdown.monthlyLeftOver}
                  colorClass={isAffordable ? 'bg-green-600' : 'bg-red-500'}
                  isInflow={true}
                  subtitle="Net disposable income"
                />
              </div>

              {/* Summary */}
              <div className={`mt-4 p-4 rounded-lg ${isAffordable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="text-sm">
                  <strong className={isAffordable ? 'text-green-900' : 'text-red-900'}>
                    {isAffordable ? '✓ Affordable' : '✗ Unaffordable'}
                  </strong>
                  <span className={isAffordable ? 'text-green-800' : 'text-red-800'}>
                    {' '}After all expenses, you'll have{' '}
                    <strong>{formatCurrency(breakdown.monthlyLeftOver)}/month</strong> remaining.
                    {' '}This represents{' '}
                    <strong>{((breakdown.monthlyLeftOver / (breakdown.grossIncome / 12)) * 100).toFixed(1)}%</strong> of your gross income.
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Explanation */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div>
            <strong>True Affordability Score:</strong> Higher is better. Calculated as Net Disposable Income ÷ Annual Housing Cost.
          </div>
          <div>
            <strong>Other Expenses</strong> include: income tax, property tax, transportation, healthcare, and childcare (if applicable).
          </div>
          <div>
            <strong>Monthly Housing</strong> includes: mortgage (principal + interest), property taxes, and homeowners insurance.
          </div>
        </div>
      </div>
    </div>
  );
}
