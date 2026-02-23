import Phaser from 'phaser';

// Boot scene — minimal setup before preload
// TODO (Task 2): Configure game settings, set background color
export class Boot extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    // Proceed to Preload
    this.scene.start('Preload');
  }
}
