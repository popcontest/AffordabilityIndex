import { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { getTownsAffordable, getTownsExpensive } from '@/lib/data';
import { formatCurrency, formatRatio } from '@/lib/viewModels';
import { stateFromAbbr } from '@/lib/usStates';
import { SproutIcon } from '@/components/icons/SproutIcon';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/rankings/towns/');

  return {
    title: 'Town Rankings - Top 100 Most & Least Affordable Towns',
    description:
      'Explore affordability rankings for small US towns with populations under 10,000. Compare the top 100 most and least affordable towns nationwide.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'Town Rankings - Top 100 Most & Least Affordable Towns | Affordability Index',
      description:
        'Comprehensive rankings of small towns by home affordability. Discover tight-knit communities where housing remains accessible.',
      url,
    },
  };
}

export default async function TownsRankingPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Rankings', url: canonical('/rankings/') },
    { name: 'Towns', url: canonical('/rankings/towns/') },
  ];

  const [mostAffordable, leastAffordable] = await Promise.all([
    getTownsAffordable(100),
    getTownsExpensive(100),
  ]);

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Hero Section */}
      <div className="bg-ai-surface border-b border-ai-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-ai-warm-subtle border border-ai-warm-light mb-6">
              <SproutIcon className="w-5 h-5 mr-2 text-ai-warm" />
              <span className="font-semibold text-ai-warm">Towns</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1]">
              Town <span className="text-ai-warm">Rankings</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 font-light leading-relaxed">
              Explore <span className="font-medium text-gray-900">tight-knit communities</span> with
              populations under 10,000
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
                  Under 10K
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Population Threshold</div>
                <div className="text-xs text-ai-text-subtle">Small towns</div>
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
              Small-Town Living, Big-Time Value
            </h2>
            <div className="text-ai-text-secondary space-y-4">
              <p>
                Towns with populations under 10,000 represent America's smallest incorporated communities. These
                close-knit places often feature historic Main Streets, strong community bonds, slower-paced lifestyles,
                and—in many cases—exceptional housing affordability. Whether you're seeking a peaceful retirement
                destination, a family-friendly environment, or remote work flexibility, small towns offer unique
                advantages.
              </p>
              <p>
                While towns may lack the amenities of larger cities, they often compensate with lower costs of living,
                shorter commutes, access to natural beauty, and genuine community connection. For those willing to
                trade urban conveniences for tranquility and value, small towns can be an ideal fit.
              </p>
              <p>
                Our rankings highlight the top 100 most and least affordable towns nationwide. The affordability ratio
                (median home value ÷ median household income) reveals where housing remains most accessible. Many
                towns feature ratios well below 4.0, indicating homes that cost less than four times the annual
                household income—a benchmark increasingly rare in larger metros.
              </p>
              <p className="text-sm bg-ai-surface border border-ai-border rounded-[var(--ai-radius-md)] p-4">
                <strong>Want more urban options?</strong> Browse our{' '}
                <Link href="/rankings/large-cities/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  large cities
                </Link>,{' '}
                <Link href="/rankings/mid-size-cities/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  mid-size cities
                </Link>, or{' '}
                <Link href="/rankings/small-cities/" className="font-semibold text-ai-warm hover:text-ai-warm-hover underline">
                  small cities
                </Link>{' '}
                rankings for larger communities.
              </p>
            </div>
          </section>

          {/* Two-Column Rankings Table */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Top 100 Most & Least Affordable Towns
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Most Affordable Column */}
              <div className="bg-white border-2 border-green-200 rounded-[var(--ai-radius-lg)] overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 px-6 py-4">
                  <h3 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                    <span className="text-2xl">✓</span> Most Affordable
                  </h3>
                  <p className="text-sm text-green-700 mt-1">Towns with the best value ratios</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Town
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
                      {mostAffordable.map((town, index) => (
                        <tr key={`${town.cityId}`} className="hover:bg-green-50 transition">
                          <td className="px-4 py-3 text-sm font-bold text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/${stateFromAbbr(town.stateAbbr)?.slug || town.stateAbbr.toLowerCase()}/${town.slug}/`}
                              className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                            >
                              {town.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600">
                            {town.stateAbbr}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {town.population?.toLocaleString() || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-green-700">
                              {town.metrics?.ratio ? formatRatio(town.metrics.ratio) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {town.metrics?.homeValue ? formatCurrency(town.metrics.homeValue) : '—'}
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
                  <p className="text-sm text-red-700 mt-1">Towns with the highest cost burden</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Town
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
                      {leastAffordable.map((town, index) => (
                        <tr key={`${town.cityId}`} className="hover:bg-red-50 transition">
                          <td className="px-4 py-3 text-sm font-bold text-gray-700">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/${stateFromAbbr(town.stateAbbr)?.slug || town.stateAbbr.toLowerCase()}/${town.slug}/`}
                              className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                            >
                              {town.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600">
                            {town.stateAbbr}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {town.population?.toLocaleString() || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-red-700">
                              {town.metrics?.ratio ? formatRatio(town.metrics.ratio) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-600">
                            {town.metrics?.homeValue ? formatCurrency(town.metrics.homeValue) : '—'}
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
              indicate more affordable towns where homes cost less relative to what residents earn.
            </p>
            <ul className="text-sm text-ai-text-secondary space-y-1 list-disc list-inside mb-3">
              <li><strong>Towns:</strong> Population under 10,000</li>
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
