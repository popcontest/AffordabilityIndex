/**
 * TrendUpIcon - Investment/growth
 */

interface TrendUpIconProps {
  className?: string;
}

export function TrendUpIcon({ className = 'w-6 h-6' }: TrendUpIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Upward trend line */}
      <path
        d="M4 18L8 14L12 16L20 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
        fill="none"
      />

      {/* Arrow */}
      <path
        d="M16 8H20V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
        fill="none"
      />

      {/* Data points */}
      <circle cx="8" cy="14" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
