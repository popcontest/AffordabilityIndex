/**
 * ChartIcon - Data/statistics
 */

interface ChartIconProps {
  className?: string;
}

export function ChartIcon({ className = 'w-6 h-6' }: ChartIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bars */}
      <rect x="4" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" opacity="0.9" />

      {/* Base line */}
      <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}
