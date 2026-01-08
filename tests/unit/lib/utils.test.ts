import { describe, it, expect, beforeEach } from 'vitest';
import {
  canonical,
  slugify,
  isZip,
  getStateSlug,
  getPlaceSlug,
  getCountySlug,
  getStateUrl,
  getCountyUrl,
  getPlaceUrl,
  getZipUrl,
} from '@/lib/seo';

describe('SEO Utilities', () => {
  describe('canonical()', () => {
    it('should create canonical URL with base URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://affordabilityindex.org';
      const url = canonical('/maine/portland/');
      expect(url).toBe('https://affordabilityindex.org/maine/portland/');
    });

    it('should handle paths without leading slash', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://affordabilityindex.org';
      const url = canonical('maine/portland/');
      expect(url).toBe('https://affordabilityindex.org/maine/portland/');
    });

    it('should use default base URL if not set', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const url = canonical('/maine/portland/');
      expect(url).toBe('https://affordabilityindex.org/maine/portland/');
    });

    it('should handle base URL with trailing slash', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://affordabilityindex.org/';
      const url = canonical('/maine/portland/');
      expect(url).toBe('https://affordabilityindex.org/maine/portland/');
    });
  });

  describe('slugify()', () => {
    it('should convert to lowercase', () => {
      expect(slugify('Portland')).toBe('portland');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('New York')).toBe('new-york');
    });

    it('should replace underscores with hyphens', () => {
      expect(slugify('los_angeles')).toBe('los-angeles');
    });

    it('should remove special characters', () => {
      expect(slugify("St. John's")).toBe('st-johns');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify('San  Francisco')).toBe('san-francisco');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('--test--')).toBe('test');
    });

    it('should handle multiple spaces and special chars', () => {
      expect(slugify('  Cape  Elizabeth  !!')).toBe('cape-elizabeth');
    });

    it('should handle ampersands', () => {
      expect(slugify('Smith & Jones')).toBe('smith-jones');
    });

    it('should handle commas', () => {
      expect(slugify('Ketchikan, Alaska')).toBe('ketchikan-alaska');
    });

    it('should handle apostrophes', () => {
      expect(slugify("O'Connor")).toBe('oconnor');
    });

    it('should return empty string for only special chars', () => {
      expect(slugify('!!!')).toBe('');
    });
  });

  describe('isZip()', () => {
    it('should return true for valid 5-digit ZIP', () => {
      expect(isZip('04161')).toBe(true);
      expect(isZip('90210')).toBe(true);
      expect(isZip('12345')).toBe(true);
    });

    it('should return false for non-5-digit strings', () => {
      expect(isZip('0416')).toBe(false);
      expect(isZip('041611')).toBe(false);
      expect(isZip('abcd')).toBe(false);
      expect(isZip('0416-1234')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isZip('')).toBe(false);
    });

    it('should return false for ZIP+4 format', () => {
      expect(isZip('12345-6789')).toBe(false);
    });
  });

  describe('getStateSlug()', () => {
    it('should slugify state names', () => {
      expect(getStateSlug('New York')).toBe('new-york');
      expect(getStateSlug('California')).toBe('california');
    });

    it('should slugify state abbreviations', () => {
      expect(getStateSlug('ME')).toBe('me');
      expect(getStateSlug('CA')).toBe('ca');
    });
  });

  describe('getPlaceSlug()', () => {
    it('should slugify place names', () => {
      expect(getPlaceSlug('Portland')).toBe('portland');
      expect(getPlaceSlug('San Francisco')).toBe('san-francisco');
      expect(getPlaceSlug('Cape Elizabeth')).toBe('cape-elizabeth');
    });

    it('should handle place names with commas', () => {
      expect(getPlaceSlug('Ketchikan, Alaska')).toBe('ketchikan-alaska');
    });
  });

  describe('getCountySlug()', () => {
    it('should slugify county names', () => {
      expect(getCountySlug('York County')).toBe('york-county');
      expect(getCountySlug('Los Angeles County')).toBe('los-angeles-county');
    });
  });

  describe('URL Builders', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://affordabilityindex.org';
    });

    describe('getStateUrl()', () => {
      it('should build state page URL', () => {
        expect(getStateUrl('maine')).toBe('https://affordabilityindex.org/maine/');
      });

      it('should handle hyphenated state slugs', () => {
        expect(getStateUrl('new-york')).toBe('https://affordabilityindex.org/new-york/');
      });
    });

    describe('getCountyUrl()', () => {
      it('should build county page URL', () => {
        expect(getCountyUrl('maine', 'york-county')).toBe(
          'https://affordabilityindex.org/maine/county/york-county/'
        );
      });
    });

    describe('getPlaceUrl()', () => {
      it('should build place page URL', () => {
        expect(getPlaceUrl('maine', 'portland')).toBe(
          'https://affordabilityindex.org/maine/portland/'
        );
      });

      it('should handle hyphenated place names', () => {
        expect(getPlaceUrl('california', 'san-francisco')).toBe(
          'https://affordabilityindex.org/california/san-francisco/'
        );
      });
    });

    describe('getZipUrl()', () => {
      it('should build ZIP page URL', () => {
        expect(getZipUrl('04161')).toBe('https://affordabilityindex.org/zip/04161/');
      });

      it('should handle different ZIP codes', () => {
        expect(getZipUrl('90210')).toBe('https://affordabilityindex.org/zip/90210/');
      });
    });
  });
});

