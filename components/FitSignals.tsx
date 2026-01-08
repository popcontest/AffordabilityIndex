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
  // So usPercentile=90 means "more affordable than 90% of US cities"
  if (usPercentile !== null) {
    const roundedPercentile = Math.round(usPercentile);

    if (usPercentile >= 90) {
      signals.push({
        type: 'positive',
        message: `More affordable than ${roundedPercentile}% of US cities ↑`,
      });
    } else if (usPercentile >= 75) {
      signals.push({
        type: 'positive',
        message: `More affordable than ${roundedPercentile}% of US cities ↑`,
      });
    } else if (usPercentile <= 10) {
      signals.push({
        type: 'negative',
        message: `Less affordable than ${100 - roundedPercentile}% of US cities ↓`,
      });
    }
  }

  // State ranking
  if (stateRank !== null && stateCount !== null) {
    if (stateRank === 1) {
      signals.push({
        type: 'positive',
        message: `Most affordable city in ${stateAbbr} (ranked #1 of ${stateCount}) - no other cities in the state have better home value-to-income ratios`,
      });
    } else if (stateRank <= 3 && stateCount >= 10) {
      signals.push({
        type: 'positive',
        message: `Ranked #${stateRank} most affordable of ${stateCount} cities in ${stateAbbr} - only ${stateRank - 1} cities have better ratios`,
      });
    } else if (stateRank <= 10 && stateCount >= 20) {
      signals.push({
        type: 'positive',
        message: `Top 10 most affordable in ${stateAbbr} (ranked #${stateRank} of ${stateCount} cities)`,
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
        message: `Excellent value (ratio: ${ratio.toFixed(1)}) - typical homes cost only ${ratio.toFixed(1)}× local income, similar to affordable Midwest cities like Cleveland and Detroit`,
      });
    } else if (ratio >= 3.0 && ratio < 4.5) {
      signals.push({
        type: 'positive',
        message: `Good affordability (ratio: ${ratio.toFixed(1)}) - most experts consider 3-4× income manageable for homeownership`,
      });
    } else if (ratio >= 4.5 && ratio < 6.0) {
      signals.push({
        type: 'neutral',
        message: `Moderate affordability (ratio: ${ratio.toFixed(1)}) - many households need to budget carefully or consider smaller homes`,
      });
    } else if (ratio >= 6.0 && ratio < 8.0) {
      signals.push({
        type: 'negative',
        message: `Challenging affordability (ratio: ${ratio.toFixed(1)}) - homes cost 6-8× local income, seen in some expensive coastal markets`,
      });
    } else if (ratio >= 8.0) {
      signals.push({
        type: 'negative',
        message: `Severe affordability challenge (ratio: ${ratio.toFixed(1)}) - similar to San Francisco or New York, where only high-income households can comfortably afford homes`,
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
