'use client';

/**
 * HousingEconomicContext - Collapsible section showing affordability-related demographics
 * Displays ACS data: median rent, housing burden %, poverty rate with MOE
 */

import { useState } from 'react';

interface HousingEconomicContextProps {
  medianRent: number;
  medianRentMoe: number;
  housingBurdenPct: number | null;
  housingBurdenPctMoe: number | null;
  povertyRatePct: number;
  povertyRatePctMoe: number;
  stateComparison?: {
    medianRent?: number;
    housingBurdenPct?: number;
    povertyRatePct?: number;
  };
  vintage: string; // "2018-2022"
}

export function HousingEconomicContext({
  medianRent,
  medianRentMoe,
  housingBurdenPct,
  housingBurdenPctMoe,
  povertyRatePct,
  povertyRatePctMoe,
  stateComparison,
  vintage,
}: HousingEconomicContextProps) {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default

  // Calculate coefficient of variation for reliability flags
  const rentCv = (medianRentMoe / 1.645) / medianRent;
  const burdenCv = housingBurdenPct && housingBurdenPctMoe
    ? (housingBurdenPctMoe / 1.645) / housingBurdenPct
    : null;
  const povertyCv = (povertyRatePctMoe / 1.645) / povertyRatePct;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Housing & Economic Context</h2>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Economic factors affecting affordability ({vintage} ACS data)</p>
        </div>
        <div className="ml-4">
          {isExpanded ? (
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-5 pt-4">
            Economic factors that affect affordability in this area
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Median Rent */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-1">Median Rent</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-gray-900">
                      ${medianRent.toLocaleString()}<span className="text-base text-gray-600">/mo</span>
                    </div>
                    {rentCv > 0.15 && rentCv < 0.30 && (
                      <span className="text-xs text-amber-600 font-medium">⚠</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ±${medianRentMoe.toLocaleString()}
                    {rentCv > 0.15 && rentCv < 0.30 && (
                      <span className="ml-2 text-amber-600">Moderate confidence</span>
                    )}
                  </div>
                </div>
                {stateComparison?.medianRent && (
                  <div className="text-right ml-4">
                    <div className="text-xs text-gray-500">State avg</div>
                    <div className="text-sm font-medium text-gray-700">
                      ${stateComparison.medianRent.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {medianRent > stateComparison.medianRent ? (
                        <span className="text-orange-600">+{((medianRent / stateComparison.medianRent - 1) * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-green-600">{((medianRent / stateComparison.medianRent - 1) * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Housing Cost Burden */}
            {housingBurdenPct !== null && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700 mb-1">Housing Cost Burden</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {housingBurdenPct.toFixed(1)}%
                      </div>
                      {burdenCv && burdenCv > 0.15 && burdenCv < 0.30 && (
                        <span className="text-xs text-amber-600 font-medium">⚠</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      of households spend 30%+ on housing
                      {burdenCv && burdenCv > 0.15 && burdenCv < 0.30 && (
                        <span className="ml-2 text-amber-600">Moderate confidence</span>
                      )}
                    </div>
                  </div>
                  {stateComparison?.housingBurdenPct && (
                    <div className="text-right ml-4">
                      <div className="text-xs text-gray-500">State avg</div>
                      <div className="text-sm font-medium text-gray-700">
                        {stateComparison.housingBurdenPct.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {housingBurdenPct > stateComparison.housingBurdenPct ? (
                          <span className="text-orange-600">+{(housingBurdenPct - stateComparison.housingBurdenPct).toFixed(1)}pp</span>
                        ) : (
                          <span className="text-green-600">{(housingBurdenPct - stateComparison.housingBurdenPct).toFixed(1)}pp</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Poverty Rate */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-1">Poverty Rate</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {povertyRatePct.toFixed(1)}%
                    </div>
                    {povertyCv > 0.15 && povertyCv < 0.30 && (
                      <span className="text-xs text-amber-600 font-medium">⚠</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    of residents below poverty line
                    {povertyCv > 0.15 && povertyCv < 0.30 && (
                      <span className="ml-2 text-amber-600">Moderate confidence</span>
                    )}
                  </div>
                </div>
                {stateComparison?.povertyRatePct && (
                  <div className="text-right ml-4">
                    <div className="text-xs text-gray-500">State avg</div>
                    <div className="text-sm font-medium text-gray-700">
                      {stateComparison.povertyRatePct.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {povertyRatePct > stateComparison.povertyRatePct ? (
                        <span className="text-orange-600">+{(povertyRatePct - stateComparison.povertyRatePct).toFixed(1)}pp</span>
                      ) : (
                        <span className="text-green-600">{(povertyRatePct - stateComparison.povertyRatePct).toFixed(1)}pp</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attribution */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-500 flex-1">
                Source: U.S. Census Bureau American Community Survey {vintage} 5-year estimates.
                Margins of error shown for reference.{' '}
                <button className="text-blue-600 hover:underline" onClick={(e) => {
                  e.stopPropagation();
                  // Could open a modal with data quality information
                }}>
                  Learn about data quality
                </button>
              </p>
            </div>
            {(rentCv > 0.15 || (burdenCv && burdenCv > 0.15) || povertyCv > 0.15) && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-md">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-800">
                    ⚠ Warning: Some metrics have moderate confidence due to smaller sample sizes. Use with caution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
