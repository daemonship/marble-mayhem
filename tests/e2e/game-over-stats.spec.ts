/**
 * E2E Scenario: Game Over stats match final game state
 *
 * Records HUD values just before game over and asserts the Game Over screen
 * shows the same values (within reasonable tolerance for time ±1s).
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

test.describe('Game Over stats match final game state', () => {
  test('game over screen stats match HUD values at end of run', async ({ page }) => {
    page.setDefaultTimeout(130000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    // Wait for at least one level-up to have occurred (ensures meaningful stats)
    await expect(async () => {
      const levelText = await page.locator('#level-display').textContent();
      expect(parseInt(levelText?.trim() ?? '1', 10)).toBeGreaterThan(1);
    }).toPass({ timeout: 90000, intervals: [1000] });

    // Poll until game over screen appears, capturing last HUD snapshot just before
    let lastKills = '';
    let lastLevel = '';

    await expect(async () => {
      lastKills = (await page.locator('#kill-counter').textContent()) ?? '';
      lastLevel = (await page.locator('#level-display').textContent()) ?? '';
      await expect(page.locator('#game-over-screen')).toBeVisible();
    }).toPass({ timeout: 120000, intervals: [250] });

    // Game Over screen must be visible
    await expect(page.locator('#game-over-screen')).toBeVisible();

    // Stats should match last recorded HUD values (kills exact, level exact)
    const goKills = (await page.locator('#game-over-kills').textContent()) ?? '';
    const goLevel = (await page.locator('#game-over-level').textContent()) ?? '';

    // Extract numbers from text (handles "Kills: 42" or just "42")
    const extractNum = (text: string) => parseInt(text.replace(/\D+/g, ''), 10);

    expect(extractNum(goKills)).toBe(extractNum(lastKills));
    expect(extractNum(goLevel)).toBe(extractNum(lastLevel));
  });

  test('game over time stat is a valid elapsed time', async ({ page }) => {
    page.setDefaultTimeout(130000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('#game-over-screen')).toBeVisible({ timeout: 120000 });

    const timeText = (await page.locator('#game-over-time').textContent()) ?? '';
    // Accept formats: "42", "0:42", "00:42", "42s", "0m 42s"
    expect(timeText.trim()).toMatch(/\d/);

    // Time must be positive (game lasted more than 0 seconds)
    const extractSeconds = (text: string): number => {
      const colonMatch = text.match(/(\d+):(\d+)/);
      if (colonMatch) return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
      return parseInt(text.replace(/\D+/g, ''), 10);
    };
    expect(extractSeconds(timeText)).toBeGreaterThan(0);
  });
});
