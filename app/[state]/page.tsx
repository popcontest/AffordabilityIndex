import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { stateFromSlug } from '@/lib/usStates';
import { getStateDashboardData, type CityWithMetrics, type ZctaWithMetrics } from '@/lib/data';
import { formatCurrency, formatRatio } from '@/lib/viewModels';
import { clampScore, scoreToGrade, formatScore } from '@/lib/scoring';
import { PercentileBadge } from '@/components/PercentileBadge';
import { PlaceTypeBadge } from '@/components/PlaceTypeBadge';
import { SearchBox } from '@/components/SearchBox';
import { RankingsTable } from '@/components/RankingsTable';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { ChartIcon } from '@/components/icons/ChartIcon';
import { ScaleIcon } from '@/components/icons/ScaleIcon';
import { FlagIcon } from '@/components/icons/FlagIcon';
import { BookIcon } from '@/components/icons/BookIcon';

interface StatePageProps {
  params: Promise<{
    state: string;
  }>;
}

export async function generateMetadata(
  props: StatePageProps
): Promise<Metadata> {
  const params = await props.params;
  const state = stateFromSlug(params.state);

  if (!state) {
    return {
      title: 'State Not Found',
    };
  }

  const url = canonical(`/${state.slug}/`);

  return {
    title: `${state.name} Home Affordability`,
    description: `Explore home affordability in ${state.name}. Compare home values to median household income across cities, towns, and ZIP codes in ${state.abbr}.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${state.name} Home Affordability | Affordability Index`,
      description: `Home affordability data for ${state.name} - median home values, household income, and affordability ratios.`,
      url,
    },
  };
}

