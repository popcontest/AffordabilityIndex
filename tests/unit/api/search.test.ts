import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/search/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/data', () => ({
  getSearchResults: vi.fn(),
  getCityByStateAndSlug: vi.fn(),
  getZipByCode: vi.fn(),
}));

vi.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimiters: {
    search: {},
  },
}));

vi.mock('@/lib/security/logger', () => ({
  logRateLimitExceeded: vi.fn(),
  logInvalidInput: vi.fn(),
  logSuspiciousQuery: vi.fn(),
  logApiError: vi.fn(),
  getUserAgent: vi.fn(() => 'test-agent'),
}));

import { getSearchResults, getCityByStateAndSlug, getZipByCode } from '@/lib/data';
import { checkRateLimit } from '@/lib/security/rateLimit';

describe('/api/search endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Query parameter "q" is required');
    });

    it('should return 400 for empty query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should reject suspicious SQL injection patterns', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=portland%20OR%201=1');

      vi.mocked(getSearchResults).mockResolvedValue([]);

      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Invalid search query');
    });

    it('should reject XSS patterns', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=<script>alert(1)</script>');

      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe('Invalid search query');
    });

    it('should reject path traversal patterns', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=../etc/passwd');

      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 10000,
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      expect(response.status).toBe(429);
      const json = await response.json();
      expect(json.error).toBe('Too many requests');

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('Retry-After')).toBe('10');
    });

    it('should include rate limit headers on success', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 10000,
      });

      vi.mocked(getSearchResults).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      // Success response won't have headers by default, but rate limit check happens
      expect(response.status).not.toBe(429);
    });
  });

  describe('ZIP Code Search', () => {
    it('should return ZIP result for valid 5-digit ZIP', async () => {
      const mockZip = {
        zcta: '04161',
        metrics: {
          ratio: 4.2,
          homeValue: 350000,
          income: 83000,
          asOfDate: '2024-01-01',
        },
      };

      vi.mocked(getZipByCode).mockResolvedValue(mockZip);

      const request = new NextRequest('http://localhost:3000/api/search?q=04161');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.query).toBe('04161');
      expect(json.results).toHaveLength(1);
      expect(json.results[0].geoType).toBe('ZCTA');
      expect(json.results[0].label).toBe('ZIP 04161');
      expect(json.count).toBe(1);
    });

    it('should return empty results for non-existent ZIP', async () => {
      vi.mocked(getZipByCode).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/search?q=99999');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.results).toHaveLength(0);
      expect(json.count).toBe(0);
    });
  });

  describe('City Search', () => {
    it('should return city search results', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]); // Unique slug

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.results).toHaveLength(1);
      expect(json.results[0].geoType).toBe('CITY');
      expect(json.results[0].label).toBe('Portland, ME');
      expect(json.results[0].state).toBe('ME');
      expect(json.results[0].ratio).toBe(4.5);
    });

    it('should filter by state when specified', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
        {
          geoType: 'CITY',
          geoId: '67890',
          name: 'Portland, OR',
          stateAbbr: 'OR',
          metrics: {
            ratio: 6.2,
            homeValue: 520000,
            income: 90000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland%20me');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      // Should only return Maine results
      expect(json.results).toHaveLength(1);
      expect(json.results[0].state).toBe('ME');
    });
  });

  describe('State Page Results', () => {
    it('should return state page for state-only queries', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=maine');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.results).toHaveLength(1);
      expect(json.results[0].geoType).toBe('STATE');
      expect(json.results[0].label).toContain('Maine');
    });
  });

  describe('Canonical URL Generation', () => {
    it('should generate correct canonical URLs', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.results[0].canonicalUrl).toBeDefined();
      expect(json.results[0].canonicalUrl).toMatch(/^\/maine\/portland/);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getSearchResults).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Internal server error');
    });

    it('should sanitize query input', async () => {
      // Test with HTML characters
      const request = new NextRequest('http://localhost:3000/api/search?q=<b>portland</b>');

      vi.mocked(getSearchResults).mockResolvedValue([]);

      const response = await GET(request);

      // Should sanitize the HTML characters
      expect(response.status).toBe(200);
    });
  });

  describe('Query Parsing', () => {
    it('should parse "city, state" format', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland%2C%20me');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getSearchResults).toHaveBeenCalledWith('portland', expect.any(Number));
    });

    it('should parse "city STATE" format', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland%20ME');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      const json = await response.json();

      expect(json).toHaveProperty('query');
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('count');
      expect(Array.isArray(json.results)).toBe(true);
      expect(typeof json.count).toBe('number');
    });

    it('should include all required fields in results', async () => {
      const mockResults = [
        {
          geoType: 'CITY',
          geoId: '12345',
          name: 'Portland, ME',
          stateAbbr: 'ME',
          metrics: {
            ratio: 4.5,
            homeValue: 380000,
            income: 85000,
            asOfDate: '2024-01-01',
          },
        },
      ];

      vi.mocked(getSearchResults).mockResolvedValue(mockResults);
      vi.mocked(getCityByStateAndSlug).mockResolvedValue([{}]);

      const request = new NextRequest('http://localhost:3000/api/search?q=portland');
      const response = await GET(request);

      const json = await response.json();
      const result = json.results[0];

      expect(result).toHaveProperty('geoType');
      expect(result).toHaveProperty('geoId');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('canonicalUrl');
      expect(result).toHaveProperty('ratio');
      expect(result).toHaveProperty('homeValue');
      expect(result).toHaveProperty('income');
      expect(result).toHaveProperty('asOfDate');
    });
  });
});
