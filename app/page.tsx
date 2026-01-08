import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import {
  SproutIcon,
  PetalIcon,
  BloomIcon,
  CompassIcon,
  ScaleIcon,
} from '@/components/icons';
import { PercentileBadge } from '@/components/PercentileBadge';
import { PlaceTypeBadge } from '@/components/PlaceTypeBadge';
import { HandUnderline } from '@/components/HandUnderline';
import { RankingsTable } from '@/components/RankingsTable';
import { TabbedRankings } from '@/components/TabbedRankings';
import {
  getNationalLargeCitiesAffordable,
  getNationalLargeCitiesExpensive,
  getNationalCitiesAffordable,
  getNationalCitiesExpensive,
  getNationalSmallCitiesAffordable,
  getNationalSmallCitiesExpensive,
  getNationalTownsAffordable,
  getNationalTownsExpensive,
} from '@/lib/data';
import type { CityWithMetrics } from '@/lib/data';
import { stateFromAbbr } from '@/lib/usStates';
import { formatRatio } from '@/lib/viewModels';
import { clampScore, scoreToGrade, formatScore } from '@/lib/scoring';

export default async function Home() {
  // Get featured data nationwide
  const [
    largeCitiesAffordable,
    largeCitiesExpensive,
    citiesAffordable,
    citiesExpensive,
    smallCitiesAffordable,
    smallCitiesExpensive,
    townsAffordable,
    townsExpensive,
  ] = await Promise.all([
    getNationalLargeCitiesAffordable(10),
    getNationalLargeCitiesExpensive(10),
    getNationalCitiesAffordable(10),
    getNationalCitiesExpensive(10),
    getNationalSmallCitiesAffordable(10),
    getNationalSmallCitiesExpensive(10),
    getNationalTownsAffordable(10),
    getNationalTownsExpensive(10),
  ]);

  return (
    <div className="min-h-screen bg-ai-bg">
      {/* (1) HOOK - Hero Section */}
      <section className="bg-ai-surface border-b border-ai-border">
        <div className="max-w-5xl mx-auto px-4 py-20 sm:py-28">
          <div className="text-center space-y-8">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ai-warm-subtle border border-ai-warm-light">
              <BloomIcon className="w-4 h-4 text-ai-warm" />
              <span className="text-sm font-medium text-ai-text-muted">
                19,000+ places • Varying data coverage • Updated monthly
              </span>
            </div>

            {/* Headline with warm accent + handwritten flourish */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ai-text">
                Find Where Your <br />
                <span className="relative inline-block">
                  <span className="text-ai-warm">Dollar Goes Furthest</span>
                  <HandUnderline />
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-ai-text-muted max-w-2xl mx-auto leading-relaxed">
                Discover affordable places to live across America. See home prices, local incomes, and true affordability in one place.
              </p>
            </div>

            {/* (2) SEARCH */}
            <div className="max-w-2xl mx-auto pt-2">
              <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-6 shadow-[var(--ai-shadow-card)]">
                <h3 className="text-lg font-semibold text-ai-text mb-3 text-center">
                  Get Your Affordability Analysis
                </h3>
                <SearchBox />
                <p className="text-xs text-ai-text-subtle mt-2.5 px-1">
                  Try "Austin, TX" → View home value-to-income ratio and affordability score
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Link
                href="/rankings/"
                className="inline-flex items-center px-8 py-4 bg-ai-warm text-white rounded-[var(--ai-radius-lg)] hover:bg-ai-warm-hover transition-colors font-semibold text-base shadow-lg hover:shadow-xl"
              >
                <CompassIcon className="w-5 h-5 mr-2" />
                Browse Affordable Cities
              </Link>
              <Link
                href="/methodology/"
                className="inline-flex items-center px-6 py-4 bg-ai-surface text-ai-text border-2 border-ai-border rounded-[var(--ai-radius-lg)] hover:bg-ai-surface-elevated transition-colors font-medium text-base"
              >
                <ScaleIcon className="w-5 h-5 mr-2" />
                How It Works
              </Link>
            </div>

            {/* Social proof - trusted by */}
            <div className="pt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-ai-text-subtle">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No sign-up required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Updated monthly</span>
              </div>
            </div>

            {/* Data vintage and source badges */}
            <div className="flex flex-wrap justify-center items-center gap-4 pt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ai-bg border border-ai-border">
                <SproutIcon className="w-4 h-4 text-ai-text-muted" />
                <div className="text-left">
                  <p className="text-xs font-medium text-ai-text">Data from Zillow & US Census</p>
                  <p className="text-xs text-ai-text-subtle">Zillow (current) + Census ACS 2018-2022</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ai-bg border border-ai-border">
                <BloomIcon className="w-4 h-4 text-ai-warm" />
                <span className="text-xs font-medium text-ai-text">Updated monthly</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Emotional Hook - Use Cases */}
      <section className="py-16 bg-ai-warm-subtle" aria-labelledby="use-cases-heading">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 id="use-cases-heading" className="text-2xl sm:text-3xl font-bold text-ai-text mb-6">
            Before You Make Big Decisions
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <article className="p-6 bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)]">
              <div className="text-4xl mb-3" aria-hidden="true">🏠</div>
              <h3 className="font-semibold text-ai-text mb-2">Considering Relocation?</h3>
              <p className="text-sm text-ai-text-muted leading-relaxed">
                See if that target city is actually affordable on your budget before making the move
              </p>
            </article>
            <article className="p-6 bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)]">
              <div className="text-4xl mb-3" aria-hidden="true">💼</div>
              <h3 className="font-semibold text-ai-text mb-2">Evaluating Job Offers?</h3>
              <p className="text-sm text-ai-text-muted leading-relaxed">
                Calculate if the salary truly covers living costs, not just rent
              </p>
            </article>
            <article className="p-6 bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)]">
              <div className="text-4xl mb-3" aria-hidden="true">📈</div>
              <h3 className="font-semibold text-ai-text mb-2">Planning Ahead?</h3>
              <p className="text-sm text-ai-text-muted leading-relaxed">
                Research where your career and income could go furthest
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* (3) PROOF - How AffordabilityIndex Works (3-step story) */}
      <section className="py-20 bg-ai-bg" aria-labelledby="how-it-works-heading">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-ai-text mb-3">
              How We Help You Compare
            </h2>
            <p className="text-lg text-ai-text-muted max-w-2xl mx-auto">
              Three simple metrics to understand affordability anywhere in America
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1: Calculate affordability score */}
            <article className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-8 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow">
              <div className="w-12 h-12 bg-ai-warm-subtle rounded-[var(--ai-radius-md)] flex items-center justify-center mb-5" aria-hidden="true">
                <ScaleIcon className="w-7 h-7 text-ai-warm" />
              </div>
              <h3 className="text-xl font-semibold text-ai-text mb-3">
                Home Value-to-Income Ratio
              </h3>
              <p className="text-ai-text-muted leading-relaxed">
                Compare median home value to median household income. A ratio of 3.0 means homes cost 3× annual income (more affordable), while 8.0 means homes cost 8× income (less affordable). Lower ratios = better affordability.
              </p>
            </article>

            {/* Step 2: Cost of living adjustment */}
            <article className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-8 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow">
              <div className="w-12 h-12 bg-ai-warm-subtle rounded-[var(--ai-radius-md)] flex items-center justify-center mb-5" aria-hidden="true">
                <PetalIcon className="w-7 h-7 text-ai-warm" />
              </div>
              <h3 className="text-xl font-semibold text-ai-text mb-3">
                Cost-of-Living Basket
              </h3>
              <p className="text-ai-text-muted leading-relaxed">
                For select cities, we include essentials: groceries, utilities,
                transportation, and childcare for a complete picture.
              </p>
            </article>

            {/* Step 3: Compare */}
            <article className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-8 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow">
              <div className="w-12 h-12 bg-ai-warm-subtle rounded-[var(--ai-radius-md)] flex items-center justify-center mb-5" aria-hidden="true">
                <BloomIcon className="w-7 h-7 text-ai-warm" />
              </div>
              <h3 className="text-xl font-semibold text-ai-text mb-3">
                Cities, Towns, ZIPs
              </h3>
              <p className="text-ai-text-muted leading-relaxed">
                Compare 50k+ cities, 10k-50k small cities, and towns under 10k.
                Also search by ZIP code for precise local insights.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 bg-ai-surface" aria-labelledby="testimonials-heading">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-ai-text mb-3">
              Helping Americans Make Smarter Moves
            </h2>
            <p className="text-lg text-ai-text-muted max-w-2xl mx-auto">
              Join thousands who've found their perfect affordable city
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-card)] p-8 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-ai-text-secondary mb-6 leading-relaxed">
                "We were thinking about moving to California for a job, but AffordabilityIndex showed us we'd need to spend 60% of our income on housing. We stayed in the Midwest and couldn't be happier."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-ai-warm-subtle rounded-full flex items-center justify-center">
                  <span className="text-ai-warm font-semibold text-lg">JM</span>
                </div>
                <div>
                  <p className="font-semibold text-ai-text">Jennifer M.</p>
                  <p className="text-sm text-ai-text-subtle">Chicago, IL</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-card)] p-8 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-ai-text-secondary mb-6 leading-relaxed">
                "As a remote worker, I can live anywhere. This site helped me find cities with great affordability ratios and good quality of life. I moved to Boise and bought a house for half what I'd pay in Seattle."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-ai-warm-subtle rounded-full flex items-center justify-center">
                  <span className="text-ai-warm font-semibold text-lg">DK</span>
                </div>
                <div>
                  <p className="font-semibold text-ai-text">David K.</p>
                  <p className="text-sm text-ai-text-subtle">Boise, ID</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-ai-bg border border-ai-border rounded-[var(--ai-radius-card)] p-8 shadow-sm">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-ai-text-secondary mb-6 leading-relaxed">
                "Finally, a tool that looks at actual affordability, not just home prices. The income ratio metric helped us understand what we could really afford. We found a great town in Ohio that fits our budget perfectly."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-ai-warm-subtle rounded-full flex items-center justify-center">
                  <span className="text-ai-warm font-semibold text-lg">SR</span>
                </div>
                <div>
                  <p className="font-semibold text-ai-text">Sarah R.</p>
                  <p className="text-sm text-ai-text-subtle">Columbus, OH</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* (4) EXPLORE - Rankings Sections */}
      <TabbedRankings
        largeCitiesAffordable={largeCitiesAffordable}
        largeCitiesExpensive={largeCitiesExpensive}
        citiesAffordable={citiesAffordable}
        citiesExpensive={citiesExpensive}
        smallCitiesAffordable={smallCitiesAffordable}
        smallCitiesExpensive={smallCitiesExpensive}
        townsAffordable={townsAffordable}
        townsExpensive={townsExpensive}
      />

      {/* (5) METHODOLOGY TRUST - Footer CTA */}
      <section className="py-20 bg-ai-surface border-t border-ai-border">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <SproutIcon className="w-12 h-12 text-ai-warm mx-auto mb-6" />
          <h2 className="text-2xl sm:text-3xl font-bold text-ai-text mb-4">
            Transparent. Data-Driven. Always Free.
          </h2>
          <p className="text-lg text-ai-text-muted mb-8 max-w-2xl mx-auto">
            Our methodology combines Zillow home values with US Census income
            data. No paywalls, no gimmicks—just real affordability insights.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/methodology/"
              className="inline-flex items-center px-6 py-3 bg-ai-warm text-white rounded-[var(--ai-radius-md)] hover:bg-ai-warm-hover transition-colors font-medium shadow-[var(--ai-shadow-sm)]"
            >
              Read Our Methodology
            </Link>
            <Link
              href="/data-sources/"
              className="inline-flex items-center px-6 py-3 bg-ai-surface text-ai-text border border-ai-border rounded-[var(--ai-radius-md)] hover:bg-ai-surface-elevated transition-colors font-medium"
            >
              View Data Sources
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Rankings Section Component
 * Displays a grid of cities with consistent styling
 */
