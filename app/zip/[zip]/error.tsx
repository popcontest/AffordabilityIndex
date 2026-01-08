'use client';

import { useEffect } from 'react';
import { InlineError } from '@/components/errors';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for ZIP routes
 * Catches errors during rendering or data fetching
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('ZIP page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Something Went Wrong
            </h1>
            <p className="text-gray-600">
              We encountered an error while loading this ZIP code data.
            </p>
          </div>

          <InlineError
            message={error.message || 'An unexpected error occurred'}
            onRetry={reset}
          />

          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Return Home
            </a>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
              <summary className="cursor-pointer font-semibold text-red-900 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-sm text-red-800 overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
