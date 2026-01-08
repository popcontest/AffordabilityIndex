'use client';

import { useEffect, useRef, useState } from 'react';

interface InteractiveMapModalProps {
  cityName: string;
  stateAbbr: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  onClose: () => void;
}

export function InteractiveMapModal({
  cityName,
  stateAbbr,
  latitude,
  longitude,
  isOpen,
  onClose,
}: InteractiveMapModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Dynamically import mapbox-gl only when modal opens
    const loadMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');

        // Set your access token
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!mapboxToken || mapboxToken.includes('your_token_here')) {
          setMapError('Mapbox token not configured');
          return;
        }
        mapboxgl.default.accessToken = mapboxToken;

        if (!mapContainer.current) return;

        // Create the map
        const map = new mapboxgl.default.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 12,
          pitch: 45,
          bearing: 0,
        });

        // Add marker
        new mapboxgl.default.Marker({ color: '#4f46e5' })
          .setLngLat([longitude, latitude])
          .setPopup(
            new mapboxgl.default.Popup({ offset: 25 }).setHTML(
              `<div style="padding: 8px;"><strong>${cityName}, ${stateAbbr}</strong></div>`
            )
          )
          .addTo(map);

        // Add navigation controls
        map.addControl(new mapboxgl.default.NavigationControl(), 'top-right');

        setMapLoaded(true);

        // Cleanup
        return () => {
          map.remove();
          setMapLoaded(false);
        };
      } catch (error) {
        console.error('Error loading map:', error);
        setMapError('Failed to load interactive map');
      }
    };

    loadMap();
  }, [isOpen, latitude, longitude, cityName, stateAbbr]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="map-modal-title" className="text-xl font-bold text-gray-900">
            Explore {cityName}, {stateAbbr}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close map"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-b-2xl">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-sm text-gray-600">Loading interactive map...</p>
              </div>
            </div>
          )}

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-b-2xl">
              <div className="text-center max-w-md p-6">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Map</h3>
                <p className="text-sm text-gray-600 mb-4">{mapError}</p>
                <a
                  href={`https://www.google.com/maps?q=${encodeURIComponent(`${cityName}, ${stateAbbr}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          )}

          <div
            ref={mapContainer}
            className="w-full h-full"
            style={{ display: mapLoaded ? 'block' : 'none' }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Use scroll/pinch to zoom
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Drag to pan
              </span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(`${cityName}, ${stateAbbr}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition"
            >
              Open in Google Maps
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
