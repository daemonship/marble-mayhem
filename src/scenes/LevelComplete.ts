import Phaser from 'phaser';

// Level completion data passed from game scene
interface LevelCompleteData {
  levelId: string;
  levelName: string;
  gems: number;
  totalGems: number;
  time: number;
  isNewBest: boolean;
  deaths: number;
}

// LevelComplete scene — shows results, allows replay or next level
export class LevelComplete extends Phaser.Scene {
  private data!: LevelCompleteData;
  private nextLevelButton!: Phaser.GameObjects.Container;
  private retryButton!: Phaser.GameObjects.Container;
  private menuButton!: Phaser.GameObjects.Container;
  private particles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'LevelComplete' });
  }

  init(data: LevelCompleteData): void {
    this.data = data;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Create background
    this.createBackground(width, height);

    // Confetti celebration
    this.createConfetti(width, height);

    // Title
    const titleText = this.add.text(width / 2, 100, 'LEVEL COMPLETE!', {
      fontSize: '56px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#fbbf24',
      stroke: '#1e3a8a',
      strokeThickness: 8,
      shadow: { offsetX: 4, offsetY: 4, blur: 10, color: '#000' }
    }).setOrigin(0.5).setDepth(10);

    // Title bounce animation
    this.tweens.add({
      targets: titleText,
      y: 90,
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      repeat: -1,
      repeatDelay: 2000
    });

    // Level name
    this.add.text(width / 2, 160, this.data.levelName, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#94a3b8',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // Stats panel
    this.createStatsPanel(width, height);

    // Buttons
    this.createButtons(width, height);

    // Save progress
    this.saveProgress();

    // Play complete sound (placeholder - would be added in Task 8)
    // this.playCompleteSound();
  }

  private createBackground(width: number, height: number): void {
    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(0);
  }

  private createConfetti(width: number, height: number): void {
    const colors = [0xfbbf24, 0x22d3ee, 0x22c55e, 0xf472b6, 0xa78bfa];

    for (let i = 0; i < 80; i++) {
      const confetti = this.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;

      confetti.fillStyle(color, 1);
      confetti.fillRect(0, 0, size, size * 0.6);

      const x = Math.random() * width;
      const y = -Math.random() * height - 50;

      confetti.setPosition(x, y);
      confetti.setDepth(5);

      this.particles.push(confetti);

      // Fall animation
      this.tweens.add({
        targets: confetti,
        y: height + 50,
        rotation: Math.random() * 360,
        duration: 3000 + Math.random() * 2000,
        ease: 'Linear',
        delay: Math.random() * 500,
        repeat: -1
      });

      // Horizontal drift
      this.tweens.add({
        targets: confetti,
        x: x + (Math.random() - 0.5) * 200,
        duration: 2000 + Math.random() * 1000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createStatsPanel(width: number, height: number): void {
    const panelY = 240;
    const panelHeight = 180;

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x1e293b, 0.95);
    panel.fillRoundedRect(width / 2 - 200, panelY, 400, panelHeight, 12);
    panel.lineStyle(3, 0x3b82f6, 1);
    panel.strokeRoundedRect(width / 2 - 200, panelY, 400, panelHeight, 12);
    panel.setDepth(3);

    // Gem count
    const gemRatio = this.data.totalGems > 0 ? this.data.gems / this.data.totalGems : 0;
    const gemColor = gemRatio === 1 ? 0x22c55e : gemRatio >= 0.5 ? 0xfbbf24 : 0xef4444;

    this.add.text(width / 2 - 140, panelY + 30, '💎 Gems', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(4);

    this.add.text(width / 2 + 140, panelY + 30, `${this.data.gems} / ${this.data.totalGems}`, {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#' + gemColor.toString(16).padStart(6, '0')
    }).setOrigin(1, 0.5).setDepth(4);

    // Gem bar
    const gemBarBg = this.add.graphics();
    gemBarBg.fillStyle(0x374151, 1);
    gemBarBg.fillRoundedRect(width / 2 - 140, panelY + 55, 280, 12, 6);
    gemBarBg.setDepth(4);

    const gemBarFill = this.add.graphics();
    gemBarFill.fillStyle(gemColor, 1);
    gemBarFill.fillRoundedRect(width / 2 - 140, panelY + 55, 280 * gemRatio, 12, 6);
    gemBarFill.setDepth(4);

    // Time
    this.add.text(width / 2 - 140, panelY + 90, '⏱️ Time', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(4);

    const timeText = this.formatTime(this.data.time);
    this.add.text(width / 2 + 140, panelY + 90, timeText, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: this.data.isNewBest ? 0x22c55e : 0xe2e8f0
    }).setOrigin(1, 0.5).setDepth(4);

    if (this.data.isNewBest) {
      this.add.text(width / 2 + 150, panelY + 90, ' ★ NEW!', {
        fontSize: '14px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: '#fbbf24'
      }).setOrigin(0, 0.5).setDepth(4);
    }

    // Deaths
    this.add.text(width / 2 - 140, panelY + 120, '💀 Deaths', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(4);

    this.add.text(width / 2 + 140, panelY + 120, this.data.deaths.toString(), {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: this.data.deaths === 0 ? 0x22c55e : this.data.deaths <= 3 ? 0xfbbf24 : 0xef4444
    }).setOrigin(1, 0.5).setDepth(4);

    // Star rating
    const stars = this.calculateStars();
    const starY = panelY + 155;
    const starSpacing = 35;
    const starStartX = width / 2 - (stars * starSpacing) / 2 + starSpacing / 2;

    for (let i = 0; i < 3; i++) {
      const starText = this.add.text(starStartX + i * starSpacing, starY, '★', {
        fontSize: '32px',
        fontFamily: 'Arial, sans-serif',
        color: i < stars ? 0xfbbf24 : 0x374151
      }).setOrigin(0.5).setDepth(4);

      // Pop animation for earned stars
      if (i < stars) {
        this.tweens.add({
          targets: starText,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 200,
          ease: 'Back.easeOut',
          delay: 500 + i * 100,
          yoyo: true
        });
      }
    }
  }

  private calculateStars(): number {
    // Star calculation based on gems and deaths
    const gemRatio = this.data.totalGems > 0 ? this.data.gems / this.data.totalGems : 0;
    const deathPenalty = Math.min(this.data.deaths * 0.2, 0.6); // Max 0.6 penalty from deaths

    const score = gemRatio - deathPenalty;

    if (score >= 1.0) return 3;
    if (score >= 0.6) return 2;
    if (score >= 0.2) return 1;
    return 0;
  }

  private createButtons(width: number, height: number): void {
    const buttonY = height - 120;
    const buttonWidth = 160;
    const buttonHeight = 50;
    const spacing = 20;

    // Next Level button (if not the last level)
    if (this.data.levelId !== 'world1_level8' && this.data.levelId !== 'sandbox') {
      this.nextLevelButton = this.createButton(
        width / 2,
        buttonY,
        buttonWidth,
        buttonHeight,
        'NEXT LEVEL',
        0x22c55e,
        0x16a34a,
        () => this.nextLevel()
      );
    }

    // Retry button
    this.retryButton = this.createButton(
      this.nextLevelButton ? width / 2 - buttonWidth / 2 - spacing : width / 2,
      buttonY + 70,
      buttonWidth,
      buttonHeight,
      'RETRY',
      0x3b82f6,
      0x2563eb,
      () => this.retryLevel()
    );

    // Menu button
    this.menuButton = this.createButton(
      this.nextLevelButton ? width / 2 + buttonWidth / 2 + spacing : width / 2,
      buttonY + 70,
      buttonWidth,
      buttonHeight,
      'LEVEL SELECT',
      0x6b7280,
      0x4b5563,
      () => this.returnToLevelSelect()
    );
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    bgColor: number,
    hoverColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0x1f2937, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    const textObj = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, textObj]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.lineStyle(2, 0x1f2937, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      container.setScale(1.05);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.lineStyle(2, 0x1f2937, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      container.setScale(1);
    });

    container.on('pointerdown', callback);

    container.setDepth(10);
    return container;
  }

  private saveProgress(): void {
    try {
      // Load existing progress
      let progress: any[] = [];
      const saved = localStorage.getItem('marble_mayhem_progress');
      if (saved) {
        progress = JSON.parse(saved);
      }

      // Update or add this level's progress
      const existingIndex = progress.findIndex((p: any) => p.levelId === this.data.levelId);
      const entry = {
        levelId: this.data.levelId,
        completed: true,
        gems: Math.max(this.data.gems, progress[existingIndex]?.gems || 0),
        totalGems: this.data.totalGems,
        bestTime: this.data.time
      };

      if (existingIndex >= 0) {
        progress[existingIndex] = entry;
      } else {
        progress.push(entry);
      }

      localStorage.setItem('marble_mayhem_progress', JSON.stringify(progress));
    } catch (e) {
      console.warn('Failed to save progress:', e);
    }
  }

  private nextLevel(): void {
    // Determine next level ID
    const currentNum = parseInt(this.data.levelId.split('_level')[1]);
    const nextLevelId = `world1_level${currentNum + 1}`;

    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('MarblePlatform', { levelId: nextLevelId });
    });
  }

  private retryLevel(): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('MarblePlatform', { levelId: this.data.levelId });
    });
  }

  private returnToLevelSelect(): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('LevelSelect');
    });
  }

  private formatTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0:00.00';
    const secs = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }
}