// Helper component for rendering ZIP sections
function ZipSectionGrid({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: ZctaWithMetrics[];
  tone: 'affordable' | 'expensive';
}) {
  if (items.length === 0) return null;

  const toneClasses = {
    affordable: {
      card: 'hover:border-blue-300',
      title: 'group-hover:text-blue-600',
      ratio: 'text-green-700',
    },
    expensive: {
      card: 'hover:border-red-300',
      title: 'group-hover:text-red-600',
      ratio: 'text-red-700',
    },
  };

  const classes = toneClasses[tone];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.slice(0, 12).map((zip) => (
            <Link
              key={zip.zcta}
              href={`/zip/${zip.zcta}/`}
              className={`bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg ${classes.card} transition-all duration-200 group hover-lift`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className={`font-semibold text-gray-900 ${classes.title} transition`}>
                    ZIP {zip.zcta}
                  </h3>
                  {zip.city && (
                    <p className="text-sm text-gray-600 mt-0.5">{zip.city}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {/* For ZIPs on state pages: no computed percentile, so show ratio as primary */}
                {zip.metrics && zip.metrics.ratio !== null && (
                  <p className="text-gray-700">
                    <span className="text-gray-500">Ratio:</span>{' '}
                    <span className={`font-semibold ${classes.ratio}`}>{formatRatio(zip.metrics.ratio)}</span>
                  </p>
                )}
                {zip.metrics && zip.metrics.homeValue !== null && (
                  <p className="text-gray-700">
                    <span className="text-gray-500">Home:</span>{' '}
                    <span className="font-medium">{formatCurrency(zip.metrics.homeValue)}</span>
                  </p>
                )}
                {zip.metrics && zip.metrics.income !== null && (
                  <p className="text-gray-700">
                    <span className="text-gray-500">Income:</span>{' '}
                    <span className="font-medium">{formatCurrency(zip.metrics.income)}</span>
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function StatePage(props: StatePageProps) {
  const params = await props.params;
  const state = stateFromSlug(params.state);

  if (!state) {
    notFound();
  }

  const data = await getStateDashboardData(params.state);

  if (!data) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: state.name, url: canonical(`/${state.slug}/`) },
  ];

  const hasData = data.topCitiesAffordable.length > 0 ||
                  data.topSmallCitiesAffordable.length > 0 ||
                  data.topTownsAffordable.length > 0 ||
                  data.topZipsAffordable.length > 0;

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
            <div className="text-center space-y-6">
              {/* Breadcrumb */}
              <div className="text-sm text-gray-500">
                <Link href="/" className="hover:text-blue-600">Home</Link>
                <span className="mx-2">›</span>
                <span className="text-gray-900 font-medium">{state.name}</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                  Affordability in <span className="text-blue-600">{state.name}</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                  Compare home affordability across {state.name} cities and ZIP codes
                </p>
              </div>

              {/* Search Box */}
              <div className="max-w-2xl mx-auto pt-2">
                <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <SearchBox />
                  <p className="text-xs text-gray-500 mt-2 px-1">
                    Search cities and ZIP codes in {state.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!hasData && (
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
              <h2 className="text-xl font-semibold text-yellow-900 mb-2">
                Data Coming Soon
              </h2>
              <p className="text-yellow-800">
                We're currently loading data for {state.name}. Check back soon
                to see affordability metrics for this state.
              </p>
            </div>
          </div>
        )}

        {hasData && (
          <>
            {/* Quick Stats Bar */}
            <section className="py-10 bg-white border-b border-gray-200">
              <div className="max-w-5xl mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                      {data.cityMedians.ratio !== null ? formatRatio(data.cityMedians.ratio) : '—'}
                    </div>
                    <div className="text-gray-600 text-sm md:text-base font-medium">Median City Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                      {data.cityMedians.homeValue !== null ? formatCurrency(data.cityMedians.homeValue) : '—'}
                    </div>
                    <div className="text-gray-600 text-sm md:text-base font-medium">Median Home Value</div>
                  </div>
                  <div className="text-center col-span-2 md:col-span-1">
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                      {data.cityMedians.income !== null ? formatCurrency(data.cityMedians.income) : '—'}
                    </div>
                    <div className="text-gray-600 text-sm md:text-base font-medium">Median Income</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Most Affordable Cities (50k+) */}
            <section className="bg-white py-16">
              <div className="max-w-7xl mx-auto px-4">
                <RankingsTable
                  cities={data.topCitiesAffordable}
                  title="Most Affordable Cities"
                  description={`Large cities in ${state.name} with populations over 50,000 where your money goes the furthest`}
                />
              </div>
            </section>

            {/* Most Affordable Small Cities (10k-50k) */}
            <section className="bg-ai-surface py-16">
              <div className="max-w-7xl mx-auto px-4">
                <RankingsTable
                  cities={data.topSmallCitiesAffordable}
                  title="Most Affordable Small Cities"
                  description={`Small cities in ${state.name} with populations between 10,000-50,000`}
                />
              </div>
            </section>

            {/* Most Affordable Towns (<10k) */}
            <section className="bg-white py-16">
              <div className="max-w-7xl mx-auto px-4">
                <RankingsTable
                  cities={data.topTownsAffordable}
                  title="Most Affordable Towns"
                  description={`Small towns in ${state.name} with populations under 10,000`}
                />
              </div>
            </section>

            {/* Least Affordable Cities (50k+) */}
            <section className="bg-ai-surface py-16">
              <div className="max-w-7xl mx-auto px-4">
                <RankingsTable
                  cities={data.topCitiesExpensive}
                  title="Least Affordable Cities"
                  description={`Large cities in ${state.name} with populations over 50,000 and the highest home price-to-income ratios`}
                />
              </div>
            </section>

            {/* Least Affordable Small Cities (10k-50k) */}
            <section className="bg-white py-16">
              <div className="max-w-7xl mx-auto px-4">
                <RankingsTable
                  cities={data.topSmallCitiesExpensive}
                  title="Least Affordable Small Cities"
                  description={`Small cities in ${state.name} with populations between 10,000-50,000 and higher affordability ratios`}
                />
              </div>
            </section>

            {/* Least Affordable Towns (<10k) */}
            <section className="bg-ai-surface py-16">
              <div className="max-w-7xl mx-auto px-4">
                <RankingsTable
                  cities={data.topTownsExpensive}
                  title="Least Affordable Towns"
                  description={`Small towns in ${state.name} with populations under 10,000 and higher home prices relative to incomes`}
                />
              </div>
            </section>

            {/* Most Affordable ZIP Codes */}
            <ZipSectionGrid
              title="Most Affordable ZIP Codes"
              subtitle={`Top ${state.name} ZIP codes with the best affordability`}
              items={data.topZipsAffordable}
              tone="affordable"
            />

            {/* Least Affordable ZIP Codes */}
            <div className="bg-gray-50">
              <ZipSectionGrid
                title="Least Affordable ZIP Codes"
                subtitle={`${state.name} ZIP codes with the highest home price-to-income ratios`}
                items={data.topZipsExpensive}
                tone="expensive"
              />
            </div>

            {/* Explore More */}
            <section className="py-14 bg-white">
              <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Explore More
                  </h2>
                  <p className="text-base text-gray-600">
                    Discover the best affordable places across America
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link
                    href="/rankings/"
                    className="group bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <ChartIcon className="w-8 h-8 mb-2 text-ai-warm" />
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700">
                      All Rankings
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Browse and filter 19,000+ cities nationwide
                    </p>
                    <span className="text-blue-600 font-medium text-xs group-hover:underline">
                      View rankings →
                    </span>
                  </Link>

                  <Link
                    href="/compare/"
                    className="group bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <ScaleIcon className="w-8 h-8 mb-2 text-ai-warm" />
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700">
                      Compare Cities
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Side-by-side comparison of up to 3 locations
                    </p>
                    <span className="text-blue-600 font-medium text-xs group-hover:underline">
                      Start comparing →
                    </span>
                  </Link>

                  <Link
                    href="/"
                    className="group bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <FlagIcon className="w-8 h-8 mb-2 text-ai-warm" />
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700">
                      All States
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Explore affordability in all 50 states + D.C.
                    </p>
                    <span className="text-blue-600 font-medium text-xs group-hover:underline">
                      Browse states →
                    </span>
                  </Link>

                  <Link
                    href="/methodology/"
                    className="group bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <BookIcon className="w-8 h-8 mb-2 text-ai-warm" />
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-700">
                      Methodology
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Learn how we calculate affordability ratios
                    </p>
                    <span className="text-blue-600 font-medium text-xs group-hover:underline">
                      Read more →
                    </span>
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
