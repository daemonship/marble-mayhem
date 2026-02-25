const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  
  const logs = [];
  page.on('console', msg => logs.push(msg.type() + ': ' + msg.text()));
  
  await page.goto('https://spudstorm.pages.dev');
  await page.waitForTimeout(2000);
  await page.locator('#start-run-btn').click();
  await page.waitForTimeout(1500);
  await page.mouse.move(600, 360);
  await page.waitForTimeout(300);
  
  // Deep investigation
  const result = await page.evaluate(() => {
    // 1. Check ALL scene instances (including inactive/sleeping)
    const allScenes = window.game?.scene?.scenes || [];
    const sceneInfo = allScenes.map(s => ({
      key: s.sys?.settings?.key,
      active: s.sys?.settings?.active,
      visible: s.sys?.settings?.visible,
      status: s.sys?.settings?.status,
      hasPlayer: Boolean(s.player),
      playerPos: s.player ? { x: Math.round(s.player.x), y: Math.round(s.player.y) } : null,
    }));
    
    // 2. Intercept player.x setter on the active game scene player
    const gameScene = window.game?.scene?.getScene('Game');
    const badPositions = [];
    if (gameScene && gameScene.player) {
      const player = gameScene.player;
      // Use a simple tracking approach - patch the physics world post-step
      const world = gameScene.physics?.world;
      if (world) {
        const origPostUpdate = world.postUpdate?.bind(world);
        if (origPostUpdate) {
          world.postUpdate = function() {
            const before = { x: player.x, y: player.y };
            origPostUpdate();
            const after = { x: player.x, y: player.y };
            if (Math.abs(after.x - before.x) > 10 || Math.abs(after.y - before.y) > 10) {
              badPositions.push({ before, after, source: 'postUpdate' });
            }
          };
        }
      }
    }
    
    // 3. Wait 500ms and sample results
    return new Promise(resolve => {
      setTimeout(() => {
        const gameScene = window.game?.scene?.getScene('Game');
        resolve({
          sceneInfo,
          badPositions: badPositions.slice(0, 5),
          currentPlayerPos: gameScene?.player ? { x: Math.round(gameScene.player.x), y: Math.round(gameScene.player.y) } : null,
          attractModeActive: window.attractModeActive,
          attractModeEnded: window.attractModeEnded,
        });
      }, 500);
    });
  });
  
  console.log('Scene info:', JSON.stringify(result.sceneInfo, null, 2));
  console.log('Bad positions from postUpdate:', JSON.stringify(result.badPositions, null, 2));
  console.log('Current player pos:', result.currentPlayerPos);
  console.log('attractModeActive:', result.attractModeActive);
  console.log('attractModeEnded:', result.attractModeEnded);
  console.log('Browser logs:');
  logs.slice(0, 20).forEach(l => console.log('  ', l));
  
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
