'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CityWithMetrics } from '../lib/data';
import { PercentileBadge } from './PercentileBadge';
import { stateFromAbbr } from '../lib/usStates';

type SortColumn = 'rank' | 'city' | 'ratio' | 'population';
type SortDirection = 'asc' | 'desc';

interface RankingsTableProps {
  cities: CityWithMetrics[];
  title: string;
  description?: string;
}

export function RankingsTable({ cities, title, description }: RankingsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      case 'ratio':
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
      return <span className="text-ai-text-subtle ml-1">⇅</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="text-ai-warm ml-1">↑</span>
    ) : (
      <span className="text-ai-warm ml-1">↓</span>
    );
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
            return (
              <Link
                key={city.cityId}
                href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                className="block bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border p-4 hover:border-ai-warm transition-colors shadow-[var(--ai-shadow-card)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ai-warm text-ai-bg font-bold text-sm">
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-ai-warm">
                      {city.metrics?.ratio?.toFixed(1) ?? 'N/A'}×
                    </span>
                    <span className="text-sm text-ai-text-subtle">affordability ratio</span>
                  </div>

                  {city.metrics?.affordabilityPercentile != null && (
                    <div>
                      <PercentileBadge
                        percentile={Math.round(city.metrics.affordabilityPercentile)}
                        size="sm"
                      />
                    </div>
                  )}

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
        <table className="w-full border-collapse bg-ai-surface rounded-[var(--ai-radius-card)] border border-ai-border shadow-[var(--ai-shadow-card)] overflow-hidden">
          <thead>
            <tr className="bg-ai-warm-subtle border-b border-ai-border">
              <th
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
                onClick={() => handleSort('rank')}
              >
                Rank <SortIcon column="rank" />
              </th>
              <th
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
                onClick={() => handleSort('city')}
              >
                City <SortIcon column="city" />
              </th>
              <th
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
                onClick={() => handleSort('ratio')}
              >
                Affordability Ratio <SortIcon column="ratio" />
              </th>
              <th className="text-left p-4 font-semibold text-ai-text">
                Percentile
              </th>
              <th
                className="text-left p-4 font-semibold text-ai-text cursor-pointer hover:bg-ai-warm-subtle/80 transition-colors"
                onClick={() => handleSort('population')}
              >
                Population <SortIcon column="population" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCities.map((city, idx) => {
              const state = stateFromAbbr(city.stateAbbr);
              return (
                <tr
                  key={city.cityId}
                  className={`border-b border-ai-border last:border-b-0 hover:bg-ai-warm-subtle/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-ai-bg' : 'bg-ai-surface'
                  }`}
                >
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ai-warm text-ai-bg font-bold text-sm">
                      {cities.indexOf(city) + 1}
                    </span>
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
                      {city.metrics?.ratio?.toFixed(1) ?? 'N/A'}×
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
