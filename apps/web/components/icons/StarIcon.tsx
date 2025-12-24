/**
 * StarIcon - Excellence/Featured
 */

interface StarIconProps {
  className?: string;
}

export function StarIcon({ className = 'w-6 h-6' }: StarIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 5-pointed star */}
      <path
        d="M12 4 L14 10 L20 10 L15 14 L17 20 L12 16 L7 20 L9 14 L4 10 L10 10 Z"
        fill="currentColor"
        opacity="0.8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Center highlight */}
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
