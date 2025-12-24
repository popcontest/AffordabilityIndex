/**
 * CompassIcon - Navigation & Direction
 * Abstract geometric icon with botanical touches
 * Represents navigation, exploration, finding direction
 */

interface CompassIconProps {
  className?: string;
}

export function CompassIcon({ className = 'w-6 h-6' }: CompassIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer circle */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />

      {/* Compass needle - geometric arrow pointing up */}
      <path
        d="M12 5 L15 11 L12 10 L9 11 Z"
        fill="currentColor"
      />

      {/* Bottom balance */}
      <path
        d="M12 19 L9 13 L12 14 L15 13 Z"
        fill="currentColor"
        opacity="0.4"
      />

      {/* Center point */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />

      {/* Cardinal direction marks - subtle */}
      <circle cx="12" cy="3.5" r="0.75" fill="currentColor" opacity="0.5" />
      <circle cx="20.5" cy="12" r="0.75" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="20.5" r="0.75" fill="currentColor" opacity="0.3" />
      <circle cx="3.5" cy="12" r="0.75" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
