'use client';

/**
 * ScoreBreakdownPanel - Detailed affordability score breakdown
 * Shows component scores with visual progress bars, national comparisons, and insights
 */

import { useState } from 'react';
import Link from 'next/link';
import type { ScoreBreakdown } from '@/lib/scoreTypes';
import { formatScore, getScoreColor } from '@/lib/scoring';

interface ScoreBreakdownPanelProps {
  score: ScoreBreakdown;
}

// National median scores for comparison
const NATIONAL_MEDIANS = {
  housing: 65,
  essentials: 58,
  taxes: 60,
  healthcare: 62,
};

// Component weights (for display purposes)
// Current implementation uses: 60% housing, 40% essentials
// Tax and healthcare components are not yet implemented
const COMPONENT_WEIGHTS = {
  housing: 60,
  essentials: 40,
  taxes: 0,  // Not yet implemented
  healthcare: 0,  // Not yet implemented
};

export function ScoreBreakdownPanel({ score }: ScoreBreakdownPanelProps) {
  // Default to EXPANDED for better visibility
  const [isExpanded, setIsExpanded] = useState(true);

  const { version, overallScore, grade, housingScore, essentialsScore, taxesScore, healthcareScore, notes } = score;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Score Breakdown</h2>
            <p className="text-sm text-gray-500 mt-0.5">How affordability is calculated</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <span>Collapse</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Expand</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overall Score - Always visible */}
      <div className="px-6 py-5 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-900">Overall Affordability</div>
          <div className="flex items-center gap-3">
            {grade && (
              <span className="text-3xl font-bold text-gray-900">{grade}</span>
            )}
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              {formatScore(overallScore)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">vs. US median: {NATIONAL_MEDIANS.housing}</span>
          {overallScore !== null && (
            <span className={`font-medium ${overallScore > NATIONAL_MEDIANS.housing ? 'text-green-600' : 'text-red-600'}`}>
              {overallScore > NATIONAL_MEDIANS.housing ? '↑' : '↓'} {Math.abs(overallScore - NATIONAL_MEDIANS.housing).toFixed(0)} points
            </span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-4 space-y-5">
          {/* Housing Score */}
          <div data-testid="score-housing">
            <ScoreComponentEnhanced
              label="Housing Affordability"
              score={housingScore}
              nationalMedian={NATIONAL_MEDIANS.housing}
              weight={COMPONENT_WEIGHTS.housing}
              description="Home value relative to local income"
              insight={getHousingInsight(housingScore, NATIONAL_MEDIANS.housing)}
              available={true}
            />
          </div>

          {/* v2 Components */}
          {version !== 'v1_housing' && (
            <>
              <div data-testid="score-essentials">
                <ScoreComponentEnhanced
                  label="Essentials Affordability"
                  score={essentialsScore}
                  nationalMedian={NATIONAL_MEDIANS.essentials}
                  weight={COMPONENT_WEIGHTS.essentials}
                  description="Disposable income after living costs"
                  insight={getEssentialsInsight(essentialsScore, NATIONAL_MEDIANS.essentials)}
                  available={essentialsScore !== null}
                />
              </div>

              <ScoreComponentEnhanced
                label="Tax Burden"
                score={taxesScore}
                nationalMedian={NATIONAL_MEDIANS.taxes}
                weight={COMPONENT_WEIGHTS.taxes}
                description="Income, sales, property taxes"
                insight={getTaxInsight(taxesScore, NATIONAL_MEDIANS.taxes)}
                available={taxesScore !== null}
              />

              <ScoreComponentEnhanced
                label="Healthcare Cost"
                score={healthcareScore}
                nationalMedian={NATIONAL_MEDIANS.healthcare}
                weight={COMPONENT_WEIGHTS.healthcare}
                description="Insurance premiums, out-of-pocket"
                insight={getHealthcareInsight(healthcareScore, NATIONAL_MEDIANS.healthcare)}
                available={healthcareScore !== null}
              />
            </>
          )}

          {/* Cost Basket Metadata (v2 only) */}
          {score.basket && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">Cost Basket Details:</div>
              <dl className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <dt className="font-medium">Household Type:</dt>
                  <dd>{score.basket.householdType.replace(/_/g, ' ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Annual Living Costs:</dt>
                  <dd className="font-semibold">${score.basket.totalAnnual.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Data Source:</dt>
                  <dd>{score.basket.source === 'basket_stub' ? 'Sample Data (MVP)' : score.basket.source}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Version:</dt>
                  <dd>{score.basket.version}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Notes */}
          {notes && notes.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-xs font-semibold text-blue-900 mb-1">About this score:</div>
              <ul className="text-xs text-blue-800 space-y-1">
                {notes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Methodology Link */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href="/methodology"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              Learn how scores are calculated
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScoreComponentEnhancedProps {
  label: string;
  score: number | null;
  nationalMedian: number;
  weight: number;
  description: string;
  insight: string | null;
  available: boolean;
}

function ScoreComponentEnhanced({
  label,
  score,
  nationalMedian,
  weight,
  description,
  insight,
  available
}: ScoreComponentEnhancedProps) {
  if (!available) {
    return (
      <div className="py-3 opacity-50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-medium text-gray-600">{label}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
          <div className="text-sm text-gray-400 italic">Coming soon</div>
        </div>
      </div>
    );
  }

  const colorClass = getScoreColor(score);
  const percentage = Math.min(100, Math.max(0, score ?? 0));
  const nationalPercentage = Math.min(100, Math.max(0, nationalMedian));

  return (
    <div className="py-3">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{label}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {weight}% weight
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        </div>
        <div className={`text-lg font-semibold tabular-nums px-3 py-1 rounded-md ${colorClass}`}>
          {formatScore(score)}
        </div>
      </div>

      {/* Progress Bar with National Comparison */}
      <div className="relative h-8 bg-gray-100 rounded-md overflow-hidden mb-2">
        {/* Score bar */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${percentage}%` }}
        />

        {/* National median marker */}
        <div
          className="absolute inset-y-0 border-l-2 border-gray-600 z-10"
          style={{ left: `${nationalPercentage}%` }}
        >
          <div className="absolute -top-5 left-0 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
            US avg
          </div>
        </div>

        {/* Score value overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700">
            {score !== null && score > nationalMedian ? '↑' : '↓'}
            {Math.abs((score ?? 0) - nationalMedian).toFixed(0)} vs. national
          </span>
        </div>
      </div>

      {/* Insight */}
      {insight && (
        <div className="flex items-start gap-2 mt-2 text-xs">
          <span className="text-gray-400">💡</span>
          <span className="text-gray-600 flex-1">{insight}</span>
        </div>
      )}
    </div>
  );
}

// Helper: Get bar color based on score
function getBarColor(score: number | null): string {
  if (score === null) return 'bg-gray-300';
  if (score >= 80) return 'bg-green-500/80';
  if (score >= 60) return 'bg-green-400/70';
  if (score >= 40) return 'bg-yellow-400/70';
  if (score >= 20) return 'bg-orange-400/70';
  return 'bg-red-400/70';
}

// Insight generators
function getHousingInsight(score: number | null, national: number): string | null {
  if (score === null) return null;

  const diff = score - national;
  if (diff >= 20) return 'Homes here are very affordable relative to income';
  if (diff >= 10) return 'Housing costs are lower than most of the country';
  if (diff >= -10) return 'Housing affordability is close to the national average';
  if (diff >= -20) return 'Homes here cost more relative to typical income';
  return 'Housing is significantly less affordable than the national average';
}

function getEssentialsInsight(score: number | null, national: number): string | null {
  if (score === null) return null;

  const diff = score - national;
  if (diff >= 15) return 'Strong disposable income after covering living costs';
  if (diff >= 5) return 'Above-average purchasing power for essentials';
  if (diff >= -5) return 'Disposable income is typical for the country';
  if (diff >= -15) return 'Cost of living reduces available income more than average';
  return 'Essential costs significantly impact disposable income';
}

function getTaxInsight(score: number | null, national: number): string | null {
  if (score === null) return null;

  const diff = score - national;
  if (diff >= 15) return 'Low tax burden compared to most states';
  if (diff >= 5) return 'Moderate tax environment, below national average';
  if (diff >= -5) return 'Tax burden is typical for the US';
  if (diff >= -15) return 'Higher than average state and local taxes';
  return 'One of the higher-tax regions in the country';
}

function getHealthcareInsight(score: number | null, national: number): string | null {
  if (score === null) return null;

  const diff = score - national;
  if (diff >= 10) return 'Healthcare costs are lower than typical';
  if (diff >= 5) return 'Moderate healthcare expenses';
  if (diff >= -5) return 'Healthcare costs are close to the national average';
  if (diff >= -10) return 'Healthcare is more expensive here';
  return 'Healthcare costs are significantly above average';
}
