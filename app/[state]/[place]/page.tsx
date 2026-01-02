import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { stateFromSlug } from '@/lib/usStates';
import { getCityDashboardData, type CityWithMetrics } from '@/lib/data';
import { calculateRequiredIncome } from '@/lib/required-income';
import { getV2Score } from '@/lib/v2-scores';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Breadcrumbs } from '@/components/dashboard/Breadcrumbs';
import { Toolbar } from '@/components/dashboard/Toolbar';
import { Panel } from '@/components/dashboard/Panel';
import { KpiGridDense } from '@/components/dashboard/KpiGridDense';
import { KpiCardDense } from '@/components/dashboard/KpiCardDense';
import { DataQualityCard } from '@/components/dashboard/DataQualityCard';
import { BenchmarkTable } from '@/components/dashboard/BenchmarkTable';
import { NearbyAlternativesTable } from '@/components/dashboard/NearbyAlternativesTable';
import { MethodologySnippet } from '@/components/dashboard/MethodologySnippet';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import { SourcesFooter } from '@/components/dashboard/SourcesFooter';
import { ShareButtons } from '@/components/ShareButtons';
import { PercentileBadge } from '@/components/PercentileBadge';
import { PlaceTypeBadge } from '@/components/PlaceTypeBadge';
import { AffordabilityCalculator } from '@/components/AffordabilityCalculator';
import { AffordabilityInsights } from '@/components/AffordabilityInsights';
import { FitSignals } from '@/components/FitSignals';
import { ScoreHero } from '@/components/ScoreHero';
import { ScoreBreakdownPanel } from '@/components/ScoreBreakdownPanel';
import { TrueAffordabilitySection } from '@/components/TrueAffordabilitySection';
import V2ScoreCard from '@/components/V2ScoreCard';
import { StaticCityMap } from '@/components/StaticCityMap';
import {
  formatCurrency,
  formatRatio,
  formatDateShort,
  deriveAffordabilityLabel,
  parseSourcesForQuality,
  formatStateComparison,
} from '@/lib/viewModels';

// ISR: Cache pages for 60 days, then revalidate on next request
export const revalidate = 5184000; // 60 days in seconds

interface PlacePageProps {
  params: Promise<{
    state: string;
    place: string;
  }>;
}

