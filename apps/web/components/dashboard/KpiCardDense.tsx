import { ReactNode } from 'react';

interface KpiCardDenseProps {
  label: string;
  value: string | number | null;
  subvalue?: string;
  delta?: string;
  tooltip?: string;
  children?: ReactNode;
}

/**
 * Compact KPI card for displaying key metrics
 */
export function KpiCardDense({ label, value, subvalue, delta, tooltip, children }: KpiCardDenseProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200 group">
      {/* Icon background (decorative) - if available */}
      {children && (
        <div className="absolute top-2 right-2 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">
          {/* Icons will be added later */}
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </div>
          {tooltip && (
            <span className="text-gray-400 text-xs cursor-help hover:text-gray-600 transition"
                  title={tooltip} aria-label={`Information: ${tooltip}`}>
              ⓘ
            </span>
          )}
        </div>

        <div className="space-y-1">
          {value !== null ? (
            <>
              <div className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{value}</div>
              {subvalue && <div className="text-sm text-gray-600 mt-2">{subvalue}</div>}
            </>
          ) : (
            <div className="text-sm text-gray-400 italic">No data</div>
          )}
        </div>
      </div>

      {children && <div className="mt-4 pt-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}
