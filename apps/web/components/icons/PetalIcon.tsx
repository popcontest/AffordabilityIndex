/**
 * PetalIcon - Component & Element
 * Abstract geometric botanical icon inspired by Behance 2025 "Flower Power" trend
 * Represents individual components, building blocks, modular elements
 */

interface PetalIconProps {
  className?: string;
}

export function PetalIcon({ className = 'w-6 h-6' }: PetalIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Center circle */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />

      {/* Four abstract petals - geometric, not realistic */}
      {/* Top petal */}
      <path
        d="M12 10 Q10 6 12 4 Q14 6 12 10"
        fill="currentColor"
        opacity="0.7"
      />

      {/* Right petal */}
      <path
        d="M14 12 Q18 10 20 12 Q18 14 14 12"
        fill="currentColor"
        opacity="0.6"
      />

      {/* Bottom petal */}
      <path
        d="M12 14 Q14 18 12 20 Q10 18 12 14"
        fill="currentColor"
        opacity="0.8"
      />

      {/* Left petal */}
      <path
        d="M10 12 Q6 14 4 12 Q6 10 10 12"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}
