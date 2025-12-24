import { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { getMidSizeCitiesAffordable, getMidSizeCitiesExpensive } from '@/lib/data';
import { formatCurrency, formatRatio } from '@/lib/viewModels';
import { stateFromAbbr } from '@/lib/usStates';
import { SmallCityIcon } from '@/components/icons/SmallCityIcon';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/rankings/mid-size-cities/');

  return {
    title: 'Mid-Size City Rankings - Top 100 Most & Least Affordable Cities',
    description:
      'Explore affordability rankings for mid-size US cities with populations between 25,000 and 49,999. Compare the top 100 most and least affordable mid-size cities.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'Mid-Size City Rankings - Top 100 Most & Least Affordable | Affordability Index',
      description:
        'Comprehensive rankings of mid-size US cities by home affordability. Find the sweet spot between urban amenities and small-town value.',
      url,
    },
  };
}

export default async function MidSizeCitiesRankingPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Rankings', url: canonical('/rankings/') },
    { name: 'Mid-Size Cities', url: canonical('/rankings/mid-size-cities/') },
  ];

  const [mostAffordable, leastAffordable] = await Promise.all([
    getMidSizeCitiesAffordable(100),
    getMidSizeCitiesExpensive(100),
  ]);

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Hero Section */}
      <div className="bg-ai-surface border-b border-ai-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-ai-warm-subtle border border-ai-warm-light mb-6">
              <SmallCityIcon className="w-5 h-5 mr-2 text-ai-warm" />
              <span className="font-semibold text-ai-warm">Mid-Size Cities</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1]">
              Mid-Size City <span className="text-ai-warm">Rankings</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 font-light leading-relaxed">
              The <span className="font-medium text-gray-900">sweet spot</span> between big city amenities and small-town
              affordability (populations 25,000-49,999)
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-positive mb-1">
                  {mostAffordable[0]?.metrics?.ratio ? formatRatio(mostAffordable[0].metrics.ratio) : '—'}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Best Ratio</div>
                <div className="text-xs text-ai-text-subtle">
                  {mostAffordable[0]?.name}, {mostAffordable[0]?.stateAbbr}
                </div>
              </div>

              <div className="bg-ai-bg border border-ai-warm-light rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-warm mb-1">
                  25K-50K
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Population Range</div>
                <div className="text-xs text-ai-text-subtle">Mid-size cities</div>
              </div>

              <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-negative mb-1">
                  {leastAffordable[0]?.metrics?.ratio ? formatRatio(leastAffordable[0].metrics.ratio) : '—'}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Highest Ratio</div>
                <div className="text-xs text-ai-text-subtle">
                  {leastAffordable[0]?.name}, {leastAffordable[0]?.stateAbbr}
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
              The Best of Both Worlds
            </h2>
            <div className="text-ai-text-secondary space-y-4">
              <p>
                Mid-size cities (populations 25,000-49,999) often represent the ideal balance for many Americans:
                they're large enough to offer solid employment opportunities, retail variety, and community services,
                yet small enough to maintain a more personal feel and, frequently, better affordability than major
                metro areas.
              </p>
              <p>
                These rankings highlight the top 100 most and least affordable mid-size cities nationwide. Many of
                these communities combine strong local economies with housing markets that haven't experienced the
                extreme price inflation seen in larger cities, making them attractive for families, retirees, and
                remote workers seeking quality of life.
              </p>
              <p>
                The affordability ratio (median home value ÷ median household income) reveals where mid-size cities
                offer the best value. Ratios below 4.0 indicate exceptional affordability, while those above 6.0
                suggest housing costs may strain household budgets.
              </p>
              <p className="text-sm bg-ai-surface border border-ai-border rounded-[var(--ai-radius-md)] p-4">
                <strong>Exploring other city sizes?</strong> Check out our{' '}
                <Link href="/rankings/large-cities/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  large cities
                </Link>,{' '}
                <Link href="/rankings/small-cities/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  small cities
                </Link>, or{' '}
                <Link href="/rankings/towns/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  town rankings
                </Link>{' '}
                for different population ranges.
              </p>
            </div>
          </section>

          {/* Two-Column Rankings Table */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Top 100 Most & Least Affordable Mid-Size Cities
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Most Affordable Column */}
              <div className="bg-white border-2 border-green-200 rounded-[var(--ai-radius-lg)] overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 px-6 py-4">
                  <h3 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                    <span className="text-2xl">✓</span> Most Affordable
                  </h3>
                  <p className="text-sm text-green-700 mt-1">Cities with the best value ratios</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          State
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Population
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
                      {mostAffordable.map((city, index) => (
                        <tr key={`${city.cityId}`} className="hover:bg-green-50 transition">
                          <td className="px-4 py-3 text-sm font-bold text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/${stateFromAbbr(city.stateAbbr)?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                              className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                            >
                              {city.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600">
                            {city.stateAbbr}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {city.population?.toLocaleString() || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-green-700">
                              {city.metrics?.ratio ? formatRatio(city.metrics.ratio) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {city.metrics?.homeValue ? formatCurrency(city.metrics.homeValue) : '—'}
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
                    <span className="text-2xl">!</span> Least Affordable
                  </h3>
                  <p className="text-sm text-red-700 mt-1">Cities with the highest cost burden</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          City
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          State
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Population
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
                      {leastAffordable.map((city, index) => (
                        <tr key={`${city.cityId}`} className="hover:bg-red-50 transition">
                          <td className="px-4 py-3 text-sm font-bold text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/${stateFromAbbr(city.stateAbbr)?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                              className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                            >
                              {city.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600">
                            {city.stateAbbr}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {city.population?.toLocaleString() || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-red-700">
                              {city.metrics?.ratio ? formatRatio(city.metrics.ratio) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {city.metrics?.homeValue ? formatCurrency(city.metrics.homeValue) : '—'}
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
                How Rankings Are <span className="text-ai-warm">Calculated</span>
              </h3>
            </div>
            <p className="text-ai-text-secondary mb-3">
              Rankings are based on the affordability ratio (median home value ÷ median household income). Lower ratios
              indicate more affordable cities where homes cost less relative to what residents earn.
            </p>
            <ul className="text-sm text-ai-text-secondary space-y-1 list-disc list-inside mb-3">
              <li><strong>Mid-Size Cities:</strong> Population between 25,000 and 49,999</li>
              <li><strong>Very Affordable:</strong> Ratio below 4.0 (homes cost less than 4× annual income)</li>
              <li><strong>Moderate:</strong> Ratio between 4.0-6.0</li>
              <li><strong>Expensive:</strong> Ratio above 6.0 (homes cost more than 6× annual income)</li>
            </ul>
            <p className="text-sm text-ai-text-secondary">
              See our{' '}
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
