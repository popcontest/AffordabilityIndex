'use client';

import Link from 'next/link';

interface QuickActionsProps {
  cityName: string;
  stateAbbr: string;
  calculatorSectionId?: string;
}

/**
 * QuickActions - Prominent action buttons for homebuyers/renters/movers
 * Shows clear next steps: Calculate affordability, Compare locations, View listings
 */
export function QuickActions({ cityName, stateAbbr, calculatorSectionId = 'calculator' }: QuickActionsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Actions</h3>
      <p className="text-sm text-gray-600 mb-4">
        Explore affordability in {cityName}, {stateAbbr}
      </p>
      <div className="flex flex-wrap gap-3">
        {/* Calculator Link */}
        <Link
          href={`#${calculatorSectionId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Calculate Your Affordability
        </Link>

        {/* Compare Link */}
        <Link
          href="/saved-locations"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Saved Locations
        </Link>

        {/* Rankings Link */}
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          View Rankings
        </Link>
      </div>
    </div>
  );
}
