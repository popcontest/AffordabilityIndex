/**
 * Lazy-loaded components for code splitting
 *
 * Heavy components that don't need to be in the initial bundle
 * are dynamically imported here to improve initial load performance
 */

import { lazy } from 'react';

// Heavy calculator components - only load when user scrolls to them
export const RentVsBuyCalculator = lazy(() =>
  import('./RentVsBuyCalculator').then(module => ({
    default: module.RentVsBuyCalculator
  }))
);

export const AffordabilityCalculator = lazy(() =>
  import('./AffordabilityCalculator').then(module => ({
    default: module.AffordabilityCalculator
  }))
);

// Complex dashboard components
export const TrueAffordabilitySection = lazy(() =>
  import('./TrueAffordabilitySection').then(module => ({
    default: module.TrueAffordabilitySection
  }))
);

export const HousingEconomicContext = lazy(() =>
  import('./HousingEconomicContext').then(module => ({
    default: module.HousingEconomicContext
  }))
);

export const PersonaCards = lazy(() =>
  import('./PersonaCards').then(module => ({
    default: module.PersonaCards
  }))
);

export const CostBreakdownChart = lazy(() =>
  import('./CostBreakdownChart').then(module => ({
    default: module.CostBreakdownChart
  }))
);

// Charts - Recharts is heavy, lazy load all charts
export const TrendChart = lazy(() =>
  import('./charts/TrendChart').then(module => ({
    default: module.TrendChart
  }))
);

export const ComparisonChart = lazy(() =>
  import('./charts/ComparisonChart').then(module => ({
    default: module.ComparisonChart
  }))
);

export const Sparkline = lazy(() =>
  import('./charts/Sparkline').then(module => ({
    default: module.Sparkline
  }))
);

// Map component
export const StaticCityMap = lazy(() =>
  import('./StaticCityMap').then(module => ({
    default: module.StaticCityMap
  }))
);

// Complex comparison tables
export const CompareView = lazy(() =>
  import('./CompareView').then(module => ({
    default: module.CompareView
  }))
);

// Rankings tables
export const RankingsTable = lazy(() =>
  import('./RankingsTable').then(module => ({
    default: module.RankingsTable
  }))
);
