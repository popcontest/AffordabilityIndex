'use client';

import { useMemo } from 'react';

interface ExampleListingsProps {
  cityName: string;
  stateAbbr: string;
  medianHomeValue: number;
  userAffordability?: number | null; // Optional: user's affordable price from calculator
}

/**
 * ExampleListings - Smart links to real estate listings with price filtering
 * Generates price range links based on median home value or user's affordability
 */
export function ExampleListings({
  cityName,
  stateAbbr,
  medianHomeValue,
  userAffordability
}: ExampleListingsProps) {
  // Generate price range links
  const priceRanges = useMemo(() => {
    const basePrice = userAffordability || medianHomeValue;

    return {
      budget: Math.round(basePrice * 0.7), // 30% below base
      affordable: Math.round(basePrice * 1.0), // At base
      stretch: Math.round(basePrice * 1.3), // 30% above base
    };
  }, [medianHomeValue, userAffordability]);

  // Format price ranges for display
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${Math.round(price / 1000)}k`;
  };

  // Generate Zillow URL with price filter
  const getZillowUrl = (minPrice?: number, maxPrice?: number) => {
    const baseUrl = `https://www.zillow.com/${cityName.toLowerCase()}-${stateAbbr.toLowerCase()}/`;
    const params = new URLSearchParams();
    if (minPrice) params.append('price', `${minPrice}-${maxPrice || ''}`);
    if (maxPrice && !minPrice) params.append('price', `0-${maxPrice}`);
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  // Generate Redfin URL
  const getRedfinUrl = () => {
    return `https://www.redfin.com/city/${Math.random() > 0.5 ? stateAbbr.toLowerCase() : stateAbbr}/${cityName.toLowerCase()}`;
  };

  return (
    <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to House Hunt?</h3>
      <p className="text-sm text-gray-700 mb-4">
        Browse actual homes for sale in <strong>{cityName}, {stateAbbr}</strong>.
        {userAffordability ? (
          <>
            {" "}Based on your budget, look for homes around <strong>{formatPrice(userAffordability)}</strong>.
          </>
        ) : (
          <>
            {" "}Based on the median home value of <strong>${(medianHomeValue / 1000).toFixed(0)}k</strong>,
            most homes are priced between <strong>{formatPrice(priceRanges.budget)}-${formatPrice(priceRanges.stretch)}</strong>.
          </>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Budget Option */}
        <a
          href={getZillowUrl(undefined, priceRanges.budget)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-col items-center justify-center gap-1 px-4 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all shadow-sm text-center"
        >
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Under {formatPrice(priceRanges.budget)}</span>
          <span className="text-xs text-gray-500 font-normal">Budget</span>
        </a>

        {/* Affordable Option */}
        <a
          href={getZillowUrl(priceRanges.budget, priceRanges.stretch)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-col items-center justify-center gap-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md text-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-sm">{formatPrice(priceRanges.budget)}-{formatPrice(priceRanges.stretch)}</span>
          <span className="text-xs text-blue-100 font-normal">Affordable</span>
        </a>

        {/* All Listings (Redfin) */}
        <a
          href={getRedfinUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-col items-center justify-center gap-1 px-4 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-red-400 hover:text-red-700 hover:bg-red-50 transition-all shadow-sm text-center"
        >
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm">Browse All</span>
          <span className="text-xs text-gray-500 font-normal">via Redfin</span>
        </a>
      </div>

      {/* Budget Tip */}
      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
        <p className="text-sm text-gray-600">
          <strong>💡 Tip:</strong> Use the calculator above to find your budget.
          If you can afford <strong>${Math.round(medianHomeValue * 0.012).toLocaleString()}/month</strong>,
          look for homes around <strong>{formatPrice(medianHomeValue)}</strong>.
        </p>
      </div>

      {/* External Link Notice */}
      <p className="mt-3 text-xs text-gray-500 text-center">
        Opens in new window • Data provided by Zillow and Redfin
      </p>
    </div>
  );
}
