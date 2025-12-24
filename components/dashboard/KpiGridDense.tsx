import { ReactNode } from 'react';

interface KpiGridDenseProps {
  children: ReactNode;
}

/**
 * Grid container for KPI cards with responsive columns
 */
export function KpiGridDense({ children }: KpiGridDenseProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {children}
    </div>
  );
}
