/**
 * SproutIcon - Growth & Beginning
 * Abstract geometric botanical icon inspired by Behance 2025 "Flower Power" trend
 * Represents new growth, starting points, early stages
 */

interface SproutIconProps {
  className?: string;
}

export function SproutIcon({ className = 'w-6 h-6' }: SproutIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stem */}
      <path
        d="M12 20 L12 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Left leaf - abstract curve */}
      <path
        d="M12 12 Q7 10 8 6 Q9 8 12 8"
        fill="currentColor"
        opacity="0.6"
      />
      {/* Right leaf - abstract curve */}
      <path
        d="M12 10 Q17 8 16 4 Q15 6 12 6"
        fill="currentColor"
        opacity="0.8"
      />
      {/* Growth point - small circle */}
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}
