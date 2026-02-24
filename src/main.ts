// Spud Storm — game entry point
// Full implementation in Tasks 2–4

// Expose game instance on window for Playwright test access
declare global {
  interface Window {
    game: Phaser.Game;
    gameState: GameState;
    audioEnabled: boolean;
    audioContext: AudioContext | null;
    userMuted: boolean;
    attractModeActive: boolean;
    attractModeEnded: boolean;
    resetIdleTimer: () => void;
  }
}

import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import type { GameState, PlayerStats } from './types.ts';

// Audio system — placeholder SFX synthesized via Web Audio
class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.enabled = true;
      }
    } catch (e) {
      // Web Audio not supported — silently fail
      this.enabled = false;
    }
    window.audioEnabled = this.enabled;
    window.audioContext = this.ctx;
  }

  // Resume audio context (needed for autoplay policy)
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignore resume failures
      });
    }
  }

  // Play shoot sound — short high-pitched blip
  playShoot(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      // Ignore playback errors
    }
  }

  // Play hit sound — medium thud
  playHit(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      // Ignore playback errors
    }
  }

  // Play level-up sound — ascending chime
  playLevelUp(): void {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {
      // Ignore playback errors
    }
  }
}

// Global audio system instance
const audioSystem = new AudioSystem();
export { audioSystem };

// Global game state accessible to tests and UI
const gameState: GameState = {
  phase: 'start',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  kills: 0,
  elapsedSeconds: 0,
  playerStats: {
    health: 100,
    maxHealth: 100,
    damage: 10,
    moveSpeed: 200,
    attackSpeed: 1.0,
    projectileCount: 1,
    magnetRange: 80,
    xpGain: 1.0,
    healthRegen: 0,
  },
  // Additional runtime state
  playerPos: { x: 400, y: 300 },
  enemies: [],
  projectiles: [],
  lastFireTime: 0,
  projectileFireInterval: 1000, // ms between shots (1000 = 1 per second)
  particlesEnabled: true,
};

// Reset game state to initial values
export function resetGameState(): void {
  gameState.phase = 'start';
  gameState.level = 1;
  gameState.xp = 0;
  gameState.xpToNextLevel = 50;
  gameState.kills = 0;
  gameState.elapsedSeconds = 0;
  gameState.playerStats = {
    health: 100,
    maxHealth: 100,
    damage: 10,
    moveSpeed: 200,
    attackSpeed: 1.0,
    projectileCount: 1,
    magnetRange: 80,
    xpGain: 1.0,
    healthRegen: 0,
  };
  gameState.playerPos = { x: 400, y: 300 };
  gameState.enemies = [];
  gameState.projectiles = [];
  gameState.lastFireTime = 0;
  gameState.projectileFireInterval = 1000;
  gameState.particlesEnabled = true;
}

