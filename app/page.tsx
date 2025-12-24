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
                19,000+ cities • Updated monthly
              </span>
            </div>

            {/* Headline with warm accent + handwritten flourish */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ai-text">
                Should You Move There? <br />
                <span className="relative inline-block">
                  <span className="text-ai-warm">Get Real Numbers</span>
                  <HandUnderline />
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-ai-text-muted max-w-2xl mx-auto leading-relaxed">
                Before you relocate, negotiate salary, or buy - compare income vs. housing costs across 19,000+ US cities
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
                  Try "Austin, TX" → See income requirements, cost breakdown, and similar cities
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/rankings/"
                className="inline-flex items-center px-6 py-3 bg-ai-primary text-ai-primary-contrast rounded-[var(--ai-radius-md)] hover:bg-ai-primary-hover transition-colors font-semibold text-sm shadow-[var(--ai-shadow-md)]"
              >
                <CompassIcon className="w-4 h-4 mr-2" />
                Find My Affordable City Match
              </Link>
              <Link
                href="/methodology/"
                className="inline-flex items-center px-5 py-2.5 bg-ai-surface text-ai-text border border-ai-border rounded-[var(--ai-radius-md)] hover:bg-ai-surface-elevated transition-colors font-medium text-sm"
              >
                <ScaleIcon className="w-4 h-4 mr-2" />
                How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Emotional Hook - Use Cases */}
      <section className="py-16 bg-ai-warm-subtle">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ai-text mb-6">
            Before You Make Big Decisions
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)]">
              <div className="text-4xl mb-3">🏠</div>
              <h3 className="font-semibold text-ai-text mb-2">Considering Relocation?</h3>
              <p className="text-sm text-ai-text-muted leading-relaxed">
                See if that target city is actually affordable on your budget before making the move
              </p>
            </div>
            <div className="p-6 bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)]">
              <div className="text-4xl mb-3">💼</div>
              <h3 className="font-semibold text-ai-text mb-2">Evaluating Job Offers?</h3>
              <p className="text-sm text-ai-text-muted leading-relaxed">
                Calculate if the salary truly covers living costs, not just rent
              </p>
            </div>
            <div className="p-6 bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)]">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="font-semibold text-ai-text mb-2">Planning Ahead?</h3>
              <p className="text-sm text-ai-text-muted leading-relaxed">
                Research where your career and income could go furthest
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* (3) PROOF - How AffordabilityIndex Works (3-step story) */}
      <section className="py-20 bg-ai-bg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ai-text mb-3">
              How We Help You Compare
            </h2>
            <p className="text-lg text-ai-text-muted max-w-2xl mx-auto">
              Three simple metrics to understand affordability anywhere in America
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1: v1 score */}
            <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-8 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow">
              <div className="w-12 h-12 bg-ai-warm-subtle rounded-[var(--ai-radius-md)] flex items-center justify-center mb-5">
                <ScaleIcon className="w-7 h-7 text-ai-warm" />
              </div>
              <h3 className="text-xl font-semibold text-ai-text mb-3">
                Income vs Housing
              </h3>
              <p className="text-ai-text-muted leading-relaxed">
                Compare median home value to median household income. Lower
                ratios mean homes cost less relative to what people earn.
              </p>
            </div>

            {/* Step 2: v2 basket */}
            <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-8 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow">
              <div className="w-12 h-12 bg-ai-warm-subtle rounded-[var(--ai-radius-md)] flex items-center justify-center mb-5">
                <PetalIcon className="w-7 h-7 text-ai-warm" />
              </div>
              <h3 className="text-xl font-semibold text-ai-text mb-3">
                Cost-of-Living Basket
              </h3>
              <p className="text-ai-text-muted leading-relaxed">
                For select cities, we include essentials: groceries, utilities,
                transportation, and childcare for a complete picture.
              </p>
            </div>

            {/* Step 3: Compare */}
            <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-8 shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow">
              <div className="w-12 h-12 bg-ai-warm-subtle rounded-[var(--ai-radius-md)] flex items-center justify-center mb-5">
                <BloomIcon className="w-7 h-7 text-ai-warm" />
              </div>
              <h3 className="text-xl font-semibold text-ai-text mb-3">
                Cities, Towns, ZIPs
              </h3>
              <p className="text-ai-text-muted leading-relaxed">
                Compare 50k+ cities, 10k-50k small cities, and towns under 10k.
                Also search by ZIP code for precise local insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* (4) EXPLORE - Rankings Sections */}
      {/* Most Affordable Large Cities - TABLE (Primary) */}
      <section className="bg-ai-surface py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={largeCitiesAffordable}
            title="Most Affordable Large Cities"
            description="Major metros (500,000+ population) where your money goes furthest"
          />
        </div>
      </section>

      {/* Most Affordable Mid-Size Cities - TABLE */}
      <section className="bg-ai-bg py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={citiesAffordable}
            title="Most Affordable Mid-Size Cities"
            description="Cities (50,000-499,999 population) with great value"
          />
        </div>
      </section>

      {/* Most Affordable Small Cities - TABLE */}
      <section className="bg-ai-surface py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={smallCitiesAffordable}
            title="Most Affordable Small Cities"
            description="Smaller cities (10,000-49,999 population) with exceptional value"
          />
        </div>
      </section>

      {/* Most Affordable Towns - TABLE */}
      <section className="bg-ai-bg py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={townsAffordable}
            title="Most Affordable Towns"
            description="Small towns (under 10,000 population) with low costs"
          />
        </div>
      </section>

      {/* Least Affordable Large Cities - TABLE (Primary) */}
      <section className="bg-ai-surface py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={largeCitiesExpensive}
            title="Least Affordable Large Cities"
            description="Major metros (500,000+ population) with highest costs"
          />
        </div>
      </section>

      {/* Least Affordable Mid-Size Cities - TABLE */}
      <section className="bg-ai-bg py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={citiesExpensive}
            title="Least Affordable Mid-Size Cities"
            description="Cities (50,000-499,999 population) with higher costs"
          />
        </div>
      </section>

      {/* Least Affordable Small Cities - TABLE */}
      <section className="bg-ai-surface py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={smallCitiesExpensive}
            title="Least Affordable Small Cities"
            description="Smaller cities (10,000-49,999 population) with higher costs"
          />
        </div>
      </section>

      {/* Least Affordable Towns - TABLE */}
      <section className="bg-ai-bg py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={townsExpensive}
            title="Least Affordable Towns"
            description="Small towns (under 10,000 population) with premium pricing"
          />
        </div>
      </section>

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

                {/* Score + Ratio */}
                <div className="space-y-2">
                  {score !== null && grade !== null && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-ai-text-muted">Score:</span>
                      <span
                        className={`text-lg font-semibold ${classes.accent}`}
                        data-testid="place-score"
                      >
                        {formatScore(score)} ({grade})
                      </span>
                    </div>
                  )}
                  {city.metrics?.ratio && (
                    <p
                      className="text-sm text-ai-text-muted"
                      data-testid="place-ratio"
                    >
                      Home value is {formatRatio(city.metrics.ratio)}× income
                    </p>
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
