'use client';

import { Suspense, ReactNode } from 'react';
import { LoadingSpinner } from '../errors';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * SuspenseWrapper - Wrapper around React Suspense with consistent loading UI
 */
export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner message="Loading..." />}>
      {children}
    </Suspense>
  );
}
