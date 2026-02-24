import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '/';

test('debug game state', async ({ page }) => {
  await page.goto(APP_URL);
  
  // Wait for start screen
  await expect(page.locator('#start-screen')).toBeVisible({ timeout: 5000 });
  
  // Click start
  await page.locator('#start-run-btn').click();
  
  // Wait a bit for scene to start
  await page.waitForTimeout(1000);
  
  // Wait for HUD
  await expect(page.locator('#hud')).toBeVisible({ timeout: 3000 });
  
  // Capture console logs
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));
  
  // Check initial game state
  const initialState = await page.evaluate(() => {
    return {
      phase: (window as any).gameState?.phase,
      kills: (window as any).gameState?.kills,
      elapsedSeconds: (window as any).gameState?.elapsedSeconds,
      enemies: (window as any).gameState?.enemies?.length,
      playerStats: (window as any).gameState?.playerStats,
      gameScene: !!(window as any).gameScene,
    };
  });
  
  console.log('Initial state:', initialState);
  
  // Wait 10 seconds
  await page.waitForTimeout(10000);
  
  // Print captured logs
  console.log('Console logs:', logs);
  
  // Check game state after 10 seconds
  const afterState = await page.evaluate(() => {
    return {
      phase: (window as any).gameState?.phase,
      kills: (window as any).gameState?.kills,
      elapsedSeconds: (window as any).gameState?.elapsedSeconds,
      enemies: (window as any).gameState?.enemies?.length,
      playerStats: (window as any).gameState?.playerStats,
    };
  });
  
  console.log('After 10s state:', afterState);
  
  // The timer should have incremented
  expect(afterState.elapsedSeconds).toBeGreaterThan(0);
});
