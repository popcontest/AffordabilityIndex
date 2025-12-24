import { getAffordabilityLabel } from '@/lib/affordabilityLabels';

interface AffordabilityBarProps {
  ratio: number | null;
  minRatio?: number;
  maxRatio?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Visual comparison bar showing affordability on a spectrum
 *
 * Displays a horizontal bar that fills based on the ratio value,
 * color-coded by affordability level.
 */
export function AffordabilityBar({
  ratio,
  minRatio = 1,
  maxRatio = 15,
  showLabel = false,
  className = '',
}: AffordabilityBarProps) {
  if (ratio === null) {
    return (
      <div className={`w-full h-2 bg-gray-200 rounded-full ${className}`}>
        <div className="w-0 h-full rounded-full" />
      </div>
    );
  }

  const label = getAffordabilityLabel(ratio);

  // Calculate percentage (clamped between 0-100%)
  const percentage = Math.min(100, Math.max(0, ((ratio - minRatio) / (maxRatio - minRatio)) * 100));

  // Get color based on affordability level
  const getBarColor = () => {
    if (ratio < 2.5) return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
    if (ratio < 3.5) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (ratio < 5.0) return 'bg-gradient-to-r from-amber-500 to-amber-600';
    if (ratio < 7.0) return 'bg-gradient-to-r from-orange-500 to-orange-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Most Affordable</span>
          <span>Least Affordable</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline bar for use in list items
 */
export function AffordabilityBarCompact({
  ratio,
  className = '',
}: {
  ratio: number | null;
  className?: string;
}) {
  if (ratio === null) return null;

  const label = getAffordabilityLabel(ratio);

  // Simplified bar for compact display
  const getBarColor = () => {
    if (ratio < 2.5) return 'bg-emerald-500';
    if (ratio < 3.5) return 'bg-green-500';
    if (ratio < 5.0) return 'bg-amber-500';
    if (ratio < 7.0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Width calculation: scale 1-10 to 20%-100%
  const width = Math.min(100, Math.max(20, (ratio / 10) * 100));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
