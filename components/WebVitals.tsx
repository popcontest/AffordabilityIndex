/**
 * Web Vitals - Track Core Web Vitals for performance monitoring
 * Uses web-vitals library (v5+)
 */

'use client';

import { useEffect } from 'react';

export function WebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isInitialized = false;

    async function initWebVitals() {
      if (isInitialized) return;
      isInitialized = true;

      try {
        const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

        const sendToAnalytics = (metric: any) => {
          // Send to Google Analytics
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', metric.name, {
              event_category: 'Web Vitals',
              event_label: metric.id,
              value: Math.round(metric.value),
              non_interaction: true,
              custom_map: {
                metric_id: metric.id,
                metric_value: metric.value,
                metric_delta: metric.delta,
              },
            });
          }

          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log('[Web Vitals]', metric);
          }
        };

        // Core Web Vitals - using on* functions in v5+
        onCLS(sendToAnalytics);
        onINP(sendToAnalytics);
        onFCP(sendToAnalytics);
        onLCP(sendToAnalytics);
        onTTFB(sendToAnalytics);
      } catch (error) {
        console.error('Failed to load web-vitals:', error);
      }
    }

    // Initialize after page load
    if (document.readyState === 'complete') {
      initWebVitals();
    } else {
      window.addEventListener('load', initWebVitals);
    }

    return () => {
      window.removeEventListener('load', initWebVitals);
    };
  }, []);

  return null;
}
