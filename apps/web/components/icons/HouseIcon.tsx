/**
 * HouseIcon - Abstract geometric house
 */

interface HouseIconProps {
  className?: string;
}

export function HouseIcon({ className = 'w-6 h-6' }: HouseIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Roof */}
      <path
        d="M12 4L4 11H6V19H18V11H20L12 4Z"
        fill="currentColor"
        opacity="0.8"
      />

      {/* Door */}
      <rect x="10" y="14" width="4" height="5" fill="currentColor" opacity="0.3" />

      {/* Window */}
      <rect x="7" y="12" width="3" height="3" fill="currentColor" opacity="0.3" />
      <rect x="14" y="12" width="3" height="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
