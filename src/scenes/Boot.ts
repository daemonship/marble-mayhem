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

    // Generate all game textures here (before any gameplay) to avoid
    // GPU readback stalls during active rendering (WebGL performance warning)
    this.createGameTextures();

    // Proceed to Preload
    this.scene.start('Preload');
  }

  private createGameTextures(): void {
    // Create properly-sized textures so sprite.scaleX=1 and physics body
    // dimensions match the logical radius (avoids Phaser 3.90 bug where
    // body.halfWidth = radius * sprite.scaleX when using 1×1 'pixel' texture).
    const make = (key: string, size: number, color: number, radius: number) => {
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        g.fillStyle(color);
        g.fillCircle(radius, radius, radius);
        g.generateTexture(key, size, size);
        g.destroy();
      }
    };
    make('playerTex', 40, 0xffff00, 20);   // 40×40 yellow circle
    make('enemyTex', 30, 0xff0000, 15);    // 30×30 red grunt
    make('speederTex', 16, 0xff8800, 8);   // 16×16 orange speeder
    make('tankTex', 50, 0x8b0000, 25);     // 50×50 dark-red tank
    make('projTex', 10, 0x00aaff, 5);      // 10×10 blue circle
    make('gemTex', 20, 0x00ff00, 10);      // 20×20 green circle
    make('particle', 8, 0xffffff, 4);      // 8×8 white circle (death particles)
    // Pickup textures
    make('pickupHeal',   26, 0x00ff66, 13);
    make('pickupShield', 26, 0x00eeff, 13);
    make('pickupBomb',   26, 0xff6600, 13);
    make('pickupSpeed',  26, 0x4488ff, 13);
  }
}
