import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { canonical, isZip } from '@/lib/seo';
import { getZipDashboardData, getStateRankingForZip } from '@/lib/data';
import { stateFromAbbr } from '@/lib/usStates';
import { JsonLd, generateBreadcrumbJsonLd } from '@/components/JsonLd';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Breadcrumbs } from '@/components/dashboard/Breadcrumbs';
import { Toolbar } from '@/components/dashboard/Toolbar';
import { Panel } from '@/components/dashboard/Panel';
import { KpiGridDense } from '@/components/dashboard/KpiGridDense';
import { KpiCardDense } from '@/components/dashboard/KpiCardDense';
import { BenchmarkTable } from '@/components/dashboard/BenchmarkTable';
import { NearbyAlternativesTable } from '@/components/dashboard/NearbyAlternativesTable';
import { MethodologySnippet } from '@/components/dashboard/MethodologySnippet';
import { FAQAccordion } from '@/components/dashboard/FAQAccordion';
import { SourcesFooter } from '@/components/dashboard/SourcesFooter';
import { ShareButtons } from '@/components/ShareButtons';
import { PercentileBadge } from '@/components/PercentileBadge';
import { estimateAffordabilityPercentile } from '@/lib/percentile';
import { AffordabilityCalculator } from '@/components/AffordabilityCalculator';
import { PersonaCards } from '@/components/PersonaCards';
import { ScoreHero } from '@/components/ScoreHero';
import { ScoreBreakdownPanel } from '@/components/ScoreBreakdownPanel';
import { TrueAffordabilitySection } from '@/components/TrueAffordabilitySection';
import {
  formatCurrency,
  formatRatio,
  formatDateShort,
  deriveAffordabilityLabel,
} from '@/lib/viewModels';

// ISR: Cache pages for 60 days, then revalidate on next request
export const revalidate = 5184000; // 60 days in seconds

interface ZipPageProps {
  params: Promise<{
    zip: string;
  }>;
}

export async function generateMetadata(props: ZipPageProps): Promise<Metadata> {
  const params = await props.params;
  const { zip } = params;

  if (!isZip(zip)) {
    return {
      title: 'Invalid ZIP Code',
    };
  }

  const dashboardData = await getZipDashboardData(zip);
  const zcta = dashboardData.zcta;

  if (!zcta) {
    return {
      title: 'ZIP Code Not Found',
    };
  }

  const url = canonical(`/zip/${zip}/`);
  const ratio = zcta.metrics?.ratio;
  const homeValue = zcta.metrics?.homeValue;
  const income = zcta.metrics?.income;

  const locationStr = zcta.stateAbbr ? ` (${zcta.stateAbbr})` : '';

  const description = ratio
    ? `Home affordability for ZIP ${zip}${locationStr}. Median home value: ${homeValue ? `$${homeValue.toLocaleString()}` : 'N/A'}, median household income: ${income ? `$${income.toLocaleString()}` : 'N/A'}, affordability ratio: ${ratio.toFixed(2)}.`
    : `Explore home affordability data for ZIP code ${zip}${locationStr}.`;

  return {
    title: `ZIP ${zip} Home Affordability`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `ZIP ${zip} Affordability | Affordability Index`,
      description,
      url,
    },
  };
}

