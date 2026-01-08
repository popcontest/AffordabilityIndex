import { Metadata } from 'next';
import { canonical } from '@/lib/seo';
import {
  JsonLd,
  generateBreadcrumbJsonLd,
  generateDatasetJsonLd,
} from '@/components/JsonLd';
import { DisclaimerBox } from '@/components/DisclaimerBox';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/methodology/');

  return {
    title: 'Methodology',
    description:
      'Learn how we calculate the Affordability Index using Zillow ZHVI home values and US Census ACS median household income data.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'Methodology | Affordability Index',
      description:
        'Our approach to measuring home affordability across US geographies using publicly available data.',
      url,
    },
  };
}

export default function MethodologyPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Methodology', url: canonical('/methodology/') },
  ];

  const datasetJsonLd = generateDatasetJsonLd(
    'Affordability Index Methodology',
    'Methodology for calculating home affordability ratios using Zillow ZHVI and Census ACS B19013 data',
    canonical('/methodology/')
  );

  return (
    <>
      <JsonLd data={[generateBreadcrumbJsonLd(breadcrumbs), datasetJsonLd]} />

      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <main className="mx-auto max-w-4xl px-6 py-16">
          <h1 className="mb-8 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Methodology
          </h1>

          <div className="space-y-8 text-zinc-700 dark:text-zinc-300">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Core Metric
              </h2>
              <p className="mb-4">
                The Affordability Index uses a simple ratio to measure home
                affordability:
              </p>
              <div className="my-6 rounded-lg bg-white p-6 dark:bg-zinc-800">
                <p className="text-center text-xl font-mono">
                  <strong>Affordability Ratio</strong> = Home Value / Median
                  Household Income
                </p>
              </div>
              <p className="mb-4">
                A higher ratio indicates lower affordability (homes are more
                expensive relative to income).
              </p>

              <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Interpreting the Ratio
              </h3>
              <p className="mb-4">
                What do different ratio values mean in practice? Here's a practical guide:
              </p>
              <div className="mb-6 space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-lg font-bold text-green-700 dark:text-green-400">1.0-2.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">Very Affordable</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Homes cost 1-2× annual income. Rare in most markets today.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">2.0-3.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">Highly Affordable</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Homes cost 2-3× annual income. Buyers can comfortably afford payments.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">3.0-4.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700 dark:text-blue-400">Moderate Affordability</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Homes cost 3-4× annual income. Manageable for many households.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">4.0-5.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-700 dark:text-yellow-400">Stretching Budgets</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Homes cost 4-5× annual income. Many households will be cost-burdened.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-lg font-bold text-orange-700 dark:text-orange-400">5.0-7.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-orange-700 dark:text-orange-400">Expensive</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Homes cost 5-7× annual income. Significant financial stretch required.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-lg font-bold text-red-700 dark:text-red-400">7.0+</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">Very Challenging</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Homes cost 7×+ annual income. Severe housing affordability crisis.</p>
                  </div>
                </div>
              </div>

              <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Concrete Examples
              </h3>
              <p className="mb-4">
                Real-world examples help illustrate what different ratios look like:
              </p>
              <div className="mb-6 space-y-3">
                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">San Francisco, CA</span>
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-semibold">Ratio: 10.0</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    $1,250,000 median home ÷ $125,000 median income = <strong>10.0</strong>. Severe affordability challenge.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">Austin, TX</span>
                    <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-sm font-semibold">Ratio: 5.2</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    $520,000 median home ÷ $100,000 median income = <strong>5.2</strong>. Expensive market.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">Cleveland, OH</span>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-semibold">Ratio: 3.0</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    $150,000 median home ÷ $50,000 median income = <strong>3.0</strong>. Moderate affordability.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">Detroit, MI</span>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-semibold">Ratio: 1.5</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    $75,000 median home ÷ $50,000 median income = <strong>1.5</strong>. Very affordable.
                  </p>
                </div>
              </div>

              <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Urban vs. Rural Differences
              </h3>
              <p className="mb-4">
                It's normal to see significant variation between city types:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li><strong>Major cities</strong> often have ratios of 4-7+ due to job concentration, limited housing, and high demand</li>
                <li><strong>Suburban areas</strong> typically range from 3-5</li>
                <li><strong>Rural areas</strong> often have ratios of 2-3 due to lower home prices</li>
              </ul>
              <p className="mb-4">
                <strong>Important:</strong> Compare your area to similar geographies. A 5.0 ratio in a major city might be typical, while 5.0 in a rural area would be unusually high.
              </p>

              <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Household Type Considerations
              </h3>
              <p className="mb-4">
                The ratio uses <strong>median household income</strong>, which includes all earners in a household. This has important implications:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li><strong>Single-earner households</strong> will find the ratio more challenging than dual-earner households</li>
                <li><strong>Household size</strong> affects affordability needs (larger families need larger homes)</li>
                <li><strong>Your situation matters:</strong> If you earn less than the median, your personal ratio is higher than what's shown</li>
              </ul>
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Example:</strong> If your area has a 4.0 ratio (based on $100k median income), but you earn $60k, your personal ratio is effectively <strong>6.7</strong> — significantly less affordable.
                </p>
              </div>

              <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Historical Context
              </h3>
              <p className="mb-4">
                Understanding how ratios have changed over time provides important context:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li><strong>Historically normal (1970s-1990s):</strong> Ratios of 2-3 were common in most areas</li>
                <li><strong>Early 2000s:</strong> Many markets saw ratios climb to 3-4</li>
                <li><strong>Post-2008:</strong> Brief decline, then steady increase</li>
                <li><strong>2020s:</strong> Many areas now exceed 4-6+ ratios, reflecting the housing affordability crisis</li>
              </ul>
              <p className="mb-4">
                A 5.0 ratio today might be "typical" for a city, but it represents a significant decline in affordability compared to previous decades. This historical context helps you understand whether high ratios are a recent phenomenon or long-standing pattern in your area.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Affordability Score (Primary Metric)
              </h2>
              <p className="mb-4">
                The <strong>Affordability Score</strong> (0-100) is our primary
                headline metric for comparing locations. Higher scores indicate
                better affordability.
              </p>
              <div className="my-6 rounded-lg bg-white p-6 dark:bg-zinc-800">
                <p className="text-lg font-semibold mb-3">How the Score Works</p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li>Score = housing affordability percentile (0-100)</li>
                  <li>100 = most affordable (homes cheapest relative to income)</li>
                  <li>0 = least affordable (homes most expensive relative to income)</li>
                  <li>Percentile computed within peer group (cities, small cities, towns)</li>
                </ul>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Letter Grades
              </h3>
              <p className="mb-4">
                Scores are translated into letter grades for easy interpretation:
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                  <strong className="text-green-700 dark:text-green-400">A+ (95-100)</strong>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Excellent affordability</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                  <strong className="text-green-700 dark:text-green-400">A (90-94)</strong>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Excellent</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <strong className="text-blue-700 dark:text-blue-400">B+ to B- (70-89)</strong>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Good to solid</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                  <strong className="text-yellow-700 dark:text-yellow-400">C+ to C- (55-69)</strong>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Mixed/moderate</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded border border-orange-200 dark:border-orange-800">
                  <strong className="text-orange-700 dark:text-orange-400">D (50-54)</strong>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Challenging</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <strong className="text-red-700 dark:text-red-400">F (&lt;50)</strong>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Very difficult</p>
                </div>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Current Score: Housing Affordability
              </h3>
              <p className="mb-4">
                The <strong>affordability score</strong> (0-100) reflects housing affordability based on the home value-to-income ratio percentile.
                Higher scores indicate more affordable housing (lower home values relative to income).
              </p>
              <p className="mb-4">
                <strong>Calculation:</strong> The score is the percentile rank of the affordability ratio (home value ÷ income)
                compared to all other geographies nationally. A score of 85 means this location is more affordable than 85% of US locations.
              </p>
              <p className="mb-4">
                <strong>Why this metric?</strong> The home value-to-income ratio is the core measure of housing affordability.
                It directly shows whether local incomes can support local home prices, making it the most relevant indicator for
                potential homebuyers and those assessing long-term housing costs.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Historical Context: Composite Score Approach
              </h3>
              <p className="mb-4">
                Previously, we explored calculating composite affordability scores that included housing costs and essential living expenses
                (food, healthcare, transportation, taxes). This approach provided a comprehensive view but added complexity.
              </p>
              <p className="mb-4">
                We've since simplified to focus on the core housing affordability metric, which is what most users care about
                when evaluating locations. The composite calculation methodology remains documented here for transparency.
              </p>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Composite Methodology (Historical Reference):</p>
                <ul className="ml-6 list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li><strong>Housing Affordability (60%):</strong> Home value ÷ income percentile</li>
                  <li><strong>Essentials Affordability (40%):</strong> Disposable income after living costs</li>
                  <li><strong>Overall Score:</strong> Weighted blend of housing and essentials scores</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This composite approach was developed to capture total cost of living, but user feedback indicated that
                housing affordability was the primary decision factor. We continue to track cost-of-living data for
                future enhancements and transparency.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Data Sources
              </h2>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Home Values: Zillow Home Value Index (ZHVI)
              </h3>

              <div className="mb-6 rounded-lg bg-white dark:bg-zinc-800 p-6 border border-zinc-200 dark:border-zinc-700">
                <dl className="space-y-3">
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Source:</dt>
                    <dd className="ml-4">
                      Zillow Research{' '}
                      <a
                        href="https://www.zillow.com/research/data/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        zillow.com/research/data/
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">What it measures:</dt>
                    <dd className="ml-4">
                      ZHVI represents the typical home value for a given geography. It is a smoothed, seasonally adjusted measure that reflects the middle tier of the housing market.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Update frequency:</dt>
                    <dd className="ml-4">
                      <strong>Monthly</strong> (typically released mid-month for the prior month)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Coverage:</dt>
                    <dd className="ml-4">
                      Cities/towns (Census Places) and ZIP Code Tabulation Areas (ZCTAs). Not all areas have coverage—rural and small towns may lack data.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Limitations:</dt>
                    <dd className="ml-4">
                      ZHVI may not be available for all geographies, particularly rural areas or ZIPs with limited housing transactions. Commercial and industrial areas may also lack coverage.
                    </dd>
                  </div>
                </dl>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Income: US Census American Community Survey (ACS)
              </h3>

              <div className="mb-6 rounded-lg bg-white dark:bg-zinc-800 p-6 border border-zinc-200 dark:border-zinc-700">
                <dl className="space-y-3">
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Source:</dt>
                    <dd className="ml-4">
                      US Census Bureau{' '}
                      <a
                        href="https://www.census.gov/programs-surveys/acs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        census.gov/programs-surveys/acs
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">What it measures:</dt>
                    <dd className="ml-4">
                      Table B19013: <strong>Median Household Income in the Past 12 Months</strong>. This is the midpoint of all household incomes in an area—half earn more, half earn less.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Dataset:</dt>
                    <dd className="ml-4">
                      <strong>ACS 5-Year Estimates</strong> (most stable for small geographies)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Update frequency:</dt>
                    <dd className="ml-4">
                      <strong>Annual</strong> (5-year estimates released in December, typically lag 1-2 years behind current conditions)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Coverage:</dt>
                    <dd className="ml-4">
                      All Census Places and ZCTAs with sufficient sample sizes. Very small areas may have suppressed data for privacy.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Limitations:</dt>
                    <dd className="ml-4">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Margin of Error (MOE):</strong> All ACS estimates include uncertainty. Smaller geographies have higher MOEs due to smaller sample sizes.</li>
                        <li><strong>Temporal lag:</strong> 5-year averages represent data from 2018-2022 (or similar vintage), not current income levels.</li>
                        <li><strong>Sample size:</strong> Cities under 25,000 people have higher MOEs and should be used as general guides, not precise measures.</li>
                      </ul>
                    </dd>
                  </div>
                </dl>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Understanding the Temporal Mismatch
              </h3>
              <p className="mb-4">
                Our affordability ratio combines data from <strong>different time periods</strong>:
              </p>
              <ul className="mb-4 ml-6 list-disc space-y-2">
                <li><strong>Zillow ZHVI:</strong> Current monthly data (updated monthly)</li>
                <li><strong>Census ACS:</strong> 5-year average (updated annually, lags 1-2 years)</li>
              </ul>
              <p className="mb-4">
                This means when we calculate the affordability ratio, we're comparing <strong>current home values</strong> to <strong>income from 1-2 years ago</strong>. This temporal mismatch is a necessary trade-off for using reliable, stable income estimates at the city and ZIP level.
              </p>
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Why this matters:</strong> If incomes in your area have changed significantly (up or down) in the past 1-2 years, the affordability ratio may not reflect current conditions. We update income data annually when new ACS estimates are released.
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Important Caveats
              </h2>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                1. Temporal Mismatch
              </h3>
              <p className="mb-4">
                Zillow ZHVI data is current monthly, while ACS income data is a
                5-year average lagging 1-2 years. The ratio combines different
                time periods.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                2. ZIP ≠ ZCTA
              </h3>
              <p className="mb-4">
                We use ZIP Code Tabulation Areas (ZCTAs), which are
                Census-created approximations of USPS ZIP codes. Boundaries may
                differ, and some rural ZIPs may not have corresponding ZCTAs.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                3. Coverage Gaps
              </h3>
              <p className="mb-4">
                Not all geographies have complete data. Small towns and rural
                areas may lack Zillow ZHVI coverage, and some areas have
                insufficient Census sample sizes.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                4. Interpretation Limits
              </h3>
              <p className="mb-4">
                This is a <strong>relative metric</strong> for geographic
                comparison, not a mortgage affordability calculator.
              </p>
              <p className="mb-4">
                <strong>What's NOT included:</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li>Mortgage interest rates (which vary daily)</li>
                <li>Down payment requirements</li>
                <li>Property tax rates (vary by county)</li>
                <li>Homeowners insurance costs</li>
                <li>Debt-to-income ratios</li>
                <li>Closing costs and fees</li>
                <li>Personal financial situation</li>
              </ul>
              <DisclaimerBox variant="general" />
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Secondary Metrics
              </h2>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Earning Power
              </h3>
              <p className="mb-4">
                The inverse of the affordability ratio: Income / Home Value.
                Represents what portion of a home's value is covered by annual
                income.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Affordability Profile (Future)
              </h3>
              <p>
                Quadrant classification using income percentile vs home value
                percentile to identify patterns like "High income, Low cost" or
                "Low income, High cost."
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Glossary of Technical Terms
              </h2>
              <p className="mb-4">
                Understanding these key terms will help you interpret our data:
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">ZCTA (ZIP Code Tabulation Area)</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> A generalized geographic area created by the Census Bureau to approximate USPS ZIP code boundaries.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Why it matters:</strong> The Census Bureau doesn't use actual ZIP codes (those are USPS territories). ZCTAs are the closest statistical approximation.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Important:</strong> ZCTA boundaries may differ from USPS ZIP code boundaries. Some rural ZIP codes don't have corresponding ZCTAs.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">ACS (American Community Survey)</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> An ongoing survey by the US Census Bureau that collects data on a rolling basis, rather than once every 10 years like the decennial census.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Why it matters:</strong> Provides more current data about communities' social and economic characteristics.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Update frequency:</strong> Data is released annually, but different "vintages" cover different time periods (see "5-Year Estimates" below).
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">5-Year Estimates</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> ACS data averaged over 5 years to provide reliable estimates for small geographies.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Why it matters:</strong> Small areas (cities, ZIP codes) don't have enough population for accurate 1-year estimates. The 5-year average increases sample size and reliability.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Trade-off:</strong> More reliable for small areas, but represents an average that lags current conditions by 1-2 years.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Percentile</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> A measure that shows what percentage of values fall below a given point.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>In context:</strong> An affordability score (percentile) of 85 means the location is more affordable than 85% of US geographies.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Range:</strong> Percentiles range from 0 to 100. Higher percentiles = better affordability in our scoring system.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Margin of Error (MOE)</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> A range that reflects the uncertainty in survey estimates. ACS data comes from samples, not complete counts.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Example:</strong> If median income is $50,000 with a MOE of ±$2,000, the true value likely falls between $48,000 and $52,000.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Why it varies:</strong> Smaller geographies have larger MOEs due to smaller sample sizes. We use 5-year estimates to minimize this uncertainty.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Census Place</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> A concentration of population identified by the Census Bureau, including cities, towns, villages, and census-designated places (CDPs).
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Types:</strong> Incorporated places (official municipalities) and CDPs (unincorporated communities with identifiable populations).
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Identifier:</strong> 7-digit GEOID combining state FIPS code and place code.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Median</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What it is:</strong> The middle value in a dataset — half of values are above, half are below.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>Why we use it:</strong> Unlike average (mean), median isn't skewed by extremely high or low values. It better represents "typical" households.
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Example:</strong> In a city with one billionaire and 10,000 regular residents, the average income would be misleading, but the median income would represent the typical resident.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Frequently Asked Questions
              </h2>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Can I use this to qualify for a mortgage?
              </h3>
              <p className="mb-4">
                <strong>No.</strong> This index is for geographic comparison and educational purposes only.
                Mortgage qualification involves many factors not included here:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li>Credit score and history</li>
                <li>Debt-to-income ratio</li>
                <li>Employment stability and income verification</li>
                <li>Current interest rates</li>
                <li>Down payment amount and source</li>
                <li>Assets and reserves</li>
              </ul>
              <p className="mb-6">
                To determine if you qualify for a mortgage, <strong>consult a licensed mortgage lender or financial advisor</strong>.
                They can review your complete financial situation and provide pre-approval.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                What does the percentile mean?
              </h3>
              <p className="mb-4">
                The percentile shows how affordable a location is compared to others. For example:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li><strong>90th percentile</strong> = More affordable than 90% of US cities (very affordable)</li>
                <li><strong>50th percentile</strong> = About average affordability</li>
                <li><strong>10th percentile</strong> = Less affordable than 90% of US cities (expensive)</li>
              </ul>
              <p className="mb-6">
                Higher percentiles = more affordable (lower home prices relative to income).
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Why is my ZIP code different from my city?
              </h3>
              <p className="mb-6">
                ZIP Codes and cities have different boundaries. We use ZCTAs (ZIP Code Tabulation Areas),
                which are Census Bureau approximations of ZIP codes. A city may contain multiple ZIP/ZCTA areas,
                and some ZIP codes cross city lines.
              </p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
