import { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { SearchBox } from '@/components/SearchBox';
import { BloomIcon } from '@/components/icons';
import { formatRatio } from '@/lib/viewModels';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/rankings/');

  return {
    title: 'Affordability Rankings: Compare States, Cities & Towns',
    description: 'Find the most affordable places to live. Search by location or browse rankings by state and city size.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'Affordability Rankings | Affordability Index',
      description: 'Discover the most and least affordable places across America with our comprehensive rankings.',
      url,
    },
  };
}

export default async function RankingsPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Rankings', url: canonical('/rankings/') },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Hero Section - Search First */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4 tracking-tight">
              Find Your <span className="text-blue-600">Affordable</span> Place
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto font-light">
              Search any city, state, or ZIP code to see affordability rankings
            </p>
          </div>

          {/* Prominent Search Box */}
          <div className="max-w-2xl mx-auto mb-12">
            <SearchBox />
            <p className="text-sm text-gray-500 text-center mt-3">
              Try: "Austin, TX" or "90210" or "California"
            </p>
          </div>

          {/* Quick Understanding of Ratios */}
          <div className="bg-white rounded-xl border-2 border-blue-200 p-6 max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-3 text-center">
              Understanding Affordability Ratios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3">
                <div className="text-2xl font-bold text-green-600 mb-1">1-3</div>
                <div className="text-gray-700 font-medium mb-1">Very Affordable</div>
                <div className="text-gray-500">Homes cost 1-3× income</div>
              </div>
              <div className="text-center p-3">
                <div className="text-2xl font-bold text-yellow-600 mb-1">4-6</div>
                <div className="text-gray-700 font-medium mb-1">Moderate</div>
                <div className="text-gray-500">Homes cost 4-6× income</div>
              </div>
              <div className="text-center p-3">
                <div className="text-2xl font-bold text-red-600 mb-1">7+</div>
                <div className="text-gray-700 font-medium mb-1">Challenging</div>
                <div className="text-gray-500">Homes cost 7×+ income</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              Lower ratio = more affordable. This compares median home value to median household income.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Browse by Category - Simplified to 4 options */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Browse Rankings by Category
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Explore the most and least affordable places in each category
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* States */}
              <Link
                href="/rankings/states"
                className="group block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-6 transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 1.31z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                      States
                    </h3>
                    <p className="text-sm text-gray-500">All 50 states ranked</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Most affordable</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17l8-8m0 0V9m0 0l-8 8-4-4-6 6" />
                    </svg>
                    <span>Least affordable</span>
                  </div>
                </div>
              </Link>

              {/* Large Cities */}
              <Link
                href="/rankings/large-cities"
                className="group block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-6 transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5-10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                      Large Cities
                    </h3>
                    <p className="text-sm text-gray-500">500K+ population</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Most affordable</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17l8-8m0 0V9m0 0l-8 8-4-4-6 6" />
                    </svg>
                    <span>Least affordable</span>
                  </div>
                </div>
              </Link>

              {/* Mid-Size Cities */}
              <Link
                href="/rankings/mid-size-cities"
                className="group block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-6 transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11v4m-4-4v4m-4 4h8M5 3h2a2 2 0 002-2V3a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                      Mid-Size Cities
                    </h3>
                    <p className="text-sm text-gray-500">50K-500K population</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Includes suburban areas and smaller metros
                </p>
              </Link>

              {/* Towns */}
              <Link
                href="/rankings/towns"
                className="group block bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-6 transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                      Small Towns
                    </h3>
                    <p className="text-sm text-gray-500">Under 50K population</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Small cities and rural communities
                </p>
              </Link>
            </div>
          </section>

          {/* How It Works - Moved Up */}
          <section className="max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How Our Rankings Work
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                <p className="mb-3">
                  <strong>Affordability Ratio</strong> = Median Home Value ÷ Median Household Income
                </p>
                <p className="mb-3">
                  A ratio of <strong>3.0</strong> means the typical home costs <strong>3× the annual income</strong>.
                  Lower ratios indicate better affordability.
                </p>
                <div className="bg-white rounded-lg p-4 border border-blue-200 mb-3">
                  <p className="text-sm text-gray-600">
                    <strong>Example:</strong> In Cleveland, OH (ratio 1.8), a $50K income can afford a $90K home.
                    In San Francisco, CA (ratio 10.0), that same $50K income faces a $500K home.
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>What's included:</strong> Home values from Zillow, income from Census Bureau ACS data.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>What's not included:</strong> Property taxes, insurance, interest rates, or personal financial situation.
                  This is for geographic comparison, not mortgage qualification.
                </p>
              </div>
              <div className="mt-4 text-center">
                <Link
                  href="/methodology/"
                  className="inline-block text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Read full methodology →
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
