'use client';

import type { V2ScoreData } from '@/lib/v2-scores';

interface V2ScoreCardProps {
  score: V2ScoreData | null;
  placeName?: string;
}

// Helper functions (inlined to avoid importing server-side code)
function getAffordabilityLabel(compositeScore: number): string {
  if (compositeScore >= 80) return 'Very Affordable';
  if (compositeScore >= 60) return 'Affordable';
  if (compositeScore >= 40) return 'Moderate';
  if (compositeScore >= 20) return 'Expensive';
  return 'Very Expensive';
}

function getAffordabilityColor(compositeScore: number): string {
  if (compositeScore >= 80) return 'text-green-600';
  if (compositeScore >= 60) return 'text-lime-600';
  if (compositeScore >= 40) return 'text-yellow-600';
  if (compositeScore >= 20) return 'text-orange-600';
  return 'text-red-600';
}

export default function V2ScoreCard({ score, placeName }: V2ScoreCardProps) {
  if (!score) {
    return (
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Affordability Score</h3>
        <p className="text-gray-600">Affordability score not available for this location.</p>
      </div>
    );
  }

  const label = getAffordabilityLabel(score.compositeScore);
  const colorClass = getAffordabilityColor(score.compositeScore);

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Affordability Score</h3>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${colorClass}`}>
            {Math.round(score.compositeScore)}
          </span>
          <span className="text-gray-600">/ 100</span>
        </div>
        <p className={`text-sm font-medium mt-1 ${colorClass}`}>{label}</p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Component Scores</h4>

        {score.housingScore !== null && (
          <ScoreBar
            label="Housing"
            score={score.housingScore}
            description="Monthly housing payment vs income"
          />
        )}

        {score.colScore !== null && (
          <ScoreBar
            label="Cost of Living"
            score={score.colScore}
            description="Essential expenses (food, healthcare, transport)"
          />
        )}

        {score.taxScore !== null && (
          <ScoreBar
            label="Taxes"
            score={score.taxScore}
            description="Income & sales tax burden"
          />
        )}

        {score.qolScore !== null && (
          <ScoreBar
            label="Quality of Life"
            score={score.qolScore}
            description="Safety, schools, walkability"
          />
        )}
      </div>

      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <p>Higher scores = more affordable. Based on housing burden, cost of living, and tax data.</p>
        {score.dataQuality && score.dataQuality !== 'complete' && (
          <p className="mt-1 text-yellow-600">
            Note: Some data components unavailable ({score.dataQuality} data quality)
          </p>
        )}
      </div>
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  description: string;
}

function ScoreBar({ label, score, description }: ScoreBarProps) {
  const roundedScore = Math.round(score);
  const getBarColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-lime-500';
    if (value >= 40) return 'bg-yellow-500';
    if (value >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-900 font-semibold">{roundedScore}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={roundedScore} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} score: ${roundedScore} out of 100. ${description}`}>
        <div
          className={`h-2 rounded-full ${getBarColor(score)}`}
          style={{ width: `${roundedScore}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}
