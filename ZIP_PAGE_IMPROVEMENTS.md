# ZIP Page Loading States and Error Handling - Implementation Summary

This document summarizes the improvements made to the ZIP page (`app/zip/[zip]/page.tsx`) for better loading states, error handling, and user experience.

## Overview

The ZIP page has been enhanced with:
1. **Reusable skeleton components** for loading states
2. **Error boundary components** for graceful error handling
3. **Progressive loading** for heavy components
4. **Data freshness warnings** for stale data
5. **Comprehensive error messages** for edge cases

## 1. Skeleton Components

### Location
`/components/skeletons/`

### Components Created

#### ScoreHeroSkeleton
**File**: `components/skeletons/ScoreHeroSkeleton.tsx`

Loading skeleton for the main ScoreHero component with animated pulse effects.

```tsx
export function ScoreHeroSkeleton() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-12 border-2 border-blue-200 shadow-xl">
      <div className="text-center relative z-10 animate-pulse">
        {/* Location name skeleton */}
        <div className="h-12 bg-gray-300 rounded-lg max-w-2xl mx-auto mb-8"></div>

        {/* Score and Grade skeletons */}
        <div className="flex items-baseline justify-center gap-8 mb-6">
          {/* Score skeleton */}
          <div className="w-48 h-32 bg-gray-300 rounded-xl"></div>

          {/* Divider */}
          <div className="h-24 w-px bg-gray-300"></div>

          {/* Grade skeleton */}
          <div className="w-32 h-28 bg-gray-300 rounded-xl"></div>
        </div>

        {/* Label skeleton */}
        <div className="h-8 bg-gray-300 rounded-lg max-w-md mx-auto mb-4"></div>

        {/* Description skeleton */}
        <div className="space-y-3 max-w-3xl mx-auto mt-6">
          <div className="h-5 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded w-3/4 mx-auto"></div>
        </div>

        {/* Required income skeleton */}
        <div className="mt-8 pt-6 border-t-2 border-gray-300">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 shadow-md">
            <div className="h-6 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### ScoreBreakdownSkeleton
**File**: `components/skeletons/ScoreBreakdownSkeleton.tsx`

Skeleton for the score breakdown panel with animated score bars.

#### PersonaCardsSkeleton
**File**: `components/skeletons/PersonaCardsSkeleton.tsx`

Grid layout skeleton for persona cards with icons, titles, and description lines.

#### KpiCardSkeleton & KpiGridSkeleton
**File**: `components/skeletons/KpiGridSkeleton.tsx`

Skeletons for KPI cards and grids used throughout the dashboard.

#### PanelSkeleton
**File**: `components/skeletons/PanelSkeleton.tsx`

Generic panel skeleton with configurable title and content lines.

#### TrueAffordabilitySkeleton
**File**: `components/skeletons/TrueAffordabilitySkeleton.tsx`

Table skeleton for the TrueAffordabilitySection component.

### Usage Example

```tsx
import { TrueAffordabilitySkeleton } from '@/components/skeletons';

// In TrueAffordabilitySection.tsx
if (allLoading) {
  return <TrueAffordabilitySkeleton />;
}
```

## 2. Error Boundary Components

### Location
`/components/errors/`

### Components Created

#### SectionErrorBoundary
**File**: `components/errors/SectionErrorBoundary.tsx`

React error boundary class component that catches errors in individual sections and shows graceful fallbacks with retry functionality.

```tsx
<SectionErrorBoundary sectionName="Score Breakdown">
  <ScoreBreakdownPanel score={heroScore} />
</SectionErrorBoundary>
```

**Features**:
- Catches rendering errors in child components
- Displays user-friendly error messages
- Provides retry button
- Prevents entire page from crashing due to section errors

#### InlineError
**File**: `components/errors/InlineError.tsx`

Compact inline error display with optional retry button.

```tsx
<InlineError
  message="Failed to load data"
  onRetry={() => refetch()}
  showIcon={true}
/>
```

#### DataWarning
**File**: `components/errors/DataWarning.tsx`

Warning banner for data quality issues (stale data, partial data, etc.).

```tsx
<DataWarning
  title="Data is Outdated"
  message="Data is over 6 months old. Current market conditions may differ significantly."
  type="stale" // 'warning' | 'info' | 'stale'
/>
```

**Types**:
- `warning`: Yellow banner for general warnings
- `info`: Blue banner for informational messages
- `stale`: Orange banner for outdated data

#### LoadingSpinner
**File**: `components/errors/LoadingSpinner.tsx`

Reusable loading spinner with configurable size and message.

```tsx
<LoadingSpinner
  size="md" // 'sm' | 'md' | 'lg'
  message="Loading data..."
  className="my-8"
