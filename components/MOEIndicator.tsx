'use client';

/**
 * MOEIndicator - Displays margin of error confidence levels for ACS data
 * Shows visual indicators and tooltips explaining data quality
 */

import { useState } from 'react';

interface MOEIndicatorProps {
  value: number;
  moe: number;
  label?: string;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

type ConfidenceLevel = 'high' | 'medium' | 'low';

export function MOEIndicator({
  value,
  moe,
  label,
  size = 'sm',
  showTooltip = true,
}: MOEIndicatorProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Calculate coefficient of variation (CV) to determine confidence level
  // CV = (MOE / 1.645) / value
  // Using 1.645 as the z-score for 90% confidence interval
  const cv = (moe / 1.645) / value;

  // Determine confidence level based on CV
  // CV < 0.10 (10%) = High confidence
  // CV 0.10-0.30 = Medium confidence
  // CV > 0.30 = Low confidence
  const getConfidenceLevel = (): ConfidenceLevel => {
    if (cv < 0.10) return 'high';
    if (cv <= 0.30) return 'medium';
    return 'low';
  };

  const confidence = getConfidenceLevel();

  // Get confidence display properties
  const getConfidenceDisplay = () => {
    switch (confidence) {
      case 'high':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✓',
          label: 'High confidence',
          description: 'Low margin of error',
        };
      case 'medium':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          icon: '⚠',
          label: 'Moderate confidence',
          description: 'Medium margin of error',
        };
      case 'low':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '!',
          label: 'Low confidence',
          description: 'High margin of error',
        };
    }
  };

  const display = getConfidenceDisplay();
  const moePercentage = ((moe / value) * 100).toFixed(1);

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <div className="relative inline-block">
      <div className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-md border ${display.bgColor} ${display.borderColor} ${display.color}`}>
        <span className="font-medium">{display.icon}</span>
        <span className="font-medium">{display.label}</span>
        {showTooltip && (
          <button
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            className="ml-1 hover:opacity-70 transition-opacity"
            aria-label="Show margin of error information"
          >
            <svg className={`w-${size === 'sm' ? '3' : '4'} h-${size === 'sm' ? '3' : '4'} ${display.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {showTooltip && showInfo && (
        <div className="absolute z-50 w-72 p-3 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg text-sm">
          <div className="font-semibold text-gray-900 mb-2">Survey-based Estimate</div>
          <div className="text-gray-700 space-y-1.5">
            <p>• <strong>Margin of error:</strong> ±{moePercentage}%</p>
            <p>• <strong>Confidence:</strong> {display.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              Data from U.S. Census Bureau American Community Survey. Smaller sample sizes result in higher margins of error.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of MOEIndicator for inline use
 * Shows just a colored dot with tooltip
 */
export function MOEDot({
  value,
  moe,
  showLabel = false,
}: {
  value: number;
  moe: number;
  showLabel?: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);

  const cv = (moe / 1.645) / value;
  const getConfidenceLevel = (): ConfidenceLevel => {
    if (cv < 0.10) return 'high';
    if (cv <= 0.30) return 'medium';
    return 'low';
  };

  const confidence = getConfidenceLevel();

  const getDotColor = () => {
    switch (confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-red-500';
    }
  };

  const getLabel = () => {
    switch (confidence) {
      case 'high': return 'High confidence';
      case 'medium': return 'Moderate confidence';
      case 'low': return 'Low confidence';
    }
  };

  const moePercentage = ((moe / value) * 100).toFixed(1);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${getDotColor()}`}
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        onClick={() => setShowInfo(!showInfo)}
      />
      {showLabel && (
        <span className="text-xs text-gray-600">{getLabel()}</span>
      )}

      {showInfo && (
        <div className="absolute z-50 w-64 p-3 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg text-xs">
          <div className="font-semibold text-gray-900 mb-1">{getLabel()}</div>
          <div className="text-gray-700 space-y-1">
            <p>Margin of error: ±{moePercentage}%</p>
            <p className="text-gray-500 mt-1">
              {confidence === 'high' && 'Reliable estimate with low uncertainty'}
              {confidence === 'medium' && 'Acceptable estimate, use with caution'}
              {confidence === 'low' && 'High uncertainty - consider broader geographic area'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
