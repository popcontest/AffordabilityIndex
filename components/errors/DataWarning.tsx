/**
 * DataWarning - Warning banner for data quality issues (stale data, partial data, etc.)
 */

interface DataWarningProps {
  title: string;
  message: string;
  type?: 'warning' | 'info' | 'stale';
}

export function DataWarning({ title, message, type = 'warning' }: DataWarningProps) {
  const styles = {
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      message: 'text-yellow-800',
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-800',
    },
    stale: {
      container: 'bg-orange-50 border-orange-200',
      icon: 'text-orange-600',
      title: 'text-orange-900',
      message: 'text-orange-800',
    },
  };

  const style = styles[type];

  return (
    <div className={`border rounded-lg p-4 mb-6 ${style.container}`}>
      <div className="flex items-start gap-3">
        <svg className={`w-5 h-5 ${style.icon} mt-0.5 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className={`font-semibold ${style.title} mb-1`}>{title}</p>
          <p className={`text-sm ${style.message}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}
