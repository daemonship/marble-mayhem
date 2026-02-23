import Phaser from 'phaser';

// Game scene — main gameplay loop
// TODO (Task 2): Implement player, enemies, projectiles, XP gems
// TODO (Task 3): Implement XP collection, level-up, upgrades
// TODO (Task 4): Wire HUD updates, audio
export class Game extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    // TODO: initialize player, systems, HUD
  }

  update(_time: number, _delta: number): void {
    // TODO: game loop — move player, update enemies, check collisions
  }
}
