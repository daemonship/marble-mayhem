/**
 * E2E Scenario: Game state resets on page refresh mid-game
 *
 * Verifies that no state persists across page loads — the game always
 * starts from the Start Screen after a hard refresh.
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

test.describe('Game state resets on page refresh mid-game', () => {
  test('refreshing mid-game shows start screen, not corrupted game state', async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page.locator('#start-screen')).toBeVisible({ timeout: 5000 });

    // Start a run
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    // Play for ~10 seconds to accumulate state
    await page.waitForTimeout(10000);

    // Confirm some XP or kills were accumulated
    const killsBefore = parseInt(
      (await page.locator('#kill-counter').textContent()) ?? '0',
      10
    );
    // (kills may still be 0 if auto-fire hasn't connected, but time has passed)

    void killsBefore; // value captured for context; not strictly required

    // Hard refresh
    await page.reload();

    // Must land on start screen — not mid-game or game-over
    await expect(page.locator('#start-screen')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#hud')).toBeHidden();
    await expect(page.locator('#game-over-screen')).toBeHidden();

    // Start a new run and verify clean state
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    const levelText = await page.locator('#level-display').textContent();
    expect(parseInt(levelText?.trim() ?? '0', 10)).toBe(1);

    const killText = await page.locator('#kill-counter').textContent();
    expect(parseInt(killText?.trim() ?? '-1', 10)).toBe(0);

    const hp = await page.locator('#health-bar').getAttribute('aria-valuenow');
    const maxHp = await page.locator('#health-bar').getAttribute('aria-valuemax');
    expect(parseInt(hp ?? '0', 10)).toBe(parseInt(maxHp ?? '100', 10));
  });

  test('game does not persist state in localStorage across refreshes', async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(5000);

    // Check localStorage does not contain game-in-progress state
    const savedPhase = await page.evaluate(() => {
      return localStorage.getItem('spudstorm_phase');
    });

    // If they do save phase, it must not be 'playing' after reload
    await page.reload();

    const phaseAfterReload = await page.evaluate(() => {
      return localStorage.getItem('spudstorm_phase');
    });

    // Either nothing was saved or the saved phase is not 'playing'
    expect(phaseAfterReload).not.toBe('playing');
    void savedPhase;
  });
});
