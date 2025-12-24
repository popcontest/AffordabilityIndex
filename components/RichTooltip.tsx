'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { formatCurrency } from '@/lib/viewModels';
import { getAffordabilityLabel } from '@/lib/affordabilityLabels';
import { AffordabilityBar } from './AffordabilityBar';

interface RichTooltipProps {
  children: React.ReactNode;
  income?: number | null;
  homeValue?: number | null;
  ratio?: number | null;
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * Rich tooltip component with beautiful styling and animations
 *
 * Shows detailed affordability information on hover including:
 * - Income and home price
 * - Visual affordability bar
 * - Interpretation of what the ratio means
 */
export function RichTooltip({
  children,
  income,
  homeValue,
  ratio,
  title,
  subtitle,
  className = '',
}: RichTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // If no data, don't show rich tooltip
  const hasData = income || homeValue || ratio;
  if (!hasData) {
    return <>{children}</>;
  }

  const label = ratio ? getAffordabilityLabel(ratio) : null;

  // Update tooltip position when shown
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Position above the trigger element, centered
      const left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      const top = triggerRect.top - tooltipRect.height - 8; // 8px gap

      // Keep tooltip on screen
      const adjustedLeft = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

      setPosition({
        top: Math.max(8, top),
        left: adjustedLeft,
      });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={isVisible ? tooltipId : undefined}
        className={className}
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="fixed z-50 animate-fade-in"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            pointerEvents: 'none',
          }}
        >
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-xs">
            {/* Header */}
            {(title || subtitle) && (
              <div className="mb-3 pb-3 border-b border-gray-100">
                {title && (
                  <div className="font-semibold text-gray-900 text-sm">
                    {title}
                  </div>
                )}
                {subtitle && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            )}

            {/* Key Metrics */}
            <div className="space-y-2 mb-3">
              {income && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Median Income</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(income)}
                  </span>
                </div>
              )}
              {homeValue && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Median Home Price</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(homeValue)}
                  </span>
                </div>
              )}
            </div>

            {/* Visual Bar */}
            {ratio && (
              <div className="mb-3">
                <AffordabilityBar ratio={ratio} showLabel={false} />
              </div>
            )}

            {/* Interpretation */}
            {label && (
              <div className={`text-xs p-2 rounded-md ${label.bgColor} ${label.borderColor} border`}>
                <div className={`font-semibold ${label.color} mb-1 flex items-center gap-1`}>
                  <label.Icon className="w-3 h-3" /> <span>{label.label}</span>
                </div>
                <div className="text-gray-600">
                  {label.description}
                </div>
              </div>
            )}

            {/* Arrow pointing down to trigger element */}
            <div
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45"
            />
          </div>
        </div>
      )}
    </>
  );
}
