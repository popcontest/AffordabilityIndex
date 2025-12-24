import { ReactNode } from 'react';

interface DashboardShellProps {
  header?: ReactNode;
  children: ReactNode;
}

/**
 * Standard dashboard container with max width, grid layout, and consistent spacing
 */
export function DashboardShell({ header, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {header && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3">{header}</div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-4">{children}</div>
      </div>
    </div>
  );
}
