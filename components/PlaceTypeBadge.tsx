'use client';

import { getPlaceTypeFromPopulation } from '@/lib/placeTypes';

interface PlaceTypeBadgeProps {
  population: number | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Badge component showing place type (City, Small City, Town)
 * Based on population thresholds
 */
export function PlaceTypeBadge({
  population,
  size = 'sm',
  showLabel = true
}: PlaceTypeBadgeProps) {
  const info = getPlaceTypeFromPopulation(population);
  const { Icon } = info;

  // Don't show badge if population is unknown
  if (info.type === 'unknown') return null;

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
  };

  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${info.color} ${info.bgColor} border ${info.borderColor} ${sizeClasses[size]}`}
      title={`${info.label} (${population?.toLocaleString()} residents)`}
    >
      <Icon className={iconSizeClasses[size]} />
      {showLabel && <span>{info.label}</span>}
    </span>
  );
}
