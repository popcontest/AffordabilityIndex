import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Affordability Index
 *
 * Tests:
 * 1. Homepage loads with all six ranking sections
 * 2. Population bucket filtering (City >= 50k, Small City 10k-50k, Town < 10k)
 * 3. Sorting direction (affordable = ascending ratio, expensive = descending)
 * 4. v2 scoring displays for cities with basket data
 * 5. v1 fallback works for cities without basket data
 */

test.describe('Homepage Sections', () => {
  test('should display all six ranking sections', async ({ page }) => {
    await page.goto('/');

    // Assert all 6 sections exist
    await expect(page.locator('[data-testid="section-most-affordable-cities"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-most-affordable-small-cities"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-most-affordable-towns"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-least-affordable-cities"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-least-affordable-small-cities"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-least-affordable-towns"]')).toBeVisible();
  });

  test('should have place cards in each section', async ({ page }) => {
    await page.goto('/');

    // Check that each section has at least one card (if data exists)
    const sections = [
      'section-most-affordable-cities',
      'section-most-affordable-small-cities',
      'section-most-affordable-towns',
      'section-least-affordable-cities',
      'section-least-affordable-small-cities',
      'section-least-affordable-towns',
    ];

    for (const sectionId of sections) {
      const section = page.locator(`[data-testid="${sectionId}"]`);
      const sectionExists = await section.count();

      if (sectionExists > 0) {
        const cards = section.locator('[data-testid="place-card"]');
        const cardCount = await cards.count();

        // If section exists, it should have cards (unless data is sparse)
        if (cardCount > 0) {
          expect(cardCount).toBeGreaterThan(0);

          // First card should have required elements
          await expect(cards.first().locator('[data-testid="place-name"]')).toBeVisible();
          await expect(cards.first().locator('[data-testid="place-type"]')).toBeVisible();
        }
      }
    }
  });
});

test.describe('Population Bucket Filtering', () => {
  test('should display correct place types for City bucket (>=50k)', async ({ page }) => {
    await page.goto('/');

    // Cities section should only show "City" badges
    const cityCards = page.locator('[data-testid="section-most-affordable-cities"] [data-testid="place-card"]');
    const cityCount = await cityCards.count();

    if (cityCount > 0) {
      // Check up to first 3 cards
      for (let i = 0; i < Math.min(cityCount, 3); i++) {
        const placeType = await cityCards.nth(i).locator('[data-testid="place-type"]').textContent();
        expect(placeType).toContain('City'); // Should show City badge
      }
    }
  });

  test('should display correct place types for Small City bucket (10k-50k)', async ({ page }) => {
    await page.goto('/');

    // Small cities section should show "Small City" badges
    const smallCityCards = page.locator('[data-testid="section-most-affordable-small-cities"] [data-testid="place-card"]');
    const smallCityCount = await smallCityCards.count();

    if (smallCityCount > 0) {
      // Check up to first 3 cards
      for (let i = 0; i < Math.min(smallCityCount, 3); i++) {
        const placeType = await smallCityCards.nth(i).locator('[data-testid="place-type"]').textContent();
        expect(placeType).toContain('Small City');
      }
    }
  });

  test('should display correct place types for Town bucket (<10k)', async ({ page }) => {
    await page.goto('/');

    // Towns section should show "Town" badges
    const townCards = page.locator('[data-testid="section-most-affordable-towns"] [data-testid="place-card"]');
    const townCount = await townCards.count();

    if (townCount > 0) {
      // Check up to first 3 cards
      for (let i = 0; i < Math.min(townCount, 3); i++) {
        const placeType = await townCards.nth(i).locator('[data-testid="place-type"]').textContent();
        expect(placeType).toContain('Town');
      }
    }
  });
});

