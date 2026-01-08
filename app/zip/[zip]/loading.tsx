/**
 * Loading page for ZIP routes
 * Shows during ISR revalidation or initial page generation
 */

import { ScoreHeroSkeleton } from '@/components/skeletons';
import { ScoreBreakdownSkeleton } from '@/components/skeletons';
import { PanelSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <>
      {/* Breadcrumb skeleton */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-300 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Score Hero skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScoreHeroSkeleton />
      </div>

      {/* Dashboard skeletons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <ScoreBreakdownSkeleton />
        </div>

        <div className="mb-8">
          <PanelSkeleton showTitle={true} lines={4} />
        </div>

        <div className="mb-8">
          <PanelSkeleton showTitle={true} lines={3} />
        </div>
      </div>
    </>
  );
}
