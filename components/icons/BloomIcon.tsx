/**
 * BloomIcon - Success & Achievement
 * Abstract geometric botanical icon inspired by Behance 2025 "Flower Power" trend
 * Represents full bloom, success, achievement, completion
 */

interface BloomIconProps {
  className?: string;
}

export function BloomIcon({ className = 'w-6 h-6' }: BloomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring of petals - 8 geometric shapes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x = 12 + Math.cos(angle) * 6;
        const y = 12 + Math.sin(angle) * 6;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.5"
            fill="currentColor"
            opacity={0.4 + (i % 2) * 0.2}
          />
        );
      })}

      {/* Center bloom */}
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />

      {/* Inner accent ring */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
      />
    </svg>
  );
}
