import { test } from '@playwright/test';

test('deep diagnose', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => { if (msg.type() !== 'warning') logs.push(msg.text()); });
  page.on('pageerror', e => logs.push('ERROR: ' + e.message));

  await page.goto('/');

  await page.locator('#start-run-btn').click();
  await page.waitForFunction(() => (window as any).gameState?.phase === 'playing', { timeout: 8000 });

  const bodyDimensions = await page.evaluate(() => {
    const g = (window as any).game;
    const s = g?.scene?.getScene('Game') as any;
    const body = s?.player?.body;
    const sprite = s?.player;

    // Try calling setCircle directly now and see if it changes width
    const beforeSetCircle = { width: body?.width, halfWidth: body?.halfWidth, radius: body?.radius };
    if (body) {
      body.setCircle(20, 0, 0);
    }
    const afterSetCircle = { width: body?.width, halfWidth: body?.halfWidth, radius: body?.radius };

    return {
      syncBounds: body?.syncBounds,
      beforeSetCircle,
      afterSetCircle,
      // Also check if the body has a custom setCircle method
      hasSetCircle: typeof body?.setCircle === 'function',
      // Check if there's a setSize method that overrides
      hasSetSize: typeof body?.setSize === 'function',
      // Read what scaleX is
      spriteScaleX: sprite?.scaleX,
    };
  });
  console.log('Body fix check:', JSON.stringify(bodyDimensions));

  // Check oscillation after the direct setCircle call
  await page.evaluate(() => {
    const g = (window as any).game;
    const s = g?.scene?.getScene('Game') as any;
    const body = s?.player?.body;
    // Force disable syncBounds
    if (body) body.syncBounds = false;
  });

  await page.waitForTimeout(100);

  const oscillationCheck = await page.evaluate(() => {
    const g = (window as any).game;
    const s = g?.scene?.getScene('Game') as any;
    const body = s?.player?.body;
    const frames: any[] = [];
    (window as any)._quick = frames;
    let i = 0;
    const cb = () => {
      i++;
      frames.push({ i, px: s?.player?.x?.toFixed?.(1), bw: body?.width, hw: body?.halfWidth, syncBounds: body?.syncBounds });
      if (i < 5) requestAnimationFrame(cb);
    };
    requestAnimationFrame(cb);
  });

  await page.waitForTimeout(200);
  const frames = await page.evaluate(() => (window as any)._quick);
  console.log('Frames with syncBounds forcibly disabled:', JSON.stringify(frames));

  console.log('--- console logs ---');
  logs.slice(0, 10).forEach(l => console.log(l));
});
