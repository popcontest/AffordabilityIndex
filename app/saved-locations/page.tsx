'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GeoType } from '@prisma/client';
import { getSavedLocations, removeSavedLocation } from '@/components/SaveLocationButton';
import { stateFromAbbr } from '@/lib/usStates';
import { formatCurrency } from '@/lib/viewModels';

interface SavedLocation {
  geoType: GeoType;
  geoId: string;
  name: string;
  stateAbbr: string;
  savedAt: number;
}

interface LocationData {
  saved: SavedLocation;
  score?: number | null;
  homeValue?: number | null;
  medianIncome?: number | null;
  population?: number | null;
  url: string;
  loading?: boolean;
  error?: boolean;
}

export default function SavedLocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSavedLocations() {
      const saved = getSavedLocations();

      if (saved.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch data for each saved location
      const locationData: LocationData[] = await Promise.all(
        saved.map(async (savedLoc) => {
          try {
            if (savedLoc.geoType === 'CITY') {
              const response = await fetch(`/api/city-by-id?id=${savedLoc.geoId}`);
              if (!response.ok) throw new Error('Failed to fetch city');
              const data = await response.json();

              const stateInfo = stateFromAbbr(savedLoc.stateAbbr);
              const url = `/${stateInfo?.slug || savedLoc.stateAbbr.toLowerCase()}/${data.slug}/`;

              return {
                saved: savedLoc,
                score: data.metrics?.affordabilityPercentile || null,
                homeValue: data.metrics?.homeValue || null,
                medianIncome: data.metrics?.income || null,
                population: data.population || null,
                url,
              };
            } else if (savedLoc.geoType === 'ZCTA') {
              const response = await fetch(`/api/zip-by-code?zip=${savedLoc.geoId}`);
              if (!response.ok) throw new Error('Failed to fetch ZIP');
              const data = await response.json();

              return {
                saved: savedLoc,
                score: data.metrics?.affordabilityPercentile || null,
                homeValue: data.metrics?.homeValue || null,
                medianIncome: data.metrics?.income || null,
                population: data.population || null,
                url: `/zip/${savedLoc.geoId}/`,
              };
            } else {
              // STATE and COUNTY types - for now, just return basic info
              const stateInfo = stateFromAbbr(savedLoc.stateAbbr);
              return {
                saved: savedLoc,
                url: `/${stateInfo?.slug || savedLoc.stateAbbr.toLowerCase()}/`,
              };
            }
          } catch (error) {
            console.error(`Error fetching ${savedLoc.name}:`, error);
            return {
              saved: savedLoc,
              error: true,
              url: '#',
            };
          }
        })
      );

      setLocations(locationData);
      setLoading(false);
    }

    loadSavedLocations();
  }, []);

  const handleRemove = (geoType: GeoType, geoId: string) => {
    removeSavedLocation(geoType, geoId);
    setLocations((prev) => prev.filter((loc) => !(loc.saved.geoType === geoType && loc.saved.geoId === geoId)));
  };

  const handleClearAll = () => {
    localStorage.removeItem('affordabilitySavedLocations');
    setLocations([]);
  };

  // Sort by saved date (newest first)
  const sortedLocations = [...locations].sort((a, b) => b.saved.savedAt - a.saved.savedAt);

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
            Saved Locations
          </h1>
          <p className="text-xl text-gray-600">
            Compare affordability across your saved cities and ZIP codes
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading your saved locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Saved Locations Yet</h2>
            <p className="text-gray-600 mb-6">
              Save up to 10 cities or ZIP codes to compare their affordability side by side.
            </p>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              Browse Cities to Save
            </Link>
          </div>
        ) : (
          <>
            {/* Actions */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {locations.length} {locations.length === 1 ? 'location' : 'locations'} saved
              </p>
              <button
                onClick={handleClearAll}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>

            {/* Comparison Table */}
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Score (0-100)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Home Value
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Median Income
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Population
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedLocations.map((location) => (
                      <tr key={`${location.saved.geoType}-${location.saved.geoId}`} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-4">
                          <Link
                            href={location.url}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition"
                          >
                            {location.saved.name}, {location.saved.stateAbbr}
                          </Link>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {location.saved.geoType === 'CITY' ? 'City' : 'ZIP Area'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {location.error ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : location.score !== null && location.score !== undefined ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                              location.score >= 70 ? 'bg-green-100 text-green-800' :
                              location.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {Math.round(location.score)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600">
                          {location.error ? (
                            <span className="text-gray-400">—</span>
                          ) : location.homeValue ? (
                            formatCurrency(location.homeValue)
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600">
                          {location.error ? (
                            <span className="text-gray-400">—</span>
                          ) : location.medianIncome ? (
                            formatCurrency(location.medianIncome)
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600">
                          {location.error ? (
                            <span className="text-gray-400">—</span>
                          ) : location.population ? (
                            location.population.toLocaleString()
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleRemove(location.saved.geoType, location.saved.geoId)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                            aria-label={`Remove ${location.saved.name} from saved locations`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Comparing Locations</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Score (0-100):</strong> Higher scores mean more affordable. Combines housing, food, healthcare, and transportation costs.</li>
                <li>• <strong>Home Value:</strong> Median home value from Zillow Research data.</li>
                <li>• <strong>Median Income:</strong> Typical household income from Census ACS data.</li>
                <li>• <strong>Population:</strong> Number of residents from Census data.</li>
              </ul>
              <div className="mt-4">
                <Link
                  href="/methodology"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Learn how we calculate scores →
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
