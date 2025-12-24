/**
 * Place type classification utilities
 * Classifies cities, small cities, and towns based on population
 */

import { CityIcon } from '@/components/icons/CityIcon';
import { SmallCityIcon } from '@/components/icons/SmallCityIcon';
import { HouseIcon } from '@/components/icons/HouseIcon';
import { LocationIcon } from '@/components/icons/LocationIcon';
import type { ComponentType } from 'react';

export type PlaceType = 'city' | 'small-city' | 'town' | 'unknown';

export interface PlaceTypeInfo {
  type: PlaceType;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Classify a place by population
 * - City: 50,000+
 * - Small City: 10,000-49,999
 * - Town: < 10,000
 */
export function classifyPlace(population: number | null | undefined): PlaceType {
  if (!population || population <= 0) return 'unknown';

  if (population >= 50000) return 'city';
  if (population >= 10000) return 'small-city';
  return 'town';
}

/**
 * Get display information for a place type
 */
export function getPlaceTypeInfo(type: PlaceType): PlaceTypeInfo {
  switch (type) {
    case 'city':
      return {
        type: 'city',
        label: 'City',
        Icon: CityIcon,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      };
    case 'small-city':
      return {
        type: 'small-city',
        label: 'Small City',
        Icon: SmallCityIcon,
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
      };
    case 'town':
      return {
        type: 'town',
        label: 'Town',
        Icon: HouseIcon,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    case 'unknown':
      return {
        type: 'unknown',
        label: 'Place',
        Icon: LocationIcon,
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
      };
  }
}

/**
 * Get place type info directly from population
 */
export function getPlaceTypeFromPopulation(population: number | null | undefined): PlaceTypeInfo {
  const type = classifyPlace(population);
  return getPlaceTypeInfo(type);
}
