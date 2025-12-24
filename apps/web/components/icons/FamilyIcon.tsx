/**
 * FamilyIcon - Abstract family/people group
 */

interface FamilyIconProps {
  className?: string;
}

export function FamilyIcon({ className = 'w-6 h-6' }: FamilyIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Adult 1 */}
      <circle cx="9" cy="8" r="2.5" fill="currentColor" opacity="0.8" />
      <path
        d="M9 11C6.5 11 5 12.5 5 14V17H13V14C13 12.5 11.5 11 9 11Z"
        fill="currentColor"
        opacity="0.8"
      />

      {/* Adult 2 */}
      <circle cx="15" cy="8" r="2.5" fill="currentColor" opacity="0.7" />
      <path
        d="M15 11C17.5 11 19 12.5 19 14V17H11V14C11 12.5 12.5 11 15 11Z"
        fill="currentColor"
        opacity="0.7"
      />

      {/* Child */}
      <circle cx="12" cy="13" r="1.5" fill="currentColor" opacity="0.5" />
      <path
        d="M12 15C10.5 15 9.5 15.8 9.5 16.5V19H14.5V16.5C14.5 15.8 13.5 15 12 15Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}
