/**
 * SunriseIcon - Retirement/peaceful living
 */

interface SunriseIconProps {
  className?: string;
}

export function SunriseIcon({ className = 'w-6 h-6' }: SunriseIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sun */}
      <circle cx="12" cy="14" r="4" fill="currentColor" opacity="0.7" />

      {/* Rays */}
      <line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="17" y1="9" x2="18.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="7" y1="9" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />

      {/* Horizon */}
      <path
        d="M3 18C3 18 6 15 12 15C18 15 21 18 21 18"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="2" y="19" width="20" height="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
