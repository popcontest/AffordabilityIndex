/**
 * PersonaCardsSkeleton - Loading skeleton for PersonaCards component
 */

export function PersonaCardsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-gray-300 rounded w-64 mb-2"></div>
        <div className="h-5 bg-gray-300 rounded w-96"></div>
      </div>

      {/* Persona cards grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50">
            {/* Icon and title row */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
                <div className="h-5 bg-gray-300 rounded w-24"></div>
              </div>
            </div>
            {/* Description lines */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-11/12"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
