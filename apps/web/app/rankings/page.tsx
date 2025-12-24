import { Metadata } from 'next';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import {
  getNationalLargeCitiesAffordable,
  getNationalLargeCitiesExpensive,
  getNationalCitiesAffordable,
  getNationalCitiesExpensive,
  getNationalSmallCitiesAffordable,
  getNationalSmallCitiesExpensive,
  getNationalTownsAffordable,
  getNationalTownsExpensive,
  getAllStatesRanked
} from '@/lib/data';
import { formatRatio } from '@/lib/viewModels';
import { stateFromAbbr } from '@/lib/usStates';
import { RankingPreviewTable } from '@/components/RankingPreviewTable';
import { BloomIcon } from '@/components/icons';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/rankings/');

  return {
    title: 'Rankings',
    description:
      'Explore affordability rankings across US states, cities, and ZIP codes. Find the most and least affordable places to live.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'Rankings | Affordability Index',
      description:
        'Browse comprehensive affordability rankings for US states, cities, towns, and ZIP codes.',
      url,
    },
  };
}

export default async function RankingsPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Rankings', url: canonical('/rankings/') },
  ];

  // Fetch all rankings data in parallel (top 10 for previews)
  const [
    statesRanked,
    largeCitiesAffordable,
    largeCitiesExpensive,
    midCitiesAffordable,
    midCitiesExpensive,
    smallCitiesAffordable,
    smallCitiesExpensive,
    townsAffordable,
    townsExpensive,
  ] = await Promise.all([
    getAllStatesRanked(),
    getNationalLargeCitiesAffordable(10),
    getNationalLargeCitiesExpensive(10),
    getNationalCitiesAffordable(10),
    getNationalCitiesExpensive(10),
    getNationalSmallCitiesAffordable(10),
    getNationalSmallCitiesExpensive(10),
    getNationalTownsAffordable(10),
    getNationalTownsExpensive(10),
  ]);

  // Get top affordable and expensive states
  const statesMostAffordable = statesRanked.slice(0, 10);
  const statesLeastAffordable = statesRanked.slice(-10).reverse();

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Hero Section */}
      <div className="bg-ai-surface border-b border-ai-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-ai-warm-subtle border border-ai-warm-light mb-6">
              <BloomIcon className="w-5 h-5 mr-2 text-ai-warm" />
              <span className="font-semibold text-ai-warm">National Rankings</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1]">
              Affordability <span className="text-ai-warm">Rankings</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 font-light leading-relaxed">
              Explore the most and least affordable places across <span className="font-medium text-gray-900">states</span>, <span className="font-medium text-gray-900">cities</span>, and <span className="font-medium text-gray-900">towns</span>
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-positive mb-1">
                  {largeCitiesAffordable[0]?.metrics?.ratio ? formatRatio(largeCitiesAffordable[0].metrics.ratio) : '—'}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Best Large City</div>
                <div className="text-xs text-ai-text-subtle">
                  {largeCitiesAffordable[0]?.name}, {largeCitiesAffordable[0]?.stateAbbr}
                </div>
              </div>

              <div className="bg-ai-bg border border-ai-warm-light rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-warm mb-1">
                  {statesRanked.length}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">States Ranked</div>
                <div className="text-xs text-ai-text-subtle">Plus cities and towns</div>
              </div>

              <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-md)] p-6">
                <div className="text-3xl font-bold text-ai-negative mb-1">
                  {largeCitiesExpensive[0]?.metrics?.ratio ? formatRatio(largeCitiesExpensive[0].metrics.ratio) : '—'}
                </div>
                <div className="text-ai-text-muted text-sm font-medium mb-1">Costliest Large City</div>
                <div className="text-xs text-ai-text-subtle">
                  {largeCitiesExpensive[0]?.name}, {largeCitiesExpensive[0]?.stateAbbr}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-ai-bg">
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          {/* Preview Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
            {/* States - Most Affordable */}
            <RankingPreviewTable
              title="Most Affordable States"
              items={statesMostAffordable}
              viewAllLink="/rankings/states"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/`}
              showState={false}
            />

            {/* States - Least Affordable */}
            <RankingPreviewTable
              title="Least Affordable States"
              items={statesLeastAffordable}
              viewAllLink="/rankings/states"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/`}
              showState={false}
            />

            {/* Large Cities - Most Affordable */}
            <RankingPreviewTable
              title="Most Affordable Large Cities (500K+)"
              items={largeCitiesAffordable}
              viewAllLink="/rankings/large-cities"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Large Cities - Least Affordable */}
            <RankingPreviewTable
              title="Least Affordable Large Cities (500K+)"
              items={largeCitiesExpensive}
              viewAllLink="/rankings/large-cities"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Mid-Size Cities - Most Affordable */}
            <RankingPreviewTable
              title="Most Affordable Mid-Size Cities (50K-500K)"
              items={midCitiesAffordable}
              viewAllLink="/rankings/mid-cities"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Mid-Size Cities - Least Affordable */}
            <RankingPreviewTable
              title="Least Affordable Mid-Size Cities (50K-500K)"
              items={midCitiesExpensive}
              viewAllLink="/rankings/mid-cities"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Small Cities - Most Affordable */}
            <RankingPreviewTable
              title="Most Affordable Small Cities (10K-50K)"
              items={smallCitiesAffordable}
              viewAllLink="/rankings/small-cities"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Small Cities - Least Affordable */}
            <RankingPreviewTable
              title="Least Affordable Small Cities (10K-50K)"
              items={smallCitiesExpensive}
              viewAllLink="/rankings/small-cities"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Towns - Most Affordable */}
            <RankingPreviewTable
              title="Most Affordable Towns (<10K)"
              items={townsAffordable}
              viewAllLink="/rankings/towns"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />

            {/* Towns - Least Affordable */}
            <RankingPreviewTable
              title="Least Affordable Towns (<10K)"
              items={townsExpensive}
              viewAllLink="/rankings/towns"
              getItemLink={(item) => `/${stateFromAbbr(item.stateAbbr!)?.slug || item.stateAbbr!.toLowerCase()}/${item.slug}/`}
            />
          </div>

          {/* Methodology Note */}
          <section className="mt-12 rounded-xl bg-white border-2 border-gray-200 p-8 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-2 h-6 bg-ai-warm rounded-full"></span>
              <h3 className="text-2xl font-bold text-gray-900">
                How Rankings Are <span className="text-ai-warm">Calculated</span>
              </h3>
            </div>
            <p className="text-ai-text-secondary mb-3">
              Rankings are based on the affordability ratio (median home value ÷ median household income). Lower ratios indicate more affordable areas where homes cost less relative to income.
            </p>
            <ul className="text-sm text-ai-text-secondary space-y-1 list-disc list-inside mb-3">
              <li><strong>More Affordable:</strong> Ratio below 4.0 (homes cost less than 4× annual income)</li>
              <li><strong>Moderate:</strong> Ratio between 4.0-6.0</li>
              <li><strong>Less Affordable:</strong> Ratio above 6.0 (homes cost more than 6× annual income)</li>
            </ul>
            <p className="text-sm text-ai-text-secondary bg-ai-surface border border-ai-border rounded-[var(--ai-radius-md)] p-3 mb-3">
              <strong>Population Categories:</strong> Large Cities (500K+), Mid-Size Cities (50K-500K), Small Cities (10K-50K), and Towns (&lt;10K).
              Click "View All" on any table above to see the complete rankings for that category.
            </p>
            <p className="text-sm text-ai-text-secondary">
              See our{' '}
              <Link
                href="/methodology/"
                className="font-semibold text-ai-warm hover:text-ai-warm-hover underline hover:no-underline"
              >
                methodology page
              </Link>{' '}
              for more details on data sources and calculations.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
