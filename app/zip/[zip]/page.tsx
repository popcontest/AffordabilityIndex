import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { canonical, isZip } from '@/lib/seo';
import { getZipDashboardData, getStateRankingForZip, buildV2ScoreBreakdown, getAcsSnapshot, shouldShowDemographics } from '@/lib/data';
import { calculateRequiredIncome } from '@/lib/required-income';
import { stateFromAbbr } from '@/lib/usStates';
import { getV2Score } from '@/lib/v2-scores';
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
import { RentVsBuyCalculator } from '@/components/RentVsBuyCalculator';
import { HousingEconomicContext } from '@/components/HousingEconomicContext';
import { ExportButton } from '@/components/ExportButton';
import { DataSourceBadge } from '@/components/DataSourceBadge';
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
    ? `Home affordability for ZIP ${zip}${locationStr}. Median home value: ${homeValue ? `$${homeValue.toLocaleString()}` : 'N/A'}, median household income: ${income ? `$${income.toLocaleString()}` : 'N/A'}, affordability ratio: ${ratio.toFixed(1)}.`
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

  // Fetch V2 affordability score (with error handling)
  let v2Score = null;
  try {
    v2Score = await getV2Score('ZCTA', zip);
  } catch (error) {
    console.error('Failed to fetch V2 score for ZIP:', error);
  }

  // Fetch required income for this ZIP (with error handling)
  let requiredIncome = null;
  try {
    requiredIncome = await calculateRequiredIncome('ZCTA', zip);
  } catch (error) {
    console.error('Failed to calculate required income:', error);
  }

  // Fetch ACS demographic data (with error handling)
  let acsData = null;
  try {
    acsData = await getAcsSnapshot('ZCTA', zip);
  } catch (error) {
    console.error('Failed to fetch ACS data for ZIP:', error);
  }

  // Build score breakdown
  const heroScore = buildV2ScoreBreakdown(v2Score);

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

  // Expanded FAQ items with improved answers targeting actual user search queries
  const cityDisplay = zcta.city ? `${zcta.city}, ${zcta.stateAbbr}` : `ZIP ${zip}`;
  const faqItems = [
    {
      question: `Can I afford to buy a home in ${cityDisplay}?`,
      answer: metrics?.homeValue && metrics?.income
        ? `The median home in ${cityDisplay} costs $${metrics.homeValue.toLocaleString()}. To comfortably afford this, you'd typically need a household income of at least $${Math.round(metrics.homeValue / 3.5).toLocaleString()}/year. <strong>Example:</strong> If you earn $${(metrics.income / 1000).toFixed(0)}K, the median home would cost ${metrics.ratio?.toFixed(1)}× your income${metrics.ratio && metrics.ratio > 5 ? ', which is above the 3-4× most experts recommend' : metrics.ratio && metrics.ratio < 4 ? ', which is within the affordable range' : ''}. The median household income here is $${metrics.income.toLocaleString()}, making homeownership ${metrics.ratio && metrics.ratio < 4 ? 'quite accessible' : metrics.ratio && metrics.ratio < 5.5 ? 'moderately affordable' : 'challenging'} compared to national averages. Use our calculator above to see how your income compares.`
        : `Affordability data for ${cityDisplay} is being calculated. Check back soon for detailed home value and income information.`,
    },
    {
      question: `What salary do I need to live in ${cityDisplay}?`,
      answer: metrics?.income
        ? `The median household income in ${cityDisplay} is $${metrics.income.toLocaleString()}/year. <strong>Example:</strong> To afford a $${metrics?.homeValue ? metrics.homeValue.toLocaleString() : '300,000'} home with 20% down at current rates, you'd need ~$${Math.round((metrics?.homeValue || 300000) / 3.5).toLocaleString()}/year income. You can live comfortably here on less if you're renting or have lower housing costs. For homeownership, aim for 28-33% of your gross income going toward housing costs (including mortgage, taxes, and insurance). Use our affordability calculator to see what works for your budget.`
        : `Income data for ${cityDisplay} is being processed. Check back soon for detailed income information.`,
    },
    {
      question: `Is ${cityDisplay} a good place to live?`,
      answer: zcta.city && state
        ? `${zcta.city} offers ${metrics?.ratio && metrics.ratio < 4 ? 'excellent' : metrics?.ratio && metrics.ratio < 5.5 ? 'good' : 'challenging'} home affordability with a typical home costing ${metrics?.homeValue ? `$${metrics.homeValue.toLocaleString()}` : 'less than many areas'}. ${zcta.population && zcta.population < 10000 ? 'As a smaller community, it offers a tight-knit atmosphere' : 'It provides'} a ${state.name} lifestyle at a more accessible price point. Consider your priorities: space vs. amenities, quiet vs. nightlife, commute vs. cost. Visit the area and talk to locals to get a feel for whether it matches your needs.`
        : `${cityDisplay} offers affordability advantages worth exploring based on your lifestyle needs. Research local amenities, schools, and commute options before deciding.`,
    },
    {
      question: `How much are property taxes in ${cityDisplay}?`,
      answer: `Property taxes vary by locality. In ${zcta.stateAbbr || 'this area'}, you can expect to pay approximately 1-2% of your home's value annually in property taxes. <strong>Example:</strong> For a $${metrics?.homeValue ? metrics.homeValue.toLocaleString() : '250,000'} home, that's roughly $${metrics?.homeValue ? Math.round(metrics.homeValue * 0.011 / 12).toLocaleString() : '230'}-${metrics?.homeValue ? Math.round(metrics.homeValue * 0.02 / 12).toLocaleString() : '415'}/month in property taxes alone. Check with local tax assessors for exact rates, as they can vary significantly within a county. Property taxes are a key factor in your total monthly housing cost.`,
    },
    ...(state
      ? [
          {
            question: `What are the cheapest places to live in ${state.name}?`,
            answer: `${cityDisplay} ranks among the ${metrics?.ratio && metrics.ratio < 4 ? 'most' : 'more'} affordable areas in ${state.name} with a ${metrics?.ratio ? formatRatio(metrics.ratio) : 'favorable'} affordability ratio. <strong>Example:</strong> Areas with ratios under 3.0 (like some Midwest cities) have homes costing only 2-3× local income, while coastal areas often exceed 7-8×. Browse our ${state.name} affordability rankings to compare all cities and ZIP codes statewide and find the best fit for your budget. Look for areas with ratios under 4.0 for the most affordable options.`,
          },
        ]
      : []),
    {
      question: 'What is the affordability ratio and why does it matter?',
      answer: `The affordability ratio (${metrics?.ratio ? formatRatio(metrics.ratio) : 'home value ÷ income'}) shows how many years of median income it takes to buy the median home. Lower is more affordable. <strong>Example:</strong> A 3.0 ratio means a $300K home with $100K income (very affordable), while a 9.0 ratio means a $900K home with $100K income (like San Francisco - very challenging). A ratio under 4.0 means most locals can realistically buy homes. Above 6.0 means homeownership requires above-average income or significant savings. ${cityDisplay} is ${metrics?.ratio && metrics.ratio < 4 ? 'highly affordable' : metrics?.ratio && metrics.ratio < 5.5 ? 'moderately affordable' : 'less affordable'} by this measure. This ratio helps you compare housing costs across different locations, but remember it doesn't include mortgage rates, down payments, or taxes.`,
    },
    {
      question: 'Why is the income data so old?',
      answer: `We use the U.S. Census Bureau's American Community Survey (ACS) 5-year estimates for income data, which averages responses from ${acsData?.vintage || '2018-2022'} to provide stable estimates for smaller areas. <strong>Example:</strong> The 2022 5-year estimate (released Dec 2023) averages data from 2018-2022. This 5-year averaging is necessary for reliable ZIP-level data. In contrast, home value data from Zillow is updated monthly. This temporal mismatch means income data may lag current conditions by 1-2 years. We update income annually when new ACS data is released (typically each December).`,
    },
    {
      question: "Why doesn't my ZIP code show up?",
      answer: "We use ZIP Code Tabulation Areas (ZCTAs), which are Census Bureau approximations of ZIP codes. Not all ZIP codes have corresponding ZCTAs—especially PO Box-only ZIPs and some rural areas. Additionally, some ZIPs may lack Zillow home value data coverage, particularly in rural areas or ZIPs with limited housing transactions. If your ZIP isn't available, try searching for a nearby city or county-level data instead.",
    },
    {
      question: "What's the difference between ZIP and ZCTA?",
      answer: "ZCTAs (ZIP Code Tabulation Areas) are Census Bureau geographic areas that approximate USPS ZIP code delivery areas. They differ in important ways: ZCTAs cover land areas, while ZIP codes can be points (like PO boxes) or have no geographic boundary. Rural ZIP codes often don't have ZCTAs. ZCTA boundaries are updated every 10 years with the Census, while ZIP codes change more frequently. We use ZCTAs because they provide consistent geographic boundaries for statistical data.",
    },
    {
      question: 'How accurate is this for small towns or rural ZIPs?',
      answer: `Data for smaller populations is less reliable due to smaller sample sizes in the Census ACS survey. This ZIP area has approximately ${zcta.population?.toLocaleString() || 'N/A'} residents${zcta.population && zcta.population < 5000 ? ', which means the income estimates have higher margins of error (±15-20% or more)' : ''}. <strong>Example:</strong> If the median income shows as $50,000 in a small ZIP, the true value might be $45,000-$55,000. For areas under 5,000 people, consider using city or county-level data for more robust estimates. The affordability ratio should be used as a general guide, not a precise financial planning tool.`,
    },
    {
      question: 'Can I use this to qualify for a mortgage?',
      answer: `No. The affordability ratio is for geographic comparison, not mortgage qualification. Lenders consider many factors not captured here: your credit score, debt-to-income ratio, down payment amount, interest rates, property taxes, insurance, and closing costs. To get pre-approved for a mortgage, contact a lender directly. They'll assess your complete financial situation and tell you exactly how much you can borrow.`,
    },
    {
      question: "What's missing from this affordability measure?",
      answer: `Our affordability ratio only considers home value relative to income. It doesn't include: mortgage interest rates, property taxes, homeowners insurance, HOA fees, closing costs, down payment requirements, maintenance costs, or your other debts. <strong>Real-world example:</strong> A $400K home with 20% down at 6.2% interest costs ~$2,400/month in principal & interest. Add $400/month property tax, $200/month insurance, and you're at $3,000/month before utilities or maintenance. A home with a 3.0 ratio might still be unaffordable if property taxes are high or you have significant student loan debt. Use our True Affordability section above for a more complete picture.`,
    },
    {
      question: 'How often is this data updated?',
      answer: `Zillow home value data is updated monthly (typically released mid-month for the prior month). <strong>Example:</strong> Home values for January 2025 would be released in mid-February 2025. Census income data is updated annually when new 5-year ACS estimates are released, usually each December. We refresh our data as soon as new sources are available. The 'Last Updated' date above shows when the home values were last refreshed. Income data vintage is noted in the Sources section below.`,
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
        <ScoreHero score={heroScore} locationName={locationName} requiredIncome={requiredIncome} />
      </div>

      {/* Data Source Badge - Prominent Display */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex justify-center">
          <DataSourceBadge
            variant="horizontal"
            zillowDate={metrics?.asOfDate}
            acsVintage={acsData?.vintage}
            showUpdateFrequency={true}
          />
        </div>
      </div>

      {/* ZIP vs ZCTA Disclaimer - Above the Fold */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> We use ZIP Code Tabulation Areas (ZCTAs), which may differ from USPS ZIP code boundaries.{' '}
              <a href="/methodology#zcta-clarification" className="text-blue-700 hover:underline font-medium">
                Learn more about the difference
              </a>
            </p>
          </div>
        </div>
      </div>

      <DashboardShell
        header={
          <div className="flex items-center justify-between">
            <Toolbar lastUpdated={metrics?.asOfDate} />
            <ExportButton
              locationName={locationName}
              locationType="ZIP"
              locationId={zip}
              stateAbbr={zcta.stateAbbr || undefined}
              homeValue={metrics?.homeValue}
              medianIncome={metrics?.income}
              affordabilityRatio={metrics?.ratio}
              earningPower={metrics?.earningPower}
              population={zcta.population}
              compositeScore={heroScore.overallScore}
              housingScore={heroScore.housingScore}
              colScore={heroScore.essentialsScore}
              taxScore={heroScore.taxesScore}
              requiredIncome={requiredIncome?.requiredAnnualIncome}
              nationalPercentile={metrics?.ratio ? estimateAffordabilityPercentile(metrics.ratio) : undefined}
              stateRanking={stateRanking ? {
                rank: stateRanking.rank,
                total: stateRanking.total,
                percentile: stateRanking.percentile,
              } : undefined}
              medianRent={acsData?.medianRent}
              housingBurdenPct={acsData?.housingBurdenPct}
              povertyRatePct={acsData?.povertyRatePct}
              zillowDate={metrics?.asOfDate?.toISOString()}
              acsVintage={acsData?.vintage}
              benchmarks={dashboardData.benchmarks.map(b => ({
                name: b.label,
                homeValue: b.homeValue,
                income: b.income,
                ratio: b.ratio,
              }))}
              includeMethodology={true}
              variant="secondary"
              size="md"
            />
          </div>
        }
      >
        {/* Score Breakdown Panel */}
        <div className="mb-8">
          <ScoreBreakdownPanel score={heroScore} />
        </div>

        {/* Small Population Warning */}
        {zcta.population !== null && zcta.population < 5000 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Small Population Area</h4>
                <p className="text-sm text-amber-800">
                  This ZIP area has approximately <strong>{zcta.population.toLocaleString()} residents</strong>.{' '}
                  Data for small populations may be less reliable due to limited sample sizes in surveys.{' '}
                  Consider data from broader geographic areas (city or county level) for more robust estimates.
                </p>
              </div>
            </div>
          </div>
        )}

        {!hasMetrics && (
          <Panel>
            <div className="text-center py-6">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Zillow Data Available</h3>
              <p className="text-gray-600 mb-4">
                This ZIP area doesn't have home value data from Zillow. This typically happens in rural areas or ZIPs with limited housing market coverage.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-medium mb-1">Why is data missing?</p>
                <ul className="text-left text-blue-800 space-y-1 ml-4 list-disc">
                  <li>Zillow may not track home values for this ZIP code</li>
                  <li>The area may be primarily commercial or industrial</li>
                  <li>Rural ZIPs often have limited data coverage</li>
                  <li>ZIP boundaries may not align with Zillow's coverage areas</li>
                </ul>
              </div>
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
                            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentile} aria-valuemin={0} aria-valuemax={100} aria-label={`National affordability comparison: ${percentile}th percentile. ${isAffordable ? `More affordable than ${percentile}% of U.S. locations` : `Less affordable than ${100 - percentile}% of U.S. locations`}`}>
                              <div
                                className={`absolute left-0 top-0 h-full ${
                                  percentile >= 75 ? 'bg-green-500' :
                                  percentile >= 50 ? 'bg-blue-500' :
                                  percentile >= 25 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                } transition-all duration-500`}
                                style={{ width: `${percentile}%` }}
                              ></div>
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700" aria-hidden="true">
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
                              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={stateRanking.percentile} aria-valuemin={0} aria-valuemax={100} aria-label={`State affordability comparison: Ranked ${stateRanking.rank} of ${stateRanking.total} in ${state.name} (${stateRanking.percentile}th percentile)`}>
                                <div
                                  className={`absolute left-0 top-0 h-full ${
                                    stateRanking.percentile >= 75 ? 'bg-green-500' :
                                    stateRanking.percentile >= 50 ? 'bg-blue-500' :
                                    stateRanking.percentile >= 25 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  } transition-all duration-500`}
                                  style={{ width: `${stateRanking.percentile}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700" aria-hidden="true">
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

            {/* True Affordability Section */}
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
                  label="Median Home Value"
                  value={formatCurrency(metrics.homeValue)}
                  subvalue={metrics.asOfDate ? formatDateShort(metrics.asOfDate) : undefined}
                  source="Zillow ZHVI"
                />
                <KpiCardDense
                  label="Median Household Income"
                  value={formatCurrency(metrics.income)}
                  subvalue="Household annual"
                  source="US Census ACS"
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

            {/* Rent vs Buy Calculator */}
            {acsData?.medianRent && metrics?.homeValue && (
              <div className="mb-8">
                <RentVsBuyCalculator
                  medianRent={acsData.medianRent}
                  medianHomeValue={metrics.homeValue}
                  propertyTaxRate={0.012}
                  cityName={cityDisplay}
                  stateAbbr={zcta.stateAbbr || 'US'}
                />
              </div>
            )}

            {/* Housing & Economic Context */}
            {acsData && shouldShowDemographics(acsData) && (
              <div className="mb-8">
                <HousingEconomicContext
                  medianRent={acsData.medianRent!}
                  medianRentMoe={acsData.medianRentMoe!}
                  housingBurdenPct={acsData.housingBurdenPct}
                  housingBurdenPctMoe={acsData.housingBurdenPctMoe}
                  povertyRatePct={acsData.povertyRatePct!}
                  povertyRatePctMoe={acsData.povertyRatePctMoe!}
                  vintage={acsData.vintage}
                />
              </div>
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
