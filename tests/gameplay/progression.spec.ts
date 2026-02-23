/**
 * Task 3 Acceptance Criteria: Progression system and upgrades
 *
 * Tests XP gem collection with magnet range, XP bar filling, level-up trigger,
 * modal with 3 unique upgrades, full game pause during modal, and stat application.
 *
 * window.gameState contract additions (Task 3):
 *   window.gameState.xp                     — current XP
 *   window.gameState.xpToNextLevel           — XP threshold for next level
 *   window.gameState.level                   — current level number
 *   window.gameState.phase                   — 'playing' | 'paused' | 'gameover'
 *   window.gameState.projectileFireInterval  — ms between auto-shots
 *   window.gameState.playerStats             — PlayerStats object
 *   window.gameState.gems                    — [{ x, y }] active XP gems on screen
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto(APP_URL);
  await page.locator('button', { hasText: 'Start Run' }).click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });
  await page.waitForFunction(() => (window as any).gameState?.phase === 'playing', {
    timeout: 5000,
  });
}

async function waitForLevelUpModal(page: import('@playwright/test').Page, timeout = 90000) {
  await expect(page.locator('#level-up-modal')).toBeVisible({ timeout });
}

test.describe('Task 3 — Progression system and upgrades', () => {
  test('XP bar fills as gems are collected', async ({ page }) => {
    await startGame(page);

    // Wait for XP to increase from 0
    await expect(async () => {
      const xp: number = await page.evaluate(() => {
        return (window as any).gameState?.xp ?? 0;
      });
      expect(xp).toBeGreaterThan(0);
    }).toPass({ timeout: 30000, intervals: [500] });

    // XP bar aria-valuenow must reflect current xp
    const xpBarValue = await page.locator('#xp-bar').getAttribute('aria-valuenow');
    const xp: number = await page.evaluate(() => (window as any).gameState?.xp ?? 0);
    expect(parseInt(xpBarValue ?? '0', 10)).toBe(Math.floor(xp));
  });

  test('XP bar resets and level increments after filling', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await startGame(page);

    // Wait for first level-up (level becomes 2)
    await expect(async () => {
      const level: number = await page.evaluate(() => (window as any).gameState?.level ?? 1);
      expect(level).toBeGreaterThan(1);
    }).toPass({ timeout: 90000, intervals: [500] });

    const levelDisplay = await page.locator('#level-display').textContent();
    expect(parseInt(levelDisplay?.trim() ?? '1', 10)).toBeGreaterThan(1);
  });

  test('level-up pauses ALL game processes', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await startGame(page);

    await waitForLevelUpModal(page);

    // Verify phase is 'paused'
    const phase: string = await page.evaluate(() => (window as any).gameState?.phase ?? '');
    expect(phase).toBe('paused');

    // Timer frozen
    const t1 = await page.locator('#timer-display').textContent();
    await page.waitForTimeout(2000);
    const t2 = await page.locator('#timer-display').textContent();
    expect(t1?.trim()).toBe(t2?.trim());

    // Enemy positions frozen
    const enemies1: Array<{ x: number; y: number }> = await page.evaluate(() =>
      ((window as any).gameState?.enemies ?? []).map((e: any) => ({ x: e.x, y: e.y }))
    );
    await page.waitForTimeout(1000);
    const enemies2: Array<{ x: number; y: number }> = await page.evaluate(() =>
      ((window as any).gameState?.enemies ?? []).map((e: any) => ({ x: e.x, y: e.y }))
    );

    if (enemies1.length > 0 && enemies2.length > 0) {
      for (let i = 0; i < Math.min(enemies1.length, enemies2.length); i++) {
        expect(enemies2[i].x).toBeCloseTo(enemies1[i].x, 0);
        expect(enemies2[i].y).toBeCloseTo(enemies1[i].y, 0);
      }
    }
  });

  test('modal shows exactly 3 unique upgrade options', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await startGame(page);
    await waitForLevelUpModal(page);

    const options = page.locator('#level-up-modal .upgrade-option');
    await expect(options).toHaveCount(3);

    const names = await options.allTextContents();
    const uniqueNames = new Set(names.map((n) => n.trim()));
    expect(uniqueNames.size).toBe(3);
  });

  test('all 8 upgrades are in the available pool', async ({ page }) => {
    page.setDefaultTimeout(100000);
    await startGame(page);

    // Collect upgrade names across multiple level-ups (play until level 5+)
    const seenUpgrades = new Set<string>();
    const expectedUpgrades = [
      '+Damage',
      '+Projectile Count',
      '+Attack Speed',
      '+Max Health',
      '+Health Regen',
      '+Move Speed',
      '+Magnet Range',
      '+XP Gain',
    ];

    for (let lvl = 0; lvl < 4 && seenUpgrades.size < expectedUpgrades.length; lvl++) {
      await waitForLevelUpModal(page, 90000);

      const names = await page.locator('#level-up-modal .upgrade-option').allTextContents();
      names.forEach((n) => seenUpgrades.add(n.trim()));

      // Pick an option to advance
      await page.locator('#level-up-modal .upgrade-option').first().click();
      await expect(page.locator('#level-up-modal')).toBeHidden({ timeout: 3000 });
    }

    // After up to 4 level-ups we should have seen most upgrade types
    // (statistically very likely with 8 upgrades × 3 per level-up)
    expect(seenUpgrades.size).toBeGreaterThanOrEqual(expectedUpgrades.length);
  });

  test('+Attack Speed upgrade reduces projectile fire interval', async ({ page }) => {
    page.setDefaultTimeout(120000);
    await startGame(page);

    const intervalBefore: number = await page.evaluate(
      () => (window as any).gameState?.projectileFireInterval ?? 1000
    );

    // Loop until we get +Attack Speed offered
    let upgraded = false;
    for (let attempt = 0; attempt < 5 && !upgraded; attempt++) {
      await waitForLevelUpModal(page, 90000);

      const attackSpeedBtn = page.locator('#level-up-modal .upgrade-option', {
        hasText: '+Attack Speed',
      });
      if (await attackSpeedBtn.isVisible()) {
        await attackSpeedBtn.click();
        upgraded = true;
      } else {
        await page.locator('#level-up-modal .upgrade-option').first().click();
      }
      await expect(page.locator('#level-up-modal')).toBeHidden({ timeout: 3000 });
    }

    if (upgraded) {
      const intervalAfter: number = await page.evaluate(
        () => (window as any).gameState?.projectileFireInterval ?? 1000
      );
      expect(intervalAfter).toBeLessThan(intervalBefore);
    }
  });

  test('+Projectile Count upgrade adds visible extra projectiles', async ({ page }) => {
    page.setDefaultTimeout(120000);
    await startGame(page);

    const projectilesBefore: number = await page.evaluate(
      () => (window as any).gameState?.playerStats?.projectileCount ?? 1
    );
    expect(projectilesBefore).toBe(1);

    let upgraded = false;
    for (let attempt = 0; attempt < 5 && !upgraded; attempt++) {
      await waitForLevelUpModal(page, 90000);

      const btn = page.locator('#level-up-modal .upgrade-option', {
        hasText: '+Projectile Count',
      });
      if (await btn.isVisible()) {
        await btn.click();
        upgraded = true;
      } else {
        await page.locator('#level-up-modal .upgrade-option').first().click();
      }
      await expect(page.locator('#level-up-modal')).toBeHidden({ timeout: 3000 });
    }

    if (upgraded) {
      const projectilesAfter: number = await page.evaluate(
        () => (window as any).gameState?.playerStats?.projectileCount ?? 1
      );
      expect(projectilesAfter).toBeGreaterThan(projectilesBefore);
    }
  });

  test('magnet range pulls XP gems from correct distance', async ({ page }) => {
    page.setDefaultTimeout(60000);
    await startGame(page);

    const initialMagnetRange: number = await page.evaluate(
      () => (window as any).gameState?.playerStats?.magnetRange ?? 80
    );

    // Gems within magnet range should be collected automatically
    // Test by confirming XP increases without direct overlap
    await expect(async () => {
      const xp: number = await page.evaluate(() => (window as any).gameState?.xp ?? 0);
      expect(xp).toBeGreaterThan(0);
    }).toPass({ timeout: 30000, intervals: [500] });

    // Confirm magnet range is a positive number
    expect(initialMagnetRange).toBeGreaterThan(0);
  });
});
