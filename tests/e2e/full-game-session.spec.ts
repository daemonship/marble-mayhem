/**
 * E2E Scenario: Full game session from start to game over
 *
 * DOM contract (implementation must provide):
 *   #start-screen          — visible on initial load
 *   button "Start Run"     — inside #start-screen
 *   #hud                   — visible once game starts
 *   #health-bar            — DOM progress bar; aria-valuenow = current HP
 *   #xp-bar                — DOM progress bar; aria-valuenow = current XP
 *   #level-display         — text content = current level number
 *   #timer-display         — text content = elapsed time (seconds or M:SS)
 *   #kill-counter          — text content = kill count number
 *   #game-over-screen      — visible when player health reaches 0
 *   #game-over-time        — final time text
 *   #game-over-level       — final level text
 *   #game-over-kills       — final kills text
 *   button "Play Again"    — inside #game-over-screen
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

test.describe('Full game session from start to game over', () => {
  test('start screen is visible with a Start Run button', async ({ page }) => {
    await page.goto(APP_URL);

    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toBeVisible({ timeout: 5000 });

    const startBtn = startScreen.locator('button', { hasText: 'Start Run' });
    await expect(startBtn).toBeVisible();
  });

  test('clicking Start Run shows the HUD with all required elements', async ({ page }) => {
    await page.goto(APP_URL);

    await page.locator('#start-screen').locator('button', { hasText: 'Start Run' }).click();

    const hud = page.locator('#hud');
    await expect(hud).toBeVisible({ timeout: 3000 });

    await expect(page.locator('#health-bar')).toBeVisible();
    await expect(page.locator('#xp-bar')).toBeVisible();
    await expect(page.locator('#level-display')).toBeVisible();
    await expect(page.locator('#timer-display')).toBeVisible();
    await expect(page.locator('#kill-counter')).toBeVisible();

    // Start screen should be gone once game starts
    await expect(page.locator('#start-screen')).toBeHidden();
  });

  test('kill counter increments above 0 within 30 seconds', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await expect(async () => {
      const text = await page.locator('#kill-counter').textContent();
      const kills = parseInt(text?.trim() ?? '0', 10);
      expect(kills).toBeGreaterThan(0);
    }).toPass({ timeout: 30000, intervals: [500] });
  });

  test('health bar decreases when player takes damage', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#health-bar')).toBeVisible({ timeout: 3000 });

    const initialHp = await page
      .locator('#health-bar')
      .getAttribute('aria-valuenow');
    const maxHp = parseInt(
      (await page.locator('#health-bar').getAttribute('aria-valuemax')) ?? '100',
      10
    );

    // Health starts at max
    expect(parseInt(initialHp ?? '100', 10)).toBe(maxHp);

    // Wait for health to drop
    await expect(async () => {
      const currentHp = parseInt(
        (await page.locator('#health-bar').getAttribute('aria-valuenow')) ?? '100',
        10
      );
      expect(currentHp).toBeLessThan(maxHp);
    }).toPass({ timeout: 30000, intervals: [500] });
  });

  test('game over screen displays Time, Level, and Kills stats', async ({ page }) => {
    // Give the game up to 2 minutes to reach game over naturally
    page.setDefaultTimeout(130000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    const gameOverScreen = page.locator('#game-over-screen');
    await expect(gameOverScreen).toBeVisible({ timeout: 120000 });

    await expect(page.locator('#game-over-time')).toBeVisible();
    await expect(page.locator('#game-over-level')).toBeVisible();
    await expect(page.locator('#game-over-kills')).toBeVisible();

    // Stats must contain non-empty numeric content
    const time = await page.locator('#game-over-time').textContent();
    const level = await page.locator('#game-over-level').textContent();
    const kills = await page.locator('#game-over-kills').textContent();

    expect(time?.trim()).toBeTruthy();
    expect(level?.trim()).toBeTruthy();
    expect(kills?.trim()).toBeTruthy();
  });

  test('clicking Play Again starts a fresh game at level 1 with 0 kills', async ({ page }) => {
    page.setDefaultTimeout(130000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('#game-over-screen')).toBeVisible({ timeout: 120000 });

    await page.locator('#game-over-screen').locator('button', { hasText: 'Play Again' }).click();

    // Fresh game state — HUD visible, no game-over screen
    await expect(page.locator('#game-over-screen')).toBeHidden({ timeout: 3000 });
    await expect(page.locator('#hud')).toBeVisible();

    // Level resets to 1
    const levelText = await page.locator('#level-display').textContent();
    expect(parseInt(levelText?.trim() ?? '0', 10)).toBe(1);

    // Kills reset to 0
    const killText = await page.locator('#kill-counter').textContent();
    expect(parseInt(killText?.trim() ?? '-1', 10)).toBe(0);

    // Health resets to max
    const hp = await page.locator('#health-bar').getAttribute('aria-valuenow');
    const maxHp = await page.locator('#health-bar').getAttribute('aria-valuemax');
    expect(parseInt(hp ?? '0', 10)).toBe(parseInt(maxHp ?? '100', 10));
  });
});
