import { CheckIcon, AlertIcon, InfoIcon } from './InsightIcon';

interface FitSignalsProps {
  cityName: string;
  stateAbbr: string;
  ratio: number | null;
  stateRatio: number | null;
  homeValue: number | null;
  stateHomeValue: number | null;
  income: number | null;
  stateIncome: number | null;
  // Real percentile data from DB (not heuristic estimates)
  usPercentile: number | null; // 0-100, percent more affordable than other US cities
  stateRank: number | null; // 1-based rank within state (1 = most affordable)
  stateCount: number | null; // Total cities in state
}

interface Signal {
  type: 'positive' | 'neutral' | 'negative';
  message: string;
}

export function FitSignals({
  cityName,
  stateAbbr,
  ratio,
  stateRatio,
  homeValue,
  stateHomeValue,
  income,
  stateIncome,
  usPercentile,
  stateRank,
  stateCount,
}: FitSignalsProps) {
  const signals: Signal[] = [];

  // Affordability ratio comparison
  if (ratio !== null && stateRatio !== null) {
    const percentDiff = ((stateRatio - ratio) / stateRatio) * 100;
    if (percentDiff > 15) {
      signals.push({
        type: 'positive',
        message: `Home price-to-income is very favorable (${Math.round(percentDiff)}% more affordable than ${stateAbbr} avg)`,
      });
    } else if (percentDiff < -15) {
      signals.push({
        type: 'negative',
        message: `Home price-to-income is challenging (${Math.round(Math.abs(percentDiff))}% less affordable than ${stateAbbr} avg)`,
      });
    }
  }

  // National percentile ranking (computed from DB using window functions)
  // usPercentile = (1 - cume_dist()) * 100 = percent of cities with WORSE affordability
  // So usPercentile=90 means "top ~10% most affordable" (ties may blur the exact %)
  if (usPercentile !== null) {
    // Clamp to prevent edge cases from float issues
    const topPct = Math.min(100, Math.max(1, Math.round(100 - usPercentile)));

    if (usPercentile >= 90) {
      signals.push({
        type: 'positive',
        message: `Ranks in top ~${topPct}% most affordable US cities`,
      });
    } else if (usPercentile >= 75) {
      signals.push({
        type: 'positive',
        message: `Ranks in top ~${topPct}% most affordable US cities`,
      });
    } else if (usPercentile <= 10) {
      signals.push({
        type: 'negative',
        message: `Ranks outside top ~${topPct}% (among the less affordable cities nationally)`,
      });
    }
  }

  // State ranking
  if (stateRank !== null && stateCount !== null) {
    if (stateRank === 1) {
      signals.push({
        type: 'positive',
        message: `Most affordable city in ${stateAbbr} (ranked #1 of ${stateCount})`,
      });
    } else if (stateRank <= 3 && stateCount >= 10) {
      signals.push({
        type: 'positive',
        message: `Ranked #${stateRank} most affordable of ${stateCount} cities in ${stateAbbr}`,
      });
    }
  }

  // Home value comparison
  if (homeValue !== null && stateHomeValue !== null) {
    const percentDiff = ((homeValue - stateHomeValue) / stateHomeValue) * 100;
    if (percentDiff < -20) {
      signals.push({
        type: 'positive',
        message: `Homes are ${Math.round(Math.abs(percentDiff))}% cheaper than ${stateAbbr} typical`,
      });
    } else if (percentDiff > 30) {
      signals.push({
        type: 'negative',
        message: `Homes are ${Math.round(percentDiff)}% more expensive than ${stateAbbr} typical`,
      });
    }
  }

  // Income comparison
  if (income !== null && stateIncome !== null) {
    const percentDiff = ((income - stateIncome) / stateIncome) * 100;
    if (percentDiff < -15) {
      signals.push({
        type: 'neutral',
        message: `Income is ${Math.round(Math.abs(percentDiff))}% below ${stateAbbr} average`,
      });
    } else if (percentDiff > 15) {
      signals.push({
        type: 'positive',
        message: `Income is ${Math.round(percentDiff)}% above ${stateAbbr} average`,
      });
    }
  }

  // Combined assessment
  if (ratio !== null) {
    if (ratio < 3.0) {
      signals.push({
        type: 'positive',
        message: 'Excellent value for buyers prioritizing low home prices',
      });
    } else if (ratio > 7.0 && income !== null && income < 80000) {
      signals.push({
        type: 'negative',
        message: 'Challenging affordability for median local incomes',
      });
    }
  }

  // If we have very few signals, add a neutral one
  if (signals.length === 0) {
    signals.push({
      type: 'neutral',
      message: `Affordability metrics are near ${stateAbbr} state averages`,
    });
  }

  const getIconAndColor = (type: Signal['type']) => {
    switch (type) {
      case 'positive':
        return { icon: <CheckIcon className="w-5 h-5" />, ariaLabel: 'Positive signal', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800', iconColor: 'text-green-600' };
      case 'negative':
        return { icon: <AlertIcon className="w-5 h-5" />, ariaLabel: 'Warning signal', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-800', iconColor: 'text-orange-600' };
      case 'neutral':
        return { icon: <InfoIcon className="w-5 h-5" />, ariaLabel: 'Neutral signal', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800', iconColor: 'text-blue-600' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Fit Signals for {cityName}
        </h2>
        <p className="text-gray-600 text-sm">
          Data-driven insights based on affordability metrics vs. {stateAbbr} and national benchmarks
        </p>
      </div>

      <div className="space-y-3">
        {signals.map((signal, index) => {
          const style = getIconAndColor(signal.type);
          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg border ${style.bgColor} ${style.borderColor}`}
            >
              <div className={`flex-shrink-0 ${style.iconColor}`} aria-label={style.ariaLabel}>
                {style.icon}
              </div>
              <div className={`text-sm leading-relaxed ${style.textColor}`}>
                {signal.message}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 italic">
        These signals are generated from comparative data analysis, not financial advice. Rankings and percentiles are computed from the latest snapshot for each city.
      </div>
    </div>
  );
}
