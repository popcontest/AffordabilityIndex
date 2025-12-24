import { notFound } from 'next/navigation';

// TODO: Implement county pages when county-level data is loaded.
// This placeholder ensures the route structure is reserved and returns 404 for now.
//
// Future implementation:
// - Resolve state via stateFromSlug
// - Resolve county by slug (match against countyFips/countyName lookup)
// - Fetch county-level metrics (when available)
// - Render county detail page with:
//   - Key stats (home value, income, ratio, earningPower)
//   - County-level place rankings
//   - County-level ZIP rankings
//   - Comparisons to state/national averages
//   - JSON-LD breadcrumb
// - Add revalidate / generateStaticParams for ISR

interface CountyPageProps {
  params: Promise<{
    state: string;
    county: string;
  }>;
}

export default async function CountyPage(props: CountyPageProps) {
  // County data not yet implemented - return 404
  notFound();
}
