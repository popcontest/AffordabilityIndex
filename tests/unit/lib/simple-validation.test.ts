import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchQuery,
  detectSuspiciousQuery,
  validateZipCode,
  validateStateAbbr,
} from '@/lib/security/validation';

describe('Security Validation - Simple Tests', () => {
  describe('sanitizeSearchQuery()', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  portland  ')).toBe('portland');
    });

    it('should remove HTML tag characters', () => {
      expect(sanitizeSearchQuery('<b>portland</b>')).toBe('bportland/b');
    });

    it('should remove quotes', () => {
      expect(sanitizeSearchQuery('"portland"')).toBe('portland');
    });
  });

  describe('detectSuspiciousQuery()', () => {
    it('should detect SQL injection', () => {
      expect(detectSuspiciousQuery("'; DROP TABLE users; --")).toBe('Potential SQL injection');
    });

    it('should allow normal queries', () => {
      expect(detectSuspiciousQuery('portland')).toBe(null);
    });
  });

  describe('validateZipCode()', () => {
    it('should validate 5-digit ZIP', () => {
      expect(validateZipCode('04161')).toBe('04161');
    });

    it('should reject invalid format', () => {
      expect(validateZipCode('1234')).toBe(null);
    });
  });
});
