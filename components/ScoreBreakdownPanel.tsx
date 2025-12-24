'use client';

/**
 * ScoreBreakdownPanel - Detailed affordability score breakdown
 * Shows component scores with collapsible details
 */

import { useState } from 'react';
import Link from 'next/link';
import type { ScoreBreakdown } from '@/lib/scoreTypes';
import { formatScore, getScoreColor } from '@/lib/scoring';

interface ScoreBreakdownPanelProps {
  score: ScoreBreakdown;
}

export function ScoreBreakdownPanel({ score }: ScoreBreakdownPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { version, overallScore, grade, housingScore, essentialsScore, taxesScore, healthcareScore, notes } = score;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Score Breakdown</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-900">Overall Affordability</div>
          <div className="flex items-center gap-3">
            {grade && (
              <span className="text-2xl font-bold text-gray-900">{grade}</span>
            )}
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatScore(overallScore)}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-500" data-testid="score-version">
          {version === 'v1_housing' ? 'v1_housing' : 'v2_full'}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Divider */}
          <div className="border-t border-gray-200 pt-4"></div>

          {/* Component Scores */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Components</h3>

            {/* Housing Score */}
            <div data-testid="score-housing">
              <ScoreComponent
                label="Housing Affordability"
                score={housingScore}
                description="Home value relative to local income"
                available={true}
              />
            </div>

            {/* v2 Components */}
            <div data-testid="score-essentials">
              <ScoreComponent
                label="Essentials Affordability"
                score={essentialsScore}
                description="Disposable income after living costs"
                available={essentialsScore !== null}
              />
            </div>

            <ScoreComponent
              label="Tax Burden"
              score={taxesScore}
              description="Income, sales, property taxes"
              available={taxesScore !== null}
            />

            <ScoreComponent
              label="Healthcare Cost"
              score={healthcareScore}
              description="Insurance premiums, out-of-pocket"
              available={healthcareScore !== null}
            />
          </div>

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

interface ScoreComponentProps {
  label: string;
  score: number | null;
  description: string;
  available: boolean;
}

function ScoreComponent({ label, score, description, available }: ScoreComponentProps) {
  if (!available) {
    return (
      <div className="flex items-center justify-between py-2 opacity-50">
        <div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
        <div className="text-sm text-gray-400 italic">Coming soon</div>
      </div>
    );
  }

  const colorClass = getScoreColor(score);

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <div className={`text-lg font-semibold tabular-nums px-3 py-1 rounded-md ${colorClass}`}>
        {formatScore(score)}
      </div>
    </div>
  );
}
