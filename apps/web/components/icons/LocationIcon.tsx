/**
 * LocationIcon - Abstract map pin
 */

interface LocationIconProps {
  className?: string;
}

export function LocationIcon({ className = 'w-6 h-6' }: LocationIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Pin shape */}
      <circle cx="12" cy="10" r="3" fill="currentColor" opacity="0.3" />
      <path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill="currentColor"
        opacity="0.8"
        strokeWidth="0"
      />
    </svg>
  );
}
