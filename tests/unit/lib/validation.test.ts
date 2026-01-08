import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchQuery,
  detectSuspiciousQuery,
  validateZipCode,
  validateStateAbbr,
} from '@/lib/security/validation';

describe('Security Validation Utilities', () => {
  describe('sanitizeSearchQuery()', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  portland  ')).toBe('portland');
    });

    it('should remove HTML tag characters', () => {
      expect(sanitizeSearchQuery('<b>portland</b>')).toBe('bportlandb');
      expect(sanitizeSearchQuery('portland<ME>')).toBe('portlandME');
    });

    it('should remove quotes', () => {
      expect(sanitizeSearchQuery('"portland"')).toBe('portland');
      expect(sanitizeSearchQuery("'maine'")).toBe('maine');
    });

    it('should limit to 100 characters', () => {
      const longQuery = 'a'.repeat(150);
      expect(sanitizeSearchQuery(longQuery).length).toBe(100);
    });

    it('should handle empty string', () => {
      expect(sanitizeSearchQuery('')).toBe('');
    });

    it('should handle special characters', () => {
      expect(sanitizeSearchQuery('portland@maine!')).toBe('portlandmaine');
      expect(sanitizeSearchQuery('san-francisco')).toBe('sanfrancisco');
    });
  });

  describe('detectSuspiciousQuery()', () => {
    describe('SQL Injection Detection', () => {
      it('should detect UNION SELECT attacks', () => {
        expect(detectSuspiciousQuery("portland' OR '1'='1")).toBe('Potential SQL injection');
        expect(detectSuspiciousQuery("'; DROP TABLE users; --")).toBe('Potential SQL injection');
      });

      it('should detect DROP TABLE attacks', () => {
        expect(detectSuspiciousQuery('portland; DROP TABLE cities--')).toBe('Potential SQL injection');
        expect(detectSuspiciousQuery('portland; drop table cities')).toBe('Potential SQL injection');
      });

      it('should detect INSERT INTO attacks', () => {
        expect(detectSuspiciousQuery('portland; INSERT INTO users')).toBe('Potential SQL injection');
      });

      it('should detect DELETE FROM attacks', () => {
        expect(detectSuspiciousQuery('portland; DELETE FROM users')).toBe('Potential SQL injection');
      });

      it('should detect UPDATE SET attacks', () => {
        expect(detectSuspiciousQuery('portland; UPDATE users SET')).toBe('Potential SQL injection');
      });

      it('should detect SQL comments', () => {
        expect(detectSuspiciousQuery('portland--')).toBe('Potential SQL injection');
        expect(detectSuspiciousQuery('portland#')).toBe('Potential SQL injection');
        expect(detectSuspiciousQuery('portland/*')).toBe('Potential SQL injection');
      });

      it('should detect OR and AND injections', () => {
        expect(detectSuspiciousQuery('portland OR 1=1')).toBe('Potential SQL injection');
        expect(detectSuspiciousQuery('portland AND 1=1')).toBe('Potential SQL injection');
      });
    });

    describe('XSS Detection', () => {
      it('should detect script tags', () => {
        expect(detectSuspiciousQuery('<script>alert(1)</script>')).toBe('Potential XSS attempt');
        expect(detectSuspiciousQuery('<script src="x.js">')).toBe('Potential XSS attempt');
      });

      it('should detect javascript: protocol', () => {
        expect(detectSuspiciousQuery('javascript:alert(1)')).toBe('Potential XSS attempt');
        expect(detectSuspiciousQuery('JavaScript:document.cookie')).toBe('Potential XSS attempt');
      });

      it('should detect event handlers', () => {
        expect(detectSuspiciousQuery('onclick=alert(1)')).toBe('Potential XSS attempt');
        expect(detectSuspiciousQuery('onload=xss()')).toBe('Potential XSS attempt');
        expect(detectSuspiciousQuery('onerror=xss()')).toBe('Potential XSS attempt');
      });
    });

    describe('Path Traversal Detection', () => {
      it('should detect double-dot patterns', () => {
        expect(detectSuspiciousQuery('../etc/passwd')).toBe('Potential path traversal');
        expect(detectSuspiciousQuery('....//')).toBe('Potential path traversal');
        expect(detectSuspiciousQuery('portland/../admin')).toBe('Potential path traversal');
      });
    });

    describe('Valid Queries', () => {
      it('should allow normal city searches', () => {
        expect(detectSuspiciousQuery('portland')).toBe(null);
        expect(detectSuspiciousQuery('san francisco')).toBe(null);
        expect(detectSuspiciousQuery('new york')).toBe(null);
      });

      it('should allow state searches', () => {
        expect(detectSuspiciousQuery('maine')).toBe(null);
        expect(detectSuspiciousQuery('california')).toBe(null);
      });

      it('should allow city, state searches', () => {
        expect(detectSuspiciousQuery('portland, me')).toBe(null);
        expect(detectSuspiciousQuery('portland me')).toBe(null);
        expect(detectSuspiciousQuery('portland, maine')).toBe(null);
      });

      it('should allow ZIP codes', () => {
        expect(detectSuspiciousQuery('04161')).toBe(null);
        expect(detectSuspiciousQuery('90210')).toBe(null);
      });

      it('should allow hyphens and apostrophes', () => {
        expect(detectSuspiciousQuery("o'connor")).toBe(null);
        expect(detectSuspiciousQuery('san-francisco')).toBe(null);
      });
    });
  });

  describe('validateZipCode()', () => {
    it('should validate 5-digit ZIP codes', () => {
      expect(validateZipCode('04161')).toBe('04161');
      expect(validateZipCode('90210')).toBe('90210');
      expect(validateZipCode('12345')).toBe('12345');
    });

    it('should validate ZIP+4 format', () => {
      expect(validateZipCode('12345-6789')).toBe('12345-6789');
      expect(validateZipCode('90210-1234')).toBe('90210-1234');
    });

    it('should reject invalid formats', () => {
      expect(validateZipCode('1234')).toBe(null); // Too short
      expect(validateZipCode('123456')).toBe(null); // Too long
      expect(validateZipCode('abcd')).toBe(null); // Non-numeric
      expect(validateZipCode('1234-5678')).toBe(null); // Wrong ZIP+4 format
    });

    it('should trim whitespace', () => {
      expect(validateZipCode('  12345  ')).toBe('12345');
      expect(validateZipCode(' 12345-6789 ')).toBe('12345-6789');
    });

    it('should handle empty string', () => {
      expect(validateZipCode('')).toBe(null);
    });
  });

  describe('validateStateAbbr()', () => {
    it('should validate 2-letter state abbreviations', () => {
      expect(validateStateAbbr('ME')).toBe('ME');
      expect(validateStateAbbr('CA')).toBe('CA');
      expect(validateStateAbbr('TX')).toBe('TX');
    });

    it('should convert lowercase to uppercase', () => {
      expect(validateStateAbbr('me')).toBe('ME');
      expect(validateStateAbbr('ca')).toBe('CA');
      expect(validateStateAbbr('Me')).toBe('ME');
    });

    it('should trim whitespace', () => {
      expect(validateStateAbbr('  ME  ')).toBe('ME');
    });

    it('should reject invalid formats', () => {
      expect(validateStateAbbr('M')).toBe(null); // Too short
      expect(validateStateAbbr('MAINE')).toBe(null); // Too long
      expect(validateStateAbbr('M3')).toBe(null); // Contains number
      expect(validateStateAbbr('')).toBe(null); // Empty
    });

    it('should reject special characters', () => {
      expect(validateStateAbbr('M-E')).toBe(null);
      expect(validateStateAbbr('M E')).toBe(null);
    });
  });
});
