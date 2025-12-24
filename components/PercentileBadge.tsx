import { getPercentileLabel, getPercentileColor, getPercentileDescription } from '@/lib/percentile';

interface PercentileBadgeProps {
  percentile: number | null;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

/**
 * Display affordability percentile as a colored badge
 * Higher percentile = more affordable
 */
export function PercentileBadge({
  percentile,
  size = 'md',
  showDescription = false
}: PercentileBadgeProps) {
  if (percentile === null) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`
          inline-flex items-center font-semibold rounded-full border
          ${getPercentileColor(percentile)}
          ${sizeClasses[size]}
        `}
      >
        {getPercentileLabel(percentile)}
      </span>
      {showDescription && (
        <span className="text-xs text-gray-600">
          {getPercentileDescription(percentile)}
        </span>
      )}
    </div>
  );
}
