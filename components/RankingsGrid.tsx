'use client';

import { useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { FilterBar, SortOption, AffordabilityFilter } from './FilterBar';
import { RichTooltip } from './RichTooltip';
import { AffordabilityBadge } from './AffordabilityBadge';
import { AffordabilityBarCompact } from './AffordabilityBar';
import { formatRatioPlain, getAffordabilityLevel } from '@/lib/affordabilityLabels';
import { stateFromAbbr } from '@/lib/usStates';
import { getAffordabilityScore } from '@/lib/scoring';

interface CityRanking {
  cityId: string;
  name: string;
  stateAbbr: string;
  slug: string;
  population: number | null;
  metrics: {
    ratio: number | null;
    income: number | null;
    homeValue: number | null;
    asOfDate: Date | null;
  } | null;
}

interface StateRanking {
  stateAbbr: string;
  stateName: string;
  medianRatio: number;
  medianIncome: number;
  medianHomeValue: number;
  cityCount: number;
  slug: string;
}

interface RankingsGridProps {
  stateRankings: StateRanking[];
  mostAffordableCities: CityRanking[];
  leastAffordableCities: CityRanking[];
}

/**
 * Memoized state ranking item to prevent unnecessary re-renders
 */
const StateRankingItem = memo(function StateRankingItem({
  state,
  index,
}: {
  state: StateRanking;
  index: number;
}) {
  return (
    <RichTooltip
      title={state.stateName}
      subtitle={`Ranked #${index + 1} in filtered results`}
      income={state.medianIncome}
      homeValue={state.medianHomeValue}
      ratio={state.medianRatio}
    >
      <Link
        href={`/${state.slug}/`}
        className="block px-5 py-4 hover:bg-blue-50 transition-all duration-200 group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs font-bold text-gray-400 w-6 flex-shrink-0">
              #{index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 group-hover:text-blue-700 truncate">
                {state.stateName}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <AffordabilityBarCompact ratio={state.medianRatio} />
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {formatRatioPlain(state.medianRatio)}
                </span>
              </div>
            </div>
          </div>
          <AffordabilityBadge ratio={state.medianRatio} variant="compact" />
        </div>
      </Link>
    </RichTooltip>
  );
});

/**
 * Memoized city ranking item to prevent unnecessary re-renders
 */
const CityRankingItem = memo(function CityRankingItem({
  city,
  index,
  hoverColor,
  textHoverColor,
}: {
  city: CityRanking;
  index: number;
  hoverColor: string;
  textHoverColor: string;
}) {
  const state = stateFromAbbr(city.stateAbbr);
  return (
    <RichTooltip
      title={`${city.name}, ${city.stateAbbr}`}
      subtitle={`#${index + 1} in filtered results`}
      income={city.metrics?.income}
      homeValue={city.metrics?.homeValue}
      ratio={city.metrics?.ratio || null}
    >
      <Link
        href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
        className={`block px-5 py-4 ${hoverColor} transition-all duration-200 group`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xs font-bold text-gray-400 w-6 flex-shrink-0">
              #{index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-gray-900 ${textHoverColor} truncate`}>
                {city.name}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 mb-1.5">
                {city.stateAbbr}
                {city.population && (
                  <> • {city.population.toLocaleString()}</>
                )}
              </div>
              <div className="flex items-center gap-2">
                <AffordabilityBarCompact ratio={city.metrics?.ratio || null} />
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {city.metrics?.ratio ? formatRatioPlain(city.metrics.ratio) : '—'}
                </span>
              </div>
            </div>
          </div>
          <AffordabilityBadge ratio={city.metrics?.ratio || null} variant="compact" />
        </div>
      </Link>
    </RichTooltip>
  );
});

/**
 * Client-side component for filterable/sortable rankings grid
 */
export function RankingsGrid({
  stateRankings,
  mostAffordableCities,
  leastAffordableCities,
}: RankingsGridProps) {
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<AffordabilityFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('ratio-asc');

  // Combine cities for unified filtering
  const allCities = useMemo(() => {
    return [...mostAffordableCities, ...leastAffordableCities];
  }, [mostAffordableCities, leastAffordableCities]);

  // Filter and sort states
  const filteredStates = useMemo(() => {
    let filtered = [...stateRankings];

    // Filter by affordability level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((state) => {
        const level = getAffordabilityLevel(state.medianRatio);
        return level === selectedLevel;
      });
    }

    // Sort states
    switch (sortBy) {
      case 'ratio-asc':
        filtered.sort((a, b) => a.medianRatio - b.medianRatio);
        break;
      case 'ratio-desc':
        filtered.sort((a, b) => b.medianRatio - a.medianRatio);
        break;
      case 'name':
        filtered.sort((a, b) => a.stateName.localeCompare(b.stateName));
        break;
      case 'income':
        filtered.sort((a, b) => b.medianIncome - a.medianIncome);
        break;
      case 'price':
        filtered.sort((a, b) => b.medianHomeValue - a.medianHomeValue);
        break;
    }

    return filtered;
  }, [stateRankings, selectedLevel, sortBy]);

  // Filter and sort cities
  const filteredCities = useMemo(() => {
    let filtered = [...allCities];

    // Filter by state
    if (selectedState !== 'all') {
      filtered = filtered.filter((city) => city.stateAbbr === selectedState);
    }

    // Filter by affordability level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((city) => {
        if (!city.metrics?.ratio) return false;
        const level = getAffordabilityLevel(city.metrics.ratio);
        return level === selectedLevel;
      });
    }

    // Sort cities
    switch (sortBy) {
      case 'ratio-asc': // Most affordable first
        filtered.sort((a, b) => {
          const scoreA = getAffordabilityScore(a.metrics);
          const scoreB = getAffordabilityScore(b.metrics);
          return scoreB - scoreA; // DESC: higher score = more affordable
        });
        break;
      case 'ratio-desc': // Least affordable first
        filtered.sort((a, b) => {
          const scoreA = getAffordabilityScore(a.metrics);
          const scoreB = getAffordabilityScore(b.metrics);
          return scoreA - scoreB; // ASC: lower score = less affordable
        });
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'income':
        filtered.sort((a, b) => {
          const incomeA = a.metrics?.income ?? 0;
          const incomeB = b.metrics?.income ?? 0;
          return incomeB - incomeA;
        });
        break;
      case 'price':
        filtered.sort((a, b) => {
          const priceA = a.metrics?.homeValue ?? 0;
          const priceB = b.metrics?.homeValue ?? 0;
          return priceB - priceA;
        });
        break;
    }

    return filtered;
  }, [allCities, selectedState, selectedLevel, sortBy]);

  // Split cities into affordable and least affordable based on original data
  const filteredMostAffordable = useMemo(() => {
    return filteredCities.filter((city) =>
      mostAffordableCities.some((c) => c.cityId === city.cityId)
    );
  }, [filteredCities, mostAffordableCities]);

  const filteredLeastAffordable = useMemo(() => {
    return filteredCities.filter((city) =>
      leastAffordableCities.some((c) => c.cityId === city.cityId)
    );
  }, [filteredCities, leastAffordableCities]);

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          onStateFilter={setSelectedState}
          onAffordabilityFilter={setSelectedLevel}
          onSort={setSortBy}
        />
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing{' '}
        <span className="font-semibold text-gray-900">{filteredStates.length}</span> states and{' '}
        <span className="font-semibold text-gray-900">{filteredCities.length}</span> cities
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: States Rankings */}
        <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow duration-300 overflow-hidden group">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-5 py-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-ai-warm" />
            <h2 className="text-xl font-bold relative z-10">States</h2>
            <p className="text-sm text-white/90 relative z-10">
              {filteredStates.length} {filteredStates.length === 1 ? 'State' : 'States'}
            </p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredStates.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500">
                <p>No states match your filters</p>
              </div>
            ) : (
              filteredStates.map((state, index) => (
                <StateRankingItem key={state.stateAbbr} state={state} index={index} />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Most Affordable Cities */}
        <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow duration-300 overflow-hidden group">
          <div className="bg-ai-positive text-white px-5 py-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <h2 className="text-xl font-bold relative z-10">Most Affordable Cities</h2>
            <p className="text-sm text-white/90 relative z-10">
              {filteredMostAffordable.length} {filteredMostAffordable.length === 1 ? 'City' : 'Cities'} (50,000+ people)
            </p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredMostAffordable.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500">
                <p>No cities match your filters</p>
              </div>
            ) : (
              filteredMostAffordable.slice(0, 50).map((city, index) => (
                <CityRankingItem
                  key={city.cityId}
                  city={city}
                  index={index}
                  hoverColor="hover:bg-green-50"
                  textHoverColor="group-hover:text-green-700"
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Least Affordable Cities */}
        <div className="bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)] hover:shadow-[var(--ai-shadow-card-hover)] transition-shadow duration-300 overflow-hidden group">
          <div className="bg-ai-negative text-white px-5 py-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <h2 className="text-xl font-bold relative z-10">Least Affordable Cities</h2>
            <p className="text-sm text-white/90 relative z-10">
              {filteredLeastAffordable.length} {filteredLeastAffordable.length === 1 ? 'City' : 'Cities'} (50,000+ people)
            </p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredLeastAffordable.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500">
                <p>No cities match your filters</p>
              </div>
            ) : (
              filteredLeastAffordable.slice(0, 50).map((city, index) => (
                <CityRankingItem
                  key={city.cityId}
                  city={city}
                  index={index}
                  hoverColor="hover:bg-red-50"
                  textHoverColor="group-hover:text-red-700"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