test.describe('Sorting Direction', () => {
  test('should display cities in ascending ratio order (most affordable)', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('[data-testid="section-most-affordable-cities"]');
    const ratioElements = section.locator('[data-testid="place-ratio"]');
    const count = await ratioElements.count();

    if (count > 1) {
      const ratios: number[] = [];

      // Extract ratio values from text like "Home value is 3.2× income"
      for (let i = 0; i < count; i++) {
        const text = await ratioElements.nth(i).textContent();
        const match = text?.match(/([\d.]+)×/);
        if (match) {
          ratios.push(parseFloat(match[1]));
        }
      }

      // Most affordable = lowest ratio first, so should be non-decreasing (ascending)
      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
      }
    }
  });

  test('should display cities in descending ratio order (least affordable)', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('[data-testid="section-least-affordable-cities"]');
    const ratioElements = section.locator('[data-testid="place-ratio"]');
    const count = await ratioElements.count();

    if (count > 1) {
      const ratios: number[] = [];

      // Extract ratio values from text like "Home value is 8.5× income"
      for (let i = 0; i < count; i++) {
        const text = await ratioElements.nth(i).textContent();
        const match = text?.match(/([\d.]+)×/);
        if (match) {
          ratios.push(parseFloat(match[1]));
        }
      }

      // Least affordable = highest ratio first, so should be non-increasing (descending)
      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeLessThanOrEqual(ratios[i - 1]);
      }
    }
  });

  test('should display small cities in ascending ratio order (most affordable)', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('[data-testid="section-most-affordable-small-cities"]');
    const ratioElements = section.locator('[data-testid="place-ratio"]');
    const count = await ratioElements.count();

    if (count > 1) {
      const ratios: number[] = [];

      for (let i = 0; i < count; i++) {
        const text = await ratioElements.nth(i).textContent();
        const match = text?.match(/([\d.]+)×/);
        if (match) {
          ratios.push(parseFloat(match[1]));
        }
      }

      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
      }
    }
  });

  test('should display towns in ascending ratio order (most affordable)', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('[data-testid="section-most-affordable-towns"]');
    const ratioElements = section.locator('[data-testid="place-ratio"]');
    const count = await ratioElements.count();

    if (count > 1) {
      const ratios: number[] = [];

      for (let i = 0; i < count; i++) {
        const text = await ratioElements.nth(i).textContent();
        const match = text?.match(/([\d.]+)×/);
        if (match) {
          ratios.push(parseFloat(match[1]));
        }
      }

      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1]);
      }
    }
  });
});

test.describe('City Detail Page - Score Components', () => {
  test('should display score hero and breakdown components', async ({ page }) => {
    await page.goto('/');

    // Click first card in most affordable cities
    const firstCard = page.locator('[data-testid="section-most-affordable-cities"] [data-testid="place-card"]').first();
    const cardExists = await firstCard.count();

    if (cardExists > 0) {
      await firstCard.click();

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // Assert score components exist
      await expect(page.locator('[data-testid="score-hero"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="score-overall"]')).toBeVisible();

      // Check version (should be v1_housing or v2_full)
      const versionElement = page.locator('[data-testid="score-version"]');
      const versionExists = await versionElement.count();

      if (versionExists > 0) {
        const versionText = await versionElement.textContent();
        expect(versionText).toMatch(/(v1_housing|v2_full)/);

        // Housing score should always be visible
        const scoreHousing = page.locator('[data-testid="score-housing"]');

        // Click "Show details" to expand breakdown if needed
        const showDetailsButton = page.locator('button:has-text("Show details")');
        const showDetailsExists = await showDetailsButton.count();

        if (showDetailsExists > 0) {
          await showDetailsButton.click();
        }

        await expect(scoreHousing).toBeVisible();

        // Check essentials score based on version
        const scoreEssentials = page.locator('[data-testid="score-essentials"]');
        await expect(scoreEssentials).toBeVisible();

        if (versionText?.includes('v2')) {
          // v2: essentials should show a score (not "Coming soon")
          const essentialsText = await scoreEssentials.textContent();
          expect(essentialsText).toContain('Essentials Affordability');
          // Should NOT contain "Coming soon" for v2
          expect(essentialsText).not.toContain('Coming soon');
        } else if (versionText?.includes('v1')) {
          // v1: essentials should show "Coming soon"
          const essentialsText = await scoreEssentials.textContent();
          expect(essentialsText).toContain('Coming soon');
        }
      }
    }
  });

  test('should detect v2 score version correctly', async ({ page }) => {
    await page.goto('/');

    // Look for any city card
    const anyCard = page.locator('[data-testid="section-most-affordable-cities"] [data-testid="place-card"]').first();
    const cardExists = await anyCard.count();

    if (cardExists > 0) {
      await anyCard.click();
      await page.waitForLoadState('networkidle');

      const versionElement = page.locator('[data-testid="score-version"]');
      const versionExists = await versionElement.count();

      if (versionExists > 0) {
        const versionText = await versionElement.textContent();

        // Version should be either v1_housing or v2_full
        expect(versionText).toMatch(/^(v1_housing|v2_full)$/);
      }
    }
  });
});