export default async function ZipPage(props: ZipPageProps) {
  const params = await props.params;
  const { zip } = params;

  if (!isZip(zip)) {
    notFound();
  }

  const dashboardData = await getZipDashboardData(zip);
  const zcta = dashboardData.zcta;

  if (!zcta) {
    notFound();
  }

  const state = zcta.stateAbbr ? stateFromAbbr(zcta.stateAbbr) : null;

  // Get state ranking
  const stateRanking = zcta.stateAbbr && zcta.metrics
    ? await getStateRankingForZip(zip, zcta.stateAbbr)
    : null;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(state ? [{ label: state.name, href: `/${state.slug}/` }] : []),
    { label: `ZIP ${zip}` },
  ];

  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: `ZIP ${zip}`, url: canonical(`/zip/${zip}/`) },
  ];

  const { metrics } = zcta;
  const hasMetrics = metrics !== null;

  // Better FAQ items targeting actual user search queries
  const cityDisplay = zcta.city ? `${zcta.city}, ${zcta.stateAbbr}` : `ZIP ${zip}`;
  const faqItems = [
    {
      question: `Can I afford to buy a home in ${cityDisplay}?`,
      answer: metrics?.homeValue && metrics?.income
        ? `The median home in ${cityDisplay} costs $${metrics.homeValue.toLocaleString()}. To comfortably afford this, you'd typically need a household income of at least $${Math.round(metrics.homeValue / 3.5).toLocaleString()}/year. The median household income here is $${metrics.income.toLocaleString()}, making homeownership ${metrics.ratio && metrics.ratio < 4 ? 'quite accessible' : metrics.ratio && metrics.ratio < 5.5 ? 'moderately affordable' : 'challenging'} compared to national averages.`
        : `Affordability data for ${cityDisplay} is being calculated.`,
    },
    {
      question: `What salary do I need to live in ${cityDisplay}?`,
      answer: metrics?.income
        ? `The median household income in ${cityDisplay} is $${metrics.income.toLocaleString()}/year. However, you can live comfortably here on less if you're renting or have lower housing costs. For homeownership, aim for 28-33% of your gross income going toward housing costs.`
        : `Income data for ${cityDisplay} is being processed.`,
    },
    {
      question: `Is ${cityDisplay} a good place to live?`,
      answer: zcta.city && state
        ? `${zcta.city} offers ${metrics?.ratio && metrics.ratio < 4 ? 'excellent' : 'good'} home affordability with a typical home costing ${metrics?.homeValue ? `$${metrics.homeValue.toLocaleString()}` : 'less than many areas'}. ${zcta.population && zcta.population < 10000 ? 'As a smaller community, it offers a tight-knit atmosphere' : 'It provides'} a ${state.name} lifestyle at a more accessible price point. Consider your priorities: space vs. amenities, quiet vs. nightlife, commute vs. cost.`
        : `${cityDisplay} offers affordability advantages worth exploring based on your lifestyle needs.`,
    },
    {
      question: `How much are property taxes in ${cityDisplay}?`,
      answer: `Property taxes vary by locality. In ${zcta.stateAbbr || 'this area'}, you can expect to pay approximately 1-2% of your home's value annually in property taxes. For a $${metrics?.homeValue ? metrics.homeValue.toLocaleString() : '250,000'} home, that's roughly $${metrics?.homeValue ? Math.round(metrics.homeValue * 0.011 / 12).toLocaleString() : '230'}-${metrics?.homeValue ? Math.round(metrics.homeValue * 0.02 / 12).toLocaleString() : '415'}/month. Check with local tax assessors for exact rates.`,
    },
    ...(state
      ? [
          {
            question: `What are the cheapest places to live in ${state.name}?`,
            answer: `${cityDisplay} ranks among the more affordable areas in ${state.name} with a ${metrics?.ratio ? formatRatio(metrics.ratio) : 'favorable'} affordability ratio. Browse our ${state.name} affordability rankings to compare all cities and ZIP codes statewide and find the best fit for your budget.`,
          },
        ]
      : []),
    {
      question: 'What is the affordability ratio and why does it matter?',
      answer:
        `The affordability ratio (${metrics?.ratio ? formatRatio(metrics.ratio) : 'home value ÷ income'}) shows how many years of median income it takes to buy the median home. Lower is more affordable. A ratio under 4.0 means most locals can realistically buy homes. Above 6.0 means homeownership requires above-average income or significant savings. ${cityDisplay} is ${metrics?.ratio && metrics.ratio < 4 ? 'highly affordable' : metrics?.ratio && metrics.ratio < 5.5 ? 'moderately affordable' : 'less affordable'} by this measure.`,
    },
  ];

  const locationName = zcta.city && state ? `${zcta.city}, ${state.abbr}` : zcta.city ? zcta.city : `ZIP ${zip}`;

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />

      {/* Breadcrumb Navigation */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            {state && (
              <>
                <Link href={`/${state.slug}/`} className="text-gray-600 hover:text-gray-900 transition">
                  {state.name}
                </Link>
                <span className="text-gray-400">/</span>
              </>
            )}
            <span className="text-gray-900 font-medium">ZIP {zip}</span>
          </nav>
        </div>
      </div>

      {/* Score Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScoreHero score={dashboardData.score} locationName={locationName} />
      </div>

      <DashboardShell
        header={
          <div className="flex items-center justify-between">
            <Toolbar lastUpdated={metrics?.asOfDate} />
          </div>
        }
      >
        {/* Score Breakdown Panel */}
        <div className="mb-8">
          <ScoreBreakdownPanel score={dashboardData.score} />
        </div>

        {!hasMetrics && (
          <Panel>
            <div className="text-center py-6">
              <p className="text-gray-600">
                Data for ZIP {zip} is currently being processed. Check back soon.
              </p>
            </div>
          </Panel>
        )}

        {hasMetrics && (
          <>
            {/* Affordability Ranking - Prominent Display */}
            {metrics.ratio && (
              <div className="mb-8">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-lg p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Affordability Ranking</h2>
                    <p className="text-gray-600">How {zcta.city || `ZIP ${zip}`} compares nationally and within {state?.name || 'the state'}</p>
                  </div>

                  {(() => {
                    const percentile = estimateAffordabilityPercentile(metrics.ratio);
                    if (percentile === null) return null;
                    const isAffordable = percentile >= 50;
                    const percentileLabel = percentile >= 75 ? 'Top 25%' : percentile >= 50 ? 'Top 50%' : percentile >= 25 ? 'Bottom 50%' : 'Bottom 25%';
                    const affordabilityText = percentile >= 75
                      ? 'Among the most affordable areas in the country'
                      : percentile >= 50
                      ? 'More affordable than most areas'
                      : percentile >= 25
                      ? 'Less affordable than most areas'
                      : 'Among the least affordable areas in the country';

                    return (
                      <>
                        {/* Large prominent badge */}
                        <div className={`text-center p-6 rounded-lg mb-6 ${
                          percentile >= 75 ? 'bg-green-100 border-2 border-green-300' :
                          percentile >= 50 ? 'bg-blue-100 border-2 border-blue-300' :
                          percentile >= 25 ? 'bg-yellow-100 border-2 border-yellow-300' :
                          'bg-red-100 border-2 border-red-300'
                        }`}>
                          <div className={`text-6xl font-extrabold mb-2 ${
                            percentile >= 75 ? 'text-green-700' :
                            percentile >= 50 ? 'text-blue-700' :
                            percentile >= 25 ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>{percentileLabel}</div>
                          <div className="text-xl font-semibold text-gray-800">{affordabilityText}</div>
                          <div className="text-sm text-gray-600 mt-2">
                            {isAffordable
                              ? `More affordable than ${percentile}% of U.S. locations`
                              : `Less affordable than ${100 - percentile}% of U.S. locations`
                            }
                          </div>
                        </div>

                        {/* Visual comparison bars */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                              <span>National Comparison</span>
                              <span>{percentile}th percentile</span>
                            </div>
                            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`absolute left-0 top-0 h-full ${
                                  percentile >= 75 ? 'bg-green-500' :
                                  percentile >= 50 ? 'bg-blue-500' :
                                  percentile >= 25 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                } transition-all duration-500`}
                                style={{ width: `${percentile}%` }}
                              ></div>
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                                {isAffordable ? 'More Affordable →' : '← Less Affordable'}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Least Affordable</span>
                              <span>Most Affordable</span>
                            </div>
                          </div>

                          {state && stateRanking && (
                            <div>
                              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                <span>Within {state.name}</span>
                                <span>Ranked #{stateRanking.rank} of {stateRanking.total}</span>
                              </div>
                              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`absolute left-0 top-0 h-full ${
                                    stateRanking.percentile >= 75 ? 'bg-green-500' :
                                    stateRanking.percentile >= 50 ? 'bg-blue-500' :
                                    stateRanking.percentile >= 25 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  } transition-all duration-500`}
                                  style={{ width: `${stateRanking.percentile}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                                  {stateRanking.percentile >= 50 ? 'More Affordable in State →' : '← Less Affordable in State'}
                                </div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Least Affordable</span>
                                <span>Most Affordable</span>
                              </div>
                              <div className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-300 mt-3">
                                {stateRanking.percentile >= 75
                                  ? `Among the top 25% most affordable ZIPs in ${state.name}`
                                  : stateRanking.percentile >= 50
                                  ? `More affordable than ${stateRanking.percentile}% of ZIPs in ${state.name}`
                                  : stateRanking.percentile >= 25
                                  ? `Less affordable than ${100 - stateRanking.percentile}% of ZIPs in ${state.name}`
                                  : `Among the bottom 25% least affordable ZIPs in ${state.name}`
                                }
                                {' • '}
                                <a href={`/${state.slug}/`} className="text-blue-600 hover:underline font-medium">
                                  View all {state.name} rankings
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Affordability Calculator */}
            {metrics.homeValue && metrics.income && (
              <div className="mb-8">
                <AffordabilityCalculator
                  medianHomeValue={metrics.homeValue}
                  medianIncome={metrics.income}
                  cityName={zcta.city || `ZIP ${zip}`}
                  stateAbbr={zcta.stateAbbr || ''}
                />
              </div>
            )}

            {/* Who This Is For */}
            {metrics.ratio && metrics.homeValue && metrics.income && (
              <div className="mb-8">
                <PersonaCards
                  ratio={metrics.ratio}
                  medianHomeValue={metrics.homeValue}
                  medianIncome={metrics.income}
                  cityName={zcta.city || `ZIP ${zip}`}
                  stateAbbr={zcta.stateAbbr || ''}
                  population={zcta.population}
                />
              </div>
            )}

            {/* True Affordability Section - V2 Feature */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">True Affordability by Household Type</h2>
              <p className="text-gray-600 mb-6">
                See the full cost of living in {zcta.city || `ZIP ${zip}`} for different household profiles, including taxes, transportation, childcare, and healthcare.
              </p>
              <TrueAffordabilitySection
                geoType="ZCTA"
                geoId={zcta.zcta}
                cityName={zcta.city || `ZIP ${zip}`}
              />
            </div>

            {/* KPI Grid - moved lower */}
            <div className="mb-8">
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
                  value={metrics.earningPower !== null ? metrics.earningPower.toFixed(4) : null}
                  subvalue="Income / Home Value"
                  tooltip="Higher earning power = stronger incomes relative to home values"
                />
                <KpiCardDense
                  label="Population"
                  value={zcta.population != null ? zcta.population.toLocaleString() : null}
                  subvalue="Total residents"
                />
              </KpiGridDense>
            </div>

            {/* Benchmarks */}
            {dashboardData.benchmarks.length > 0 && (
              <Panel title="Benchmarks" subtitle="Compare to state and national averages">
                <BenchmarkTable rows={dashboardData.benchmarks} />
              </Panel>
            )}

            {/* Nearby Alternatives */}
            {(dashboardData.nearbyBetter.length > 0 || dashboardData.nearbyWorse.length > 0) && (
              <Panel
                title="Nearby ZIP Codes"
                subtitle={state ? `Other ZIPs in ${state.name} for comparison` : 'Other ZIPs for comparison'}
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
              <SourcesFooter zillowDate={metrics.asOfDate} isZCTA={true} />
            </Panel>
          </>
        )}
      </DashboardShell>
    </>
  );
}
