import Phaser from 'phaser';

// Preload scene — load all assets before game starts
export class Preload extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    // Generate a 1x1 white pixel texture for placeholder sprites
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture('pixel', 1, 1);
    graphics.destroy();
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
