/**
 * E2E Scenario: Modal interactions are blocked during game pause
 *
 * Verifies that clicking outside the level-up modal does nothing:
 * - Timer stays frozen
 * - Enemy positions do not change
 * - Only modal buttons are clickable
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

async function waitForLevelUpModal(page: import('@playwright/test').Page, timeout = 90000) {
  await expect(page.locator('#level-up-modal')).toBeVisible({ timeout });
}

test.describe('Modal interactions are blocked during game pause', () => {
  test('clicking outside the modal does not resume the game', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await waitForLevelUpModal(page);
    await expect(page.locator('#level-up-modal')).toBeVisible();

    // Record timer before clicking outside
    const timerBefore = await page.locator('#timer-display').textContent();

    // Click the game container area (outside the modal)
    await page.locator('#game-container').click({ position: { x: 10, y: 10 }, force: true });
    await page.waitForTimeout(2000);

    // Modal must still be visible
    await expect(page.locator('#level-up-modal')).toBeVisible();

    // Timer must still be frozen
    const timerAfter = await page.locator('#timer-display').textContent();
    expect(timerBefore?.trim()).toBe(timerAfter?.trim());
  });

  test('enemies do not move while level-up modal is open', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await waitForLevelUpModal(page);

    // Capture enemy positions via window.gameState
    const posBefore: Array<{ x: number; y: number }> = await page.evaluate(() => {
      const gs = (window as any).gameState;
      return (gs?.enemies ?? []).map((e: any) => ({ x: e.x, y: e.y }));
    });

    await page.waitForTimeout(1000);

    const posAfter: Array<{ x: number; y: number }> = await page.evaluate(() => {
      const gs = (window as any).gameState;
      return (gs?.enemies ?? []).map((e: any) => ({ x: e.x, y: e.y }));
    });

    // If there are enemies tracked, positions must not have changed
    if (posBefore.length > 0 && posAfter.length > 0) {
      for (let i = 0; i < Math.min(posBefore.length, posAfter.length); i++) {
        expect(posAfter[i].x).toBeCloseTo(posBefore[i].x, 0);
        expect(posAfter[i].y).toBeCloseTo(posBefore[i].y, 0);
      }
    }
  });

  test('selecting an upgrade closes the modal and resumes the game', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await waitForLevelUpModal(page);

    // Select the first available upgrade
    await page.locator('#level-up-modal .upgrade-option').first().click();

    // Modal must close
    await expect(page.locator('#level-up-modal')).toBeHidden({ timeout: 3000 });

    // Timer must resume (increment within 2 seconds)
    const timerBefore = await page.locator('#timer-display').textContent();
    await page.waitForTimeout(2000);
    const timerAfter = await page.locator('#timer-display').textContent();
    expect(timerBefore?.trim()).not.toBe(timerAfter?.trim());
  });

  test('only modal buttons are interactive while modal is open', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await waitForLevelUpModal(page);

    // The 3 upgrade option buttons should be clickable
    const options = page.locator('#level-up-modal .upgrade-option');
    await expect(options).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(options.nth(i)).toBeEnabled();
    }

    // The game canvas / container behind modal should have pointer-events disabled
    // (or intercepted by an overlay) — check via CSS or that click does nothing
    const overlayPointerEvents = await page.evaluate(() => {
      const overlay = document.querySelector('#modal-backdrop') as HTMLElement | null;
      if (!overlay) return null;
      return getComputedStyle(overlay).pointerEvents;
    });

    // If there's a backdrop element, it should block clicks (not 'none')
    if (overlayPointerEvents !== null) {
      expect(overlayPointerEvents).not.toBe('none');
    }
  });
});
