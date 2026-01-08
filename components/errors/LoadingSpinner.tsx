/**
 * LoadingSpinner - Reusable loading spinner with optional message
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} border-gray-200 border-t-blue-600`}></div>
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
