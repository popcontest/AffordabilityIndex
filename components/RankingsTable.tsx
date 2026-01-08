'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CityWithMetrics } from '../lib/data';
import { PercentileBadge } from './PercentileBadge';
import { stateFromAbbr } from '../lib/usStates';
import { getAffordabilityScore, formatScore } from '../lib/scoring';

type SortColumn = 'rank' | 'city' | 'score' | 'ratio' | 'population';
type SortDirection = 'asc' | 'desc';

interface RankingsTableProps {
  cities: CityWithMetrics[];
  title: string;
  description?: string;
}

export function RankingsTable({ cities, title, description }: RankingsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const formatRatio = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(1);
  };

  const getAffordabilityRankLabel = (rank: number, total: number) => {
    if (rank === 1) return 'Most affordable';
    if (rank === total) return 'Least affordable';
    return `#${rank}`;
  };

  const getRankColor = (rank: number, total: number) => {
    const percentile = rank / total;
    if (percentile <= 0.1) return 'bg-green-100 text-green-800 border-green-300'; // Top 10%
    if (percentile <= 0.25) return 'bg-teal-100 text-teal-800 border-teal-300'; // Top 25%
    if (percentile >= 0.9) return 'bg-red-100 text-red-800 border-red-300'; // Bottom 10%
    if (percentile >= 0.75) return 'bg-orange-100 text-orange-800 border-orange-300'; // Bottom 25%
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedCities = [...cities].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    switch (sortColumn) {
      case 'rank':
        const rankA = cities.indexOf(a) + 1;
        const rankB = cities.indexOf(b) + 1;
        return multiplier * (rankA - rankB);
      case 'city':
        return multiplier * a.name.localeCompare(b.name);
      case 'score':
        // Use affordability score (percentile rank based on home value-to-income ratio)
        const scoreA = getAffordabilityScore(a.metrics);
        const scoreB = getAffordabilityScore(b.metrics);
        // Higher score = more affordable, so reverse for DESC sorting
        return multiplier * (scoreB - scoreA);
      case 'ratio':
        // Lower ratio = more affordable
        const ratioA = a.metrics?.ratio ?? Infinity;
        const ratioB = b.metrics?.ratio ?? Infinity;
        return multiplier * (ratioA - ratioB);
      case 'population':
        return multiplier * ((a.population ?? 0) - (b.population ?? 0));
      default:
        return 0;
    }
  });

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="text-ai-text-subtle ml-1" aria-hidden="true">⇅</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="text-ai-warm ml-1" aria-hidden="true">↑</span>
    ) : (
      <span className="text-ai-warm ml-1" aria-hidden="true">↓</span>
    );
  };

  const getSortButtonAriaLabel = (column: SortColumn, columnLabel: string) => {
    if (sortColumn !== column) {
      return `Sort by ${columnLabel}`;
    }
    return `Sort by ${columnLabel} (${sortDirection === 'asc' ? 'ascending' : 'descending'})`;
  };

  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-ai-text mb-2">{title}</h2>
        {description && (
          <p className="text-ai-text-subtle">{description}</p>
        )}
      </div>

      {/* Mobile: Cards */}
      <div className="block lg:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cities.map((city, idx) => {
            const state = stateFromAbbr(city.stateAbbr);
            const rank = idx + 1;
            const score = getAffordabilityScore(city.metrics);
            const rankLabel = getAffordabilityRankLabel(rank, cities.length);
            return (
              <Link
                key={city.cityId}
                href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                className="block bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-4 hover:border-ai-warm transition-colors shadow-[var(--ai-shadow-card)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border ${getRankColor(rank, cities.length)}`}>
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-ai-text text-lg">
                        {city.name}
                      </h3>
                    </div>
                    <p className="text-sm text-ai-text-subtle">{city.stateName}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    {city.metrics?.affordabilityPercentile != null && (
                      <PercentileBadge
                        percentile={Math.round(city.metrics.affordabilityPercentile)}
                        size="sm"
                      />
                    )}
                    <span className="text-xs text-ai-text-subtle">
                      {rankLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div>
                      <span className="text-ai-text-subtle">Score:</span>{' '}
                      <span className="font-bold text-ai-warm">{formatScore(score)}</span>
                    </div>
                    {city.metrics?.ratio !== null && (
                      <div>
                        <span className="text-ai-text-subtle">Ratio:</span>{' '}
                        <span className="font-semibold text-ai-text">{formatRatio(city.metrics?.ratio ?? null)}</span>
                      </div>
                    )}
                  </div>

                  {city.population && (
                    <p className="text-sm text-ai-text-subtle">
                      Pop: {city.population.toLocaleString()}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)] overflow-hidden" aria-label={`${title} table`}>
          <thead>
            <tr className="bg-ai-warm-subtle border-b border-ai-border">
              <th
                scope="col"
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
              >
                <button
                  onClick={() => handleSort('rank')}
                  className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ai-warm focus:ring-offset-2 rounded"
                  aria-label={getSortButtonAriaLabel('rank', 'Rank')}
                >
                  Rank <SortIcon column="rank" />
                </button>
              </th>
              <th
                scope="col"
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
              >
                <button
                  onClick={() => handleSort('city')}
                  className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ai-warm focus:ring-offset-2 rounded"
                  aria-label={getSortButtonAriaLabel('city', 'City')}
                >
                  City <SortIcon column="city" />
                </button>
              </th>
              <th
                scope="col"
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
              >
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ai-warm focus:ring-offset-2 rounded"
                  aria-label={getSortButtonAriaLabel('score', 'Affordability Score (higher = more affordable)')}
                >
                  Score <SortIcon column="score" />
                </button>
              </th>
              <th
                scope="col"
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
              >
                <button
                  onClick={() => handleSort('ratio')}
                  className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ai-warm focus:ring-offset-2 rounded"
                  aria-label={getSortButtonAriaLabel('ratio', 'Affordability Ratio (lower = more affordable)')}
                >
                  Ratio <SortIcon column="ratio" />
                </button>
              </th>
              <th
                scope="col"
                className="text-left p-4 font-semibold text-ai-text"
              >
                Percentile
              </th>
              <th
                scope="col"
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
              >
                <button
                  onClick={() => handleSort('population')}
                  className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ai-warm focus:ring-offset-2 rounded"
                  aria-label={getSortButtonAriaLabel('population', 'Population')}
                >
                  Population <SortIcon column="population" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCities.map((city, idx) => {
              const state = stateFromAbbr(city.stateAbbr);
              const rank = cities.indexOf(city) + 1;
              const score = getAffordabilityScore(city.metrics);
              const rankLabel = getAffordabilityRankLabel(rank, cities.length);
              return (
                <tr
                  key={city.cityId}
                  className={`border-b border-ai-border last:border-b-0 hover:bg-ai-warm-subtle/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-ai-bg' : 'bg-ai-surface'
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm border ${getRankColor(rank, cities.length)}`}>
                        {rank}
                      </span>
                      {rank <= 3 || rank > cities.length - 3 ? (
                        <span className="text-xs text-ai-text-subtle hidden xl:inline">
                          {rankLabel}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                      className="block hover:text-ai-warm transition-colors"
                    >
                      <div className="font-bold text-ai-text">{city.name}</div>
                      <div className="text-sm text-ai-text-subtle">{city.stateName}</div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className="text-xl font-bold text-ai-warm">
                      {formatScore(score)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-lg font-semibold text-ai-text tabular-nums">
                      {formatRatio(city.metrics?.ratio ?? null)}
                    </span>
                  </td>
                  <td className="p-4">
                    {city.metrics?.affordabilityPercentile != null && (
                      <PercentileBadge
                        percentile={Math.round(city.metrics.affordabilityPercentile)}
                        size="sm"
                      />
                    )}
                  </td>
                  <td className="p-4 text-ai-text-subtle">
                    {city.population ? city.population.toLocaleString() : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
