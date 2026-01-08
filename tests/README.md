# Tests

This directory contains the test suite for the Affordability Index application.

## Quick Start

```bash
# Run all tests once
npm run test

# Run tests in watch mode (re-run on changes)
npm run test:watch

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration and mocks
├── unit/                       # Unit tests
│   ├── api/                   # API route tests
│   ├── components/            # React component tests
│   └── lib/                   # Utility function tests
└── e2e/                       # End-to-end tests (Playwright)
    └── smoke.spec.ts
```

## Writing Tests

### Component Example

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### API Route Example

```ts
import { GET } from '@/app/api/my-route/route';
import { NextRequest } from 'next/server';

describe('/api/my-route', () => {
  it('should return success response', async () => {
    const request = new NextRequest('http://localhost:3000/api/my-route');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### Utility Function Example

```ts
import { myFunction } from '@/lib/utils';

describe('myFunction()', () => {
  it('should return correct value', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

## Coverage Goals

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 60%
- **Statements**: 70%

View detailed coverage report at `coverage/index.html` after running `npm run test:coverage`.

## Common Issues

### Module Not Found Errors

If you see "Cannot find module" errors:
1. Ensure all dependencies are installed: `npm install`
2. Check that import paths use `@/` alias correctly
3. Verify `vitest.config.ts` has correct path aliases

### React Component Tests Failing

1. Ensure components are wrapped properly if they use hooks
2. Check that `@testing-library/react` is installed
3. Verify `jsdom` environment is configured in `vitest.config.ts`

### API Route Tests Failing

1. Mock external dependencies (database, external APIs)
2. Check `tests/setup.ts` for global mocks
3. Verify request URLs are properly formatted

## See Also

- [TEST_SUMMARY.md](./TEST_SUMMARY.md) - Detailed overview of all tests
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
