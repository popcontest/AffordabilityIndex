/**
 * ScoreBreakdownSkeleton - Loading skeleton for ScoreBreakdownPanel component
 */

export function ScoreBreakdownSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
      {/* Header */}
      <div className="h-7 bg-gray-300 rounded w-48 mb-6"></div>

      {/* Score bars */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-5 bg-gray-300 rounded w-32"></div>
              <div className="h-5 bg-gray-300 rounded w-16"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gray-300 rounded-full w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
