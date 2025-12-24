import { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { getAllStatesRanked } from '@/lib/data';
import { formatCurrency, formatRatio } from '@/lib/viewModels';
import { stateFromAbbr } from '@/lib/usStates';
import { FlagIcon } from '@/components/icons/FlagIcon';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/rankings/states/');

  return {
    title: 'State Rankings - All 51 States by Affordability',
    description:
      'Compare home affordability across all 50 US states plus DC. See which states offer the best value with our comprehensive state-by-state affordability rankings.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'State Rankings - All 51 States by Affordability | Affordability Index',
      description:
        'Comprehensive state-by-state rankings showing where homes are most and least affordable relative to income across the United States.',
      url,
    },
  };
}

export default async function StatesRankingPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Rankings', url: canonical('/rankings/') },
    { name: 'States', url: canonical('/rankings/states/') },
  ];

  const stateRankings = await getAllStatesRanked();

  // Split into most and least affordable
  const mostAffordable = stateRankings.slice(0, Math.ceil(stateRankings.length / 2));
  const leastAffordable = stateRankings.slice(Math.ceil(stateRankings.length / 2));

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Hero Section */}
      <div className="bg-ai-surface border-b border-ai-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-ai-warm-subtle border border-ai-warm-light mb-6">
              <FlagIcon className="w-5 h-5 mr-2 text-ai-warm" />
              <span className="font-semibold text-ai-warm">State Rankings</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1]">
              All 51 <span className="text-ai-warm">States</span> Ranked
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 font-light leading-relaxed">
              Discover which states offer the <span className="font-medium text-gray-900">best value</span> for homebuyers
              across all 50 states plus the District of Columbia
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-positive mb-1">
                  {stateRankings[0]?.medianRatio ? formatRatio(stateRankings[0].medianRatio) : '—'}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Best State Ratio</div>
                <div className="text-xs text-ai-text-subtle">
                  {stateRankings[0]?.stateName}
                </div>
              </div>

              <div className="bg-ai-bg border border-ai-warm-light rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-warm mb-1">
                  {stateRankings.length}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">States Compared</div>
                <div className="text-xs text-ai-text-subtle">All 50 states + DC</div>
              </div>

              <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-negative mb-1">
                  {stateRankings[stateRankings.length - 1]?.medianRatio
                    ? formatRatio(stateRankings[stateRankings.length - 1].medianRatio)
                    : '—'}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Highest Ratio</div>
                <div className="text-xs text-ai-text-subtle">
                  {stateRankings[stateRankings.length - 1]?.stateName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-ai-bg">
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Breadcrumb Navigation */}
          <nav className="mb-8 text-sm text-ai-text-muted">
            <ol className="flex items-center gap-2">
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-ai-border">/</span>}
                  {i === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-gray-900">{crumb.name}</span>
                  ) : (
                    <Link href={crumb.url} className="hover:text-ai-warm transition">
                      {crumb.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Introduction */}
          <section className="mb-12 bg-white border border-ai-border rounded-[var(--ai-radius-lg)] p-8 shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              State-by-State Affordability Comparison
            </h2>
            <div className="text-ai-text-secondary space-y-4">
              <p>
                Our state rankings aggregate home affordability data across all cities and towns within each state,
                providing a comprehensive view of housing costs relative to income at the state level. These rankings
                help identify which states consistently offer better value for homebuyers and where housing costs
                may be stretching household budgets.
              </p>
              <p>
                Each state's affordability ratio represents the median home value divided by median household income.
                Lower ratios indicate more affordable states where homes cost less relative to what residents earn.
                A ratio below 4.0 is considered very affordable, while ratios above 6.0 suggest significant
                affordability challenges.
              </p>
              <p className="text-sm bg-ai-surface border border-ai-border rounded-[var(--ai-radius-md)] p-4">
                <strong>Note:</strong> State-level rankings provide a high-level overview, but affordability varies
                significantly within states. For detailed local insights, explore individual{' '}
                <Link href="/rankings/large-cities/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  city rankings
                </Link>{' '}
                or use our{' '}
                <Link href="/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  search tool
                </Link>.
              </p>
            </div>
          </section>

          {/* Two-Column Rankings Table */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Complete State Rankings
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Most Affordable Column */}
              <div className="bg-white border-2 border-green-200 rounded-[var(--ai-radius-lg)] overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 px-6 py-4">
                  <h3 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                    <span className="text-2xl">✓</span> Most Affordable States
                  </h3>
                  <p className="text-sm text-green-700 mt-1">Lower ratios = better value</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          State
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Ratio
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Home Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mostAffordable.map((state, index) => (
                        <tr key={state.stateAbbr} className="hover:bg-green-50 transition">
                          <td className="px-4 py-4 text-sm font-bold text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/${stateFromAbbr(state.stateAbbr)?.slug || state.stateAbbr.toLowerCase()}/`}
                              className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                            >
                              {state.stateName}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-bold text-green-700">
                              {state.medianRatio ? formatRatio(state.medianRatio) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-600">
                            {state.medianHomeValue ? formatCurrency(state.medianHomeValue) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Least Affordable Column */}
              <div className="bg-white border-2 border-red-200 rounded-[var(--ai-radius-lg)] overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200 px-6 py-4">
                  <h3 className="text-2xl font-bold text-red-800 flex items-center gap-2">
                    <span className="text-2xl">!</span> Least Affordable States
                  </h3>
                  <p className="text-sm text-red-700 mt-1">Higher ratios = lower affordability</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          State
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Ratio
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Home Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leastAffordable.map((state, index) => (
                        <tr key={state.stateAbbr} className="hover:bg-red-50 transition">
                          <td className="px-4 py-4 text-sm font-bold text-gray-700">
                            #{mostAffordable.length + index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/${stateFromAbbr(state.stateAbbr)?.slug || state.stateAbbr.toLowerCase()}/`}
                              className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                            >
                              {state.stateName}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-bold text-red-700">
                              {state.medianRatio ? formatRatio(state.medianRatio) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-600">
                            {state.medianHomeValue ? formatCurrency(state.medianHomeValue) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Methodology Note */}
          <section className="mt-12 rounded-xl bg-white border-2 border-gray-200 p-8 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-2 h-6 bg-ai-warm rounded-full"></span>
              <h3 className="text-2xl font-bold text-gray-900">
                How State Rankings Are <span className="text-ai-warm">Calculated</span>
              </h3>
            </div>
            <p className="text-ai-text-secondary mb-3">
              State rankings are based on aggregated data from cities and towns within each state. The affordability
              ratio represents median home value divided by median household income at the state level.
            </p>
            <ul className="text-sm text-ai-text-secondary space-y-1 list-disc list-inside mb-3">
              <li><strong>Very Affordable:</strong> Ratio below 4.0 (homes cost less than 4× annual income)</li>
              <li><strong>Moderate:</strong> Ratio between 4.0-6.0</li>
              <li><strong>Expensive:</strong> Ratio above 6.0 (homes cost more than 6× annual income)</li>
            </ul>
            <p className="text-sm text-ai-text-secondary">
              For more granular insights, explore city-level rankings or individual state pages. See our{' '}
              <Link
                href="/methodology/"
                className="font-semibold text-ai-warm hover:text-ai-warm-hover underline hover:no-underline"
              >
                methodology page
              </Link>{' '}
              for complete details on data sources and calculations.
            </p>
          </section>

          {/* Back to Rankings */}
          <div className="mt-12 text-center">
            <Link
              href="/rankings/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ai-warm text-white font-semibold rounded-lg hover:bg-ai-warm-hover transition shadow-md hover:shadow-lg"
            >
              ← Back to All Rankings
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
