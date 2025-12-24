import { getAffordabilityLabel } from '@/lib/affordabilityLabels';

interface AffordabilityBadgeProps {
  ratio: number | null;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

/**
 * Displays an affordability level badge with color coding
 *
 * Examples:
 * - variant="compact": Shows just the label with icon
 * - variant="default": Shows label with colored background
 * - variant="detailed": Shows label with description
 */
export function AffordabilityBadge({
  ratio,
  variant = 'default',
  className = '',
}: AffordabilityBadgeProps) {
  const label = getAffordabilityLabel(ratio);
  const { Icon } = label;

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${label.color} ${className}`}
        title={label.description}
      >
        <Icon className="w-3 h-3" />
        <span>{label.shortLabel}</span>
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`inline-flex flex-col gap-1 px-3 py-2 rounded-lg border-2 ${label.bgColor} ${label.borderColor} ${className}`}
      >
        <div className={`flex items-center gap-1.5 text-sm font-bold ${label.color}`}>
          <Icon className="w-4 h-4" />
          <span>{label.label}</span>
        </div>
        <p className="text-xs text-gray-600">{label.description}</p>
      </div>
    );
  }

  // default variant
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${label.bgColor} ${label.borderColor} ${className}`}
      title={label.description}
    >
      <Icon className="w-4 h-4" />
      <span className={`text-sm font-semibold ${label.color}`}>{label.label}</span>
    </span>
  );
}
