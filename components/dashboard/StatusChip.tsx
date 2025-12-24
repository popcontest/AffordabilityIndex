interface StatusChipProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
  className?: string;
}

/**
 * Small chip component for labels with optional color tones
 */
export function StatusChip({ label, tone = 'neutral', className = '' }: StatusChipProps) {
  const toneClasses = {
    neutral: 'bg-gray-100 text-gray-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
