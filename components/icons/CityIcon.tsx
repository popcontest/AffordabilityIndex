/**
 * CityIcon - Abstract geometric city skyline
 */

interface CityIconProps {
  className?: string;
}

export function CityIcon({ className = 'w-6 h-6' }: CityIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Tall building */}
      <rect x="4" y="4" width="4" height="16" fill="currentColor" opacity="0.8" />
      <rect x="5" y="6" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="5" y="9" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="5" y="12" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Medium building */}
      <rect x="10" y="8" width="4" height="12" fill="currentColor" opacity="0.9" />
      <rect x="11" y="10" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="11" y="13" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Short building */}
      <rect x="16" y="12" width="4" height="8" fill="currentColor" opacity="0.7" />
      <rect x="17" y="14" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="17" y="16" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Base line */}
      <rect x="3" y="20" width="18" height="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
