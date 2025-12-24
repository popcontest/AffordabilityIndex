/**
 * GraduationIcon - Education/career growth
 */

interface GraduationIconProps {
  className?: string;
}

export function GraduationIcon({ className = 'w-6 h-6' }: GraduationIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cap */}
      <path
        d="M12 4L2 9L12 14L22 9L12 4Z"
        fill="currentColor"
        opacity="0.8"
      />

      {/* Tassel */}
      <circle cx="17" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
      <line x1="17" y1="9.5" x2="17" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.6" />

      {/* Base */}
      <path
        d="M6 11V15C6 17 9 19 12 19C15 19 18 17 18 15V11"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.7"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
