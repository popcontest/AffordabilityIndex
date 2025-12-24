import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { EmailSignup } from '@/components/EmailSignup';
import { PercentileBadge } from '@/components/PercentileBadge';
import { PlaceTypeBadge } from '@/components/PlaceTypeBadge';
import {
  getNationalCitiesAffordable,
  getNationalCitiesExpensive,
  getNationalSmallCitiesAffordable,
  getNationalSmallCitiesExpensive,
  getNationalTownsAffordable,
  getNationalTownsExpensive,
  getNationalTopZips,
} from '@/lib/data';
import type { CityWithMetrics } from '@/lib/data';
import { US_STATES, stateFromAbbr } from '@/lib/usStates';
import { formatCurrency, formatRatio } from '@/lib/viewModels';
import { clampScore, scoreToGrade, formatScore } from '@/lib/scoring';

export default async function Home() {
  // Get featured data nationwide - run queries in parallel for better performance
  const [
    citiesAffordable,
    citiesExpensive,
    smallCitiesAffordable,
    smallCitiesExpensive,
    townsAffordable,
    townsExpensive,
    featuredZips,
  ] = await Promise.all([
    getNationalCitiesAffordable(12),
    getNationalCitiesExpensive(12),
    getNationalSmallCitiesAffordable(12),
    getNationalSmallCitiesExpensive(12),
    getNationalTownsAffordable(12),
    getNationalTownsExpensive(12),
    getNationalTopZips(6),
  ]);

  // Quick stats
  const totalStates = US_STATES.length;

  // Helper component for city grid sections
  function CitySectionGrid({
    title,
    subtitle,
    items,
    tone,
  }: {
    title: string;
    subtitle: string;
    items: CityWithMetrics[];
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.slice(0, 12).map((city) => {
          const state = stateFromAbbr(city.stateAbbr);
          return (
            <Link
              key={city.cityId}
              href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
              className={`bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg ${classes.card} transition-all duration-200 group hover-lift`}
              data-testid="place-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-gray-900 ${classes.title} transition`} data-testid="place-name">
                      {city.name}
                    </h3>
                    <span data-testid="place-type">
                      <PlaceTypeBadge population={city.population} size="xs" showLabel={false} />
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{city.stateAbbr}</p>
                </div>
                {city.metrics?.affordabilityPercentile != null && (
                  <PercentileBadge
                    percentile={Math.round(city.metrics.affordabilityPercentile)}
                    size="sm"
                  />
                )}
              </div>
              <div className="space-y-1 text-sm">
                {/* Score + Grade (Primary) */}
                {(() => {
                  const score = clampScore(city.metrics?.affordabilityPercentile ?? null);
                  const grade = scoreToGrade(score);
                  return score !== null && grade !== null ? (
                    <p className="text-gray-700">
                      <span className="text-gray-500">Score:</span>{' '}
                      <span className={`font-semibold ${classes.ratio}`} data-testid="place-score">
                        {formatScore(score)} ({grade})
                      </span>
                    </p>
                  ) : null;
                })()}
                {/* Ratio (Secondary) */}
                {city.metrics?.ratio && (
                  <p className="text-xs text-gray-600" data-testid="place-ratio">
                    Home value is {formatRatio(city.metrics.ratio)}× income
                  </p>
                )}
                {city.metrics?.homeValue && (
                  <p className="text-gray-700">
                    <span className="text-gray-500">Home:</span>{' '}
                    <span className="font-medium">{formatCurrency(city.metrics.homeValue)}</span>
                  </p>
                )}
                {city.metrics?.income && (
                  <p className="text-gray-700">
                    <span className="text-gray-500">Income:</span>{' '}
                    <span className="font-medium">{formatCurrency(city.metrics.income)}</span>
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center space-y-6">
            {/* Trust Pill */}
            <div className="inline-block">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>19,000+ cities analyzed • Updated monthly</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900">
                Find Where Your Money Goes <span className="text-indigo-600">Further</span>
              </h1>
              <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
                Compare home affordability across America. Search 19,000+ cities and 33,000+ ZIP codes by price-to-income ratio.
              </p>
            </div>

            {/* Search Box */}
            <div className="max-w-2xl mx-auto pt-2">
              <div className="bg-white rounded-lg border border-zinc-200 p-3 shadow-sm">
                <SearchBox />
                <p className="text-xs text-zinc-500 mt-2 px-1">
                  Try: "Portland, Maine", "Austin, TX", "Maine", or "ZIP 90210"
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Link
                href="/rankings/"
                className="inline-flex items-center px-5 py-2.5 bg-white text-zinc-700 rounded-lg hover:bg-zinc-50 transition border border-zinc-300 font-medium text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Rankings
              </Link>
              <Link
                href="/compare/"
                className="inline-flex items-center px-5 py-2.5 bg-white text-zinc-700 rounded-lg hover:bg-zinc-50 transition border border-zinc-300 font-medium text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Compare Cities
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Bar */}
      <section className="py-10 bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-zinc-900 mb-1">19,000+</div>
              <div className="text-zinc-600 text-sm md:text-base font-medium">Cities Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-zinc-900 mb-1">33,000+</div>
              <div className="text-zinc-600 text-sm md:text-base font-medium">ZIP Codes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-zinc-900 mb-1">50+</div>
              <div className="text-zinc-600 text-sm md:text-base font-medium">States + D.C.</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-zinc-900 mb-1">100%</div>
              <div className="text-zinc-600 text-sm md:text-base font-medium">Free Forever</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-14 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-zinc-900 mb-3">
              Understanding the Affordability Ratio
            </h2>
            <p className="text-base text-zinc-600 max-w-2xl mx-auto">
              We calculate a simple ratio: <span className="font-semibold text-zinc-900">Home Value ÷ Median Income</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-lg border border-zinc-200">
              <div className="text-2xl font-bold text-green-700 mb-2">2.0 - 4.0</div>
              <h3 className="font-semibold text-zinc-900 mb-2">More Affordable</h3>
              <p className="text-sm text-zinc-600">
                Homes cost 2-4× annual income. Generally easier to afford with conventional financing.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-zinc-200">
              <div className="text-2xl font-bold text-amber-700 mb-2">4.0 - 6.0</div>
              <h3 className="font-semibold text-zinc-900 mb-2">Moderate</h3>
              <p className="text-sm text-zinc-600">
                Homes cost 4-6× annual income. May require higher income or larger down payment.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-zinc-200">
              <div className="text-2xl font-bold text-red-700 mb-2">6.0+</div>
              <h3 className="font-semibold text-zinc-900 mb-2">Less Affordable</h3>
              <p className="text-sm text-zinc-600">
                Homes cost 6+× annual income. Challenging without substantial savings or dual income.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Most Affordable Cities (50k+) */}
      <section className="py-16 bg-white" data-testid="section-most-affordable-cities">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Most Affordable Cities
              </h2>
              <p className="text-gray-600">
                Large cities (50,000+ population) where your money goes the furthest
              </p>
            </div>
            <Link
              href="/rankings/"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
            >
              View all rankings →
            </Link>
          </div>
          <CitySectionGrid
            title=""
            subtitle=""
            items={citiesAffordable}
            tone="affordable"
          />
        </div>
      </section>

      {/* Most Affordable Small Cities (10k-50k) */}
      <section className="py-16 bg-gray-50" data-testid="section-most-affordable-small-cities">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Most Affordable Small Cities
              </h2>
              <p className="text-gray-600">
                Small cities (10,000-50,000 population) with great affordability
              </p>
            </div>
          </div>
          <CitySectionGrid
            title=""
            subtitle=""
            items={smallCitiesAffordable}
            tone="affordable"
          />
        </div>
      </section>

      {/* Most Affordable Towns (<10k) */}
      <section className="py-16 bg-white" data-testid="section-most-affordable-towns">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Most Affordable Towns
              </h2>
              <p className="text-gray-600">
                Small towns (under 10,000 population) with the best value
              </p>
            </div>
          </div>
          <CitySectionGrid
            title=""
            subtitle=""
            items={townsAffordable}
            tone="affordable"
          />
        </div>
      </section>

      {/* Least Affordable Cities (50k+) */}
      <section className="py-16 bg-gray-50" data-testid="section-least-affordable-cities">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Least Affordable Cities
              </h2>
              <p className="text-gray-600">
                Large cities (50,000+ population) with the highest home-to-income ratios
              </p>
            </div>
          </div>
          <CitySectionGrid
            title=""
            subtitle=""
            items={citiesExpensive}
            tone="expensive"
          />
        </div>
      </section>

      {/* Least Affordable Small Cities (10k-50k) */}
      <section className="py-16 bg-white" data-testid="section-least-affordable-small-cities">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Least Affordable Small Cities
              </h2>
              <p className="text-gray-600">
                Small cities (10,000-50,000 population) with challenging affordability
              </p>
            </div>
          </div>
          <CitySectionGrid
            title=""
            subtitle=""
            items={smallCitiesExpensive}
            tone="expensive"
          />
        </div>
      </section>

      {/* Least Affordable Towns (<10k) */}
      <section className="py-16 bg-gray-50" data-testid="section-least-affordable-towns">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Least Affordable Towns
              </h2>
              <p className="text-gray-600">
                Small towns (under 10,000 population) with the highest ratios
              </p>
            </div>
          </div>
          <CitySectionGrid
            title=""
            subtitle=""
            items={townsExpensive}
            tone="expensive"
          />
        </div>
      </section>

      {/* Featured ZIPs Section */}
      {featuredZips.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Most Affordable ZIP Codes
                </h2>
                <p className="text-gray-600">
                  Top ZIP codes nationwide with the best affordability
                </p>
              </div>
              <Link
                href="/rankings/"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
              >
                View all rankings →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredZips.map((zip) => (
                <Link
                  key={zip.zcta}
                  href={`/zip/${zip.zcta}/`}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group hover-lift"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                      ZIP {zip.zcta}
                    </h3>
                    {zip.city && zip.stateAbbr && (
                      <p className="text-sm text-gray-600 mt-0.5">{zip.city}, {zip.stateAbbr}</p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {zip.metrics?.ratio && (
                      <p className="text-gray-700">
                        <span className="text-gray-500">Ratio:</span>{' '}
                        <span className="font-semibold text-green-700">{formatRatio(zip.metrics.ratio)}</span>
                      </p>
                    )}
                    {zip.metrics?.homeValue && (
                      <p className="text-gray-700">
                        <span className="text-gray-500">Home:</span>{' '}
                        <span className="font-medium">{formatCurrency(zip.metrics.homeValue)}</span>
                      </p>
                    )}
                    {zip.metrics?.income && (
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
      )}

      {/* Persona-Based Navigation */}
      <section className="py-14 bg-white border-t border-zinc-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-zinc-900 mb-3">
              Find Your Perfect Affordable City
            </h2>
            <p className="text-base text-zinc-600">
              Discover the best places based on your situation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Remote Workers */}
            <Link
              href="/rankings/"
              className="group bg-white border border-zinc-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-2">💻</div>
              <h3 className="text-base font-bold text-zinc-900 mb-2 group-hover:text-indigo-700">
                Remote Workers
              </h3>
              <p className="text-sm text-zinc-600 mb-3">
                Keep your big-city salary, slash your housing costs
              </p>
              <span className="text-indigo-600 font-medium text-xs group-hover:underline">
                Explore cities →
              </span>
            </Link>

            {/* First-Time Buyers */}
            <Link
              href="/rankings/"
              className="group bg-white border border-zinc-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-2">🏡</div>
              <h3 className="text-base font-bold text-zinc-900 mb-2 group-hover:text-indigo-700">
                First-Time Buyers
              </h3>
              <p className="text-sm text-zinc-600 mb-3">
                Find homes you can afford with realistic budgets
              </p>
              <span className="text-indigo-600 font-medium text-xs group-hover:underline">
                Find affordable homes →
              </span>
            </Link>

            {/* Retirees */}
            <Link
              href="/rankings/"
              className="group bg-white border border-zinc-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-2">🌅</div>
              <h3 className="text-base font-bold text-zinc-900 mb-2 group-hover:text-indigo-700">
                Retirees
              </h3>
              <p className="text-sm text-zinc-600 mb-3">
                Stretch retirement savings by relocating
              </p>
              <span className="text-indigo-600 font-medium text-xs group-hover:underline">
                See retirement spots →
              </span>
            </Link>

            {/* Investors */}
            <Link
              href="/rankings/"
              className="group bg-white border border-zinc-200 rounded-lg p-5 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="text-3xl mb-2">📈</div>
              <h3 className="text-base font-bold text-zinc-900 mb-2 group-hover:text-indigo-700">
                RE Investors
              </h3>
              <p className="text-sm text-zinc-600 mb-3">
                Find markets with strong rent-to-price ratios
              </p>
              <span className="text-indigo-600 font-medium text-xs group-hover:underline">
                View markets →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Browse by State Section */}
      <section className="py-14 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-zinc-900 mb-3">
              Browse by State
            </h2>
            <p className="text-base text-zinc-600">
              Explore affordability data for all 50 states + D.C.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-6xl mx-auto">
            {US_STATES.map((state) => (
              <Link
                key={state.abbr}
                href={`/${state.slug}/`}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center hover:bg-blue-50 hover:border-blue-300 hover:shadow transition group"
              >
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition">
                  {state.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">{state.abbr}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <EmailSignup
            variant="modal"
            title="Never Miss an Affordability Update"
            description="Get the latest data on home affordability, market trends, and discover the best places to live in your inbox."
          />
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Data Sources:</strong>
          </p>
          <p className="text-sm text-gray-600">
            Home values from{' '}
            <a
              href="https://www.zillow.com/research/data/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              Zillow Research
            </a>{' '}
            • Income from{' '}
            <span className="font-medium">US Census Bureau ACS</span>
          </p>
        </div>
      </section>
    </div>
  );
}
