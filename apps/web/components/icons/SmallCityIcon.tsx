/**
 * SmallCityIcon - Abstract small town buildings
 */

interface SmallCityIconProps {
  className?: string;
}

export function SmallCityIcon({ className = 'w-6 h-6' }: SmallCityIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left building */}
      <rect x="5" y="10" width="4" height="10" fill="currentColor" opacity="0.8" />
      <rect x="6" y="12" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="6" y="15" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Middle building */}
      <rect x="10" y="8" width="4" height="12" fill="currentColor" opacity="0.9" />
      <rect x="11" y="10" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="11" y="13" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Right building */}
      <rect x="15" y="11" width="4" height="9" fill="currentColor" opacity="0.7" />
      <rect x="16" y="13" width="2" height="1" fill="currentColor" opacity="0.3" />
      <rect x="16" y="16" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Base */}
      <rect x="4" y="20" width="16" height="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
