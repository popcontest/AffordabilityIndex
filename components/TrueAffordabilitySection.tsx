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
    // Fetch data for all personas in parallel
    Promise.all(
      PERSONAS.map(async (persona, index) => {
        try {
          const response = await fetch(
            `/api/true-affordability?geoType=${geoType}&geoId=${geoId}&householdType=${persona.type}`
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
        <p className="text-yellow-800">
          True affordability data is currently unavailable for this location. We're working to populate
          comprehensive cost data for all cities.
        </p>
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