export async function generateMetadata(props: PlacePageProps): Promise<Metadata> {
  const params = await props.params;
  const state = stateFromSlug(params.state);

  if (!state) {
    return {
      title: 'Place Not Found',
    };
  }

  let dashboardData;
  try {
    dashboardData = await getCityDashboardData(params.state, params.place);
  } catch (error) {
    console.error('Error loading metadata for city:', error);
    return { title: 'City Not Found' };
  }

  // Disambiguation case
  if (dashboardData.cities.length > 1) {
    const cityName = dashboardData.cities[0].name;
    const url = canonical(`/${state.slug}/${params.place}/`);
    return {
      title: `Which ${cityName} in ${state.name}? | Affordability Index`,
      description: `Select a ${cityName} in ${state.name} to view home affordability data.`,
      alternates: {
        canonical: url,
      },
    };
  }

  // Single city case
  const city = dashboardData.city;
  if (!city) {
    return { title: 'City Not Found' };
  }

  const url = canonical(`/${state.slug}/${params.place}/`);
  const ratio = city.metrics?.ratio;
  const homeValue = city.metrics?.homeValue ?? null;
  const income = city.metrics?.income ?? null;

  const description = ratio
    ? `Home affordability in ${city.name}, ${state.abbr}. Median home value: ${formatCurrency(homeValue)}, median household income: ${formatCurrency(income)}, affordability ratio: ${formatRatio(ratio)}.`
    : `Explore home affordability data for ${city.name}, ${state.abbr}.`;

  return {
    title: `${city.name}, ${state.abbr} Home Affordability`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${city.name}, ${state.abbr} Affordability | Affordability Index`,
      description,
      url,
    },
  };
}

export default async function PlacePage(props: PlacePageProps) {
  const params = await props.params;
  const state = stateFromSlug(params.state);

  if (!state) {
    notFound();
  }

  let dashboardData;
  let hadError = false;

  try {
    dashboardData = await getCityDashboardData(params.state, params.place);
  } catch (error) {
    console.error('Error loading city dashboard data:', error);
    hadError = true;
    // Return empty dashboard data - we'll show an error message instead of 404
    dashboardData = {
      city: null,
      cities: [],
      benchmarks: [],
      nearbyBetter: [],
      nearbyWorse: [],
      affordabilitySnapshot: null,
      rankData: null,
      score: { version: 'v1_housing' as const, overallScore: 0, grade: 'N/A' as const, housingScore: null, essentialsScore: null, taxesScore: null, healthcareScore: null, notes: [] },
    };
  }

  // Disambiguation case: multiple cities with same slug
  if (dashboardData.cities.length > 1) {
    return renderDisambiguationPage(dashboardData.cities, state, params.place);
  }

  // Single city case
  const city = dashboardData.city;

  // Only show 404 if no city found AND we didn't have a database error
  if (!city && !hadError) {
    notFound();
  }

  // If we had an error and no city, show error page
  if (!city && hadError) {
    return renderErrorPage(state, params.place);
  }

  return renderCityDashboard(city!, dashboardData, state, params.place);
}

async function renderCityDashboard(
  city: CityWithMetrics,
  dashboardData: ReturnType<typeof getCityDashboardData> extends Promise<infer T> ? T : never,
  state: { name: string; abbr: string; slug: string },
  placeParam: string
) {
  // Fetch required income for this city (with error handling)
  let requiredIncome = null;
  try {
    requiredIncome = await calculateRequiredIncome('CITY', city.cityId);
  } catch (error) {
    console.error('Failed to calculate required income:', error);
  }

  // Fetch V2 affordability score (with error handling)
  let v2Score = null;
  try {
    v2Score = await getV2Score('CITY', city.cityId);
  } catch (error) {
    console.error('Failed to fetch V2 score:', error);
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: state.name, href: `/${state.slug}/` },
    { label: city.name },
  ];

  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: state.name, url: canonical(`/${state.slug}/`) },
    { name: city.name, url: canonical(`/${state.slug}/${placeParam}/`) },
  ];

  const { metrics } = city;
  const hasMetrics = metrics !== null;
  const dataQuality = parseSourcesForQuality(metrics?.sources ?? null);

  // Extract state averages from benchmarks (second row if available)
  const stateAvg = dashboardData.benchmarks.length > 1 ? dashboardData.benchmarks[1] : null;

  // FAQ items
  const faqItems = [
    {
      question: `What is the affordability ratio for ${city.name}?`,
      answer: metrics?.ratio
        ? `The affordability ratio for ${city.name} is ${formatRatio(metrics.ratio)}, meaning the median home value is ${formatRatio(metrics.ratio)} times the median household income. ${deriveAffordabilityLabel(metrics.ratio)} compared to national averages.`
        : `Affordability ratio data for ${city.name} is currently being processed.`,
    },
    {
      question: `How affordable is ${city.name} compared to other places in ${state.name}?`,
      answer: `Visit the ${state.name} affordability page to see rankings of the most and least affordable places in the state. This page shows nearby alternatives for comparison.`,
    },
    {
      question: 'What is earning power?',
      answer:
        'Earning power is the inverse of the affordability ratio (income divided by home value). Higher earning power means incomes are stronger relative to home values. Learn more on our methodology page.',
    },
    {
      question: 'Where does this data come from?',
      answer:
        'Our data comes from Zillow ZHVI (home values) and US Census ACS 5-year estimates (income). See the sources section at the bottom of this page for complete attribution.',
    },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Breadcrumb Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3" aria-label="Breadcrumb">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600 transition">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${state.slug}/`} className="hover:text-blue-600 transition">
            {state.name}
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{city.name}</span>
        </div>
      </nav>

      {/* Map + Score Hero - Side by Side */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map - Left Side */}
          <div className="order-2 lg:order-1">
            <StaticCityMap
              cityName={city.name}
              stateAbbr={state.abbr}
              className="h-full min-h-[300px] lg:min-h-[400px]"
            />
          </div>

          {/* Score Hero - Right Side */}
          <div className="order-1 lg:order-2">
            <ScoreHero score={dashboardData.score} locationName={`${city.name}, ${state.abbr}`} requiredIncome={requiredIncome} />
          </div>
        </div>
      </div>

      <DashboardShell
        header={
          <div className="flex items-center justify-between">
            <Toolbar lastUpdated={metrics?.asOfDate} />
          </div>
        }
      >
        {/* Score Breakdown Panel */}
        <div className="mb-12">
          <ScoreBreakdownPanel score={dashboardData.score} />
        </div>

        {/* V2 Affordability Score Card */}
        <div className="mb-12">
          <V2ScoreCard score={v2Score} placeName={city.name} />
        </div>

        {!hasMetrics && (
          <Panel>
            <div className="text-center py-6">
              <p className="text-gray-600">
                Data for {city.name} is currently being processed. Check back soon.
              </p>
            </div>
          </Panel>
        )}

        {hasMetrics && (
          <>
            {/* True Affordability Section - V2 Feature */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">True Affordability by Household Type</h2>
              <p className="text-gray-600 mb-6">
                See the full cost of living in {city.name} for different household profiles, including taxes, transportation, childcare, and healthcare.
              </p>
              <TrueAffordabilitySection
                geoType="CITY"
                geoId={city.cityId}
                cityName={city.name}
              />
            </div>

            {/* Fit Signals - Quick at-a-glance context */}
            <div className="mb-12">
              <FitSignals
                cityName={city.name}
                stateAbbr={state.abbr}
                ratio={metrics.ratio}
                stateRatio={stateAvg?.ratio ?? null}
                homeValue={metrics.homeValue}
                stateHomeValue={stateAvg?.homeValue ?? null}
                income={metrics.income}
                stateIncome={stateAvg?.income ?? null}
                usPercentile={dashboardData.rankData?.usPercentMoreAffordable ?? null}
                stateRank={dashboardData.rankData?.stateRank ?? null}
                stateCount={dashboardData.rankData?.stateCount ?? null}
              />
            </div>

            {/* Affordability Insights - What This Means */}
            {metrics.ratio && (
              <div className="mb-12">
                <AffordabilityInsights
                  cityName={city.name}
                  metrics={{
                    homeValue: metrics.homeValue,
                    income: metrics.income,
                    ratio: metrics.ratio,
                  }}
                  nationalPercentile={dashboardData.rankData?.usPercentMoreAffordable ?? null}
                />
              </div>
            )}

            {/* Benchmarks - Visual comparison */}
            {dashboardData.benchmarks.length > 0 && (
              <div className="mb-12">
                <Panel title="How Does This Compare?" subtitle="Compare to state and national averages">
                  <BenchmarkTable rows={dashboardData.benchmarks} />
                </Panel>
              </div>
            )}

            {/* Affordability Calculator - Interactive exploration */}
            {metrics.homeValue && metrics.income && (
              <div className="mb-12">
                <AffordabilityCalculator
                  medianHomeValue={metrics.homeValue}
                  medianIncome={metrics.income}
                  cityName={city.name}
                  stateAbbr={state.abbr}
                />
              </div>
            )}

            {/* Detailed KPI Grid */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Metrics</h2>
              <KpiGridDense>
                <KpiCardDense
                  label="Affordability Ratio"
                  value={metrics.ratio !== null ? formatRatio(metrics.ratio) : null}
                  subvalue={metrics.ratio ? deriveAffordabilityLabel(metrics.ratio) : undefined}
                  tooltip="Home Value / Income - Lower is more affordable"
                />
                <KpiCardDense
                  label="Median Home Value"
                  value={formatCurrency(metrics.homeValue)}
                  subvalue={metrics.asOfDate ? formatDateShort(metrics.asOfDate) : undefined}
                />
                <KpiCardDense
                  label="Median Income"
                  value={formatCurrency(metrics.income)}
                  subvalue="Household annual"
                />
                <KpiCardDense
                  label="Earning Power"
                  value={(metrics.earningPower !== null && !isNaN(metrics.earningPower) && isFinite(metrics.earningPower)) ? metrics.earningPower.toFixed(4) : null}
                  subvalue="Income / Home Value"
                  tooltip="Higher earning power = stronger incomes relative to home values"
                />
                <KpiCardDense
                  label="Population"
                  value={city.population != null ? city.population.toLocaleString() : null}
                  subvalue="Total residents"
                />
                {/* Only show data quality card when there's something noteworthy (not for exact matches or unknown) */}
                {dataQuality.incomeMatchType && dataQuality.incomeMatchType !== 'exact' && (
                  <DataQualityCard
                    incomeMatchType={dataQuality.incomeMatchType}
                    note={dataQuality.note}
                  />
                )}
              </KpiGridDense>
            </div>

            {/* Nearby Alternatives */}
            {(dashboardData.nearbyBetter.length > 0 || dashboardData.nearbyWorse.length > 0) && (
              <Panel
                title="Nearby Alternatives"
                subtitle={`Other cities in ${state.name} for comparison`}
              >
                <NearbyAlternativesTable
                  betterRows={dashboardData.nearbyBetter}
                  worseRows={dashboardData.nearbyWorse}
                />
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
              <SourcesFooter zillowDate={metrics.asOfDate} isZCTA={false} />
            </Panel>
          </>
        )}
      </DashboardShell>
    </>
  );
}

function renderErrorPage(
  state: { name: string; abbr: string; slug: string },
  slug: string
) {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: state.name, url: canonical(`/${state.slug}/`) },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      <DashboardShell>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Temporarily Unavailable</h1>
          <p className="text-lg text-gray-600 mb-6">
            We're experiencing technical difficulties loading data for this location.
          </p>
          <p className="text-gray-600 mb-8">
            Our team has been notified and is working to resolve the issue. Please try again in a few minutes.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={`/${state.slug}/`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              View {state.name}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Go Home
            </Link>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}

function renderDisambiguationPage(
  cities: CityWithMetrics[],
  state: { name: string; abbr: string; slug: string },
  slug: string
) {
  const cityName = cities[0].name;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: state.name, href: `/${state.slug}/` },
    { label: `${cityName} (select)` },
  ];

  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: state.name, url: canonical(`/${state.slug}/`) },
    { name: `${cityName} (disambiguation)`, url: canonical(`/${state.slug}/${slug}/`) },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      <DashboardShell
        header={
          <div className="flex items-center justify-between">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        }
      >
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Which {cityName} in {state.name}?
          </h1>
          <p className="text-gray-600 mt-2">
            Select a location to view affordability data
          </p>
        </div>

        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">City</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">County</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Metro</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Ratio</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Home Value</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.cityId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <Link
                        href={`/${state.slug}/${slug}-${city.cityId}/`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {city.name}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{city.countyName || '—'}</td>
                    <td className="py-2 px-3 text-gray-700">{city.metro || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-900">
                      {city.metrics?.ratio ? formatRatio(city.metrics.ratio) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-gray-900">
                      {formatCurrency(city.metrics?.homeValue ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </DashboardShell>
    </>
  );
}
