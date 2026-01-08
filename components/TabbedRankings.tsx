'use client';

import { useState } from 'react';
import Link from 'next/link';
import { stateFromAbbr } from '@/lib/usStates';
import { formatRatio } from '@/lib/viewModels';
import { clampScore, scoreToGrade, formatScore } from '@/lib/scoring';
import type { CityWithMetrics } from '@/lib/data';

interface TabbedRankingsProps {
  largeCitiesAffordable: CityWithMetrics[];
  largeCitiesExpensive: CityWithMetrics[];
  citiesAffordable: CityWithMetrics[];
  citiesExpensive: CityWithMetrics[];
  smallCitiesAffordable: CityWithMetrics[];
  smallCitiesExpensive: CityWithMetrics[];
  townsAffordable: CityWithMetrics[];
  townsExpensive: CityWithMetrics[];
}

type AffordabilityType = 'affordable' | 'expensive';
type CitySize = 'large' | 'mid' | 'small' | 'towns';

export function TabbedRankings({
  largeCitiesAffordable,
  largeCitiesExpensive,
  citiesAffordable,
  citiesExpensive,
  smallCitiesAffordable,
  smallCitiesExpensive,
  townsAffordable,
  townsExpensive,
}: TabbedRankingsProps) {
  const [affordabilityType, setAffordabilityType] = useState<AffordabilityType>('affordable');
  const [citySize, setCitySize] = useState<CitySize>('large');

  // Get current cities based on selections
  const getCurrentCities = () => {
    if (affordabilityType === 'affordable') {
      switch (citySize) {
        case 'large':
          return largeCitiesAffordable;
        case 'mid':
          return citiesAffordable;
        case 'small':
          return smallCitiesAffordable;
        case 'towns':
          return townsAffordable;
      }
    } else {
      switch (citySize) {
        case 'large':
          return largeCitiesExpensive;
        case 'mid':
          return citiesExpensive;
        case 'small':
          return smallCitiesExpensive;
        case 'towns':
          return townsExpensive;
      }
    }
  };

  const cities = getCurrentCities();
  const isAffordable = affordabilityType === 'affordable';
  const accentColor = isAffordable ? 'text-ai-positive' : 'text-ai-negative';
  const bgColor = isAffordable ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isAffordable ? 'border-green-200' : 'border-red-200';
  const titleColor = isAffordable ? 'text-green-800' : 'text-red-800';

  const getCitySizeLabel = (size: CitySize) => {
    switch (size) {
      case 'large':
        return 'Large Cities';
      case 'mid':
        return 'Mid-Size Cities';
      case 'small':
        return 'Small Cities';
      case 'towns':
        return 'Towns';
    }
  };

  const getPopulationRange = (size: CitySize) => {
    switch (size) {
      case 'large':
        return '500,000+';
      case 'mid':
        return '50,000-499,999';
      case 'small':
        return '10,000-49,999';
      case 'towns':
        return 'Under 10,000';
    }
  };

  return (
    <section className="py-16 bg-ai-surface">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-ai-text mb-3">
            Explore {isAffordable ? 'Most Affordable' : 'Least Affordable'} Places
          </h2>
          <p className="text-lg text-ai-text-muted max-w-2xl mx-auto">
            {isAffordable
              ? 'Discover cities and towns where your money goes furthest'
              : 'See which areas have the highest housing costs relative to income'}
          </p>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          {/* Affordability Type Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-ai-bg border border-ai-border p-1">
              <button
                onClick={() => setAffordabilityType('affordable')}
                className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
                  affordabilityType === 'affordable'
                    ? 'bg-green-100 text-green-800 shadow-sm'
                    : 'text-ai-text-muted hover:text-ai-text'
                }`}
              >
                ✓ Most Affordable
              </button>
              <button
                onClick={() => setAffordabilityType('expensive')}
                className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
                  affordabilityType === 'expensive'
                    ? 'bg-red-100 text-red-800 shadow-sm'
                    : 'text-ai-text-muted hover:text-ai-text'
                }`}
              >
                ! Least Affordable
              </button>
            </div>
          </div>

          {/* City Size Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            {(Object.keys({ large: null, mid: null, small: null, towns: null }) as CitySize[]).map((size) => (
              <button
                key={size}
                onClick={() => setCitySize(size)}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm border-2 transition-all ${
                  citySize === size
                    ? `${borderColor} ${titleColor} ${bgColor}`
                    : 'border-ai-border text-ai-text-muted hover:border-ai-warm hover:text-ai-warm'
                }`}
              >
                {getCitySizeLabel(size)}
                <span className="block text-xs opacity-75">{getPopulationRange(size)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rankings Table */}
        <div className={`mt-8 rounded-xl overflow-hidden border-2 ${borderColor} shadow-lg`}>
          <div className={`${bgColor} border-b-2 ${borderColor} px-6 py-4`}>
            <h3 className={`text-2xl font-bold ${titleColor} flex items-center gap-2`}>
              {isAffordable ? '✓' : '!'} {isAffordable ? 'Most Affordable' : 'Least Affordable'} {getCitySizeLabel(citySize)}
            </h3>
            <p className={`text-sm ${isAffordable ? 'text-green-700' : 'text-red-700'} mt-1`}>
              {isAffordable ? 'Best value ratios' : 'Highest cost burden'} ({getPopulationRange(citySize)} population)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Population
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Home Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cities.slice(0, 10).map((city, index) => {
                  const state = stateFromAbbr(city.stateAbbr);
                  const score = clampScore(city.metrics?.affordabilityPercentile ?? null);
                  const grade = scoreToGrade(score);

                  return (
                    <tr
                      key={city.cityId}
                      className={`hover:${isAffordable ? 'bg-green-50' : 'bg-red-50'} transition`}
                    >
                      <td className="px-4 py-4 text-sm font-bold text-gray-700">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/${state?.slug || city.stateAbbr.toLowerCase()}/${city.slug}/`}
                          className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition"
                        >
                          {city.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-center text-xs text-gray-600">
                        {city.stateAbbr}
                      </td>
                      <td className="px-4 py-4 text-right text-xs text-gray-600">
                        {city.population?.toLocaleString() || '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {score !== null && grade !== null ? (
                          <span className={`text-sm font-bold ${accentColor}`}>
                            {formatScore(score)} ({grade})
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-xs text-gray-600">
                        {city.metrics?.homeValue ? formatRatio(city.metrics.homeValue) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* View All Link */}
        <div className="text-center mt-8">
          <Link
            href={`/rankings/${citySize === 'large' ? 'large-cities' : citySize === 'mid' ? 'mid-size-cities' : citySize === 'small' ? 'small-cities' : 'towns'}/`}
            className="inline-flex items-center text-ai-warm hover:text-ai-warm-hover font-medium text-sm hover:underline transition-colors"
          >
            View complete {getCitySizeLabel(citySize)} rankings →
          </Link>
        </div>
      </div>
    </section>
  );
}