function RankingsSection({
  testId,
  title,
  subtitle,
  items,
  tone,
  bgClass,
}: {
  testId: string;
  title: string;
  subtitle: string;
  items: CityWithMetrics[];
  tone: 'affordable' | 'expensive';
  bgClass: string;
}) {
  if (items.length === 0) return null;

  const toneClasses = {
    affordable: {
      accent: 'text-ai-positive',
      hover: 'hover:border-ai-positive-light',
    },
    expensive: {
      accent: 'text-ai-negative',
      hover: 'hover:border-ai-negative-light',
    },
  };

  const classes = toneClasses[tone];

  return (
    <section className={`py-16 ${bgClass}`} data-testid={testId}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-ai-text mb-2">{title}</h2>
            <p className="text-ai-text-muted">{subtitle}</p>
          </div>
          <Link
            href="/rankings/"
            className="text-ai-warm hover:text-ai-warm-hover font-medium text-sm hover:underline transition-colors hidden sm:block"
          >
            View all rankings →
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.slice(0, 9).map((city) => {
            const state = stateFromAbbr(city.stateAbbr);
            const score = clampScore(city.metrics?.affordabilityPercentile ?? null);
            const grade = scoreToGrade(score);

            return (
              <Link
                key={city.cityId}
                href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                className={`bg-ai-surface border border-ai-border rounded-[var(--ai-radius-card)] p-6 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] ${classes.hover} transition-all duration-200 group`}
                data-testid="place-card"
              >
                {/* City Name + Type Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="font-semibold text-ai-text group-hover:text-ai-warm transition-colors truncate"
                        data-testid="place-name"
                      >
                        {city.name}
                      </h3>
                      <span data-testid="place-type" className="flex-shrink-0">
                        <PlaceTypeBadge
                          population={city.population}
                          size="xs"
                          showLabel={false}
                        />
                      </span>
                    </div>
                    <p className="text-xs text-ai-text-subtle">{city.stateAbbr}</p>
                  </div>
                  {city.metrics?.affordabilityPercentile != null && (
                    <PercentileBadge
                      percentile={Math.round(city.metrics.affordabilityPercentile)}
                      size="sm"
                    />
                  )}
                </div>

                {/* Affordability Score */}
                <div className="space-y-2">
                  {score !== null && grade !== null && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-ai-text-muted">Affordability:</span>
                      <span
                        className={`text-lg font-semibold ${classes.accent}`}
                        data-testid="place-score"
                      >
                        {formatScore(score)} ({grade})
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile "View all" link */}
        <div className="text-center mt-8 sm:hidden">
          <Link
            href="/rankings/"
            className="inline-flex items-center text-ai-warm hover:text-ai-warm-hover font-medium text-sm hover:underline transition-colors"
          >
            View all rankings →
          </Link>
        </div>
      </div>
    </section>
  );
}
