import Link from 'next/link';

interface RankingItem {
  name?: string | null;
  stateName?: string | null;
  stateAbbr?: string | null;
  slug?: string | null;
  zcta?: string;
  metrics?: {
    ratio: number | null;
  } | null;
  medianRatio?: number; // For StateRanking
}

interface RankingPreviewTableProps {
  title: string;
  items: RankingItem[];
  viewAllLink: string;
  getItemLink: (item: RankingItem) => string;
  showState?: boolean;
}

export function RankingPreviewTable({
  title,
  items,
  viewAllLink,
  getItemLink,
  showState = true,
}: RankingPreviewTableProps) {
  return (
    <div className="bg-white border border-ai-border rounded-[var(--ai-radius-lg)] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-ai-surface border-b border-ai-border px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <Link
          href={viewAllLink}
          className="text-sm font-semibold text-ai-warm hover:text-ai-warm-hover transition-colors flex items-center gap-1"
        >
          View All
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ai-surface border-b border-ai-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-ai-text-muted uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-ai-text-muted uppercase tracking-wider">
                Name
              </th>
              {showState && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-ai-text-muted uppercase tracking-wider w-20">
                  State
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ai-border">
            {items.map((item, index) => {
              // For display name, prefer stateName for states, name for cities
              const displayName = item.stateName || item.name || '—';

              return (
                <tr key={index} className="hover:bg-ai-surface transition-colors">
                  <td className="px-6 py-3 text-sm font-bold text-ai-text-muted">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={getItemLink(item)}
                      className="text-sm font-semibold text-gray-900 hover:text-ai-warm transition-colors"
                    >
                      {displayName}
                    </Link>
                  </td>
                  {showState && (
                    <td className="px-6 py-3 text-sm text-ai-text-muted">
                      {item.stateAbbr}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="px-6 py-8 text-center text-ai-text-muted">
          No data available
        </div>
      )}
    </div>
  );
}
