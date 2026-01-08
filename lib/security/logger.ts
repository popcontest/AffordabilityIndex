/**
 * Security logging utilities
 *
 * Provides structured logging for security-relevant events
 */

export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  SUSPICIOUS_QUERY = 'SUSPICIOUS_QUERY',
  AUTH_FAILURE = 'AUTH_FAILURE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  API_ERROR = 'API_ERROR',
}

interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  details: Record<string, any>;
}

/**
 * Log a security event
 *
 * @param event - Security event details
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // In production, send to logging service (Sentry, DataDog, etc.)
  // For now, log to console with structured format
  const logLevel = getLogLevel(event.type);
  const logMessage = `[SECURITY] ${event.type} - ${JSON.stringify(securityEvent)}`;

  switch (logLevel) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }
}

/**
 * Determine log level based on event type
 */
function getLogLevel(eventType: SecurityEventType): 'error' | 'warn' | 'info' {
  switch (eventType) {
    case SecurityEventType.RATE_LIMIT_EXCEEDED:
    case SecurityEventType.UNAUTHORIZED_ACCESS:
    case SecurityEventType.AUTH_FAILURE:
      return 'warn';
    case SecurityEventType.API_ERROR:
      return 'error';
    default:
      return 'info';
  }
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(params: {
  ip: string;
  endpoint: string;
  limit: number;
}): void {
  logSecurityEvent({
    type: SecurityEventType.RATE_LIMIT_EXCEEDED,
    ip: params.ip,
    endpoint: params.endpoint,
    details: {
      limit: params.limit,
    },
  });
}

/**
 * Log invalid input
 */
export function logInvalidInput(params: {
  ip: string;
  endpoint: string;
  field: string;
  value: any;
  reason: string;
}): void {
  logSecurityEvent({
    type: SecurityEventType.INVALID_INPUT,
    ip: params.ip,
    endpoint: params.endpoint,
    details: {
      field: params.field,
      value: typeof params.value === 'string' ? params.value.slice(0, 100) : params.value,
      reason: params.reason,
    },
  });
}

/**
 * Log suspicious query patterns
 */
export function logSuspiciousQuery(params: {
  ip: string;
  userAgent?: string;
  endpoint: string;
  query: string;
  reason: string;
}): void {
  logSecurityEvent({
    type: SecurityEventType.SUSPICIOUS_QUERY,
    ip: params.ip,
    userAgent: params.userAgent,
    endpoint: params.endpoint,
    details: {
      query: params.query.slice(0, 200),
      reason: params.reason,
    },
  });
}

/**
 * Log API errors
 */
export function logApiError(params: {
  ip: string;
  endpoint: string;
  error: Error | string;
  context?: Record<string, any>;
}): void {
  logSecurityEvent({
    type: SecurityEventType.API_ERROR,
    ip: params.ip,
    endpoint: params.endpoint,
    details: {
      error: params.error instanceof Error ? params.error.message : params.error,
      stack: params.error instanceof Error ? params.error.stack : undefined,
      context: params.context,
    },
  });
}

/**
 * Detect suspicious patterns in search queries
 *
 * @param query - Search query string
 * @returns Reason if suspicious, null otherwise
 */
export function detectSuspiciousQuery(query: string): string | null {
  const normalized = query.toLowerCase().trim();

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
    /(\bupdate\b.*\bset\b)/i,
    /(--)|(#)|(\/\*)/i,
    /(\bor\b.*=.*)/i,
    /(\band\b.*=.*)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(normalized)) {
      return 'Potential SQL injection';
    }
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onload=, etc.
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(normalized)) {
      return 'Potential XSS attempt';
    }
  }

  // Check for path traversal
  if (/\.\./.test(normalized)) {
    return 'Potential path traversal';
  }

  return null;
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
