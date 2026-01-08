import { Metadata } from 'next';
import { canonical } from '@/lib/seo';
import {
  JsonLd,
  generateBreadcrumbJsonLd,
  generateDatasetJsonLd,
} from '@/components/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  const url = canonical('/data-sources/');

  return {
    title: 'Data Sources',
    description:
      'Data sources for the Affordability Index: Zillow Research ZHVI for home values and US Census Bureau ACS B19013 for median household income.',
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: 'Data Sources | Affordability Index',
      description:
        'Publicly available data from Zillow Research and US Census Bureau used to calculate home affordability.',
      url,
    },
  };
}

export default function DataSourcesPage() {
  const breadcrumbs = [
    { name: 'Home', url: canonical('/') },
    { name: 'Data Sources', url: canonical('/data-sources/') },
  ];

  const datasetJsonLd = generateDatasetJsonLd(
    'Affordability Index Data Sources',
    'Public data sources: Zillow ZHVI and US Census ACS B19013',
    canonical('/data-sources/')
  );

  return (
    <>
      <JsonLd data={[generateBreadcrumbJsonLd(breadcrumbs), datasetJsonLd]} />

      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <main className="mx-auto max-w-4xl px-6 py-16">
          <h1 className="mb-8 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Data Sources
          </h1>

          <div className="mb-8 text-zinc-700 dark:text-zinc-300">
            <p>
              The Affordability Index uses two primary public datasets to calculate
              affordability metrics, including the <strong>Affordability Score</strong> (0-100)
              and detailed affordability ratios for every US city and ZIP code with available data.
            </p>
          </div>

          <div className="space-y-8 text-zinc-700 dark:text-zinc-300">
            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Zillow Home Value Index (ZHVI)
              </h2>

              <div className="mb-4 rounded-lg bg-white p-6 dark:bg-zinc-800">
                <dl className="space-y-2">
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Source:
                    </dt>
                    <dd>
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
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Update Frequency:
                    </dt>
                    <dd>Monthly (typically released mid-month for prior month)</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Coverage:
                    </dt>
                    <dd>
                      Census Places (cities/towns) and ZIP Code Tabulation Areas
                      (ZCTAs)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Description:
                    </dt>
                    <dd>
                      ZHVI represents the typical home value for a given
                      geography. It is a smoothed, seasonally adjusted measure
                      that reflects the middle tier of the housing market.
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="mb-4">
                We use the "Single-Family Residences + Condos, Middle Tier"
                ZHVI dataset, which provides the most comprehensive coverage
                across US geographies.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                US Census American Community Survey (ACS)
              </h2>

              <div className="mb-4 rounded-lg bg-white p-6 dark:bg-zinc-800">
                <dl className="space-y-2">
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Source:
                    </dt>
                    <dd>
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
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Table:
                    </dt>
                    <dd>
                      B19013 - Median Household Income in the Past 12 Months
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Dataset:
                    </dt>
                    <dd>ACS 5-year estimates (most stable and comprehensive)</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Update Frequency:
                    </dt>
                    <dd>
                      Annual (5-year estimates released in December, typically
                      lag 1-2 years)
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Coverage:
                    </dt>
                    <dd>All Census Places and ZCTAs with sufficient sample sizes</dd>
                  </div>
                </dl>
              </div>

              <p className="mb-4">
                <strong>Important:</strong> ACS estimates include margins of
                error (MOE). Smaller geographies (small towns, rural ZCTAs)
                have higher margins of error.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Geographic Coverage
              </h2>

              <div className="mb-4 rounded-lg bg-white dark:bg-zinc-800 p-6">
                <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  What We Cover
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2">
                  <li><strong>Census Places:</strong> ~19,000+ cities, towns, and census-designated places (CDPs) nationwide</li>
                  <li><strong>ZIP Code Tabulation Areas (ZCTAs):</strong> ~32,000+ ZIP areas with available data</li>
                  <li><strong>States:</strong> All 50 states plus District of Columbia</li>
                </ul>

                <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Coverage Gaps & Limitations
                </h3>
                <p className="mb-3">
                  <strong>Not all areas have complete data.</strong> Here's why some locations may be missing or have partial coverage:
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>
                    <strong>Zillow ZHVI Gaps:</strong> Rural areas, small towns, and ZIPs with limited housing transactions may lack Zillow home value data. Commercial/industrial ZIPs may also be excluded.
                  </li>
                  <li>
                    <strong>ACS Data Suppression:</strong> Very small areas (under a few thousand residents) may have income data suppressed for privacy purposes or have high margins of error.
                  </li>
                  <li>
                    <strong>ZIP vs ZCTA:</strong> Some USPS ZIP codes don't have corresponding ZCTAs, particularly PO Box-only ZIPs and rural routes.
                  </li>
                </ul>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Data Quality Indicators
              </h3>
              <p className="mb-4">
                We provide visual indicators to help you assess data reliability:
              </p>
              <ul className="ml-6 list-disc space-y-2 mb-4">
                <li>
                  <strong>Full Coverage:</strong> Both Zillow and Census data available. High reliability.
                </li>
                <li>
                  <strong>Partial Coverage:</strong> One data source missing (e.g., home values available but income data missing). Use with caution.
                </li>
                <li>
                  <strong>Small Population Warning:</strong> Areas under 5,000 residents get a warning banner due to higher margins of error in Census estimates.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                How We Use This Data
              </h2>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Calculating the Affordability Ratio
              </h3>
              <div className="mb-4 rounded-lg bg-white dark:bg-zinc-800 p-6">
                <p className="mb-3 font-mono text-center text-lg">
                  <strong>Affordability Ratio</strong> = Home Value / Median Household Income
                </p>
                <p className="mb-3">
                  We combine Zillow's ZHVI (typical home value) with Census ACS median household income to create this ratio. A lower ratio means homes are more affordable relative to local incomes.
                </p>
                <p>
                  <strong>Example:</strong> If the median home costs $300,000 and median household income is $75,000, the ratio is 4.0 (homes cost 4× annual income).
                </p>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Temporal Mismatch
              </h3>
              <p className="mb-4">
                <strong>Important caveat:</strong> Our ratio combines data from different time periods. Zillow ZHVI is updated monthly (current), while ACS income is a 5-year average (lags 1-2 years). This means we're comparing <strong>current home values</strong> to <strong>income from 1-2 years ago</strong>.
              </p>
              <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Why this matters:</strong> If incomes in your area have changed significantly (up or down) in the past 1-2 years, the affordability ratio may not fully reflect current conditions. We update income data annually when new ACS estimates are released (typically December).
                </p>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Update Schedule
              </h3>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Zillow ZHVI:</strong> Monthly refresh when new data is published (mid-month for prior month)
                </li>
                <li>
                  <strong>Census ACS:</strong> Annual refresh when new 5-year estimates are released (typically December)
                </li>
                <li>
                  <strong>Timestamps:</strong> Each data point includes an "as of" date showing when it was last updated
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Data Attribution
              </h2>

              <p className="mb-4">
                This project uses publicly available data from the following sources. We provide attribution on every page:
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Zillow Research Data
                  </h3>
                  <p className="mb-2">
                    <strong>Attribution:</strong> Data provided by Zillow Research (
                    <a
                      href="https://www.zillow.com/research/data/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      zillow.com/research/data/
                    </a>
                    )
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Zillow Home Value Index (ZHVI) is used under fair use for research and educational purposes. Zillow data is refreshed monthly.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    US Census Bureau Data
                  </h3>
                  <p className="mb-2">
                    <strong>Attribution:</strong> US Census Bureau, American Community Survey (
                    <a
                      href="https://www.census.gov/programs-surveys/acs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      census.gov/programs-surveys/acs
                    </a>
                    )
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    ACS 5-year estimates are public domain data. Income data is updated annually when new estimates are released.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Data Updates
              </h2>

              <p className="mb-4">
                We refresh our data on the following schedule:
              </p>

              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Zillow ZHVI:</strong> Monthly refresh when new data is
                  published
                </li>
                <li>
                  <strong>Census ACS:</strong> Annual refresh when new 5-year
                  estimates are released (typically December)
                </li>
              </ul>

              <p className="mt-4">
                Each data point includes a timestamp indicating the "as of" date
                for that measurement.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Attribution
              </h2>

              <p className="mb-4">
                This project uses publicly available data from:
              </p>

              <ul className="ml-6 list-disc space-y-2">
                <li>
                  Zillow Research (
                  <a
                    href="https://www.zillow.com/research/data/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    zillow.com/research/data/
                  </a>
                  )
                </li>
                <li>
                  US Census Bureau, American Community Survey (
                  <a
                    href="https://www.census.gov/programs-surveys/acs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    census.gov/programs-surveys/acs
                  </a>
                  )
                </li>
              </ul>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
