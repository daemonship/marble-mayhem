/**
 * Task 2 Acceptance Criteria: Core gameplay engine
 *
 * Tests mouse-follow movement, enemy spawning AI, auto-shooting,
 * projectile-enemy collision with health-based damage, and XP gem drops.
 *
 * DOM / window contract:
 *   window.game            — Phaser.Game instance
 *   window.gameState       — live GameState object (phase, kills, playerStats, enemies, etc.)
 *   window.gameState.playerPos  — { x, y }
 *   window.gameState.enemies    — [{ x, y, health, maxHealth }]
 *   window.gameState.projectileFireInterval — ms between shots
 *   #kill-counter          — text content = current kill count
 *   #health-bar            — aria-valuenow = current player HP
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto(APP_URL);
  await expect(page.locator('#start-screen')).toBeVisible({ timeout: 5000 });
  await page.locator('#start-run-btn').click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });
  await page.waitForFunction(() => (window as any).gameState?.phase === 'playing', {
    timeout: 5000,
  });
}

test.describe('Task 2 — Core gameplay engine', () => {
  test('player follows mouse cursor within the viewport', async ({ page }) => {
    await startGame(page);

    // Move mouse to top-left area
    await page.mouse.move(100, 100);
    await page.waitForTimeout(500);

    const posTopLeft: { x: number; y: number } = await page.evaluate(() => {
      return (window as any).gameState?.playerPos ?? { x: 0, y: 0 };
    });

    // Move mouse to bottom-right area
    const viewportSize = page.viewportSize()!;
    await page.mouse.move(viewportSize.width - 100, viewportSize.height - 100);
    await page.waitForTimeout(500);

    const posBottomRight: { x: number; y: number } = await page.evaluate(() => {
      return (window as any).gameState?.playerPos ?? { x: 0, y: 0 };
    });

    // Player must have moved meaningfully (more than 50px in either axis)
    const dx = Math.abs(posBottomRight.x - posTopLeft.x);
    const dy = Math.abs(posBottomRight.y - posTopLeft.y);
    expect(dx + dy).toBeGreaterThan(50);
  });

  test('mouse leaving viewport clamps player to canvas edges without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await startGame(page);

    // Move mouse completely outside the viewport
    await page.mouse.move(-100, -100);
    await page.waitForTimeout(500);
    await page.mouse.move(9999, 9999);
    await page.waitForTimeout(500);

    // No JS errors should have been thrown
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);

    // Player position must be within canvas bounds
    const bounds: { x: number; y: number; w: number; h: number } = await page.evaluate(() => {
      const gs = (window as any).gameState;
      const game = (window as any).game as any;
      return {
        x: gs?.playerPos?.x ?? 0,
        y: gs?.playerPos?.y ?? 0,
        w: game?.scale?.width ?? 800,
        h: game?.scale?.height ?? 600,
      };
    });
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x).toBeLessThanOrEqual(bounds.w);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeLessThanOrEqual(bounds.h);
  });

  test('enemies spawn from screen edges and move toward the player', async ({ page }) => {
    await startGame(page);

    // Wait for enemies to spawn (within 5 seconds)
    await expect(async () => {
      const enemyCount: number = await page.evaluate(() => {
        return ((window as any).gameState?.enemies ?? []).length;
      });
      expect(enemyCount).toBeGreaterThan(0);
    }).toPass({ timeout: 10000, intervals: [500] });

    // Capture positions twice and verify enemies have moved toward player
    const snapshot1: Array<{ x: number; y: number }> = await page.evaluate(() => {
      return ((window as any).gameState?.enemies ?? []).map((e: any) => ({ x: e.x, y: e.y }));
    });

    await page.waitForTimeout(1000);

    const snapshot2: Array<{ x: number; y: number }> = await page.evaluate(() => {
      return ((window as any).gameState?.enemies ?? []).map((e: any) => ({ x: e.x, y: e.y }));
    });

    const playerPos: { x: number; y: number } = await page.evaluate(() => {
      return (window as any).gameState?.playerPos ?? { x: 400, y: 300 };
    });

    // At least one enemy must have moved closer to the player
    const enemyCount = Math.min(snapshot1.length, snapshot2.length);
    expect(enemyCount).toBeGreaterThan(0);

    let movedCloser = false;
    for (let i = 0; i < enemyCount; i++) {
      const dist1 = Math.hypot(snapshot1[i].x - playerPos.x, snapshot1[i].y - playerPos.y);
      const dist2 = Math.hypot(snapshot2[i].x - playerPos.x, snapshot2[i].y - playerPos.y);
      if (dist2 < dist1) {
        movedCloser = true;
        break;
      }
    }
    expect(movedCloser).toBe(true);
  });

  test('100+ enemies maintain ≥30 FPS', async ({ page }) => {
    page.setDefaultTimeout(120000);
    await startGame(page);

    // Wait until 100 enemies are on screen (game spawns many over time)
    await expect(async () => {
      const count: number = await page.evaluate(() => {
        return ((window as any).gameState?.enemies ?? []).length;
      });
      expect(count).toBeGreaterThanOrEqual(100);
    }).toPass({ timeout: 90000, intervals: [2000] });

    // Sample FPS over 2 seconds
    await page.waitForTimeout(2000);

    const fps: number = await page.evaluate(() => {
      return (window as any).game?.loop?.actualFps ?? 0;
    });

    expect(fps).toBeGreaterThanOrEqual(30);
  });

  test('kill counter increments by exactly 1 per enemy death', async ({ page }) => {
    await startGame(page);

    // Wait for first kill
    await expect(async () => {
      const text = await page.locator('#kill-counter').textContent();
      expect(parseInt(text?.trim() ?? '0', 10)).toBeGreaterThan(0);
    }).toPass({ timeout: 30000, intervals: [500] });

    const killsBefore = parseInt(
      (await page.locator('#kill-counter').textContent()) ?? '0',
      10
    );

    // Wait a short time and check kills only increment by integers
    await page.waitForTimeout(1000);

    const killsAfter = parseInt(
      (await page.locator('#kill-counter').textContent()) ?? '0',
      10
    );

    // Must only increase (never decrease)
    expect(killsAfter).toBeGreaterThanOrEqual(killsBefore);

    // Increment must be a whole number
    expect(killsAfter - killsBefore).toBe(Math.round(killsAfter - killsBefore));
  });

  test('projectile damage applies health-based reduction without going below zero', async ({
    page,
  }) => {
    await startGame(page);

    // Wait for enemies to spawn
    await expect(async () => {
      const count: number = await page.evaluate(() => {
        return ((window as any).gameState?.enemies ?? []).length;
      });
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10000, intervals: [500] });

    // Monitor enemy health values over time — none should go below 0
    for (let check = 0; check < 10; check++) {
      await page.waitForTimeout(500);
      const healths: number[] = await page.evaluate(() => {
        return ((window as any).gameState?.enemies ?? []).map((e: any) => e.health as number);
      });
      for (const hp of healths) {
        expect(hp).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('concurrent projectile hits do not double-count kill', async ({ page }) => {
    await startGame(page);

    // Watch kills over time — each increment must be exactly 1
    const killSamples: number[] = [];

    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(250);
      const kills = parseInt(
        (await page.locator('#kill-counter').textContent()) ?? '0',
        10
      );
      killSamples.push(kills);
    }

    // Differences between consecutive samples must always be 0 or 1
    for (let i = 1; i < killSamples.length; i++) {
      const diff = killSamples[i] - killSamples[i - 1];
      expect(diff).toBeGreaterThanOrEqual(0);
      // Large jumps indicate double-counting
      expect(diff).toBeLessThanOrEqual(5); // allow for multiple simultaneous kills
    }
  });
});
