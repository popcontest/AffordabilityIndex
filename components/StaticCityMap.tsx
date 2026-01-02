/**
 * StaticCityMap - Displays a static map image for a city using Mapbox Static Images API
 *
 * Uses geocode.maps.co (free, no auth) for geocoding, then Mapbox for static map rendering.
 * This is a server component that fetches coordinates once during SSR/SSG.
 */

interface StaticCityMapProps {
  cityName: string;
  stateAbbr: string;
  className?: string;
}

export async function StaticCityMap({ cityName, stateAbbr, className = '' }: StaticCityMapProps) {
  // TEMPORARY: Disable geocoding to prevent production errors
  // TODO: Re-enable once Mapbox Geocoding API scope is confirmed working in production
  return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
}

function MapPlaceholder({ cityName, stateAbbr, className }: StaticCityMapProps) {
  return (
    <div className={`relative rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center ${className}`}
      style={{ minHeight: '400px' }}
    >
      <div className="text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-full mb-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">{cityName}</h3>
        <p className="text-sm text-gray-600 mt-1">{stateAbbr}</p>
      </div>
    </div>
  );
}
