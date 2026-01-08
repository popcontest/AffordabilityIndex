/**
 * InlineError - Compact error display for inline errors within sections
 */

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  showIcon?: boolean;
}

export function InlineError({ message, onRetry, showIcon = true }: InlineErrorProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
      <div className="flex items-start gap-3">
        {showIcon && (
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        <div className="flex-1">
          <p className="text-sm text-red-800">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-900 hover:text-red-700 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
