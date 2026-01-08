import { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { SearchBox } from '@/components/SearchBox';
import { getAllStatesRanked } from '@/lib/data';
import { getLargeCitiesAffordable, getMidSizeCitiesAffordable, getTownsAffordable } from '@/lib/data';
import { formatCurrency } from '@/lib/viewModels';
import { stateFromAbbr } from '@/lib/usStates';

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

  // Fetch top 20 most affordable from each category
  const [stateRankings, largeCities, midSizeCities, towns] = await Promise.all([
    getAllStatesRanked(),
    getLargeCitiesAffordable(20),
    getMidSizeCitiesAffordable(20),
    getTownsAffordable(20),
  ]);

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Hero Section - Search First */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4 tracking-tight">
              Find Your <span className="text-blue-600">Affordable</span> Place
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto font-light">
              Search any city, state, or ZIP code to see affordability rankings
            </p>
          </div>

          {/* Prominent Search Box */}
          <div className="max-w-2xl mx-auto">
            <SearchBox />
            <p className="text-sm text-gray-500 text-center mt-3">
              Try: "Austin, TX" or "90210" or "California"
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Understanding Scores Section */}
          <section className="mb-12">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Understanding Affordability Scores (0-100)
              </h2>
              <p className="text-center text-gray-700 mb-6 max-w-3xl mx-auto">
                Our scores range from 0-100 and include <strong>housing, food, healthcare, transportation, taxes, and quality of life</strong> — not just home prices!
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="bg-white rounded-lg p-4 text-center border-2 border-green-300">
                  <div className="text-3xl font-bold text-green-600 mb-1">80-100</div>
                  <div className="text-gray-700 font-medium">Very Affordable</div>
                  <div className="text-xs text-gray-500 mt-1">Top 20% in US</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border-2 border-lime-300">
                  <div className="text-3xl font-bold text-lime-600 mb-1">60-79</div>
                  <div className="text-gray-700 font-medium">Affordable</div>
                  <div className="text-xs text-gray-500 mt-1">Above average</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border-2 border-yellow-300">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">40-59</div>
                  <div className="text-gray-700 font-medium">Moderate</div>
                  <div className="text-xs text-gray-500 mt-1">About average</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border-2 border-orange-300">
                  <div className="text-3xl font-bold text-orange-600 mb-1">20-39</div>
                  <div className="text-gray-700 font-medium">Expensive</div>
                  <div className="text-xs text-gray-500 mt-1">Below average</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border-2 border-red-300 col-span-2 md:col-span-1">
                  <div className="text-3xl font-bold text-red-600 mb-1">0-19</div>
                  <div className="text-gray-700 font-medium">Very Expensive</div>
                  <div className="text-xs text-gray-500 mt-1">Bottom 20% in US</div>
                </div>
              </div>
            </div>
          </section>

          {/* States Rankings */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">State Rankings</h2>
                <p className="text-gray-600 mt-1">All 50 states plus DC ranked by affordability</p>
              </div>
              <Link
                href="/rankings/states"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                View all states →
              </Link>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">State</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Score (0-100)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Home Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stateRankings.slice(0, 10).map((state, index) => (
                    <tr key={state.stateAbbr} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-bold text-gray-700">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${stateFromAbbr(state.stateAbbr)?.slug || state.stateAbbr.toLowerCase()}/`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition"
                        >
                          {state.stateName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                          {Math.round(100 - state.medianRatio)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {state.medianHomeValue ? formatCurrency(state.medianHomeValue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Large Cities Rankings */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Large Cities</h2>
                <p className="text-gray-600 mt-1">Cities with 100K+ population</p>
              </div>
              <Link
                href="/rankings/large-cities"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                View all large cities →
              </Link>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Score (0-100)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Population</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {largeCities.map((city, index) => (
                    <tr key={city.cityId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-bold text-gray-700">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${stateFromAbbr(city.stateAbbr)?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition"
                        >
                          {city.name}, {city.stateAbbr}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                          {Math.round(city.metrics?.affordabilityPercentile || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {city.population ? city.population.toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mid-Size Cities Rankings */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Mid-Size Cities</h2>
                <p className="text-gray-600 mt-1">Cities with 50K-100K population</p>
              </div>
              <Link
                href="/rankings/mid-size-cities"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                View all mid-size cities →
              </Link>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Score (0-100)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Population</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {midSizeCities.map((city, index) => (
                    <tr key={city.cityId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-bold text-gray-700">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${stateFromAbbr(city.stateAbbr)?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition"
                        >
                          {city.name}, {city.stateAbbr}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                          {Math.round(city.metrics?.affordabilityPercentile || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {city.population ? city.population.toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Towns Rankings */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Small Towns</h2>
                <p className="text-gray-600 mt-1">Towns under 50K population</p>
              </div>
              <Link
                href="/rankings/towns"
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                View all towns →
              </Link>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Town</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Score (0-100)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Population</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {towns.map((city, index) => (
                    <tr key={city.cityId} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-bold text-gray-700">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/${stateFromAbbr(city.stateAbbr)?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition"
                        >
                          {city.name}, {city.stateAbbr}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800">
                          {Math.round(city.metrics?.affordabilityPercentile || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {city.population ? city.population.toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Methodology Note */}
          <section className="max-w-4xl mx-auto">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How Our Composite Score Works
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                <p className="mb-3">
                  Our <strong>Affordability Score (0-100)</strong> is a composite percentile that combines multiple factors:
                </p>
                <ul className="mb-3 space-y-1">
                  <li><strong>Housing (60%):</strong> Monthly housing payment vs income (includes mortgage, taxes, insurance)</li>
                  <li><strong>Essentials (25%):</strong> Food, healthcare, transportation costs relative to income</li>
                  <li><strong>Taxes (10%):</strong> Income and sales tax burden</li>
                  <li><strong>Quality of Life (5%):</strong> Safety, schools, walkability</li>
                </ul>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Higher scores = more affordable.</strong> A score of 80 means more affordable than 80% of US locations.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Data Sources:</strong> Zillow (home values), Census ACS (income, demographics), C2ER (cost of living),
                  and government tax databases. Updated monthly.
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
