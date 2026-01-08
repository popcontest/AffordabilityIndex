import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/true-affordability/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/trueAffordability', () => ({
  calculateTrueAffordability: vi.fn(),
}));

vi.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimiters: {
    calculator: {},
  },
}));

vi.mock('@/lib/security/logger', () => ({
  logRateLimitExceeded: vi.fn(),
  logInvalidInput: vi.fn(),
  logApiError: vi.fn(),
}));

import { calculateTrueAffordability } from '@/lib/trueAffordability';
import { checkRateLimit } from '@/lib/security/rateLimit';

describe('/api/true-affordability endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60000,
    });
  });

  describe('Request Validation', () => {
    it('should validate required geoType parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/true-affordability?geoId=12345');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    it('should validate required geoId parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/true-affordability?geoType=CITY');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    it('should reject invalid geoType', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=INVALID&geoId=12345'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid householdType', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&householdType=invalid'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should accept valid householdType values', async () => {
      const householdTypes = ['single', 'couple', 'family', 'emptyNester', 'retiree', 'remote'];

      for (const type of householdTypes) {
        vi.mocked(calculateTrueAffordability).mockResolvedValue({
          disposableIncome: 50000,
          costs: {},
          trueAffordabilityRatio: 3.5,
        });

        const request = new NextRequest(
          `http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&householdType=${type}`
        );
        const response = await GET(request);

        expect(response.status).not.toBe(400);
      }
    });

    it('should default to family householdType', async () => {
      vi.mocked(calculateTrueAffordability).mockResolvedValue({
        disposableIncome: 50000,
        costs: {},
        trueAffordabilityRatio: 3.5,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(calculateTrueAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          householdType: 'family',
        })
      );
    });

    it('should validate income as positive number', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&income=-50000'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should validate maximum income value', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&income=20000000'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: false,
        limit: 20,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      expect(response.status).toBe(429);
      const json = await response.json();
      expect(json.error).toBe('Too many requests');

      expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('Successful Calculation', () => {
    it('should return true affordability calculation for city', async () => {
      const mockResult = {
        disposableIncome: 45000,
        costs: {
          housing: 20000,
          taxes: 8000,
          transportation: 5000,
          childcare: 12000,
          healthcare: 3000,
        },
        trueAffordabilityRatio: 3.2,
      };

      vi.mocked(calculateTrueAffordability).mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.trueAffordabilityRatio).toBe(3.2);
      expect(json.data.disposableIncome).toBe(45000);
    });

    it('should return true affordability calculation for ZIP', async () => {
      const mockResult = {
        disposableIncome: 55000,
        costs: {
          housing: 22000,
          taxes: 9000,
          transportation: 4500,
          childcare: 10000,
          healthcare: 3500,
        },
        trueAffordabilityRatio: 4.1,
      };

      vi.mocked(calculateTrueAffordability).mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=ZCTA&geoId=04161'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.data.trueAffordabilityRatio).toBe(4.1);
    });

    it('should include request parameters in response', async () => {
      const mockResult = {
        disposableIncome: 45000,
        costs: {},
        trueAffordabilityRatio: 3.2,
      };

      vi.mocked(calculateTrueAffordability).mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&householdType=single&income=75000'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.data.geoType).toBe('CITY');
      expect(json.data.geoId).toBe('12345');
      expect(json.data.householdType).toBe('single');
    });

    it('should pass custom income to calculation', async () => {
      vi.mocked(calculateTrueAffordability).mockResolvedValue({
        disposableIncome: 60000,
        costs: {},
        trueAffordabilityRatio: 4.5,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&income=120000'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(calculateTrueAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          annualIncome: 120000,
        })
      );
    });
  });

  describe('Household Type Handling', () => {
    it('should set default children for family household', async () => {
      vi.mocked(calculateTrueAffordability).mockResolvedValue({
        disposableIncome: 45000,
        costs: {},
        trueAffordabilityRatio: 3.2,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&householdType=family'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(calculateTrueAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          householdType: 'family',
          numChildren: 2,
          childAges: [1, 3],
        })
      );
    });

    it('should not include children for single household', async () => {
      vi.mocked(calculateTrueAffordability).mockResolvedValue({
        disposableIncome: 45000,
        costs: {},
        trueAffordabilityRatio: 3.2,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&householdType=single'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(calculateTrueAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          householdType: 'single',
          numChildren: 0,
          childAges: undefined,
        })
      );
    });

    it('should not include children for couple household', async () => {
      vi.mocked(calculateTrueAffordability).mockResolvedValue({
        disposableIncome: 45000,
        costs: {},
        trueAffordabilityRatio: 3.2,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345&householdType=couple'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(calculateTrueAffordability).toHaveBeenCalledWith(
        expect.objectContaining({
          householdType: 'couple',
          numChildren: 0,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle calculation errors gracefully', async () => {
      vi.mocked(calculateTrueAffordability).mockRejectedValue(
        new Error('Calculation failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Internal server error');
    });

    it('should not expose error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      vi.mocked(calculateTrueAffordability).mockRejectedValue(
        new Error('Detailed database error message')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      const json = await response.json();
      expect(json.message).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error details in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      vi.mocked(calculateTrueAffordability).mockRejectedValue(
        new Error('Detailed error for debugging')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      const json = await response.json();
      expect(json.message).toBe('Detailed error for debugging');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      const mockResult = {
        disposableIncome: 45000,
        costs: {
          housing: 20000,
          taxes: 8000,
        },
        trueAffordabilityRatio: 3.2,
      };

      vi.mocked(calculateTrueAffordability).mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      const json = await response.json();

      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('geoType');
      expect(json.data).toHaveProperty('geoId');
      expect(json.data).toHaveProperty('householdType');
    });

    it('should include all cost breakdown fields', async () => {
      const mockResult = {
        disposableIncome: 45000,
        costs: {
          housing: 20000,
          taxes: 8000,
          transportation: 5000,
          childcare: 12000,
          healthcare: 3000,
        },
        trueAffordabilityRatio: 3.2,
      };

      vi.mocked(calculateTrueAffordability).mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/true-affordability?geoType=CITY&geoId=12345'
      );
      const response = await GET(request);

      const json = await response.json();

      expect(json.data.costs).toBeDefined();
      expect(json.data.disposableIncome).toBeDefined();
      expect(json.data.trueAffordabilityRatio).toBeDefined();
    });
  });
});
