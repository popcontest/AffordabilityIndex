# Performance Optimization Quick Reference

## Quick Commands

```bash
# Build with bundle analysis
ANALYZE=true npm run build

# Standard production build
npm run build

# Check bundle sizes
npm run check-bundle

# Development server
npm run dev
```

## Key Files

- **C:\code\websites\AffordabilityIndex\components\LazyComponents.tsx** - All lazy-loaded components
- **C:\code\websites\AffordabilityIndex\components\WebVitals.tsx** - Web Vitals tracking
- **C:\code\websites\AffordabilityIndex\next.config.ts** - Next.js optimizations
- **C:\code\websites\AffordabilityIndex\scripts\check-bundle-size.js** - Bundle monitoring
- **C:\code\websites\AffordabilityIndex\package.json** - Dependencies

## Lazy Loading Pattern

```typescript
// For new components, use dynamic imports:
import { lazy } from 'react';

export const HeavyComponent = lazy(() =>
  import('./HeavyComponent').then(m => ({ default: m.HeavyComponent }))
);

// Then use with Suspense:
import { Suspense } from 'react';
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

## Removed Dependencies (Don't Re-add)

- @anthropic-ai/sdk
- @google/generative-ai
- openai
- file-saver

## Added Tools

- @next/bundle-analyzer - Bundle analysis
- web-vitals - Performance tracking

## Web Vitals Tracked

- CLS - Cumulative Layout Shift
- INP - Interaction to Next Paint
- FCP - First Contentful Paint
- LCP - Largest Contentful Paint
- TTFB - Time to First Byte

Reports to Google Analytics: G-MD27S36LNC

## Performance Budgets

- app/page.js: 100 KB
- main.js: 200 KB
- webpack-runtime.js: 50 KB

Check with: `npm run check-bundle`

## Next.js Optimizations Enabled

✅ Modular imports for Recharts
✅ Gzip compression
✅ Bundle analyzer configured
✅ SWC minification (default in Next.js 16)

## Documentation

- PERFORMANCE_OPTIMIZATION.md - Detailed guide
- BUNDLE_OPTIMIZATION_SUMMARY.md - Complete report
- PERFORMANCE_QUICK_REFERENCE.md - This file
