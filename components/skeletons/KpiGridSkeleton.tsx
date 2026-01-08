/**
 * KpiGridSkeleton - Loading skeleton for KPI grids and cards
 */

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-gray-300 rounded w-24"></div>
        <div className="h-8 bg-gray-300 rounded w-32"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
