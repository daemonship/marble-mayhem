// Spud Storm — game entry point
// Full implementation in Tasks 2–4

// Expose game instance on window for Playwright test access
declare global {
  interface Window {
    game: unknown;
    gameState: unknown;
  }
}

// TODO (Task 2): Initialize Phaser game with Boot → Preload → MainMenu → Game → GameOver scenes
// TODO (Task 4): Mount DOM overlay (HUD, start screen, game over screen, level-up modal)

export {};
