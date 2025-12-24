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
