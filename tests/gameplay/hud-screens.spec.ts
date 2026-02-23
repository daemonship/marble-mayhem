/**
 * Task 4 Acceptance Criteria: HUD, screens, and feedback polish
 *
 * Tests DOM-overlay HUD accuracy, Start/GameOver screens, audio fallback,
 * and visual feedback (hit flash, death particles, SFX triggers).
 *
 * DOM contract:
 *   #start-screen          — visible before game starts
 *   #hud                   — visible during gameplay
 *   #health-bar            — role="progressbar", aria-valuenow, aria-valuemax
 *   #xp-bar                — role="progressbar", aria-valuenow, aria-valuemax
 *   #level-display         — text = level number
 *   #timer-display         — text = elapsed time
 *   #kill-counter          — text = kill count
 *   #game-over-screen      — visible on death
 *   #game-over-time        — final time
 *   #game-over-level       — final level
 *   #game-over-kills       — final kills
 *   button "Play Again"    — inside #game-over-screen
 *   .hit-flash             — applied to enemy element on hit (transient class)
 *   window.audioEnabled    — boolean; false if Web Audio unavailable
 */

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto(APP_URL);
  await page.locator('button', { hasText: 'Start Run' }).click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });
}

test.describe('Task 4 — HUD, screens, and feedback polish', () => {
  test('health bar is a valid ARIA progressbar with correct initial values', async ({ page }) => {
    await startGame(page);

    const healthBar = page.locator('#health-bar');
    await expect(healthBar).toBeVisible();
    await expect(healthBar).toHaveAttribute('role', 'progressbar');

    const valuenow = await healthBar.getAttribute('aria-valuenow');
    const valuemax = await healthBar.getAttribute('aria-valuemax');
    expect(valuenow).not.toBeNull();
    expect(valuemax).not.toBeNull();

    const hp = parseInt(valuenow!, 10);
    const maxHp = parseInt(valuemax!, 10);

    expect(hp).toBeGreaterThan(0);
    expect(hp).toBe(maxHp); // full health at start
  });

  test('XP bar is a valid ARIA progressbar starting at 0', async ({ page }) => {
    await startGame(page);

    const xpBar = page.locator('#xp-bar');
    await expect(xpBar).toBeVisible();
    await expect(xpBar).toHaveAttribute('role', 'progressbar');

    const valuenow = await xpBar.getAttribute('aria-valuenow');
    expect(parseInt(valuenow ?? '-1', 10)).toBe(0);
  });

  test('HUD level display shows 1 at game start', async ({ page }) => {
    await startGame(page);

    const levelText = await page.locator('#level-display').textContent();
    expect(parseInt(levelText?.replace(/\D/g, '') ?? '0', 10)).toBe(1);
  });

  test('HUD timer increments during gameplay', async ({ page }) => {
    await startGame(page);

    const t1 = await page.locator('#timer-display').textContent();
    await page.waitForTimeout(2000);
    const t2 = await page.locator('#timer-display').textContent();

    // Timer must have changed
    expect(t1?.trim()).not.toBe(t2?.trim());
  });

  test('HUD remains consistent during simulated lag spike', async ({ page }) => {
    await startGame(page);

    // Pause JS execution briefly to simulate a lag spike, then check HUD integrity
    await page.waitForTimeout(3000);

    // Run a blocking operation to simulate lag
    await page.evaluate(() => {
      const start = Date.now();
      while (Date.now() - start < 500) {
        // busy wait
      }
    });

    // HUD elements must still be visible and have valid values after lag
    await expect(page.locator('#health-bar')).toBeVisible();
    await expect(page.locator('#kill-counter')).toBeVisible();
    await expect(page.locator('#level-display')).toBeVisible();

    const hp = parseInt(
      (await page.locator('#health-bar').getAttribute('aria-valuenow')) ?? '-1',
      10
    );
    expect(hp).toBeGreaterThanOrEqual(0);
  });

  test('game over screen stats match rapid-death scenario', async ({ page }) => {
    page.setDefaultTimeout(130000);
    await page.goto(APP_URL);
    await page.locator('button', { hasText: 'Start Run' }).click();
    await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('#game-over-screen')).toBeVisible({ timeout: 120000 });

    // Stats must be coherent — level ≥ 1, kills ≥ 0, time > 0
    const levelText = await page.locator('#game-over-level').textContent();
    const killsText = await page.locator('#game-over-kills').textContent();
    const timeText = await page.locator('#game-over-time').textContent();

    expect(parseInt((levelText ?? '').replace(/\D/g, ''), 10)).toBeGreaterThanOrEqual(1);
    expect(parseInt((killsText ?? '').replace(/\D/g, ''), 10)).toBeGreaterThanOrEqual(0);

    const extractSec = (t: string) => {
      const m = t.match(/(\d+):(\d+)/);
      if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      return parseInt(t.replace(/\D/g, ''), 10);
    };
    expect(extractSec(timeText ?? '0')).toBeGreaterThan(0);
  });

  test('audio failure does not crash the game', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Block AudioContext to simulate unsupported/autoplay-blocked browser
    await page.addInitScript(() => {
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;
    });

    await startGame(page);
    await page.waitForTimeout(5000);

    // Game must still be running despite no audio
    await expect(page.locator('#hud')).toBeVisible();
    await expect(page.locator('#kill-counter')).toBeVisible();

    // No fatal JS errors
    const fatalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('AudioContext')
    );
    expect(fatalErrors).toHaveLength(0);

    // Game should flag audio as disabled
    const audioEnabled: boolean = await page.evaluate(
      () => (window as any).audioEnabled ?? false
    );
    expect(audioEnabled).toBe(false);
  });

  test('hit flash class is applied to enemies on projectile hit', async ({ page }) => {
    await startGame(page);

    // Wait for enemies to be present
    await expect(async () => {
      const count = await page.locator('.enemy').count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 15000, intervals: [500] });

    // Monitor for .hit-flash being applied (transient — check repeatedly over 10s)
    let flashDetected = false;
    for (let i = 0; i < 20 && !flashDetected; i++) {
      await page.waitForTimeout(500);
      const flashCount = await page.locator('.enemy.hit-flash').count();
      if (flashCount > 0) flashDetected = true;
    }

    expect(flashDetected).toBe(true);
  });

  test('death particles are emitted when an enemy is destroyed', async ({ page }) => {
    await startGame(page);

    // The kill counter incrementing means enemies are dying — check for particle elements
    await expect(async () => {
      const kills = parseInt(
        (await page.locator('#kill-counter').textContent()) ?? '0',
        10
      );
      expect(kills).toBeGreaterThan(0);
    }).toPass({ timeout: 30000, intervals: [500] });

    // Particle presence — either DOM particles or canvas-drawn (check window flag)
    const particlesEnabled: boolean = await page.evaluate(
      () => (window as any).gameState?.particlesEnabled ?? false
    );
    expect(particlesEnabled).toBe(true);
  });
});
