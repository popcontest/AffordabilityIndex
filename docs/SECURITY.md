# Security Implementation

This document outlines the security measures implemented in the Affordability Index application.

## Overview

The application implements defense-in-depth security practices including:
- Rate limiting to prevent abuse and DoS attacks
- Input validation and sanitization
- Security headers
- Structured logging for security events
- Error handling

## Rate Limiting

### Implementation

Rate limiting is implemented using `@upstash/ratelimit` with Redis-backed storage.

### Rate Limits by Endpoint

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| `/api/search` | 10 requests | 10 seconds | Prevent scraping of search results |
| `/api/true-affordability` | 20 requests | 1 minute | Allow reasonable calculator usage |
| `/api/debug-city` | 30 requests | 1 minute | Moderate limit for data endpoints |
| `/api/health` | 100 requests | 1 minute | Lenient for health checks |

### Response Headers

When rate limits are enforced, the API returns:
- Status: `429 Too Many Requests`
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: ISO timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying

### Configuration

For production, configure Upstash Redis:

```bash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**⚠️ Warning:** Without Upstash Redis configured, the application uses in-memory rate limiting which is NOT production-ready (doesn't work across multiple server instances).

### Getting Upstash Redis

1. Sign up at [upstash.com](https://upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and token to your `.env` file

## Input Validation

### Zod Schemas

All API routes use Zod schemas for input validation:

- **Search**: Query string length, content validation
- **True Affordability**: geoType, geoId, householdType, income validation
- **Debug City**: State abbreviation, slug validation

### Sanitization

All user inputs are sanitized:
- HTML/JS characters removed (`<`, `>`, `"`, `'`)
- Length limits enforced
- Whitespace trimmed

### Suspicious Pattern Detection

The system automatically detects and blocks:
- SQL injection attempts
- XSS attempts (script tags, javascript:, event handlers)
- Path traversal attempts (`..`)
- Malformed input

Suspicious queries are logged but return generic error messages to avoid leaking information.

## Security Headers

### Implemented Headers

All responses include these security headers:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; ...
```

### Content Security Policy

The CSP is configured to:
- Only load resources from same origin
- Allow inline scripts/styles (required for Next.js development)
- Restrict external connections to Census API and Zillow
- Block camera, microphone, and geolocation access
- Prevent embedding in frames (`frame-ancestors 'none'`)

### API CORS

API routes have permissive CORS for development:
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

**⚠️ Production:** Restrict `Access-Control-Allow-Origin` to your actual domain.

## Logging and Monitoring

### Security Event Types

All security-relevant events are logged with structured data:

- `RATE_LIMIT_EXCEEDED`: When clients hit rate limits
- `INVALID_INPUT`: Validation failures with field and reason
- `SUSPICIOUS_QUERY`: Blocked malicious query attempts
- `API_ERROR`: Uncaught errors in API routes

### Log Format

```json
{
  "type": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2026-01-07T12:00:00.000Z",
  "ip": "1.2.3.4",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/api/search",
  "details": {
    "limit": 10
  }
}
```

### Production Monitoring

For production, integrate with:
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Infrastructure monitoring
- **CloudWatch**: AWS logging
- **Custom**: Build your own logging pipeline

### Sentry Integration (Optional)

To enable Sentry:

```bash
npm install @sentry/nextjs
```

Configure in `sentry.config.js`:

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

## Error Handling

### API Errors

All API routes follow consistent error handling:

1. **Client Errors (4xx)**: Clear, actionable error messages
   - 400: Invalid input
   - 429: Rate limit exceeded
   - 404: Resource not found

2. **Server Errors (5xx)**: Generic messages (no sensitive data leaked)
   - Production: `{ error: "Internal server error" }`
   - Development: Includes error message and stack trace

### Never Log/Expose

- Database credentials
- API keys (Census, Sentry tokens)
- Internal paths/structure
- Detailed error messages to clients in production

## Best Practices

### Development

1. **Never commit secrets**: Use `.env.local` for local development
2. **Test rate limiting**: Verify limits work correctly
3. **Test validation**: Try malicious inputs
4. **Review logs**: Check security event logs regularly

### Production

1. **Configure Upstash Redis**: Required for distributed rate limiting
2. **Restrict CORS**: Set specific origin domains
3. **Enable HTTPS**: Required for HSTS header
4. **Set up monitoring**: Integrate Sentry or similar
5. **Review CSP logs**: Check for CSP violations in browser console
6. **Regular updates**: Keep dependencies updated

### Deployment Checklist

- [ ] Upstash Redis configured
- [ ] CORS restricted to specific domain(s)
- [ ] HTTPS enabled
- [ ] Environment variables set (NODE_ENV=production)
- [ ] Sentry configured (optional but recommended)
- [ ] Database credentials stored securely
- [ ] Security headers verified (use securityheaders.com)
- [ ] CSP tested (use csp-evaluator.withgoogle.com)
- [ ] Rate limiting tested
- [ ] Error monitoring tested
- [ ] Log aggregation configured

## Testing Security

### Manual Testing

1. **Rate Limiting**:
   ```bash
   # Send 11 rapid requests to search endpoint
   for i in {1..11}; do curl "http://localhost:3000/api/search?q=test"; done
   # Should get 429 on 11th request
   ```

2. **Input Validation**:
   ```bash
   # Test SQL injection
   curl "http://localhost:3000/api/search?q=';DROP%20TABLE%20users;--"
   # Should return 400 Bad Request

   # Test XSS
   curl "http://localhost:3000/api/search?q=<script>alert('xss')</script>"
   # Should return 400 Bad Request
   ```

3. **Headers**:
   ```bash
   curl -I http://localhost:3000/api/health
   # Check for security headers
   ```

### Automated Security Scanning

Consider integrating:
- **OWASP ZAP**: DAST scanner
- **npm audit**: Check for vulnerable dependencies
- **Snyk**: Dependency scanning

## Troubleshooting

### Rate Limiting Not Working

- Check Upstash Redis credentials
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check browser console for CSP errors
- Review logs for rate limiter errors

### Clients Getting Blocked Unexpectedly

- Check rate limit values (might be too strict)
- Review logs for false positives
- Consider increasing limits for legitimate use cases

### CSP Errors in Browser

- Check browser console for CSP violations
- Update CSP in `next.config.ts` if needed
- Report violations to logs for monitoring

## Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

**Last updated**: 2026-01-07
