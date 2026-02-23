import Phaser from 'phaser';

// Boot scene — minimal setup before preload
export class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    // Set scale mode
    this.scale.setGameSize(800, 600);
    this.scale.refresh();
    // Proceed to Preload
    this.scene.start('Preload');
  }
}
