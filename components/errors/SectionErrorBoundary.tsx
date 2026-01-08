'use client';

import { Component, ReactNode } from 'react';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * SectionErrorBoundary - Catches errors in individual sections and shows graceful fallbacks
 * Use this to isolate failures in non-critical components
 */
export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SectionErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-yellow-900 mb-1">
                {this.props.sectionName ? `${this.props.sectionName} Unavailable` : 'Section Unavailable'}
              </p>
              <p className="text-sm text-yellow-800 mb-3">
                {this.state.error?.message || 'An unexpected error occurred while loading this section.'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="text-sm font-medium text-yellow-900 hover:text-yellow-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
