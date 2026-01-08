import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Next.js dynamic imports
vi.mock('next/dynamic', () => ({
  default: (...args: any) => {
    const dynamicModule = vi.fn() as any;
    (dynamicModule as any).render = vi.fn();
    return dynamicModule;
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8080';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
