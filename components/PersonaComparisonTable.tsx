'use client';

import { CostBreakdown } from '@/lib/trueAffordability';
import { formatCurrency } from '@/lib/viewModels';

interface PersonaComparison {
  type: string;
  label: string;
  breakdown: CostBreakdown;
}

interface PersonaComparisonTableProps {
  personas: PersonaComparison[];
  cityName: string;
}

export function PersonaComparisonTable({ personas, cityName }: PersonaComparisonTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900">
          Affordability by Household Type
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Compare true affordability across different household profiles in {cityName}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Household Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Other Expenses
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Housing
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Disposable
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Left Over
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {personas.map((persona, index) => {
              const { breakdown, label } = persona;
              const isAffordable = breakdown.monthlyLeftOver >= 0;

              return (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{label}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(breakdown.grossIncome)}
                    </div>
                    <div className="text-xs text-gray-500">per year</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(breakdown.monthlyOtherExpenses)}
                    </div>
                    <div className="text-xs text-gray-500">per month</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(breakdown.monthlyHousingCost)}
                    </div>
                    <div className="text-xs text-gray-500">per month</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(breakdown.netDisposableIncome)}
                    </div>
                    <div className="text-xs text-gray-500">after costs</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className={`text-sm font-semibold ${isAffordable ? 'text-green-600' : 'text-red-600'}`}>
                      {isAffordable ? '+' : ''}{formatCurrency(breakdown.monthlyLeftOver)}
                    </div>
                    <div className="text-xs text-gray-500">per month</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {breakdown.trueAffordabilityScore?.toFixed(1) || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div>
            <strong>True Affordability Score:</strong> Higher is better. Calculated as Net Disposable Income ÷ Annual Housing Cost.
          </div>
          <div>
            <strong>Other Expenses</strong> include: income tax, property tax, transportation, healthcare, and childcare (if applicable).
          </div>
          <div>
            <strong>Monthly Housing</strong> includes: mortgage (principal + interest) and homeowners insurance.
          </div>
        </div>
      </div>
    </div>
  );
}
