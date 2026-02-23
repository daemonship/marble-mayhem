import Phaser from 'phaser';

// GameOver scene — displays final stats and Play Again button
export class GameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(): void {
    const gameState = (window as any).gameState;

    // Update DOM game-over screen stats with final values
    const timeEl = document.getElementById('game-over-time');
    const levelEl = document.getElementById('game-over-level');
    const killsEl = document.getElementById('game-over-kills');

    // Ensure we display the final stats from gameState
    if (timeEl) timeEl.textContent = Math.floor(gameState.elapsedSeconds).toString();
    if (levelEl) levelEl.textContent = gameState.level.toString();
    if (killsEl) killsEl.textContent = gameState.kills.toString();

    // Show the DOM overlay
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
      gameOverScreen.style.display = 'flex';
    }

    // Hide the HUD
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.display = 'none';
    }

    // Show mute button on game over screen
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
      muteButton.style.display = 'block';
    }
  }
}
