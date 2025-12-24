import { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standardized panel with title, optional subtitle, body, and right-aligned actions slot
 */
export function Panel({ title, subtitle, actions, children, className = '' }: PanelProps) {
  return (
    <div className={`bg-white border border-ai-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200">
          <div>
            {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