// Create DOM overlay elements
function createDOMOverlay(): void {
  const container = document.getElementById('game-container') ?? document.body;
  // Start screen
  const startScreen = document.createElement('div');
  startScreen.id = 'start-screen';
  startScreen.style.position = 'absolute';
  startScreen.style.top = '0';
  startScreen.style.left = '0';
  startScreen.style.width = '100%';
  startScreen.style.height = '100%';
  startScreen.style.display = 'flex';
  startScreen.style.alignItems = 'center';
  startScreen.style.justifyContent = 'center';
  startScreen.style.backgroundColor = 'rgba(0,0,0,0.8)';
  startScreen.style.color = 'white';
  startScreen.style.fontFamily = 'sans-serif';
  startScreen.style.zIndex = '100';
  startScreen.innerHTML = `
    <div style="max-width: 520px; width: 90%; text-align: center;">
      <h1 style="font-size: 3.2rem; color: #fbbf24; text-shadow: 0 0 30px #f59e0b, 0 0 60px rgba(245,158,11,0.4); margin: 0 0 0.15em; letter-spacing: 0.06em;">🥔 SPUD STORM</h1>
      <p style="font-size: 1rem; color: #9ca3af; margin-bottom: 1.8em; font-style: italic;">A never-ending wave survival game</p>

      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 1.4em 1.8em; margin-bottom: 1.8em; text-align: left;">
        <h3 style="color: #a78bfa; margin: 0 0 0.9em; text-align: center; font-size: 0.85rem; letter-spacing: 0.15em; text-transform: uppercase;">How to Play</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.65em; color: #d1d5db; font-size: 0.95rem;">
          <li>🖱️ <strong>Move your mouse</strong> — your potato follows the cursor</li>
          <li>💥 <strong>Auto-attack</strong> — fires automatically at the nearest enemy</li>
          <li>💚 <strong>Collect green gems</strong> dropped by defeated enemies to gain XP</li>
          <li>⬆️ <strong>Level up</strong> — choose a powerful upgrade each level</li>
          <li>❤️ <strong>Don't let enemies touch you</strong> — each hit drains health</li>
        </ul>
      </div>

      <button id="start-run-btn" style="font-size: 1.3rem; padding: 0.65em 2.5em; cursor: pointer; background: #7c3aed; color: white; border: 2px solid #a78bfa; border-radius: 8px; letter-spacing: 0.05em;">▶ START GAME</button>

      <p style="color: #6b7280; font-size: 0.8rem; margin-top: 1.2em;">Tip: Keep moving — standing still is fatal!</p>
    </div>
  `;
  container.appendChild(startScreen);

  // Mute button (top-right corner, always visible during gameplay)
  const muteButton = document.createElement('button');
  muteButton.id = 'mute-button';
  muteButton.textContent = '🔊';
  muteButton.style.position = 'absolute';
  muteButton.style.top = '10px';
  muteButton.style.right = '10px';
  muteButton.style.fontSize = '1.5rem';
  muteButton.style.padding = '5px 10px';
  muteButton.style.cursor = 'pointer';
  muteButton.style.backgroundColor = 'rgba(0,0,0,0.5)';
  muteButton.style.border = '2px solid rgba(255,255,255,0.3)';
  muteButton.style.borderRadius = '5px';
  muteButton.style.zIndex = '150';
  muteButton.style.display = 'none'; // Hidden until game starts
  muteButton.setAttribute('aria-label', 'Toggle sound');
  container.appendChild(muteButton);

  // Wire up mute button
  muteButton.addEventListener('click', () => {
    const currentState = window.game?.sound?.mute ?? false;
    const newState = !currentState;
    if (window.game && window.game.sound) {
      window.game.sound.mute = newState;
    }
    window.userMuted = newState;
    muteButton.textContent = newState ? '🔇' : '🔊';
  });

  // Expose mute button update function
  (window as any).updateMuteButton = (muted: boolean) => {
    muteButton.textContent = muted ? '🔇' : '🔊';
  };

  // HUD
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.position = 'absolute';
  hud.style.top = '10px';
  hud.style.left = '10px';
  hud.style.color = 'white';
  hud.style.fontFamily = 'monospace';
  hud.style.fontSize = '16px';
  hud.style.pointerEvents = 'none';
  hud.style.display = 'none'; // hidden until game starts
  hud.style.zIndex = '50';
  hud.innerHTML = `
    <div>Health: <progress id="health-bar" value="100" max="100" role="progressbar" aria-valuenow="100" aria-valuemax="100" aria-valuemin="0" aria-label="Health"></progress> <span id="health-text">100/100</span></div>
    <div>XP: <progress id="xp-bar" value="0" max="100" role="progressbar" aria-valuenow="0" aria-valuemax="100" aria-valuemin="0" aria-label="XP"></progress> <span id="xp-text">0/100</span></div>
    <div>Level: <span id="level-display">1</span></div>
    <div>Time: <span id="timer-display">0</span>s</div>
    <div>Kills: <span id="kill-counter">0</span></div>
  `;
  container.appendChild(hud);

  // Game over screen (hidden initially)
  const gameOverScreen = document.createElement('div');
  gameOverScreen.id = 'game-over-screen';
  gameOverScreen.style.position = 'absolute';
  gameOverScreen.style.top = '0';
  gameOverScreen.style.left = '0';
  gameOverScreen.style.width = '100%';
  gameOverScreen.style.height = '100%';
  gameOverScreen.style.display = 'none';
  gameOverScreen.style.alignItems = 'center';
  gameOverScreen.style.justifyContent = 'center';
  gameOverScreen.style.backgroundColor = 'rgba(0,0,0,0.9)';
  gameOverScreen.style.color = 'white';
  gameOverScreen.style.fontFamily = 'sans-serif';
  gameOverScreen.style.zIndex = '200';
  gameOverScreen.innerHTML = `
    <div style="text-align: center;">
      <h1>Game Over</h1>
      <p>Time: <span id="game-over-time">0</span>s</p>
      <p>Level: <span id="game-over-level">1</span></p>
      <p>Kills: <span id="game-over-kills">0</span></p>
      <button id="play-again-btn" style="font-size: 1.5rem; padding: 0.5em 1em; cursor: pointer;">Play Again</button>
    </div>
  `;
  container.appendChild(gameOverScreen);

  // Wire up button events
  const startBtn = document.getElementById('start-run-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log('Start button clicked');
      audioSystem.resume();
      startScreen.style.display = 'none';
      hud.style.display = 'block';
      muteButton.style.display = 'block'; // Show mute button during gameplay

      // Reset game state for fresh run (this sets phase to 'start')
      resetGameState();

      // Stop Game only if it's actually running (e.g. attract mode was active)
      if (window.game.scene.isActive('Game')) {
        window.game.scene.stop('Game');
      }

      // Clear attract mode flags after stopping the old scene so the still-ticking
      // update loop can't overwrite them before the new scene starts
      setTimeout(() => {
        window.attractModeActive = false;
        window.attractModeEnded = false;
        console.log('Starting Game scene...');
        window.game.scene.stop('MainMenu');
        window.game.scene.start('Game');
      }, 50);
    });
  }

  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      gameOverScreen.style.display = 'none';
      startScreen.style.display = 'flex';
      muteButton.style.display = 'none'; // Hide mute button on start screen

      // Reset game state and clear attract mode flags
      resetGameState();
      window.attractModeActive = false;
      window.attractModeEnded = false;

      // Stop game scene
      if (window.game.scene.getScene('Game')) {
        window.game.scene.stop('Game');
      }

      // Return to main menu
      window.game.scene.start('MainMenu');
    });
  }
}

