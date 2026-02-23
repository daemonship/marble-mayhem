import Phaser from 'phaser';

// Preload scene — load all assets before game starts
// TODO (Task 2): Load sprites, audio, tilemaps
export class Preload extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    // TODO: load game assets
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
