/**
 * StaticCityMap - Displays a static map image for a city using Mapbox Static Images API
 *
 * Uses Mapbox Geocoding API for coordinates, then Mapbox Static Images API for rendering.
 * Server-side component that fetches coordinates once during SSR/SSG.
 * Client-side component adds interactive modal option.
 */

interface StaticCityMapProps {
  cityName: string;
  stateAbbr: string;
  className?: string;
}

export async function StaticCityMap({ cityName, stateAbbr, className = '' }: StaticCityMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // If no token or placeholder token, show placeholder
  if (!mapboxToken || mapboxToken.includes('your_token_here')) {
    console.warn('StaticCityMap: No valid Mapbox token configured');
    return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
  }

  try {
    // Step 1: Geocode using Mapbox Geocoding API
    const query = encodeURIComponent(`${cityName}, ${stateAbbr}, USA`);
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&limit=1&types=place`;

    let lon: number;
    let lat: number;

    const geocodingResponse = await fetch(geocodingUrl, {
      next: { revalidate: 2592000 }, // Cache for 30 days
    });

    if (!geocodingResponse.ok) {
      console.warn(`StaticCityMap: Mapbox geocoding failed for ${cityName}, ${stateAbbr}: ${geocodingResponse.status}`);
      return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
    }

    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.features || geocodingData.features.length === 0) {
      console.warn(`StaticCityMap: No geocoding results for ${cityName}, ${stateAbbr}`);
      return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
    }

    [lon, lat] = geocodingData.features[0].center;

    // Step 2: Construct Mapbox Static Images API URL with coordinates
    const markerOverlay = `pin-l+4f46e5(${lon},${lat})`; // Large pin, brand purple
    const style = 'mapbox/streets-v12'; // Modern, detailed street style
    const width = 600;
    const height = 400;
    const retina = '@2x';
    const zoom = 12; // City-level zoom

    const mapUrl = `https://api.mapbox.com/styles/v1/${style}/static/${markerOverlay}/${lon},${lat},${zoom}/${width}x${height}${retina}?access_token=${mapboxToken}&attribution=false&logo=false`;

    // Google Maps URL for fallback/link
    const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${cityName}, ${stateAbbr}`)}`;

    return (
      <div className={`relative rounded-xl overflow-hidden shadow-md border border-gray-200 group ${className}`}>
        <img
          src={mapUrl}
          alt={`Map of ${cityName}, ${stateAbbr}`}
          className="w-full h-full object-cover"
          width={width}
          height={height}
          loading="lazy"
        />

        {/* Attribution overlay (required by Mapbox ToS) */}
        <div className="absolute bottom-0 right-0 bg-white/95 backdrop-blur-sm px-2 py-1 text-xs text-gray-600 rounded-tl-md">
          © <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">OpenStreetMap</a>
        </div>

        {/* "View larger map" button - shown on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg shadow-lg hover:bg-gray-50 transition transform hover:scale-105 font-medium"
            aria-label={`View larger map of ${cityName}, ${stateAbbr}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            View larger map
          </a>
        </div>
      </div>
    );
  } catch (error) {
    console.error('StaticCityMap: Unexpected error for', cityName, stateAbbr, ':', error);
    return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
  }
}

function MapPlaceholder({ cityName, stateAbbr, className }: StaticCityMapProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${cityName}, ${stateAbbr}`)}`;

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center group ${className}`}
      style={{ minHeight: '400px' }}
    >
      <div className="text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-full mb-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900">{cityName}</h3>
        <p className="text-sm text-gray-600 mt-1">{stateAbbr}</p>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm bg-white text-gray-700 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700 transition shadow-sm group-hover:scale-105 transform"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View map
        </a>
      </div>
    </div>
  );
}
