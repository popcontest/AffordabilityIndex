/**
 * ScoreHero - Prominent affordability score display
 * Shows score (0-100), letter grade, and descriptor
 */

import type { ScoreBreakdown } from '@/lib/scoreTypes';
import type { RequiredIncomeData } from '@/lib/required-income';
import { scoreLabel, getScoreColor } from '@/lib/scoring';
import { formatCurrency } from '@/lib/viewModels';

interface ScoreHeroProps {
  score: ScoreBreakdown;
  locationName: string;
  requiredIncome?: RequiredIncomeData | null;
}

export function ScoreHero({ score, locationName, requiredIncome }: ScoreHeroProps) {
  const { overallScore, grade } = score;

  if (overallScore === null || grade === null) {
    return (
      <div className="bg-ai-surface rounded-[var(--ai-radius-card)] p-8 text-center border border-ai-border shadow-[var(--ai-shadow-card)]">
        <div className="text-ai-text-muted text-lg">
          Affordability data not available for {locationName}
        </div>
      </div>
    );
  }

  const label = scoreLabel(overallScore);
  const colorClass = getScoreColor(overallScore);

  // Get accent color based on score (using semantic tokens)
  const getAccentClass = (score: number) => {
    if (score >= 75) return 'text-ai-positive';
    if (score >= 60) return 'text-ai-warm';
    if (score >= 45) return 'text-ai-negative-light';
    return 'text-ai-negative';
  };

  const getBgClass = (score: number) => {
    if (score >= 75) return 'bg-ai-positive-subtle';
    if (score >= 60) return 'bg-ai-warm-subtle';
    if (score >= 45) return 'bg-ai-negative-subtle';
    return 'bg-ai-negative-subtle';
  };

  const accentClass = getAccentClass(overallScore);
  const bgClass = getBgClass(overallScore);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-12 border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300" data-testid="score-hero">
      <div className="text-center relative z-10">
        {/* Location name */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 tracking-tight">{locationName}</h1>

        {/* Score and Grade */}
        <div className="flex items-baseline justify-center gap-8 mb-6" data-testid="score-overall">
          {/* Score */}
          <div>
            <div className="text-8xl md:text-9xl font-black bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent tabular-nums leading-none">
              {Math.round(overallScore)}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-3">out of 100</div>
          </div>

          {/* Divider */}
          <div className="h-24 w-px bg-gray-300"></div>

          {/* Grade */}
          <div>
            <div className="text-7xl md:text-8xl font-black text-gray-400 leading-none">{grade}</div>
            <div className="text-sm font-medium text-gray-600 mt-3">grade</div>
          </div>
        </div>

        {/* Label */}
        <div className="text-2xl font-bold text-gray-800 mb-4">
          <span className={accentClass}>{label}</span> affordability
        </div>

        {/* Emotional context - what this score means */}
        <div className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto mt-6">
          {overallScore >= 75 && (
            <>One of the most affordable places in America. Homeownership is within reach for most households.</>
          )}
          {overallScore >= 60 && overallScore < 75 && (
            <>Solid affordability with reasonable housing costs relative to local incomes.</>
          )}
          {overallScore >= 45 && overallScore < 60 && (
            <>Housing costs are stretching budgets. Many households need careful planning to afford homeownership.</>
          )}
          {overallScore < 45 && (
            <>Housing affordability is a serious challenge. Only higher-income households can comfortably afford homes here.</>
          )}
        </div>

        {/* Required Family Income - Above Fold Feature */}
        {requiredIncome && (
          <div className="mt-8 pt-6 border-t-2 border-gray-300">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 shadow-md">
              <p className="text-lg font-semibold text-gray-800 mb-2">
                A family needs <span className="text-2xl font-bold text-blue-700">{formatCurrency(requiredIncome.requiredAnnualIncome)}/year</span> to live comfortably here
              </p>
              <p className="text-sm text-gray-600">
                Based on typical housing costs, living expenses, and taxes for a family of 4
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent pointer-events-none"></div>
    </div>
  );
}
