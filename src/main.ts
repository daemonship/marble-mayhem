// Marble Mayhem — game entry point (~30 lines)
// A physics platformer where you guide a marble through obstacle courses

declare global {
  interface Window {
    game: Phaser.Game;
  }
}

import Phaser from 'phaser';
import { TitleScreen } from './scenes/TitleScreen';
import { LevelSelect } from './scenes/LevelSelect';
import { MarblePlatform } from './scenes/MarblePlatform';
import { LevelComplete } from './scenes/LevelComplete';

// Initialize Phaser game
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#0a0a1a',
  parent: document.getElementById('game-container') ?? undefined,
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
  scene: [TitleScreen, LevelSelect, MarblePlatform, LevelComplete],
};

const game = new Phaser.Game(config);
window.game = game;

export {};