/>
```

## 3. Progressive Loading Components

### Location
`/components/loading/`

### Components Created

#### ProgressiveSection
**File**: `components/loading/ProgressiveSection.tsx`

Delays rendering of heavy sections for better perceived performance.

```tsx
<ProgressiveSection delay={100}>
  <TrueAffordabilitySection
    geoType="ZCTA"
    geoId={zcta.zcta}
    cityName={zcta.city || `ZIP ${zip}`}
  />
</ProgressiveSection>
```

**Features**:
- Shows fallback/skeleton during delay
- Improves perceived performance by prioritizing above-fold content
- Configurable delay in milliseconds

#### SuspenseWrapper
**File**: `components/loading/SuspenseWrapper.tsx`

Wrapper around React Suspense with consistent loading UI.

```tsx
<SuspenseWrapper fallback={<CustomSkeleton />}>
  <AsyncComponent />
</SuspenseWrapper>
```

## 4. Data Quality Utilities

### Location
`/lib/dataQuality.ts`

### Functions Created

#### checkDataFreshness()
Checks if data is stale based on the date.

```tsx
const dataQuality = checkDataFreshness(metrics?.asOfDate, 90); // 90 days threshold

if (dataQuality?.isStale) {
  // Show warning
  <DataWarning
    title={dataQuality.severity === 'critical' ? 'Data is Outdated' : 'Data May Be Stale'}
    message={dataQuality.message}
    type={dataQuality.severity === 'critical' ? 'stale' : 'warning'}
  />
}
```

**Returns**:
```tsx
{
  isStale: boolean;
  daysSinceUpdate: number;
  severity: 'good' | 'warning' | 'critical';
  message?: string;
}
```

#### isValidZip()
Validates ZIP code format.

```tsx
if (!isValidZip(zip)) {
  notFound();
}
```

#### normalizeZip()
Sanitizes and normalizes ZIP code input.

```tsx
const normalizedZip = normalizeZip(userInput); // "12345-6789" → "12345"
```

#### checkDataCompleteness()
Checks if required data fields are present.

```tsx
const { isComplete, missingFields } = checkDataCompleteness({
  metrics,
  acsData
});

