import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { stateFromSlug } from '@/lib/usStates';
import { getCountyDashboardData, type CountyWithMetrics } from '@/lib/data';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Panel } from '@/components/dashboard/Panel';
import { KpiGridDense } from '@/components/dashboard/KpiGridDense';
import { KpiCardDense } from '@/components/dashboard/KpiCardDense';
import { BenchmarkTable } from '@/components/dashboard/BenchmarkTable';
import { MethodologySnippet } from '@/components/dashboard/MethodologySnippet';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import { SourcesFooter } from '@/components/dashboard/SourcesFooter';
import {
  formatCurrency,
  formatRatio,
  formatDateShort,
} from '@/lib/viewModels';

// ISR: Cache pages for 60 days, then revalidate on next request
export const revalidate = 5184000; // 60 days in seconds

interface CountyPageProps {
  params: Promise<{
    state: string;
    county: string;
  }>;
}

export async function generateMetadata(props: CountyPageProps): Promise<Metadata> {
  const params = await props.params;
  const state = stateFromSlug(params.state);

  if (!state) {
    return {
      title: 'State Not Found',
    };
  }

  const dashboardData = await getCountyDashboardData(params.state, params.county);
  const county = dashboardData.county;

  if (!county) {
    return {
      title: 'County Not Found',
    };
  }

  const url = canonical(`/${state.slug}/county/${params.county}/`);
  const metrics = county.metrics;
  const ratio = metrics?.ratio;
  const homeValue = metrics?.homeValue;
  const income = metrics?.income;

  const description = ratio
    ? `Home affordability in ${county.countyName} County, ${state.abbr}. County average: median home value ${formatCurrency(homeValue || null)}, median household income ${formatCurrency(income || null)}, affordability ratio ${formatRatio(ratio)}. Explore cities and ZIP codes within the county.`
    : `Explore home affordability data for ${county.countyName} County, ${state.abbr}. View cities and ZIP codes within the county.`;

  return {
    title: `${county.countyName} County, ${state.abbr} Home Affordability`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${county.countyName} County, ${state.abbr} Affordability | Affordability Index`,
      description,
      url,
    },
  };
}

export default async function CountyPage(props: CountyPageProps) {
  const params = await props.params;
  const state = stateFromSlug(params.state);

  if (!state) {
    notFound();
  }

  const dashboardData = await getCountyDashboardData(params.state, params.county);
  const county = dashboardData.county;

  if (!county) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: state.name, url: canonical(`/${state.slug}/`) },
    { name: `${county.countyName} County`, url: canonical(`/${state.slug}/county/${params.county}/`) },
  ];

  const { metrics } = county;
  const hasMetrics = metrics !== null;
  const citiesWithData = dashboardData.cities.filter((c) => c.metrics !== null);
  const zipsWithData = dashboardData.zips.filter((z) => z.metrics !== null);

  // FAQ items
  const faqItems = [
    {
      question: `What is the affordability ratio for ${county.countyName} County?`,
      answer: metrics?.ratio
        ? `The county-wide affordability ratio is ${formatRatio(metrics.ratio)}, meaning the median home value is ${formatRatio(metrics.ratio)} times the median household income. This is calculated from aggregated data across all cities in the county.`
        : `County-level affordability data is calculated from individual city data within ${county.countyName} County.`,
    },
    {
      question: `Which cities in ${county.countyName} County are most affordable?`,
      answer: citiesWithData.length > 0
        ? `Browse the cities section below to see affordability rankings for all cities in ${county.countyName} County. Cities are sorted by population, and you can compare home values, incomes, and affordability ratios.`
        : `City-level data for ${county.countyName} County is being processed.`,
    },
    {
      question: 'How are county averages calculated?',
      answer: 'County-level metrics are population-weighted averages from all cities within the county that have affordability data. This provides a more accurate representation than a simple average, as larger cities have proportionally more influence on the county average.',
    },
    {
      question: 'Where does this data come from?',
      answer:
        'Our data comes from Zillow ZHVI (home values) and US Census ACS 5-year estimates (income) for individual cities within the county. See the sources section at the bottom of this page for complete attribution.',
    },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <nav className="flex items-center space-x-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-blue-600 transition">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${state.slug}/`} className="hover:text-blue-600 transition">
            {state.name}
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{county.countyName} County</span>
        </nav>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {county.countyName} County, {state.abbr}
          </h1>
          <p className="text-lg text-gray-600">
            Home affordability data for cities and ZIP codes in {county.countyName} County
          </p>
        </div>

        {/* County Summary */}
        {hasMetrics && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">County Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Affordability Ratio</div>
                <div className="text-3xl font-bold text-gray-900">{formatRatio(metrics.ratio)}</div>
                <div className="text-sm text-gray-600 mt-1">County Average</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Median Home Value</div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.homeValue)}</div>
                <div className="text-sm text-gray-600 mt-1">Population-Weighted</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Median Income</div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.income)}</div>
                <div className="text-sm text-gray-600 mt-1">Household Annual</div>
              </div>
            </div>
            {metrics.asOfDate && (
              <div className="mt-4 text-sm text-gray-600">
                Data as of {formatDateShort(metrics.asOfDate)}
              </div>
            )}
          </div>
        )}
      </div>

      <DashboardShell>
        {/* Benchmarks */}
        {dashboardData.benchmarks.length > 0 && (
          <Panel title="How Does This Compare?" subtitle="County average vs state and national">
            <BenchmarkTable rows={dashboardData.benchmarks} />
          </Panel>
        )}

        {/* Cities in County */}
        {citiesWithData.length > 0 && (
          <Panel title="Cities in This County" subtitle={`Affordability data for ${citiesWithData.length} cities`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">City</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Population</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Ratio</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Home Value</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Income</th>
                  </tr>
                </thead>
                <tbody>
                  {citiesWithData.map((city) => (
                    <tr key={city.cityId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <Link
                          href={`/${state.slug}/${city.slug}/`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {city.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {city.population?.toLocaleString() || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
                        {city.metrics?.ratio ? formatRatio(city.metrics.ratio) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
                        {formatCurrency(city.metrics?.homeValue ?? null)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
                        {formatCurrency(city.metrics?.income ?? null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ZIP Codes in County */}
        {zipsWithData.length > 0 && (
          <Panel title="ZIP Codes in This County" subtitle={`Affordability data for ${zipsWithData.length} ZIPs`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">ZIP</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">City</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Ratio</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Home Value</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Income</th>
                  </tr>
                </thead>
                <tbody>
                  {zipsWithData.map((zip) => (
                    <tr key={zip.zcta} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <Link
                          href={`/zip/${zip.zcta}/`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {zip.zcta}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{zip.city || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
                        {zip.metrics?.ratio ? formatRatio(zip.metrics.ratio) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
                        {formatCurrency(zip.metrics?.homeValue ?? null)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">
                        {formatCurrency(zip.metrics?.income ?? null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Top Affordable/Expensive Cities */}
        {dashboardData.topCitiesAffordable.length > 0 && (
          <Panel
            title="Most Affordable Cities"
            subtitle={`Top ${dashboardData.topCitiesAffordable.length} cities with lowest ratios`}
          >
            <div className="space-y-2">
              {dashboardData.topCitiesAffordable.map((city, index) => (
                <div
                  key={city.cityId}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <Link
                        href={`/${state.slug}/${city.slug}/`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {city.name}
                      </Link>
                      <div className="text-sm text-gray-600">
                        {city.population?.toLocaleString()} residents
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-700">
                      {formatRatio(city.metrics?.ratio ?? null)}
                    </div>
                    <div className="text-sm text-gray-600">ratio</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {dashboardData.topCitiesExpensive.length > 0 && (
          <Panel
            title="Least Affordable Cities"
            subtitle={`Top ${dashboardData.topCitiesExpensive.length} cities with highest ratios`}
          >
            <div className="space-y-2">
              {dashboardData.topCitiesExpensive.map((city, index) => (
                <div
                  key={city.cityId}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <Link
                        href={`/${state.slug}/${city.slug}/`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {city.name}
                      </Link>
                      <div className="text-sm text-gray-600">
                        {city.population?.toLocaleString()} residents
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-700">
                      {formatRatio(city.metrics?.ratio ?? null)}
                    </div>
                    <div className="text-sm text-gray-600">ratio</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Methodology */}
        <Panel title="Methodology">
          <MethodologySnippet />
        </Panel>

        {/* FAQ */}
        <Panel title="Frequently Asked Questions">
          <FAQAccordion items={faqItems} />
        </Panel>

        {/* Sources */}
        <Panel title="Data Sources">
          <SourcesFooter zillowDate={metrics?.asOfDate} isZCTA={false} />
        </Panel>
      </DashboardShell>
    </>
  );
}
