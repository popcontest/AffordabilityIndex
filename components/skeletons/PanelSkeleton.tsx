/**
 * PanelSkeleton - Loading skeleton for generic Panel component
 */

interface PanelSkeletonProps {
  showTitle?: boolean;
  lines?: number;
}

export function PanelSkeleton({ showTitle = true, lines = 3 }: PanelSkeletonProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse">
      {showTitle && (
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <div className="h-5 bg-gray-300 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mt-2"></div>
          </div>
        </div>
      )}
      <div className="px-4 py-3">
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-gray-200 rounded"
              style={{ width: `${Math.max(60, 100 - i * 10)}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
