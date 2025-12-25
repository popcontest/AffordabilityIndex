/**
 * StaticCityMap - Displays a static map image for a city using Mapbox Static Images API
 *
 * Uses Mapbox's geocoding and static image generation to show the city location.
 * This is a lightweight solution that doesn't require JavaScript on the client.
 *
 * Free tier: 50,000 map loads/month
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 */

interface StaticCityMapProps {
  cityName: string;
  stateAbbr: string;
  className?: string;
}

export function StaticCityMap({ cityName, stateAbbr, className = '' }: StaticCityMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // If no token, show placeholder
  if (!mapboxToken || mapboxToken.includes('your_token_here')) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm text-gray-600">
            Map preview
            <br />
            <span className="text-xs text-gray-500">
              (Mapbox token required)
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Construct the Mapbox Static Images API URL
  const query = encodeURIComponent(`${cityName}, ${stateAbbr}, USA`);

  // Use Mapbox Geocoding to automatically center the map
  // Format: /styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}{@2x}
  // We use 'auto' for overlay to let Mapbox handle it, but we'll construct a marker URL

  // Pin marker (blue marker for the city)
  const markerOverlay = `pin-s+3b82f6(${query})`;

  // Map parameters
  const style = 'mapbox/light-v11'; // Clean, minimal style
  const width = 600;
  const height = 400;
  const retina = '@2x'; // High DPI displays
  const zoom = 10; // City-level zoom

  // Full URL
  const mapUrl = `https://api.mapbox.com/styles/v1/${style}/static/${markerOverlay}/auto/${width}x${height}${retina}?access_token=${mapboxToken}&attribution=false&logo=false`;

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-sm border border-gray-200 ${className}`}>
      <img
        src={mapUrl}
        alt={`Map of ${cityName}, ${stateAbbr}`}
        className="w-full h-full object-cover"
        width={width}
        height={height}
        loading="lazy"
      />

      {/* Attribution overlay (required by Mapbox ToS) */}
      <div className="absolute bottom-0 right-0 bg-white/90 px-2 py-1 text-xs text-gray-600">
        © <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className="underline">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>
      </div>
    </div>
  );
}
