/**
 * BookIcon - Documentation/Learning
 */

interface BookIconProps {
  className?: string;
}

export function BookIcon({ className = 'w-6 h-6' }: BookIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Book cover */}
      <rect x="6" y="4" width="12" height="16" rx="1" fill="currentColor" opacity="0.8" />

      {/* Pages */}
      <rect x="7" y="5" width="10" height="14" fill="currentColor" opacity="0.3" />

      {/* Spine */}
      <rect x="6" y="4" width="2" height="16" fill="currentColor" opacity="0.9" />

      {/* Page lines */}
      <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="9" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="9" y1="14" x2="13" y2="14" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}
