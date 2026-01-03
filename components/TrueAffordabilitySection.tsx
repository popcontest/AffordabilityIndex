'use client';

import { useEffect, useState } from 'react';
import { PersonaComparisonTable } from './PersonaComparisonTable';
import { CostBreakdown } from '@/lib/trueAffordability';

interface TrueAffordabilitySectionProps {
  geoType: 'CITY' | 'ZCTA';
  geoId: string;
  cityName: string;
}

interface PersonaData {
  type: string;
  label: string;
  description: string;
  breakdown: CostBreakdown | null;
  loading: boolean;
  error: string | null;
}

const PERSONAS = [
  { type: 'single', label: 'Single Professional', description: 'One earner, no dependents' },
  { type: 'couple', label: 'Couple (No Kids)', description: 'Two earners, no children' },
  { type: 'family', label: 'Family (2 Kids)', description: 'Two earners, two children' },
  { type: 'emptyNester', label: 'Empty Nester', description: 'Two earners, grown children' },
  { type: 'retiree', label: 'Retiree', description: 'Fixed income, retired' },
  { type: 'remoteWorker', label: 'Remote Worker', description: 'Location-independent income' },
];

export function TrueAffordabilitySection({ geoType, geoId, cityName }: TrueAffordabilitySectionProps) {
  const [personaData, setPersonaData] = useState<PersonaData[]>(
    PERSONAS.map(p => ({ ...p, breakdown: null, loading: true, error: null }))
  );

  useEffect(() => {
    // Helper function to fetch with timeout
    const fetchWithTimeout = async (url: string, timeout = 10000): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - data unavailable');
        }
        throw error;
      }
    };

    // Fetch data for all personas in parallel
    Promise.all(
      PERSONAS.map(async (persona, index) => {
        try {
          const response = await fetchWithTimeout(
            `/api/true-affordability?geoType=${geoType}&geoId=${geoId}&householdType=${persona.type}`,
            10000 // 10 second timeout
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${persona.label}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.message || 'Failed to calculate affordability');
          }

          return {
            index,
            breakdown: data.data,
            error: null,
          };
        } catch (error: any) {
          console.error(`Error fetching ${persona.label}:`, error);
          return {
            index,
            breakdown: null,
            error: error.message,
          };
        }
      })
    ).then((results) => {
      setPersonaData((prev) =>
        prev.map((persona, index) => {
          const result = results[index];
          return {
            ...persona,
            breakdown: result.breakdown,
            loading: false,
            error: result.error,
          };
        })
      );
    }).catch((error) => {
      // Fallback error handler - ensure loading state is cleared
      console.error('Failed to fetch true affordability data:', error);
      setPersonaData((prev) =>
        prev.map((persona) => ({
          ...persona,
          loading: false,
          error: 'Data unavailable for this location',
        }))
      );
    });
  }, [geoType, geoId]);

  const allLoading = personaData.every((p) => p.loading);
  const anyErrors = personaData.some((p) => p.error);
  const hasData = personaData.some((p) => p.breakdown);

  // Show loading state
  if (allLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
        <p className="text-gray-600">Calculating true affordability for different household types...</p>
      </div>
    );
  }

  // Show error state if no data loaded
  if (!hasData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-900 mb-1">Data Unavailable for This Location</p>
            <p className="text-sm text-yellow-800">
              True affordability data is currently unavailable for {cityName}. This can happen when:
            </p>
            <ul className="text-sm text-yellow-800 list-disc list-inside mt-2 space-y-1">
              <li>Cost of living data is incomplete for this area</li>
              <li>The location is too new or too small for comprehensive data</li>
              <li>Required tax or expense data is not yet available</li>
            </ul>
            <p className="text-sm text-yellow-800 mt-3">
              We're working to populate comprehensive cost data for all cities. Check back soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter out personas with errors
  const validPersonas = personaData
    .filter((p) => p.breakdown !== null)
    .map((p) => ({
      type: p.type,
      label: p.label,
      breakdown: p.breakdown!,
    }));

  return (
    <div className="space-y-6">
      <PersonaComparisonTable personas={validPersonas} cityName={cityName} />

      {anyErrors && (
        <div className="text-xs text-gray-500 italic">
          Note: Some household types could not be calculated due to incomplete data.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">What is True Affordability?</h4>
        <p className="text-sm text-blue-800">
          Unlike simple home price-to-income ratios, True Affordability accounts for the full cost of living in a location:
          income taxes, property taxes, transportation, childcare, and healthcare. This gives you a realistic picture of
          how much money you'll have left after covering essentials.
        </p>
      </div>
    </div>
  );
}
