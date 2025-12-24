/**
 * LaptopIcon - Remote work icon
 */

interface LaptopIconProps {
  className?: string;
}

export function LaptopIcon({ className = 'w-6 h-6' }: LaptopIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Screen */}
      <rect x="4" y="5" width="16" height="11" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="5" y="6" width="14" height="9" fill="currentColor" opacity="0.2" />

      {/* Base */}
      <path
        d="M2 17H22L21 19H3L2 17Z"
        fill="currentColor"
        opacity="0.9"
      />

      {/* Trackpad indicator */}
      <rect x="10" y="18" width="4" height="0.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
