import { StatusChip } from './StatusChip';

interface DataQualityCardProps {
  incomeMatchType: string | null;
  candidateCount?: number;
  note?: string;
}

/**
 * Card showing data quality information for income matching
 */
export function DataQualityCard({ incomeMatchType, candidateCount, note }: DataQualityCardProps) {
  const getMatchDescription = (matchType: string | null): { label: string; tone: 'neutral' | 'success' | 'warning' | 'info'; description: string } => {
    switch (matchType) {
      case 'exact':
        return {
          label: 'Exact Match',
          tone: 'success',
          description: 'City name matched exactly to Census place data. Highest quality income data.',
        };
      case 'pop_disambiguated':
        return {
          label: 'Population Match',
          tone: 'info',
          description: 'Multiple Census candidates found; matched by highest population. Good quality income data.',
        };
      case 'ambiguous':
        return {
          label: 'Ambiguous',
          tone: 'warning',
          description: 'Multiple Census candidates with similar population. Income data not used to preserve accuracy.',
        };
      case 'none':
        return {
          label: 'No Match',
          tone: 'neutral',
          description: 'No matching Census place found. Income data unavailable.',
        };
      default:
        return {
          label: 'Unknown',
          tone: 'neutral',
          description: 'Match type not specified.',
        };
    }
  };

  const matchInfo = getMatchDescription(incomeMatchType);

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-3">
      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
        Data Quality
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <StatusChip label={matchInfo.label} tone={matchInfo.tone} />
          {candidateCount !== undefined && candidateCount > 1 && (
            <span className="text-xs text-gray-500">({candidateCount} candidates)</span>
          )}
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{matchInfo.description}</p>
        {note && <p className="text-xs text-gray-500 italic">{note}</p>}
      </div>
    </div>
  );
}
