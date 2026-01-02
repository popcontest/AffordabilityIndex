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
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // If no token, show placeholder
  if (!mapboxToken || mapboxToken.includes('your_token_here')) {
    return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
  }

  // Step 1: Geocode using Nominatim (OpenStreetMap) - free, no auth, rate limit: 1/sec
  const query = encodeURIComponent(`${cityName}, ${stateAbbr}, USA`);
  const geocodingUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;

  let lon: number;
  let lat: number;

  try {
    const geocodingResponse = await fetch(geocodingUrl, {
      next: { revalidate: 2592000 }, // Cache for 30 days
      headers: {
        'User-Agent': 'AffordabilityIndex/1.0 (https://affordabilityindex.org)',
      },
    });

    if (!geocodingResponse.ok) {
      throw new Error(`Nominatim geocoding failed: ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();

    if (!Array.isArray(geocodingData) || geocodingData.length === 0) {
      throw new Error('No geocoding results from Nominatim');
    }

    lon = parseFloat(geocodingData[0].lon);
    lat = parseFloat(geocodingData[0].lat);
  } catch (error) {
    console.error('Geocoding error for', cityName, stateAbbr, ':', error);
    return <MapPlaceholder cityName={cityName} stateAbbr={stateAbbr} className={className} />;
  }

  // Step 2: Construct Mapbox Static Images API URL with coordinates
  // Format: /styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom}/{width}x{height}{@2x}

  const markerOverlay = `pin-l+4f46e5(${lon},${lat})`; // Large pin, brand purple color
  const style = 'mapbox/streets-v12'; // Modern, detailed street style
  const width = 600;
  const height = 400;
  const retina = '@2x';
  const zoom = 12; // Zoom in closer to the city

  const mapUrl = `https://api.mapbox.com/styles/v1/${style}/static/${markerOverlay}/${lon},${lat},${zoom}/${width}x${height}${retina}?access_token=${mapboxToken}&attribution=false&logo=false`;

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-md border border-gray-200 ${className}`}>
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
    </div>
  );
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
