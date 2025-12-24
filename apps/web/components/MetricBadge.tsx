import { getPercentileLabel, getPercentileColor } from '@/lib/percentile';

interface MetricBadgeProps {
  value: number;
  label: string;
  inverse?: boolean; // If true, lower values are better (e.g., cost)
  compact?: boolean;
}

/**
 * Flexible metric badge for displaying percentile-based metrics
 * Used in tables and compact layouts
 */
export function MetricBadge({
  value,
  label,
  inverse = false,
  compact = false
}: MetricBadgeProps) {
  // For inverse metrics (cost), flip the percentile for color calculation
  const colorPercentile = inverse ? 100 - value : value;

  const labelText = compact
    ? `${label}: ${getPercentileLabel(value)}`
    : getPercentileLabel(value);

  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full border
        ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'}
        ${getPercentileColor(colorPercentile)}
      `}
      title={`${label}: ${getPercentileLabel(value)}`}
    >
      {labelText}
    </span>
  );
}