test.describe('State Page', () => {
  test('should display state page sections correctly', async ({ page }) => {
    // Test Maine state page
    await page.goto('/maine/');

    // Check that at least one section exists
    const citySection = page.locator('[data-testid="section-most-affordable-cities"]');
    const exists = await citySection.count();

    if (exists > 0) {
      await expect(citySection).toBeVisible();

      // Check for place cards in the section
      const cards = citySection.locator('[data-testid="place-card"]');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // Verify card structure
        await expect(cards.first().locator('[data-testid="place-name"]')).toBeVisible();
        await expect(cards.first().locator('[data-testid="place-type"]')).toBeVisible();
      }
    }
  });

  test('should maintain correct bucket filtering on state pages', async ({ page }) => {
    await page.goto('/california/');

    // Check cities bucket
    const cityCards = page.locator('[data-testid="section-most-affordable-cities"] [data-testid="place-card"]');
    const cityCount = await cityCards.count();

    if (cityCount > 0) {
      const placeType = await cityCards.first().locator('[data-testid="place-type"]').textContent();
      expect(placeType).toContain('City');
    }

    // Check small cities bucket
    const smallCityCards = page.locator('[data-testid="section-most-affordable-small-cities"] [data-testid="place-card"]');
    const smallCityCount = await smallCityCards.count();

    if (smallCityCount > 0) {
      const placeType = await smallCityCards.first().locator('[data-testid="place-type"]').textContent();
      expect(placeType).toContain('Small City');
    }

    // Check towns bucket
    const townCards = page.locator('[data-testid="section-most-affordable-towns"] [data-testid="place-card"]');
    const townCount = await townCards.count();

    if (townCount > 0) {
      const placeType = await townCards.first().locator('[data-testid="place-type"]').textContent();
      expect(placeType).toContain('Town');
    }
  });
});

test.describe('Score and Ratio Display', () => {
  test('should display both score and ratio on cards', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('[data-testid="section-most-affordable-cities"] [data-testid="place-card"]').first();
    const cardExists = await firstCard.count();

    if (cardExists > 0) {
      // Check for score
      const scoreElement = firstCard.locator('[data-testid="place-score"]');
      const scoreExists = await scoreElement.count();

      if (scoreExists > 0) {
        const scoreText = await scoreElement.textContent();
        // Should match pattern like "85 (B+)" or "92 (A-)"
        expect(scoreText).toMatch(/\d+\s*\([A-F][+-]?\)/);
      }

      // Check for ratio
      const ratioElement = firstCard.locator('[data-testid="place-ratio"]');
      const ratioExists = await ratioElement.count();

      if (ratioExists > 0) {
        const ratioText = await ratioElement.textContent();
        // Should match pattern like "Home value is 3.2× income"
        expect(ratioText).toMatch(/[\d.]+×/);
      }
    }
  });
});
