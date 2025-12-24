/**
 * CrownIcon - Achievement/Top ranking
 */

interface CrownIconProps {
  className?: string;
}

export function CrownIcon({ className = 'w-6 h-6' }: CrownIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Crown base */}
      <path
        d="M4 18h16v2H4z"
        fill="currentColor"
        opacity="0.9"
      />

      {/* Crown peaks */}
      <path
        d="M12 6L10 12H14L12 6Z"
        fill="currentColor"
        opacity="0.8"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M6 10L5 14H9L8 10L6 10Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M18 10L16 10L15 14H19L18 10Z"
        fill="currentColor"
        opacity="0.7"
      />

      {/* Base line */}
      <rect x="5" y="14" width="14" height="4" rx="0.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
