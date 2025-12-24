/**
 * Affordability Labels and Interpretation
 *
 * Provides plain-language interpretation of affordability ratios
 * to help users understand what the numbers actually mean.
 */

export type AffordabilityLevel = 'very-affordable' | 'affordable' | 'moderate' | 'challenging' | 'very-challenging';

import type { ComponentType } from 'react';
import { StarIcon } from '@/components/icons/StarIcon';

export interface AffordabilityLabel {
  level: AffordabilityLevel;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  Icon: ComponentType<{ className?: string }>;
}

/**
 * Determine affordability level based on ratio
 *
 * Ratio interpretation:
 * - < 2.5: Very Affordable (homes cost less than 2.5 years of income)
 * - 2.5-3.5: Affordable
 * - 3.5-5.0: Moderate
 * - 5.0-7.0: Challenging
 * - > 7.0: Very Challenging
 */
export function getAffordabilityLevel(ratio: number | null): AffordabilityLevel {
  if (ratio === null) return 'moderate';

  if (ratio < 2.5) return 'very-affordable';
  if (ratio < 3.5) return 'affordable';
  if (ratio < 5.0) return 'moderate';
  if (ratio < 7.0) return 'challenging';
  return 'very-challenging';
}

/**
 * Get full affordability label details for a given ratio
 */
export function getAffordabilityLabel(ratio: number | null): AffordabilityLabel {
  const level = getAffordabilityLevel(ratio);

  const labels: Record<AffordabilityLevel, AffordabilityLabel> = {
    'very-affordable': {
      level: 'very-affordable',
      label: 'Very Affordable',
      shortLabel: 'Great Value',
      description: 'Homes cost less than 2.5 years of typical household income',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      Icon: StarIcon,
    },
    'affordable': {
      level: 'affordable',
      label: 'Affordable',
      shortLabel: 'Good Value',
      description: 'Homes cost 2.5-3.5 years of typical household income',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      Icon: StarIcon,
    },
    'moderate': {
      level: 'moderate',
      label: 'Moderate',
      shortLabel: 'Average',
      description: 'Homes cost 3.5-5 years of typical household income',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      Icon: StarIcon,
    },
    'challenging': {
      level: 'challenging',
      label: 'Challenging',
      shortLabel: 'Difficult',
      description: 'Homes cost 5-7 years of typical household income',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      Icon: StarIcon,
    },
    'very-challenging': {
      level: 'very-challenging',
      label: 'Very Challenging',
      shortLabel: 'Very Difficult',
      description: 'Homes cost more than 7 years of typical household income',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      Icon: StarIcon,
    },
  };

  return labels[level];
}

/**
 * Format ratio as plain language
 * Instead of "3.2×" show "3.2 years of income"
 */
export function formatRatioPlain(ratio: number | null): string {
  if (ratio === null) return 'Data unavailable';

  const formatted = ratio.toFixed(1);
  return `${formatted}× income`;
}

/**
 * Format ratio with interpretation
 * Example: "3.2 years • Affordable"
 */
export function formatRatioWithLabel(ratio: number | null): string {
  if (ratio === null) return 'Data unavailable';

  const label = getAffordabilityLabel(ratio);
  const formatted = ratio.toFixed(1);
  return `${formatted}× • ${label.shortLabel}`;
}

/**
 * Get real-world example for a given ratio and income
 * Example: "A household earning $75,000 could afford a $234,000 home"
 */
export function getAffordabilityExample(income: number, ratio: number): string {
  const affordableHomePrice = income * ratio;

  const incomeFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(income);

  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(affordableHomePrice);

  return `A household earning ${incomeFormatted} could afford a ${priceFormatted} home`;
}

/**
 * Get color for ratio value (for charts and visual elements)
 */
export function getRatioColor(ratio: number | null): string {
  const label = getAffordabilityLabel(ratio);
  return label.color;
}

/**
 * Get background color for ratio value
 */
export function getRatioBgColor(ratio: number | null): string {
  const label = getAffordabilityLabel(ratio);
  return label.bgColor;
}

/**
 * Get border color for ratio value
 */
export function getRatioBorderColor(ratio: number | null): string {
  const label = getAffordabilityLabel(ratio);
  return label.borderColor;
}
