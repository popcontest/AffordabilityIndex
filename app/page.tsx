import Link from 'next/link';
import type { Metadata } from 'next';
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
import { JsonLd } from '@/components/JsonLd';
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://affordabilityindex.org';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Home Affordability Calculator & Rankings - Find Where Your Dollar Goes Furthest',
    description: 'Compare home affordability across 19,000+ US cities, towns, and ZIP codes. See home values, median incomes, and affordability scores. Find the most affordable places to live in America.',
    keywords: [
      'home affordability',
      'affordable cities',
      'cost of living',
      'home value to income ratio',
      'most affordable cities',
      'affordable towns',
      'housing affordability',
      'real estate affordability',
      'where to buy a home',
      'affordable housing',
      'median home value',
      'household income',
      'affordability calculator',
      'best places to buy a home',
      'cheapest cities to live',
      'housing market',
      'Zillow home values',
      'Census income data',
    ].join(', '),
    openGraph: {
      type: 'website',
      url: siteUrl,
      title: 'Home Affordability Calculator & Rankings - Find Where Your Dollar Goes Furthest',
      description: 'Compare home affordability across 19,000+ US cities, towns, and ZIP codes. See home values, median incomes, and affordability scores.',
      images: [
        {
          url: `${siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Affordability Index - Find Where Your Dollar Goes Furthest',
        },
      ],
      siteName: 'Affordability Index',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Home Affordability Calculator & Rankings - Find Where Your Dollar Goes Furthest',
      description: 'Compare home affordability across 19,000+ US cities, towns, and ZIP codes. Free tool with data from Zillow & US Census.',
      images: [`${siteUrl}/og-image.png`],
    },
    alternates: {
      canonical: siteUrl,
    },
  };
}

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

  // Create structured data for WebSite schema
  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Affordability Index',
    url: siteUrl,
    description: 'Compare home affordability across 19,000+ US cities, towns, and ZIP codes. See home values, median incomes, and affordability scores.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/api/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // Create structured data for FAQ
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How is home affordability calculated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We calculate home affordability by comparing the median home value to the median household income for each location. A lower ratio (e.g., 3.0) means homes cost 3× annual income (more affordable), while a higher ratio (e.g., 8.0) means homes cost 8× income (less affordable). We use Zillow Home Value Index (ZHVI) for home prices and US Census ACS data for income.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is a good home affordability ratio?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A good home affordability ratio is generally considered to be 3.0 or lower, meaning homes cost 3× or less of the median annual income. Ratios between 3.0-4.5 are considered moderately affordable. Ratios above 5.0 are considered expensive, and ratios above 7.0 are severely unaffordable.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where can I find the most affordable cities in the US?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The most affordable cities in the US are typically found in the Midwest (e.g., Indiana, Ohio, Michigan) and South (e.g., Alabama, Mississippi). These areas often have affordability ratios below 3.0. Use our rankings to explore affordable cities by population size.',
        },
      },
    ],
  };

  // Create structured data for Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Affordability Index',
    url: siteUrl,
    description: 'Free home affordability comparison tool covering 19,000+ US locations',
    logo: `${siteUrl}/logo.png`,
    sameAs: [],
  };

  return (
    <>
      {/* Structured Data */}
      <JsonLd data={webSiteSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={organizationSchema} />

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
                Compare home affordability across 19,000+ US cities, towns, and ZIP codes. Find the most affordable places to live in America with data from Zillow and US Census.
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

            {/* Social proof - trusted by */}
            <div className="pt-6 pb-4 flex flex-wrap justify-center items-center gap-6 text-sm text-ai-text-subtle">
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

            {/* Quick actions */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
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

      {/* (4) EXPLORE - Rankings Sections */}
      {/* Jump Links Navigation */}
      <div className="bg-ai-bg border-b border-ai-border py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-ai-text mb-2">
              Explore Rankings
            </h2>
            <p className="text-ai-text-muted">Jump to city size:</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#large-cities-affordable"
              className="px-6 py-3 bg-ai-surface border-2 border-ai-border rounded-lg hover:border-ai-warm hover:text-ai-warm transition font-medium text-sm"
            >
              Large Cities
            </a>
            <a
              href="#midsize-cities-affordable"
              className="px-6 py-3 bg-ai-surface border-2 border-ai-border rounded-lg hover:border-ai-warm hover:text-ai-warm transition font-medium text-sm"
            >
              Mid-Size Cities
            </a>
            <a
              href="#small-cities-affordable"
              className="px-6 py-3 bg-ai-surface border-2 border-ai-border rounded-lg hover:border-ai-warm hover:text-ai-warm transition font-medium text-sm"
            >
              Small Cities
            </a>
            <a
              href="#towns-affordable"
              className="px-6 py-3 bg-ai-surface border-2 border-ai-border rounded-lg hover:border-ai-warm hover:text-ai-warm transition font-medium text-sm"
            >
              Towns
            </a>
          </div>
        </div>
      </div>

      {/* Most Affordable Large Cities - TABLE (Primary) */}
      <section id="large-cities-affordable" className="bg-ai-surface py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={largeCitiesAffordable}
            title="Most Affordable Large Cities"
            description="Major metros (500,000+ population) where your money goes furthest"
          />
        </div>
      </section>

      {/* Most Affordable Mid-Size Cities - TABLE */}
      <section id="midsize-cities-affordable" className="bg-ai-bg py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={citiesAffordable}
            title="Most Affordable Mid-Size Cities"
            description="Cities (50,000-499,999 population) with great value"
          />
        </div>
      </section>

      {/* Most Affordable Small Cities - TABLE */}
      <section id="small-cities-affordable" className="bg-ai-surface py-16">
        <div className="max-w-7xl mx-auto px-4">
          <RankingsTable
            cities={smallCitiesAffordable}
            title="Most Affordable Small Cities"
            description="Smaller cities (10,000-49,999 population) with exceptional value"
          />
        </div>
      </section>

      {/* Most Affordable Towns - TABLE */}
      <section id="towns-affordable" className="bg-ai-bg py-16">
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
    </>
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
