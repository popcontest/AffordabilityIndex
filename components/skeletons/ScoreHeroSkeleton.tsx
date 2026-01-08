/**
 * ScoreHeroSkeleton - Loading skeleton for ScoreHero component
 */

export function ScoreHeroSkeleton() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-12 border-2 border-blue-200 shadow-xl">
      <div className="text-center relative z-10 animate-pulse">
        {/* Location name skeleton */}
        <div className="h-12 bg-gray-300 rounded-lg max-w-2xl mx-auto mb-8"></div>

        {/* Score and Grade skeletons */}
        <div className="flex items-baseline justify-center gap-8 mb-6">
          {/* Score skeleton */}
          <div className="w-48 h-32 bg-gray-300 rounded-xl"></div>

          {/* Divider */}
          <div className="h-24 w-px bg-gray-300"></div>

          {/* Grade skeleton */}
          <div className="w-32 h-28 bg-gray-300 rounded-xl"></div>
        </div>

        {/* Label skeleton */}
        <div className="h-8 bg-gray-300 rounded-lg max-w-md mx-auto mb-4"></div>

        {/* Description skeleton */}
        <div className="space-y-3 max-w-3xl mx-auto mt-6">
          <div className="h-5 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded w-3/4 mx-auto"></div>
        </div>

        {/* Required income skeleton */}
        <div className="mt-8 pt-6 border-t-2 border-gray-300">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 shadow-md">
            <div className="h-6 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent pointer-events-none"></div>
    </div>
  );
}
