/**
 * HandUnderline - Subtle handwritten flourish (Type by Hand trend)
 * A single organic underline to add human touch to accented words
 */

interface HandUnderlineProps {
  className?: string;
}

export function HandUnderline({ className = '' }: HandUnderlineProps) {
  return (
    <svg
      className={`absolute -bottom-2 left-0 w-full ${className}`}
      viewBox="0 0 200 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 8 Q50 2, 100 6 T198 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-ai-warm opacity-40"
      />
    </svg>
  );
}
