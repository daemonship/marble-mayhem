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
    <div style="text-align: center;">
      <h1>Spud Storm</h1>
      <p>Survive as long as you can!</p>
      <button id="start-run-btn" style="font-size: 1.5rem; padding: 0.5em 1em; cursor: pointer;">Start Run</button>
    </div>
  `;
  document.body.appendChild(startScreen);

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
  document.body.appendChild(muteButton);

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
  document.body.appendChild(hud);

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
  document.body.appendChild(gameOverScreen);

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

      // Start the game scene
      const gameScene = window.game.scene.getScene('Game');
      console.log('Current game scene:', gameScene);
      if (gameScene) {
        window.game.scene.stop('Game');
      }

      // Use a small delay to ensure scene transition works properly
      setTimeout(() => {
        console.log('Starting Game scene...');
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

      // Reset game state
      resetGameState();

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
  parent: document.getElementById('app') ?? undefined,
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
