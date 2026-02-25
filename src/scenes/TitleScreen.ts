import Phaser from 'phaser';

// TitleScreen scene — animated marble rolling through logo, start button
export class TitleScreen extends Phaser.Scene {
  private marble!: Phaser.GameObjects.Image;
  private marbleVelocity = 200;
  private titleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private backgroundStars: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'TitleScreen' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Create animated background
    this.createBackground();

    // Create title text with marble animation
    this.titleText = this.add.text(width / 2, height / 3, 'MARBLE MAYHEM', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#fbbf24',
      stroke: '#1e3a8a',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, blur: 10, color: '#000' }
    }).setOrigin(0.5).setDepth(10);

    // Subtitle
    this.add.text(width / 2, height / 3 + 60, 'A Physics Platformer', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#94a3b8',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // Create marble that rolls through the title
    this.createMarble(width, height);

    // Create start button
    this.createStartButton(width, height);

    // Instructions
    this.add.text(width / 2, height - 80, 'Press SPACE or Click to Start', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#6b7280',
      stroke: '#000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(10);

    // Version info
    this.add.text(width / 2, height - 30, 'v0.1.0 — Task 6: Game Flow', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#4b5563'
    }).setOrigin(0.5).setDepth(10);

    // Input handlers
    this.setupInput();
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1e1e3f, 0x1e1e3f, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);

    // Create twinkling stars
    for (let i = 0; i < 60; i++) {
      const star = this.add.graphics();
      const x = Math.random() * width;
      const y = Math.random() * height * 0.6;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.5 + 0.3;

      star.fillStyle(0xffffff, alpha);
      star.fillCircle(x, y, size);
      star.setDepth(-5);

      this.backgroundStars.push(star);

      // Twinkle animation
      this.tweens.add({
        targets: star,
        alpha: Math.random() * 0.3 + 0.2,
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1000
      });
    }

    // Parallax city silhouette
    this.createCitySilhouette(width, height);
  }

  private createCitySilhouette(width: number, height: number): void {
    const city = this.add.graphics();
    city.fillStyle(0x111827, 0.8);

    // Create simple building shapes
    let x = 0;
    while (x < width) {
      const bWidth = 40 + Math.random() * 80;
      const bHeight = 60 + Math.random() * 120;
      city.fillRect(x, height - bHeight, bWidth, bHeight);
      x += bWidth + 5 + Math.random() * 20;
    }

    city.setDepth(-8);
  }

  private createMarble(width: number, height: number): void {
    // Create marble texture
    const marbleTex = this.textures.createCanvas('titleMarble', 40, 40);
    if (marbleTex) {
      const ctx = marbleTex.getContext();
      const cx = 20, cy = 20, r = 18;

      // Marble body
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a8a';
      ctx.fill();

      // Highlight
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, 40, 20);
      ctx.restore();

      // Specular
      const g = ctx.createRadialGradient(cx - 6, cy - 7, 1, cx - 4, cy - 5, 9);
      g.addColorStop(0, 'rgba(255,255,255,0.88)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 40, 40);
      ctx.restore();

      marbleTex.refresh();
    }

    // Create marble sprite
    this.marble = this.add.image(-50, height / 2 - 20, 'titleMarble');
    this.marble.setScale(1.5);
    this.marble.setDepth(15);

    // Animate marble rolling across the title
    this.tweens.add({
      targets: this.marble,
      x: width + 50,
      duration: 4000,
      ease: 'Power2',
      repeat: -1,
      onRepeat: () => {
        this.marble.x = -50;
      }
    });

    // Rotation animation
    this.tweens.add({
      targets: this.marble,
      angle: 360,
      duration: 800,
      repeat: -1
    });
  }

  private createStartButton(width: number, height: number): void {
    // Button container
    this.startButton = this.add.container(width / 2, height / 2 + 40);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x3b82f6, 1);
    bg.fillRoundedRect(-100, -25, 200, 50, 10);
    bg.lineStyle(3, 0x1e40af, 1);
    bg.strokeRoundedRect(-100, -25, 200, 50, 10);

    // Button text
    const text = this.add.text(0, 0, 'START GAME', {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.startButton.add([bg, text]);
    this.startButton.setSize(200, 50);
    this.startButton.setInteractive({ useHandCursor: true });

    // Hover effect
    this.startButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2563eb, 1);
      bg.fillRoundedRect(-100, -25, 200, 50, 10);
      bg.lineStyle(3, 0x1e40af, 1);
      bg.strokeRoundedRect(-100, -25, 200, 50, 10);
      this.startButton.setScale(1.05);
    });

    this.startButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x3b82f6, 1);
      bg.fillRoundedRect(-100, -25, 200, 50, 10);
      bg.lineStyle(3, 0x1e40af, 1);
      bg.strokeRoundedRect(-100, -25, 200, 50, 10);
      this.startButton.setScale(1);
    });

    // Click handler
    this.startButton.on('pointerdown', () => {
      this.startGame();
    });

    this.startButton.setDepth(15);
  }

  private setupInput(): void {
    // Space to start
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.startGame();
    });

    // Enter to start
    this.input.keyboard!.once('keydown-ENTER', () => {
      this.startGame();
    });
  }

  private startGame(): void {
    // Transition to level select
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('LevelSelect');
    });
  }

  update(): void {
    // Marble rotation is handled by tweens
  }
}
