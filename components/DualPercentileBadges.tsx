import { PercentileBadge } from './PercentileBadge';

interface DualPercentileBadgesProps {
  nationalPercentile: number | null;
  statePercentile: number | null;
  stateName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Display both national and state-level percentile badges
 */
export function DualPercentileBadges({
  nationalPercentile,
  statePercentile,
  stateName,
  size = 'md',
}: DualPercentileBadgesProps) {
  if (!nationalPercentile && !statePercentile) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {nationalPercentile !== null && (
        <div className="flex items-center gap-2">
          <PercentileBadge percentile={nationalPercentile} size={size} />
          <span className="text-xs text-gray-600">National</span>
        </div>
      )}
      {statePercentile !== null && stateName && (
        <div className="flex items-center gap-2">
          <PercentileBadge percentile={statePercentile} size={size} />
          <span className="text-xs text-gray-600">{stateName}</span>
        </div>
      )}
    </div>
  );
}
