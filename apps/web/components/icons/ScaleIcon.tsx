/**
 * ScaleIcon - Balance/fairness
 */

interface ScaleIconProps {
  className?: string;
}

export function ScaleIcon({ className = 'w-6 h-6' }: ScaleIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Center pole */}
      <rect x="11" y="4" width="2" height="14" fill="currentColor" opacity="0.8" />

      {/* Crossbar */}
      <rect x="4" y="6" width="16" height="1.5" rx="0.75" fill="currentColor" opacity="0.9" />

      {/* Left pan */}
      <path
        d="M7 8L5 14H9L7 8Z"
        fill="currentColor"
        opacity="0.6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Right pan */}
      <path
        d="M17 8L15 14H19L17 8Z"
        fill="currentColor"
        opacity="0.6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Base */}
      <rect x="8" y="18" width="8" height="2" rx="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
