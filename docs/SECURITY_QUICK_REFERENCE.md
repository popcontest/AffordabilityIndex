# Security Quick Reference

Quick guide to security features in Affordability Index.

## File Structure

```
lib/security/
├── rateLimit.ts      # Rate limiting configuration and utilities
├── validation.ts     # Zod schemas and input validation
└── logger.ts         # Security event logging

app/api/
├── search/route.ts           # Rate-limited search (10 req/10s)
├── true-affordability/route.ts  # Calculator (20 req/1m)
├── debug-city/route.ts       # Data endpoint (30 req/1m)
└── health/route.ts           # Health check (100 req/1m)
```

## Quick Setup

### 1. Environment Variables

Add to `.env.local` for development:

```bash
# Optional: For production rate limiting
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

### 2. Using Rate Limiting

```typescript
import { checkRateLimit, getClientIp, rateLimiters } from '@/lib/security/rateLimit';

// In your API route
const ip = getClientIp(request);
const result = await checkRateLimit(ip, rateLimiters.search);

if (!result.success) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  );
}
```

### 3. Using Validation

```typescript
import { validateQueryParams, MyApiSchema } from '@/lib/security/validation';

const validationResult = validateQueryParams(searchParams, MyApiSchema);
if (!validationResult.success) {
  return NextResponse.json(
    { error: validationResult.error },
    { status: 400 }
  );
}
```

### 4. Security Logging

```typescript
import { logApiError, logInvalidInput } from '@/lib/security/logger';

// Log API errors
logApiError({
  ip,
  endpoint: '/api/my-endpoint',
  error: error,
  context: { userId: 123 },
});

// Log invalid input
logInvalidInput({
  ip,
  endpoint: '/api/my-endpoint',
  field: 'email',
  value: userInput,
  reason: 'Invalid email format',
});
```

## Testing Security

### Test Rate Limiting

```bash
# Quick test with curl
for i in {1..12}; do
  curl "http://localhost:3000/api/search?q=test"
done
# Should return 429 on request 11+
```

### Test Input Validation

```bash
# SQL injection attempt
curl "http://localhost:3000/api/search?q=';DROP%20TABLE%20users;--"
# Should return 400 Bad Request

# XSS attempt
curl "http://localhost:3000/api/search?q=<script>alert(1)</script>"
# Should return 400 Bad Request
```

### Test Security Headers

```bash
curl -I http://localhost:3000/api/health
# Check for: X-Frame-Options, X-Content-Type-Options, CSP, etc.
```

## Common Tasks

### Add Rate Limiting to New Endpoint

1. Choose appropriate limiter from `rateLimiters`
2. Add to route handler:

```typescript
import { checkRateLimit, getClientIp, rateLimiters } from '@/lib/security/rateLimit';

const ip = getClientIp(request);
const rateLimitResult = await checkRateLimit(ip, rateLimiters.data);
```

### Add Validation Schema

1. Define schema in `lib/security/validation.ts`:

```typescript
export const MyApiSchema = z.object({
  param1: z.string().min(1),
  param2: z.number().positive(),
});
```

2. Use in route:

```typescript
const validationResult = validateQueryParams(searchParams, MyApiSchema);
```

### Create Custom Rate Limiter

Add to `lib/security/rateLimit.ts`:

```typescript
export const rateLimiters = {
  // ... existing limiters
  myEndpoint: createRateLimiter(50, '1 m'), // 50 req/min
};
```

## Monitoring

### Check Logs

All security events are logged with `[SECURITY]` prefix:

```bash
# In development console
[SECURITY] RATE_LIMIT_EXCEEDED - {"type":"RATE_LIMIT_EXCEEDED"...}
```

### Log Events

- `RATE_LIMIT_EXCEEDED`: Client hit rate limit
- `INVALID_INPUT`: Validation failed
- `SUSPICIOUS_QUERY`: Malicious query blocked
- `API_ERROR`: Uncaught error

## Production Checklist

- [ ] Configure Upstash Redis
- [ ] Restrict CORS origins
- [ ] Enable HTTPS
- [ ] Set up error tracking (Sentry)
- [ ] Review security headers
- [ ] Test rate limiting
- [ ] Monitor security logs

## Troubleshooting

### Rate Limiting Not Working

**Problem**: Requests not being limited

**Solutions**:
1. Check Upstash Redis credentials
2. Verify env vars are set
3. Check logs for errors
4. Try in-memory mode (development)

### Validation Errors

**Problem**: Valid requests being rejected

**Solutions**:
1. Check schema definitions
2. Verify parameter names match
3. Check for type mismatches
4. Review Zod error messages

### CSP Violations

**Problem**: Browser console shows CSP errors

**Solutions**:
1. Check browser console for specific violation
2. Update CSP in `next.config.ts`
3. Add allowed domains as needed

## Resources

- [Full Documentation](./SECURITY.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Upstash Redis](https://upstash.com/)
- [Zod Validation](https://zod.dev/)

---

**Need help?** Check `docs/SECURITY.md` for detailed documentation.
