import { test, expect } from '@playwright/test';

test('player follows mouse', async ({ page }) => {
  await page.goto('/');
  await page.locator('#start-run-btn').click();
  await page.waitForFunction(() => (window as any).gameState?.phase === 'playing', { timeout: 8000 });

  // Let the game settle for a moment
  await page.waitForTimeout(500);

  // Get initial player position
  const before = await page.evaluate(() => {
    const s = (window as any).gameScene;
    const canvas = (window as any).game?.canvas;
    const rect = canvas?.getBoundingClientRect();
    return {
      playerX: s?.player?.x,
      playerY: s?.player?.y,
      mouseX: s?.mouseX,
      mouseY: s?.mouseY,
      canvasRect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
    };
  });
  console.log('Before mouse move:', JSON.stringify(before));

  // Move the mouse to the right side of the viewport
  const viewport = page.viewportSize()!;
  const targetX = Math.floor(viewport.width * 0.8);
  const targetY = Math.floor(viewport.height * 0.5);
  await page.mouse.move(targetX, targetY);
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    const s = (window as any).gameScene;
    return {
      playerX: s?.player?.x,
      playerY: s?.player?.y,
      mouseX: s?.mouseX,
      mouseY: s?.mouseY,
    };
  });
  console.log('After mouse move:', JSON.stringify(after));
  console.log(`Mouse moved to viewport (${targetX}, ${targetY})`);

  // Player should have moved toward the mouse target (playerX should increase)
  expect(after.playerX).toBeGreaterThan(before.playerX ?? 0);
});
