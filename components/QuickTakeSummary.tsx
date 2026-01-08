'use client';

import type { V2ScoreData } from '@/lib/v2-scores';

interface QuickTakeSummaryProps {
  score: V2ScoreData;
  cityName: string;
  stateRatio?: number | null;
  nationalRatio?: number;
  population?: number | null;
}

/**
 * QuickTakeSummary - 3-bullet summary of key affordability insights
 * Positioned after ScoreHero to give users quick context before diving deeper
 */
export function QuickTakeSummary({
  score,
  cityName,
  stateRatio = null,
  nationalRatio = 4.5,
  population = null,
}: QuickTakeSummaryProps) {
  const { compositeScore, housingScore, colScore, taxScore, qolScore } = score;

  if (!compositeScore) {
    return null;
  }

  const scoreNum = Math.round(compositeScore);
  const percentile = scoreNum;

  // Determine affordability level
  const getLevel = (score: number) => {
    if (score >= 80) return { label: 'Very Affordable', color: 'green', icon: '✅' };
    if (score >= 60) return { label: 'Affordable', color: 'blue', icon: '👍' };
    if (score >= 40) return { label: 'Moderate', color: 'yellow', icon: '⚠️' };
    return { label: 'Challenging', color: 'red', icon: '❌' };
  };

  const level = getLevel(scoreNum);

  // Calculate insights
  const insights: { icon: string; text: string; highlight: boolean }[] = [];

  // Insight 1: National comparison
  const nationalComparison = scoreNum >= 50
    ? `More affordable than ${percentile}% of US cities`
    : `Less affordable than ${100 - percentile}% of US cities`;
  insights.push({
    icon: '🇺🇸',
    text: nationalComparison,
    highlight: scoreNum >= 50,
  });

  // Insight 2: Housing cost vs income (if available)
  if (housingScore && housingScore !== null) {
    const housingNum = Math.round(housingScore);
    if (housingNum >= 60) {
      insights.push({
        icon: '🏠',
        text: `Housing costs reasonable relative to local incomes`,
        highlight: true,
      });
    } else if (housingNum <= 40) {
      insights.push({
        icon: '🏠',
        text: `Housing costs stretch local budgets (${level.label} market)`,
        highlight: false,
      });
    }
  }

  // Insight 3: Best for (based on overall score)
  if (scoreNum >= 70) {
    insights.push({
      icon: '👨‍👩‍👧‍👦',
      text: `Great for families & retirees - high affordability`,
      highlight: true,
    });
  } else if (scoreNum >= 50) {
    insights.push({
      icon: '💼',
      text: `Suitable for professionals & young families`,
      highlight: true,
    });
  } else {
    insights.push({
      icon: '💰',
      text: `Consider higher-income neighborhoods or suburbs`,
      highlight: false,
    });
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        Quick Take: {cityName} is <span className={`text-${level.color}-600`}>{level.label}</span> ({scoreNum}/100)
      </h3>
      <ul className="space-y-3">
        {insights.slice(0, 3).map((insight, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              {insight.icon}
            </span>
            <span className={`text-sm ${insight.highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {insight.text}
            </span>
          </li>
        ))}
      </ul>

      {/* Additional context for smaller cities */}
      {population !== null && population < 50000 && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Smaller cities like {cityName} (population: {population.toLocaleString()}) may have limited housing inventory, affecting availability.
          </p>
        </div>
      )}
    </div>
  );
}
