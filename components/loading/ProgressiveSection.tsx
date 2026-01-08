'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ProgressiveSectionProps {
  children: ReactNode;
  delay?: number; // Delay in ms before showing content (for progressive loading)
  fallback?: ReactNode;
  showSpinner?: boolean;
}

/**
 * ProgressiveSection - Delays rendering of heavy sections for better perceived performance
 * Shows a spinner/skeleton during the delay, then renders content
 */
export function ProgressiveSection({
  children,
  delay = 0,
  fallback,
  showSpinner = false,
}: ProgressiveSectionProps) {
  const [shouldRender, setShouldRender] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!shouldRender) {
    return (
      <>{fallback || (showSpinner && <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div></div>)}</>
    );
  }

  return <>{children}</>;
}
