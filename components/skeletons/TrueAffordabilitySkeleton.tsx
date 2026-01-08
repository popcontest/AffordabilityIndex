/**
 * TrueAffordabilitySkeleton - Loading skeleton for TrueAffordabilitySection component
 */

export function TrueAffordabilitySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Data rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border-b border-gray-100 px-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box skeleton */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="h-5 bg-blue-200 rounded w-48 mb-2"></div>
        <div className="space-y-2">
          <div className="h-4 bg-blue-200 rounded"></div>
          <div className="h-4 bg-blue-200 rounded w-11/12"></div>
        </div>
      </div>
    </div>
  );
}