// Update DOM elements based on gameState
function updateHUD(): void {
  const healthBar = document.getElementById('health-bar') as HTMLProgressElement;
  const healthText = document.getElementById('health-text');
  const xpBar = document.getElementById('xp-bar') as HTMLProgressElement;
  const xpText = document.getElementById('xp-text');
  const levelDisplay = document.getElementById('level-display');
  const timerDisplay = document.getElementById('timer-display');
  const killCounter = document.getElementById('kill-counter');

  if (healthBar && healthText) {
    const hp = Math.max(0, gameState.playerStats.health);
    const max = gameState.playerStats.maxHealth;
    healthBar.value = hp;
    healthBar.max = max;
    healthBar.setAttribute('aria-valuenow', hp.toString());
    healthBar.setAttribute('aria-valuemax', max.toString());
    healthText.textContent = `${hp}/${max}`;
  }
  if (xpBar && xpText) {
    const xp = gameState.xp;
    const toNext = gameState.xpToNextLevel;
    xpBar.value = xp;
    xpBar.max = toNext;
    xpBar.setAttribute('aria-valuenow', xp.toString());
    xpBar.setAttribute('aria-valuemax', toNext.toString());
    xpText.textContent = `${xp}/${toNext}`;
  }
  if (levelDisplay) levelDisplay.textContent = gameState.level.toString();
  if (timerDisplay) timerDisplay.textContent = Math.floor(gameState.elapsedSeconds).toString();
  if (killCounter) killCounter.textContent = gameState.kills.toString();
}

// Periodic HUD update
setInterval(updateHUD, 100);

// Initialize Phaser game
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#222222',
  parent: document.getElementById('game-container') ?? undefined,
  // Keep game loop running even in headless / background tabs
  disableVisibilityChange: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Boot, Preload, MainMenu, Game, GameOver],
};

const game = new Phaser.Game(config);
window.game = game;
window.gameState = gameState;

// Create DOM overlay after game is created
createDOMOverlay();

export {};
