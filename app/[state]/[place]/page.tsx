import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { canonical } from '@/lib/seo';
import { stateFromSlug } from '@/lib/usStates';
import { getCityDashboardData, type CityWithMetrics, buildV2ScoreBreakdown } from '@/lib/data';
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
import { StaticCityMap } from '@/components/StaticCityMap';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { QuickActions } from '@/components/QuickActions';
import { SaveLocationButton } from '@/components/SaveLocationButton';
import { QuickTakeSummary } from '@/components/QuickTakeSummary';
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

  const dashboardData = await getCityDashboardData(params.state, params.place);

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

  const dashboardData = await getCityDashboardData(params.state, params.place);

  // Disambiguation case: multiple cities with same slug
  if (dashboardData.cities.length > 1) {
    return renderDisambiguationPage(dashboardData.cities, state, params.place);
  }

  // Single city case
  const city = dashboardData.city;
  if (!city) {
    notFound();
  }

  return renderCityDashboard(city, dashboardData, state, params.place);
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

  // Build score breakdown
  const heroScore = buildV2ScoreBreakdown(v2Score);

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

  // FAQ items - expanded with improved answers
  const faqItems = [
    {
      question: `What is the affordability ratio for ${city.name}?`,
      answer: metrics?.ratio
        ? `The affordability ratio for ${city.name} is ${formatRatio(metrics.ratio)}, meaning the median home value is ${formatRatio(metrics.ratio)} times the median household income. ${deriveAffordabilityLabel(metrics.ratio)} compared to national averages. <strong>Example:</strong> With a ${formatRatio(metrics.ratio)} ratio, a $100,000 income would typically buy a $${(100000 * metrics.ratio).toLocaleString()} home. A lower ratio means homes are more affordable relative to local incomes. ${city.name} ranks ${dashboardData.rankData?.stateRank ? `#${dashboardData.rankData.stateRank} out of ${dashboardData.rankData.stateCount} places in ${state.name}` : 'somewhere in the middle'} by this measure.`
        : `Affordability ratio data for ${city.name} is currently being processed. Check back soon.`,
    },
    {
      question: `How affordable is ${city.name} compared to other places in ${state.name}?`,
      answer: `${city.name} ${metrics?.ratio && metrics.ratio < 4 ? 'is among the more affordable' : metrics?.ratio && metrics.ratio < 5.5 ? 'has mid-range affordability' : 'is less affordable than'} places in ${state.name}. <strong>Real-world context:</strong> ${metrics?.ratio && metrics.ratio < 3.5 ? 'At this ratio, homeownership is within reach for most households, similar to affordable Midwest cities.' : metrics?.ratio && metrics.ratio < 5 ? 'This is typical for many suburban areas - manageable with careful budgeting.' : 'This level means many households face significant housing cost burdens.'} Visit the ${state.name} affordability page to see rankings of the most and least affordable places in the state. You'll also find nearby alternatives listed above that offer different price points for comparison.`,
    },
    {
      question: 'What is earning power?',
      answer: `Earning power is the inverse of the affordability ratio (income dividedided by home value). Higher earning power means incomes are stronger relative to home values, indicating better housing affordability for local residents. ${city.name}'s earning power is ${metrics?.earningPower ? metrics.earningPower.toFixed(4) : 'being calculated'}. <strong>Example:</strong> ${metrics?.earningPower ? `With this earning power, every $1,000 in monthly income can buy approximately $${(metrics.earningPower * 1000).toFixed(0)} in home value.` : ''} This metric helps you compare how far local incomes go toward housing costs across different cities. Learn more on our methodology page.`,
    },
    {
      question: 'Where does this data come from?',
      answer: `Our data comes from two trusted sources: Zillow Home Value Index (ZHVI) for median home values, updated monthly, and the U.S. Census Bureau's American Community Survey (ACS) 5-year estimates for median household income, updated annually. See the sources section at the bottom of this page for complete attribution, including specific data vintage years and update schedules.`,
    },
    {
      question: `Can I afford to buy a home in ${city.name}?`,
      answer: metrics?.homeValue && metrics?.income
        ? `The median home in ${city.name} costs $${metrics.homeValue.toLocaleString()}. To comfortably afford this, you'd typically need a household income of at least $${Math.round(metrics.homeValue / 3.5).toLocaleString()}/year. <strong>Concrete example:</strong> If you earn $${(metrics.income / 1000).toFixed(0)}K, the median home would cost ${metrics.ratio?.toFixed(1)}× your income${metrics.ratio && metrics.ratio > 5 ? ', which is above the 3-4× most financial experts recommend' : metrics.ratio && metrics.ratio < 4 ? ', which is within the affordable range' : ''}. The median household income here is $${metrics.income.toLocaleString()}, making homeownership ${metrics.ratio && metrics.ratio < 4 ? 'quite accessible' : metrics.ratio && metrics.ratio < 5.5 ? 'moderately affordable' : 'challenging'} for the average resident. Use our calculator above to see how your income compares.`
        : `Affordability data for ${city.name} is being processed.`,
    },
    {
      question: 'Why is the income data so old?',
      answer: `We use the U.S. Census Bureau's American Community Survey (ACS) 5-year estimates for income data. This averages survey responses over a 5-year period to provide stable estimates for smaller cities and neighborhoods. While this means income data lags current conditions by 1-2 years, it's necessary for reliable geographic-level data. <strong>Example:</strong> The 2022 5-year estimate (released Dec 2023) averages data from 2018-2022. In contrast, Zillow home values are updated monthly. We update income data annually when new ACS estimates are released (typically each December).`,
    },
    {
      question: `How accurate is this data for small cities like ${city.name}?`,
      answer: city.population && city.population < 25000
        ? `For smaller cities like ${city.name} (population: ${city.population.toLocaleString()}), Census income estimates have higher margins of error due to smaller sample sizes. This is normal for cities under 25,000 people. <strong>Example:</strong> The margin of error might be ±15-20% for income in small cities, versus ±3-5% for larger cities. The affordability ratio should be used as a general guide rather than a precise measure. For more robust estimates, consider looking at county-level data or larger nearby cities.`
        : `With ${city.population?.toLocaleString() || 'a sizable population'}, ${city.name} has relatively reliable income estimates from the Census. However, all survey-based data has margins of error, and recent economic changes may not be fully reflected yet. <strong>Example:</strong> If the median income is $60,000, the true value might be $57,000-$63,000. Use this as a starting point for your housing affordability research.`,
    },
    {
      question: 'Can I use this to qualify for a mortgage?',
      answer: `No. The affordability ratio is designed for <strong>geographic comparison</strong>, not mortgage qualification. Lenders consider many factors not captured here: your credit score, debt-to-income ratio, down payment amount, current interest rates, property taxes, homeowners insurance, and closing costs. <strong>Example:</strong> Two cities might both have a 4.0 affordability ratio, but if one has 2% property taxes and the other has 0.5% taxes, the monthly payment difference could be hundreds of dollars. To get pre-approved for a mortgage, contact a lender directly. They'll review your complete financial situation and tell you exactly how much you can borrow.`,
    },
    {
      question: "What's missing from this affordability measure?",
      answer: `Our affordability ratio only considers home value relative to income. It doesn't include: mortgage interest rates (which dramatically affect monthly payments), property taxes, homeowners insurance, HOA fees, closing costs, down payment requirements, ongoing maintenance costs, or your other debts. <strong>Real-world example:</strong> A $400K home with 20% down at 6.2% interest costs ~$2,400/month in principal & interest. Add $400/month property tax, $200/month insurance, and you're at $3,000/month before utilities or maintenance. A home with a good ratio might still be unaffordable if property taxes are high or you have significant student loans. Use our True Affordability section above for a more complete picture that includes taxes and other costs.`,
    },
    {
      question: 'How often is this data updated?',
      answer: `Zillow home value data is updated monthly (typically released mid-month for the prior month). <strong>Example:</strong> Home values for January 2025 would be released in mid-February 2025. Census income data is updated annually when new 5-year ACS estimates are released, usually each December. We refresh our data as soon as new sources are available. The 'Last Updated' date in the toolbar above shows when home values were last refreshed. Income data vintage is noted in the Sources section below.`,
    },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Breadcrumb Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3" aria-label="Breadcrumb">
        <div className="flex items-center justify-between">
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
          <SaveLocationButton
            geoType="CITY"
            geoId={city.cityId}
            name={city.name}
            stateAbbr={state.abbr}
            variant="compact"
          />
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
            <ScoreHero score={heroScore} locationName={`${city.name}, ${state.abbr}`} requiredIncome={requiredIncome} />
          </div>
        </div>

        {/* Data Source Badge - Prominent Display */}
        <div className="mt-6 flex justify-center">
          <DataSourceBadge
            variant="horizontal"
            zillowDate={metrics?.asOfDate}
            showUpdateFrequency={true}
          />
        </div>

        {/* Quick Actions Bar - Prominent CTAs */}
        <div className="mt-6">
          <QuickActions
            cityName={city.name}
            stateAbbr={state.abbr}
            calculatorSectionId="calculator"
          />
        </div>

        {/* Quick Take Summary - 3 key insights */}
        {v2Score && (
          <div className="mt-6">
            <QuickTakeSummary
              score={v2Score}
              cityName={city.name}
              stateRatio={stateAvg?.ratio ?? null}
              nationalRatio={4.5}
              population={city.population}
            />
          </div>
        )}
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
          <ScoreBreakdownPanel score={heroScore} />
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
            {/* Affordability Calculator - Interactive exploration (MOVED UP) */}
            {metrics.homeValue && metrics.income && (
              <div className="mb-12" id="calculator">
                <AffordabilityCalculator
                  medianHomeValue={metrics.homeValue}
                  medianIncome={metrics.income}
                  cityName={city.name}
                  stateAbbr={state.abbr}
                />
              </div>
            )}

            {/* True Affordability Section */}
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

            {/* Detailed KPI Grid */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Metrics</h2>
              <KpiGridDense>
                <KpiCardDense
                  label="Median Home Value"
                  value={formatCurrency(metrics.homeValue)}
                  subvalue={metrics.asOfDate ? formatDateShort(metrics.asOfDate) : undefined}
                  source="Zillow ZHVI"
                />
                <KpiCardDense
                  label="Median Household Income"
                  value={formatCurrency(metrics.income)}
                  subvalue="Annual income"
                  source="US Census ACS"
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