if (!isComplete) {
  console.warn('Missing fields:', missingFields);
}
```

#### getErrorMessage()
Gets appropriate error message for different failure scenarios.

```tsx
const message = getErrorMessage('network', 'ZIP 12345');
// "Unable to load data due to a network error. Please check your connection and try again."
```

**Error Types**:
- `network`: Network connectivity issues
- `timeout`: Request timeout
- `invalid`: Invalid input provided
- `not_found`: Resource not found
- `unknown`: Unexpected errors

## 5. Page-Level Error Handling

### Loading Page
**File**: `app/zip/[zip]/loading.tsx`

Custom loading page shown during ISR revalidation or initial page generation.

```tsx
export default function Loading() {
  return (
    <>
      <ScoreHeroSkeleton />
      <ScoreBreakdownSkeleton />
      <PanelSkeleton />
    </>
  );
}
```

### Error Page
**File**: `app/zip/[zip]/error.tsx`

Custom error boundary for ZIP routes with user-friendly error display and retry functionality.

```tsx
'use client';

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Something Went Wrong
          </h1>
          <InlineError
            message={error.message}
            onRetry={reset}
          />
          <Link href="/">Return Home</Link>

          {process.env.NODE_ENV === 'development' && (
            <details>
              <summary>Error Details (Development Only)</summary>
              <pre>{error.stack}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 6. Enhanced ZIP Page Features

### ZIP Code Validation
```tsx
// Normalize and validate ZIP
const normalizedZip = normalizeZip(zip);
if (!isValidZip(normalizedZip)) {
  notFound();
}
```

### Graceful Error Handling
```tsx
let dashboardData;
try {
  dashboardData = await getZipDashboardData(normalizedZip);
} catch (error) {
  console.error('Failed to fetch dashboard data:', error);

  // Return user-friendly error page instead of crashing
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Unable to Load ZIP Data
      </h1>
      <p className="text-gray-600 mb-6">
        {getErrorMessage('network', `ZIP ${normalizedZip}`)}
      </p>
      <Link href="/" className="btn-primary">Return Home</Link>
    </div>
  );
}
```

### Data Freshness Warnings
```tsx
// Check data freshness
const dataQuality = checkDataFreshness(metrics?.asOfDate);

// Display warning if data is stale
{dataQuality && dataQuality.isStale && (
  <DataWarning
    title={dataQuality.severity === 'critical' ? 'Data is Outdated' : 'Data May Be Stale'}
    message={dataQuality.message || 'Data may not reflect current market conditions.'}
    type={dataQuality.severity === 'critical' ? 'stale' : 'warning'}
  />
)}
```

### Section-Level Error Boundaries
```tsx
<SectionErrorBoundary sectionName="Affordability Calculator">
  <div className="mb-8">
    <AffordabilityCalculator
      medianHomeValue={metrics.homeValue}
      medianIncome={metrics.income}
      cityName={zcta.city || `ZIP ${normalizedZip}`}
      stateAbbr={zcta.stateAbbr || ''}
    />
  </div>
</SectionErrorBoundary>

<SectionErrorBoundary sectionName="True Affordability">
  <ProgressiveSection delay={100}>
    <TrueAffordabilitySection
      geoType="ZCTA"
      geoId={zcta.zcta}
      cityName={zcta.city || `ZIP ${normalizedZip}`}
    />
  </ProgressiveSection>
</SectionErrorBoundary>
```

## 7. Edge Cases Handled

### Invalid ZIP Codes
```tsx
// Validates format: 12345 or 12345-6789
if (!isValidZip(normalizedZip)) {
  notFound();
}
```

### Network Errors
```tsx
try {
  dashboardData = await getZipDashboardData(normalizedZip);
} catch (error) {
  // Show user-friendly error with retry option
  return <ErrorPage error={error} />;
}
```

### Partial Data Loading
```tsx
// Sections handle missing data gracefully
{metrics.homeValue && metrics.income && (
  <AffordabilityCalculator
    medianHomeValue={metrics.homeValue}
    medianIncome={metrics.income}
    // ...
  />
)}

// Show message if data is processing
{!hasMetrics && (
  <Panel>
    <div className="text-center py-6">
      <p className="text-gray-600">
        Data for ZIP {normalizedZip} is currently being processed. Check back soon.
      </p>
    </div>
  </Panel>
)}
```

### Data Freshness
```tsx
// Warns users when data is old
// - Warning: 90-180 days old
// - Critical: 180+ days old
const dataQuality = checkDataFreshness(metrics?.asOfDate, 90);
```

### Timeouts
TrueAffordabilitySection already implements 10-second timeout with graceful error handling:

```tsx
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
```

## 8. Benefits

### User Experience
- **Perceived Performance**: Skeleton screens make the app feel faster
- **Clear Feedback**: Users always know what's happening (loading, error, empty states)
- **Graceful Degradation**: Section errors don't crash the entire page
- **Informative Warnings**: Data freshness warnings set appropriate expectations

### Developer Experience
- **Reusable Components**: Skeletons and error components can be used throughout the app
- **Consistent UI**: Standardized loading and error states
- **Easy Debugging**: Development mode shows detailed error information
- **Maintainable**: Clear separation of concerns with dedicated error handling

### SEO and Caching
- **ISR Support**: Custom loading page for revalidation periods
- **Error Pages**: Proper error.tsx for Next.js error handling
- **Metadata Safety**: Metadata generation handles errors gracefully

## 9. Implementation Checklist

To apply these improvements to the ZIP page:

- [x] Create skeleton components
- [x] Create error boundary components
- [x] Create progressive loading components
- [x] Create data quality utilities
- [x] Create loading.tsx for ISR revalidation
- [x] Create error.tsx for error boundaries
- [x] Add ZIP validation and normalization
- [x] Add data freshness warnings
- [x] Wrap sections in error boundaries
- [x] Implement progressive loading for heavy sections
- [x] Handle network errors gracefully
- [x] Handle partial data scenarios
- [x] Add timeout handling for API calls

## 10. Next Steps

To fully integrate these improvements:

1. **Replace the existing page.tsx** with the enhanced version from `page.enhanced.tsx`
2. **Test error scenarios**:
   - Invalid ZIP codes
   - Network failures
   - Missing data
   - Stale data
3. **Test loading states**:
   - Initial page load
   - ISR revalidation
   - Progressive section loading
4. **Monitor error rates** and user feedback
5. **Consider adding**:
   - Analytics for error tracking
   - Retry logic with exponential backoff
   - Offline support with service workers

## Files Created

### Skeleton Components
- `/components/skeletons/ScoreHeroSkeleton.tsx`
- `/components/skeletons/ScoreBreakdownSkeleton.tsx`
- `/components/skeletons/PersonaCardsSkeleton.tsx`
- `/components/skeletons/KpiGridSkeleton.tsx`
- `/components/skeletons/PanelSkeleton.tsx`
- `/components/skeletons/TrueAffordabilitySkeleton.tsx`
- `/components/skeletons/index.ts`

### Error Components
- `/components/errors/SectionErrorBoundary.tsx`
- `/components/errors/InlineError.tsx`
- `/components/errors/DataWarning.tsx`
- `/components/errors/LoadingSpinner.tsx`
- `/components/errors/index.ts`

### Loading Components
- `/components/loading/ProgressiveSection.tsx`
- `/components/loading/SuspenseWrapper.tsx`
- `/components/loading/index.ts`

### Utilities
- `/lib/dataQuality.ts`

### Page Files
- `/app/zip/[zip]/loading.tsx`
- `/app/zip/[zip]/error.tsx`
- `/app/zip/[zip]/page.enhanced.tsx` (reference implementation)

### Documentation
- `/ZIP_PAGE_IMPROVEMENTS.md` (this file)
