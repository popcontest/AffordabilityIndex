import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { canonical } from '@/lib/seo';
import { SearchBox } from '@/components/SearchBox';
import { CompareView } from '@/components/CompareView';

export const metadata: Metadata = {
  title: 'Compare Cities | Affordability Index',
  description: 'Compare home affordability across multiple cities and ZIP codes. See side-by-side metrics for home values, income, and affordability ratios.',
  alternates: {
    canonical: canonical('/compare/'),
  },
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-blue-100 hover:text-white text-sm font-medium transition">
              ← Back to Home
            </Link>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">
            Compare Cities & ZIP Codes
          </h1>
          <p className="text-lg text-blue-100 max-w-3xl">
            Compare affordability side-by-side and find the best place for your budget
          </p>
        </div>
      </div>

      {/* Comparison Results */}
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      }>
        <CompareView />
      </Suspense>

      {/* Search and Empty State Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add Locations to Compare
          </h2>
          <div className="max-w-2xl">
            <SearchBox />
          </div>
          <p className="text-sm text-gray-500 mt-4">
            💡 Tip: Click on a search result to add it to your comparison. You can compare up to 3 locations.
          </p>
        </div>

        {/* Empty State - Only shown when no locations */}
        <div className="mt-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No locations selected yet
          </h3>
          <p className="text-gray-600 mb-6">
            Search for cities or ZIP codes above to start comparing
          </p>

          {/* Popular comparisons */}
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Try these popular comparisons:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                href="/compare?locations=austin,portland,denver"
                className="px-4 py-3 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 text-blue-800 rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all text-center"
              >
                Austin vs Portland vs Denver
              </Link>
              <Link
                href="/compare?locations=04101,78701,80202"
                className="px-4 py-3 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 text-purple-800 rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all text-center"
              >
                ZIPs: Maine, Texas, Colorado
              </Link>
              <Link
                href="/compare?locations=miami,seattle,boston"
                className="px-4 py-3 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 text-green-800 rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all text-center"
              >
                Miami vs Seattle vs Boston
              </Link>
            </div>
          </div>
        </div>

        {/* How to Use */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How to compare locations
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                  1
                </span>
                <h4 className="font-medium text-gray-900">Search</h4>
              </div>
              <p className="text-sm text-gray-600 ml-10">
                Use the search box to find cities or ZIP codes
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                  2
                </span>
                <h4 className="font-medium text-gray-900">Select</h4>
              </div>
              <p className="text-sm text-gray-600 ml-10">
                Click on search results to add them to your comparison (max 3)
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                  3
                </span>
                <h4 className="font-medium text-gray-900">Compare</h4>
              </div>
              <p className="text-sm text-gray-600 ml-10">
                View side-by-side metrics and charts to find the best fit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
