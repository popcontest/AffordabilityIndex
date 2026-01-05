interface BenchmarkRow {
  label: string;
  ratio: number | null;
  homeValue: number | null;
  income: number | null;
}

interface BenchmarkTableProps {
  rows: BenchmarkRow[];
}

/**
 * Visual comparison of this geography to state and national benchmarks
 * Shows affordability ratios with color-coded bars for instant comprehension
 */
export function BenchmarkTable({ rows }: BenchmarkTableProps) {
  const formatCurrency = (val: number | null) => {
    if (val === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatRatio = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(2);
  };

  // Find max ratio for bar scaling
  const maxRatio = Math.max(...rows.map(r => r.ratio ?? 0).filter(r => r > 0));

  // Color based on affordability (lower is better)
  const getBarColor = (ratio: number | null) => {
    if (ratio === null) return 'bg-gray-200';
    if (ratio < 4) return 'bg-gradient-to-r from-green-400 to-green-500';
    if (ratio < 6) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    if (ratio < 8) return 'bg-gradient-to-r from-orange-400 to-orange-500';
    return 'bg-gradient-to-r from-red-400 to-red-500';
  };

  const getTextColor = (ratio: number | null) => {
    if (ratio === null) return 'text-gray-600';
    if (ratio < 4) return 'text-green-700';
    if (ratio < 6) return 'text-yellow-700';
    if (ratio < 8) return 'text-orange-700';
    return 'text-red-700';
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400 italic">
        Benchmarks coming soon
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((row, index) => {
        const barWidth = row.ratio && maxRatio > 0 ? (row.ratio / maxRatio) * 100 : 0;
        const isCurrentLocation = index === 0;

        return (
          <div
            key={index}
            className={`relative rounded-lg border-2 p-5 transition-all duration-200 ${
              isCurrentLocation
                ? 'border-blue-400 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            {/* Location Label */}
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold ${isCurrentLocation ? 'text-blue-900 text-lg' : 'text-gray-800 text-base'}`}>
                {row.label}
                {isCurrentLocation && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Current</span>}
              </h3>
            </div>

            {/* Affordability Visual Bar */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Relative Affordability</span>
              </div>

              {/* Visual Bar */}
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${getBarColor(row.ratio)} transition-all duration-500 shadow-sm`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="mt-1 text-xs text-gray-500">
                {row.ratio && row.ratio < 4 && 'Highly affordable'}
                {row.ratio && row.ratio >= 4 && row.ratio < 6 && 'Moderately affordable'}
                {row.ratio && row.ratio >= 6 && row.ratio < 8 && 'Challenging affordability'}
                {row.ratio && row.ratio >= 8 && 'Severe affordability crisis'}
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-500 mb-1">Median Home Value</div>
                <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(row.homeValue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Median Income</div>
                <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(row.income)}</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <span className="font-medium">How to read this:</span> The colored bars show relative affordability comparison -
          longer bars indicate less affordable areas where homes cost more relative to income.
        </div>
      </div>
    </div>
  );
}
