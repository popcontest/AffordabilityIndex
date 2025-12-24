/**
 * FlagIcon - Country/Nation
 */

interface FlagIconProps {
  className?: string;
}

export function FlagIcon({ className = 'w-6 h-6' }: FlagIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Pole */}
      <rect x="5" y="4" width="2" height="16" fill="currentColor" opacity="0.8" />

      {/* Flag (wavy shape) */}
      <path
        d="M7 5 Q10 4 13 5 T19 5 L19 13 Q16 14 13 13 T7 13 Z"
        fill="currentColor"
        opacity="0.7"
        stroke="currentColor"
        strokeWidth="1"
      />

      {/* Wave detail */}
      <path
        d="M7 8 Q10 7 13 8 T19 8"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.4"
      />
    </svg>
  );
}
