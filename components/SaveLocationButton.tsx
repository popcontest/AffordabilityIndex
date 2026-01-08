'use client';

import { useState, useEffect } from 'react';
import { GeoType } from '@prisma/client';

interface SavedLocation {
  geoType: GeoType;
  geoId: string;
  name: string;
  stateAbbr: string;
  savedAt: number;
}

interface SaveLocationButtonProps {
  geoType: GeoType;
  geoId: string;
  name: string;
  stateAbbr: string;
  variant?: 'default' | 'compact';
}

const STORAGE_KEY = 'affordabilitySavedLocations';

/**
 * SaveLocationButton - Save location to localStorage for later comparison
 * No authentication required
 */
export function SaveLocationButton({
  geoType,
  geoId,
  name,
  stateAbbr,
  variant = 'default'
}: SaveLocationButtonProps) {
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);

  // Check if location is already saved on mount
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem(STORAGE_KEY);
      if (savedStr) {
        const savedLocations: SavedLocation[] = JSON.parse(savedStr);
        const isSaved = savedLocations.some(
          loc => loc.geoType === geoType && loc.geoId === geoId
        );
        setSaved(isSaved);
        setSaveCount(savedLocations.length);
      }
    } catch (error) {
      console.error('Error reading saved locations:', error);
    }
  }, [geoType, geoId]);

  const handleSave = () => {
    try {
      const savedStr = localStorage.getItem(STORAGE_KEY) || '[]';
      const savedLocations: SavedLocation[] = JSON.parse(savedStr);

      if (saved) {
        // Remove from saved
        const filtered = savedLocations.filter(
          loc => !(loc.geoType === geoType && loc.geoId === geoId)
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        setSaved(false);
        setSaveCount(filtered.length);
      } else {
        // Add to saved
        const newLocation: SavedLocation = {
          geoType,
          geoId,
          name,
          stateAbbr,
          savedAt: Date.now(),
        };
        // Limit to 10 saved locations
        const updated = [newLocation, ...savedLocations].slice(0, 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSaved(true);
        setSaveCount(updated.length);
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleSave}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          saved
            ? 'bg-green-100 text-green-800 border-2 border-green-300 hover:bg-green-200'
            : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:text-blue-700'
        }`}
        aria-label={saved ? `Remove ${name} from saved locations` : `Save ${name} for later`}
      >
        {saved ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Saved</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>Save</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleSave}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
        saved
          ? 'bg-green-600 text-white hover:bg-green-700'
          : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
      }`}
      aria-label={saved ? `Remove ${name} from saved locations` : `Save ${name} for later comparison`}
    >
      {saved ? (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Saved ({saveCount})</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>Save for Later</span>
        </>
      )}
    </button>
  );
}

/**
 * Get all saved locations from localStorage
 */
export function getSavedLocations(): SavedLocation[] {
  try {
    const savedStr = localStorage.getItem(STORAGE_KEY);
    return savedStr ? JSON.parse(savedStr) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a location from saved locations
 */
export function removeSavedLocation(geoType: GeoType, geoId: string): void {
  try {
    const savedStr = localStorage.getItem(STORAGE_KEY);
    if (savedStr) {
      const savedLocations: SavedLocation[] = JSON.parse(savedStr);
      const filtered = savedLocations.filter(
        loc => !(loc.geoType === geoType && loc.geoId === geoId)
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Error removing saved location:', error);
  }
}
