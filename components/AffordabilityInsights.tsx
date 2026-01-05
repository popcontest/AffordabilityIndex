/**
 * AffordabilityInsights - Contextual insights that make the data meaningful
 * Provides 2-3 human-readable takeaways based on city's affordability metrics
 */

import { formatCurrency } from '@/lib/viewModels';
import {
  CheckIcon,
  DollarIcon,
  AlertIcon,
  HomeIcon,
  ChartIcon,
  TargetIcon,
  TrendUpIcon,
  StarIcon,
  LocationIcon,
} from './InsightIcon';

interface AffordabilityInsightsProps {
  cityName: string;
  metrics: {
    homeValue: number | null;
    income: number | null;
    ratio: number | null;
    hudFmr2Br?: number | null;
    propertyTaxRate?: number | null;
  } | null;
  nationalPercentile?: number | null;
}

export function AffordabilityInsights({ cityName, metrics, nationalPercentile }: AffordabilityInsightsProps) {
  if (!metrics) {
    return null;
  }

  // Calculate key insights
  const insights: Array<{ icon: React.ReactNode; title: string; text: string }> = [];

  // Insight 1: Home value relative to income
  if (metrics.homeValue && metrics.income && metrics.ratio) {
    const ratio = metrics.ratio;
    const yearsToSave = Math.round(ratio);

    if (ratio < 3) {
      insights.push({
        icon: <CheckIcon className="w-6 h-6" />,
        title: 'Strong Buying Power',
        text: `The typical home costs less than 3 years of median income. This is well below the national average, making homeownership more accessible.`,
      });
    } else if (ratio < 5) {
      insights.push({
        icon: <DollarIcon className="w-6 h-6" />,
        title: 'Moderate Affordability',
        text: `Homes cost about ${yearsToSave} years of annual income. While manageable for many households, buyers may need to save for several years for a down payment.`,
      });
    } else if (ratio < 7) {
      insights.push({
        icon: <AlertIcon className="w-6 h-6" />,
        title: 'Challenging Market',
        text: `With homes costing ${yearsToSave}+ years of median income, affordability is stretched. Only higher-income households or those with substantial savings can comfortably buy.`,
      });
    } else {
      insights.push({
        icon: <AlertIcon className="w-6 h-6" />,
        title: 'Severe Affordability Crisis',
        text: `Homes cost ${yearsToSave}+ years of annual income - nearly double the national average. Homeownership is out of reach for most middle-class households without significant financial help.`,
      });
    }
  }

  // Insight 2: Rental vs ownership
  if (metrics.hudFmr2Br && metrics.income) {
    const annualRent = metrics.hudFmr2Br * 12;
    const rentBurden = (annualRent / metrics.income) * 100;

    if (rentBurden < 25) {
      insights.push({
        icon: <HomeIcon className="w-6 h-6" />,
        title: 'Rental Affordability',
        text: `A 2-bedroom apartment costs about ${Math.round(rentBurden)}% of median income. This is below the 30% "affordable" threshold, leaving more room in household budgets.`,
      });
    } else if (rentBurden < 35) {
      insights.push({
        icon: <ChartIcon className="w-6 h-6" />,
        title: 'Tight Rental Market',
        text: `Renting a 2-bedroom uses ${Math.round(rentBurden)}% of median income - above the 30% affordability guideline. Many renters are cost-burdened.`,
      });
    } else {
      insights.push({
        icon: <TrendUpIcon className="w-6 h-6" />,
        title: 'Rental Crisis',
        text: `A typical 2-bedroom costs ${Math.round(rentBurden)}% of median income. Renters face severe cost burdens, with little left for savings or emergencies.`,
      });
    }
  }

  // Insight 3: Property taxes
  if (metrics.propertyTaxRate && metrics.homeValue) {
    const annualTax = metrics.homeValue * metrics.propertyTaxRate;
    const monthlyTax = annualTax / 12;

    if (metrics.propertyTaxRate < 0.01) {
      insights.push({
        icon: <TargetIcon className="w-6 h-6" />,
        title: 'Low Tax Burden',
        text: `Property taxes are just ${(metrics.propertyTaxRate * 100).toFixed(2)}% (about ${formatCurrency(monthlyTax)}/month). This keeps total housing costs more manageable than high-tax states.`,
      });
    } else if (metrics.propertyTaxRate > 0.02) {
      insights.push({
        icon: <TrendUpIcon className="w-6 h-6" />,
        title: 'High Property Taxes',
        text: `Property taxes run ${(metrics.propertyTaxRate * 100).toFixed(2)}% of home value (${formatCurrency(monthlyTax)}/month). Factor this into your total housing budget.`,
      });
    }
  }

  // Insight 4: Percentile context (if available)
  if (nationalPercentile !== undefined && nationalPercentile !== null) {
    const percentile = nationalPercentile;

    if (percentile >= 75) {
      insights.push({
        icon: <StarIcon className="w-6 h-6" />,
        title: 'Top Quartile Affordability',
        text: `This location ranks in the top 25% most affordable cities nationally. You're getting more home for your money than most places.`,
      });
    } else if (percentile <= 25) {
      insights.push({
        icon: <LocationIcon className="w-6 h-6" />,
        title: 'Premium Market',
        text: `This ranks in the bottom 25% for affordability. You're paying a premium to live here - often worth it for jobs, amenities, or lifestyle.`,
      });
    }
  }

  // Only show if we have at least 1 insight
  if (insights.length < 1) {
    return null;
  }

  return (
    <div className="bg-ai-surface rounded-[var(--ai-radius-card)] p-6 border border-ai-border shadow-[var(--ai-shadow-card)]">
      <h2 className="text-xl font-bold text-ai-text mb-4">What This Means for You</h2>

      <div className="space-y-4">
        {insights.slice(0, 3).map((insight, index) => (
          <div
            key={index}
            className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg hover:shadow-md transition-all"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-blue-300 rounded-full flex items-center justify-center text-blue-600 shadow-sm">
              {insight.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">{insight.title}</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{insight.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-ai-border-subtle">
        <p className="text-xs text-ai-text-muted">
          These insights are based on current market data and median household income. Individual circumstances vary.
        </p>
      </div>
    </div>
  );
}