import {
  clampScore,
  scoreToGrade,
  scoreLabel,
  formatScore,
  formatGrade,
  getScoreColor,
  getScoreDescription,
  getAffordabilityScore,
} from '@/lib/scoring';

describe('Scoring Utilities', () => {
  describe('clampScore()', () => {
    it('should clamp scores above 99 to 99', () => {
      expect(clampScore(100)).toBe(99);
      expect(clampScore(150)).toBe(99);
      expect(clampScore(999)).toBe(99);
    });

    it('should clamp scores below 0 to 0', () => {
      expect(clampScore(-1)).toBe(0);
      expect(clampScore(-100)).toBe(0);
    });

    it('should leave valid scores unchanged', () => {
      expect(clampScore(50)).toBe(50);
      expect(clampScore(0)).toBe(0);
      expect(clampScore(99)).toBe(99);
    });

    it('should round scores', () => {
      expect(clampScore(85.7)).toBe(86);
      expect(clampScore(85.2)).toBe(85);
    });

    it('should handle null/undefined', () => {
      expect(clampScore(null)).toBe(null);
      expect(clampScore(undefined)).toBe(null);
    });
  });

  describe('scoreToGrade()', () => {
    it('should return A+ for scores 95-100', () => {
      expect(scoreToGrade(95)).toBe('A+');
      expect(scoreToGrade(98)).toBe('A+');
      expect(scoreToGrade(100)).toBe('A+');
    });

    it('should return A for scores 85-94', () => {
      expect(scoreToGrade(85)).toBe('A');
      expect(scoreToGrade(90)).toBe('A');
      expect(scoreToGrade(94)).toBe('A');
    });

    it('should return A- for scores 80-84', () => {
      expect(scoreToGrade(80)).toBe('A-');
      expect(scoreToGrade(82)).toBe('A-');
      expect(scoreToGrade(84)).toBe('A-');
    });

    it('should return B+ for scores 75-79', () => {
      expect(scoreToGrade(75)).toBe('B+');
      expect(scoreToGrade(77)).toBe('B+');
      expect(scoreToGrade(79)).toBe('B+');
    });

    it('should return B for scores 65-74', () => {
      expect(scoreToGrade(65)).toBe('B');
      expect(scoreToGrade(70)).toBe('B');
      expect(scoreToGrade(74)).toBe('B');
    });

    it('should return B- for scores 60-64', () => {
      expect(scoreToGrade(60)).toBe('B-');
      expect(scoreToGrade(62)).toBe('B-');
      expect(scoreToGrade(64)).toBe('B-');
    });

    it('should return C+ for scores 55-59', () => {
      expect(scoreToGrade(55)).toBe('C+');
      expect(scoreToGrade(57)).toBe('C+');
      expect(scoreToGrade(59)).toBe('C+');
    });

    it('should return C for scores 45-54', () => {
      expect(scoreToGrade(45)).toBe('C');
      expect(scoreToGrade(50)).toBe('C');
      expect(scoreToGrade(54)).toBe('C');
    });

    it('should return C- for scores 40-44', () => {
      expect(scoreToGrade(40)).toBe('C-');
      expect(scoreToGrade(42)).toBe('C-');
      expect(scoreToGrade(44)).toBe('C-');
    });

    it('should return D+ for scores 35-39', () => {
      expect(scoreToGrade(35)).toBe('D+');
      expect(scoreToGrade(37)).toBe('D+');
      expect(scoreToGrade(39)).toBe('D+');
    });

    it('should return D for scores 25-34', () => {
      expect(scoreToGrade(25)).toBe('D');
      expect(scoreToGrade(30)).toBe('D');
      expect(scoreToGrade(34)).toBe('D');
    });

    it('should return D- for scores 20-24', () => {
      expect(scoreToGrade(20)).toBe('D-');
      expect(scoreToGrade(22)).toBe('D-');
      expect(scoreToGrade(24)).toBe('D-');
    });

    it('should return F for scores below 20', () => {
      expect(scoreToGrade(0)).toBe('F');
      expect(scoreToGrade(10)).toBe('F');
      expect(scoreToGrade(19)).toBe('F');
    });

    it('should handle null/undefined', () => {
      expect(scoreToGrade(null)).toBe(null);
      expect(scoreToGrade(undefined)).toBe(null);
    });
  });

  describe('scoreLabel()', () => {
    it('should return Excellent for scores 95+', () => {
      expect(scoreLabel(95)).toBe('Excellent');
      expect(scoreLabel(98)).toBe('Excellent');
    });

    it('should return Very Good for scores 85-94', () => {
      expect(scoreLabel(85)).toBe('Very Good');
      expect(scoreLabel(90)).toBe('Very Good');
    });

    it('should return Good for scores 75-84', () => {
      expect(scoreLabel(75)).toBe('Good');
      expect(scoreLabel(80)).toBe('Good');
    });

    it('should return Above Average for scores 65-74', () => {
      expect(scoreLabel(65)).toBe('Above Average');
      expect(scoreLabel(70)).toBe('Above Average');
    });

    it('should return Average for scores 55-64', () => {
      expect(scoreLabel(55)).toBe('Average');
      expect(scoreLabel(60)).toBe('Average');
    });

    it('should return Moderate for scores 45-54', () => {
      expect(scoreLabel(45)).toBe('Moderate');
      expect(scoreLabel(50)).toBe('Moderate');
    });

    it('should return Below Average for scores 35-44', () => {
      expect(scoreLabel(35)).toBe('Below Average');
      expect(scoreLabel(40)).toBe('Below Average');
    });

    it('should return Challenging for scores 25-34', () => {
      expect(scoreLabel(25)).toBe('Challenging');
      expect(scoreLabel(30)).toBe('Challenging');
    });

    it('should return Poor for scores 20-24', () => {
      expect(scoreLabel(20)).toBe('Poor');
      expect(scoreLabel(22)).toBe('Poor');
    });

    it('should return Unaffordable for scores below 20', () => {
      expect(scoreLabel(0)).toBe('Unaffordable');
      expect(scoreLabel(10)).toBe('Unaffordable');
      expect(scoreLabel(19)).toBe('Unaffordable');
    });

    it('should return Unknown for null/undefined', () => {
      expect(scoreLabel(null)).toBe('Unknown');
      expect(scoreLabel(undefined)).toBe('Unknown');
    });
  });

  describe('formatScore()', () => {
    it('should format score as string', () => {
      expect(formatScore(85)).toBe('85');
      expect(formatScore(92.7)).toBe('93');
    });

    it('should return em dash for null/undefined', () => {
      expect(formatScore(null)).toBe('—');
      expect(formatScore(undefined)).toBe('—');
    });
  });

  describe('formatGrade()', () => {
    it('should return grade as-is', () => {
      expect(formatGrade('A')).toBe('A');
      expect(formatGrade('B+')).toBe('B+');
    });

    it('should return em dash for null/empty', () => {
      expect(formatGrade(null)).toBe('—');
      expect(formatGrade('')).toBe('—');
    });
  });

  describe('getScoreColor()', () => {
    it('should return green for A+ (95+)', () => {
      expect(getScoreColor(95)).toBe('bg-green-100 text-green-800 border-green-300');
    });

    it('should return blue for A (85-94)', () => {
      expect(getScoreColor(85)).toBe('bg-blue-100 text-blue-800 border-blue-300');
    });

    it('should return cyan for A- (80-84)', () => {
      expect(getScoreColor(80)).toBe('bg-cyan-100 text-cyan-800 border-cyan-300');
    });

    it('should return teal for B+ (75-79)', () => {
      expect(getScoreColor(75)).toBe('bg-teal-100 text-teal-800 border-teal-300');
    });

    it('should return yellow for B/B- (60-74)', () => {
      expect(getScoreColor(65)).toBe('bg-yellow-100 text-yellow-800 border-yellow-300');
    });

    it('should return amber for C (45-59)', () => {
      expect(getScoreColor(50)).toBe('bg-amber-100 text-amber-800 border-amber-300');
    });

    it('should return orange for D (25-44)', () => {
      expect(getScoreColor(35)).toBe('bg-orange-100 text-orange-800 border-orange-300');
    });

    it('should return rose for D- (20-24)', () => {
      expect(getScoreColor(20)).toBe('bg-rose-100 text-rose-800 border-rose-300');
    });

    it('should return red for F (below 20)', () => {
      expect(getScoreColor(10)).toBe('bg-red-100 text-red-800 border-red-300');
    });

    it('should return gray for null/undefined', () => {
      expect(getScoreColor(null)).toBe('bg-gray-100 text-gray-700 border-gray-300');
      expect(getScoreColor(undefined)).toBe('bg-gray-100 text-gray-700 border-gray-300');
    });
  });

  describe('getScoreDescription()', () => {
    it('should return description for Excellent (95+)', () => {
      expect(getScoreDescription(95)).toContain('Excellent affordability');
    });

    it('should return description for Very Good (85-94)', () => {
      expect(getScoreDescription(85)).toContain('Very good affordability');
    });

    it('should return description for Unaffordable (below 20)', () => {
      expect(getScoreDescription(10)).toContain('Unaffordable');
    });

    it('should return no data message for null/undefined', () => {
      expect(getScoreDescription(null)).toBe('Affordability data not available');
      expect(getScoreDescription(undefined)).toBe('Affordability data not available');
    });
  });

  describe('getAffordabilityScore()', () => {
    it('should return V2 percentile when available', () => {
      expect(getAffordabilityScore({
        affordabilityPercentile: 85,
        ratio: 4.5
      })).toBe(85);
    });

    it('should fallback to V1 ratio when percentile not available', () => {
      expect(getAffordabilityScore({
        ratio: 4.5
      })).toBe(95.5); // 100 - 4.5
    });

    it('should return -Infinity for null metrics', () => {
      expect(getAffordabilityScore(null)).toBe(-Infinity);
      expect(getAffordabilityScore(undefined)).toBe(-Infinity);
    });

    it('should return -Infinity when no data available', () => {
      expect(getAffordabilityScore({})).toBe(-Infinity);
      expect(getAffordabilityScore({
        affordabilityPercentile: null,
        ratio: null
      })).toBe(-Infinity);
    });

    it('should prefer percentile over ratio', () => {
      const result = getAffordabilityScore({
        affordabilityPercentile: 75,
        ratio: 5.0
      });
      expect(result).toBe(75, not(95)); // Should use 75, not 100-5=95
    });
  });
});
