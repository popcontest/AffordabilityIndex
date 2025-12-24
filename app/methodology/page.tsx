import { Metadata } from 'next';
import { canonical } from '@/lib/seo';
import {
  JsonLd,
  generateBreadcrumbJsonLd,
  generateDatasetJsonLd,
} from '@/components/JsonLd';

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
              <p>
                <strong>Example:</strong> A home value of $500,000 and median
                income of $100,000 yields a ratio of 5.0 (homes cost 5× annual
                income).
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
                Version 1: Housing-Only (Current)
              </h3>
              <p className="mb-4">
                The current score (v1) reflects <strong>housing affordability only</strong>,
                based on the home value to income ratio percentile. The ratio itself
                remains available as a detailed metric but is no longer the headline.
              </p>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Version 2: Full Cost-of-Living Basket (MVP - Now Available)
              </h3>
              <p className="mb-4">
                Select cities now display v2 scores that incorporate a weighted blend of:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li><strong>Housing Affordability (60%):</strong> Home value ÷ income percentile</li>
                <li><strong>Essentials Affordability (40%):</strong> Disposable income after living costs (food, healthcare, transportation, taxes, other essentials)</li>
              </ul>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                <strong>v2 MVP Details:</strong>
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                <li><strong>Coverage:</strong> Cities with county-level cost basket data</li>
                <li><strong>Household Type:</strong> Single adult, no children (1_adult_0_kids)</li>
                <li><strong>Essentials Score:</strong> Based on disposable income percentile (median income - annual essentials cost) across all cities with basket data</li>
                <li><strong>Overall Score:</strong> round(0.60 × housing + 0.40 × essentials)</li>
                <li><strong>Fallback:</strong> Cities without cost basket data continue using v1 (housing-only)</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Future enhancements will add granular component breakdowns (taxes, healthcare)
                and expand coverage to more geographies.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Data Sources
              </h2>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Home Values: Zillow Home Value Index (ZHVI)
              </h3>
              <ul className="mb-4 ml-6 list-disc space-y-2">
                <li>
                  <strong>Source:</strong> Zillow Research public data
                </li>
                <li>
                  <strong>Update Frequency:</strong> Monthly
                </li>
                <li>
                  <strong>Coverage:</strong> Cities/towns (Census Places) and
                  ZIP Code Tabulation Areas (ZCTAs)
                </li>
                <li>
                  <strong>Metric:</strong> ZHVI represents the typical home
                  value for a given geography
                </li>
              </ul>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Income: US Census American Community Survey (ACS)
              </h3>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Table:</strong> B19013 (Median Household Income in
                  the Past 12 Months)
                </li>
                <li>
                  <strong>Dataset:</strong> ACS 5-year estimates
                </li>
                <li>
                  <strong>Update Frequency:</strong> Annual
                </li>
                <li>
                  <strong>Coverage:</strong> Census Places and ZCTAs
                </li>
              </ul>
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
              <p>
                This is a <strong>relative metric</strong> for geographic
                comparison, not a mortgage affordability calculator. It does not
                account for interest rates, down payments, property taxes, or
                household debt.
              </p>
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
          </div>
        </main>
      </div>
    </>
  );
}
