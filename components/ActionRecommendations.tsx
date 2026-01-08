'use client';

import Link from 'next/link';

interface CalculatorResult {
  canAffordMedian: boolean;
  affordableHomePrice: number;
  medianHomeValue: number;
  income: number;
  monthlyPayment: number;
  percentOfHomesAffordable: number;
}

interface ActionRecommendationsProps {
  result: CalculatorResult;
  cityName: string;
  stateAbbr: string;
}

/**
 * ActionRecommendations - Contextual next steps based on calculator results
 * Shows personalized guidance and clear CTAs based on affordability
 */
export function ActionRecommendations({ result, cityName, stateAbbr }: ActionRecommendationsProps) {
  const {
    canAffordMedian,
    affordableHomePrice,
    medianHomeValue,
    income,
    monthlyPayment,
    percentOfHomesAffordable,
  } = result;

  // Generate price range for listings
  const budgetPrice = Math.round(affordableHomePrice * 0.7);
  const stretchPrice = Math.round(affordableHomePrice * 1.3);

  // Format helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (canAffordMedian && percentOfHomesAffordable >= 70) {
    // Great news - can afford most homes
    return (
      <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              🎉 Great News! You Can Afford {cityName}
            </h4>
            <p className="text-gray-700 mb-4">
              With your income of <strong>{formatCurrency(income)}/year</strong>, you can afford{' '}
              <strong>{Math.round(percentOfHomesAffordable)}%</strong> of homes in {cityName}. The median home is well within your budget!
            </p>

            {/* Clear next steps */}
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="font-semibold text-gray-900 mb-2">💡 Next Steps:</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>1. Browse homes in your price range below</p>
                  <p>2. Get pre-approved for a mortgage to strengthen your offer</p>
                  <p>3. Consider neighborhoods that match your lifestyle</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.zillow.com/${cityName.toLowerCase()}-${stateAbbr.toLowerCase()}/?price=${budgetPrice}-${stretchPrice}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h3a1 1 0 001-1V10z" />
                  </svg>
                  View Homes {formatCurrency(budgetPrice)}-{formatCurrency(stretchPrice)}
                </a>
                <Link
                  href="/compare"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare Cities
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (canAffordMedian && percentOfHomesAffordable >= 50) {
    // Good news - can afford median but tight
    return (
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              👍 Good News - Within Reach!
            </h4>
            <p className="text-gray-700 mb-4">
              With your income of <strong>{formatCurrency(income)}/year</strong>, you can afford{' '}
              <strong>{Math.round(percentOfHomesAffordable)}%</strong> of homes in {cityName}. The median home is within your budget!
            </p>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="font-semibold text-gray-900 mb-2">💡 Next Steps:</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>1. Focus on homes at or below {formatCurrency(medianHomeValue)}</p>
                  <p>2. Consider a larger down payment to lower monthly costs</p>
                  <p>3. Browse listings filtered to your budget</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.zillow.com/${cityName.toLowerCase()}-${stateAbbr.toLowerCase()}/?price=${budgetPrice}-${medianHomeValue}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h3a1 1 0 001-1V10z" />
                  </svg>
                  View Homes Up To {formatCurrency(medianHomeValue)}
                </a>
                <Link
                  href={`/saved-locations`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save & Compare
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canAffordMedian) {
    // Stretch budget - can't afford median
    const shortfall = medianHomeValue - affordableHomePrice;
    const shortfallPercent = Math.round((shortfall / medianHomeValue) * 100);

    return (
      <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.932-3L13.932 4c-.776-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.932 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              ⚠️ Stretch Budget - Consider Your Options
            </h4>
            <p className="text-gray-700 mb-4">
              The median home in {cityName} ({formatCurrency(medianHomeValue)}) is{' '}
              <strong>{shortfallPercent}%</strong> above your comfortable budget of {formatCurrency(affordableHomePrice)}.
            </p>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="font-semibold text-gray-900 mb-2">💡 Options:</div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>1. <strong>Browse budget-friendly homes</strong> under {formatCurrency(affordableHomePrice)}</p>
                  <p>2. <strong>Compare nearby cities</strong> with better affordability</p>
                  <p>3. <strong>Increase your down payment</strong> to {formatCurrency(shortfall * 0.2)} (20%) or more</p>
                  <p>4. <strong>Wait and save</strong> - build more equity for a larger down payment</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.zillow.com/${cityName.toLowerCase()}-${stateAbbr.toLowerCase()}/?price=0-${affordableHomePrice}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 001 1h3a1 1 0 001-1V10z" />
                  </svg>
                  View Homes Under {formatCurrency(affordableHomePrice)}
                </a>
                <Link
                  href="/rankings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare Areas
                </Link>
              </div>

              <div className="mt-3 text-xs text-gray-600 italic">
                Consider saving for a larger down payment or looking at nearby cities with better affordability.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - should not reach here
  return null;
}
