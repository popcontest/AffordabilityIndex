'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatRatio } from '@/lib/viewModels';
import { PercentileBadge } from './PercentileBadge';
import { estimateAffordabilityPercentile } from '@/lib/percentile';

interface LocationData {
  type: 'city' | 'zip';
  id: string;
  name: string;
  state: string;
  homeValue: number | null;
  income: number | null;
  ratio: number | null;
  url: string;
}

export function CompareView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  // Parse locations from URL on mount
  useEffect(() => {
    const locationIds = searchParams.get('locations')?.split(',') || [];

    if (locationIds.length > 0) {
      fetchLocations(locationIds);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  // Generate share URL
  useEffect(() => {
    if (typeof window !== 'undefined' && locations.length > 0) {
      setShareUrl(window.location.href);
    }
  }, [locations]);

  async function fetchLocations(ids: string[]) {
    setLoading(true);
    try {
      // Fetch data for each location
      const promises = ids.slice(0, 3).map(async (id) => {
        const response = await fetch(`/api/search?q=${encodeURIComponent(id)}&limit=1`);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.results || data.results.length === 0) return null;

        const result = data.results[0];
        return {
          type: result.geoType === 'ZCTA' ? 'zip' : 'city',
          id: result.geoId,
          name: result.name,
          state: result.stateAbbr || '',
          homeValue: result.metrics?.homeValue || null,
          income: result.metrics?.income || null,
          ratio: result.metrics?.ratio || null,
          url: result.geoType === 'ZCTA' ? `/zip/${result.geoId}/` : `/${result.stateAbbr?.toLowerCase()}/${result.geoId}/`,
        } as LocationData;
      });

      const results = (await Promise.all(promises)).filter(Boolean) as LocationData[];
      setLocations(results);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
    setLoading(false);
  }

  function removeLocation(index: number) {
    const newLocations = locations.filter((_, i) => i !== index);
    setLocations(newLocations);

    // Update URL
    const ids = newLocations.map(l => l.id);
    if (ids.length > 0) {
      router.push(`/compare?locations=${ids.join(',')}`);
    } else {
      router.push('/compare');
    }
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    alert('Comparison link copied to clipboard!');
  }

  // Find winner for each metric (memoized to prevent recalculation on every render)
  const winners = useMemo(() => ({
    ratio: locations.reduce((best, loc, i) =>
      !loc.ratio ? best : (!best.ratio || loc.ratio < best.ratio) ? { ...loc, index: i } : best
    , {} as LocationData & { index: number }),
    homeValue: locations.reduce((best, loc, i) =>
      !loc.homeValue ? best : (!best.homeValue || loc.homeValue < best.homeValue) ? { ...loc, index: i } : best
    , {} as LocationData & { index: number }),
    income: locations.reduce((best, loc, i) =>
      !loc.income ? best : (!best.income || loc.income > best.income) ? { ...loc, index: i } : best
    , {} as LocationData & { index: number }),
  }), [locations]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return null; // Will show the empty state from the parent
  }

  // Calculate max values for bar chart scaling
  const maxHomeValue = Math.max(...locations.map(l => l.homeValue || 0));
  const maxIncome = Math.max(...locations.map(l => l.income || 0));
  const maxRatio = Math.max(...locations.map(l => l.ratio || 0));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with Share Button */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Comparing {locations.length} Location{locations.length > 1 ? 's' : ''}
        </h2>
        <button
          onClick={copyShareUrl}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Comparison
        </button>
      </div>

      {/* Side-by-Side Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {locations.map((location, index) => (
          <div
            key={index}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 relative hover:shadow-lg transition-shadow"
          >
            {/* Remove Button */}
            <button
              onClick={() => removeLocation(index)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition"
              title="Remove from comparison"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Location Header */}
            <div className="mb-4 pr-8">
              <Link href={location.url} className="group">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                  {location.name}
                </h3>
                <p className="text-sm text-gray-500">{location.state}</p>
              </Link>
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              {/* Affordability Ratio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Affordability Ratio</span>
                  {'index' in winners.ratio && winners.ratio.index === index && location.ratio && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                      BEST
                    </span>
                  )}
                </div>
                {location.ratio ? (
                  <>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatRatio(location.ratio)}
                    </div>
                    <PercentileBadge
                      percentile={estimateAffordabilityPercentile(location.ratio)}
                      size="sm"
                    />
                  </>
                ) : (
                  <div className="text-gray-400">No data</div>
                )}
              </div>

              {/* Home Value */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Median Home Value</span>
                  {'index' in winners.homeValue && winners.homeValue.index === index && location.homeValue && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      LOWEST
                    </span>
                  )}
                </div>
                {location.homeValue ? (
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(location.homeValue)}
                  </div>
                ) : (
                  <div className="text-gray-400">No data</div>
                )}
              </div>

              {/* Income */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Median Income</span>
                  {'index' in winners.income && winners.income.index === index && location.income && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      HIGHEST
                    </span>
                  )}
                </div>
                {location.income ? (
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(location.income)}
                  </div>
                ) : (
                  <div className="text-gray-400">No data</div>
                )}
              </div>
            </div>

            {/* View Details Link */}
            <Link
              href={location.url}
              className="mt-6 block w-full text-center px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition font-medium text-sm"
            >
              View Full Details →
            </Link>
          </div>
        ))}
      </div>

      {/* Visual Comparison Bars */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Visual Comparison</h3>

        {/* Affordability Ratio Bars */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Affordability Ratio (Lower is Better)</h4>
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{location.name}</span>
                  <span className="font-semibold text-gray-700">
                    {location.ratio ? formatRatio(location.ratio) : 'N/A'}
                  </span>
                </div>
                {location.ratio && (
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        'index' in winners.ratio && winners.ratio.index === index ? 'bg-green-500' : 'bg-blue-400'
                      }`}
                      style={{ width: `${(location.ratio / maxRatio) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Home Value Bars */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Median Home Value</h4>
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{location.name}</span>
                  <span className="font-semibold text-gray-700">
                    {location.homeValue ? formatCurrency(location.homeValue) : 'N/A'}
                  </span>
                </div>
                {location.homeValue && (
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        'index' in winners.homeValue && winners.homeValue.index === index ? 'bg-blue-500' : 'bg-orange-400'
                      }`}
                      style={{ width: `${(location.homeValue / maxHomeValue) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Income Bars */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Median Household Income</h4>
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{location.name}</span>
                  <span className="font-semibold text-gray-700">
                    {location.income ? formatCurrency(location.income) : 'N/A'}
                  </span>
                </div>
                {location.income && (
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        'index' in winners.income && winners.income.index === index ? 'bg-purple-500' : 'bg-teal-400'
                      }`}
                      style={{ width: `${(location.income / maxIncome) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add More Locations */}
      {locations.length < 3 && (
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6 text-center">
          <p className="text-gray-700 font-medium mb-3">
            You can compare up to 3 locations. Add {3 - locations.length} more!
          </p>
          <Link
            href="/compare"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Another Location
          </Link>
        </div>
      )}
    </div>
  );
}
