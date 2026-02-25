import Phaser from 'phaser';
import * as PM from '../progression/ProgressManager';
import type { WorldStats } from '../progression/ProgressManager';

// Level completion data passed from game scene
interface LevelCompleteData {
  levelId:    string;
  levelName:  string;
  gems:       number;
  totalGems:  number;
  time:       number;
  isNewBest:  boolean;
  deaths:     number;
}

// LevelComplete scene — shows results, allows replay or next level
export class LevelComplete extends Phaser.Scene {
  private levelData!: LevelCompleteData;
  private nextLevelButton!: Phaser.GameObjects.Container;
  private retryButton!:     Phaser.GameObjects.Container;
  private menuButton!:      Phaser.GameObjects.Container;
  private particles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'LevelComplete' });
  }

  init(data: LevelCompleteData): void {
    this.levelData = data;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Save progress first so star calc uses up-to-date bests.
    const stars      = this.calculateStars();
    const worldStats = PM.saveLevel(
      this.levelData.levelId,
      this.levelData.gems,
      this.levelData.totalGems,
      this.levelData.time,
      stars,
    );

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
    this.add.text(width / 2, 160, this.levelData.levelName, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#94a3b8',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // Stats panel
    this.createStatsPanel(width, height, stars);

    // Buttons
    this.createButtons(width, height);

    // World-completion banner (shown after a brief delay so the player sees the stats first)
    if (worldStats.isComplete) {
      this.time.delayedCall(800, () => {
        this.showWorldCompleteBanner(width, height, worldStats);
      });
    }
  }

  // ── Background ──────────────────────────────────────────────────────────────

  private createBackground(width: number, height: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(0);
  }

  // ── Confetti ────────────────────────────────────────────────────────────────

  private createConfetti(width: number, height: number): void {
    const colors = [0xfbbf24, 0x22d3ee, 0x22c55e, 0xf472b6, 0xa78bfa];

    for (let i = 0; i < 80; i++) {
      const confetti = this.add.graphics();
      const color    = colors[Math.floor(Math.random() * colors.length)];
      const size     = Math.random() * 8 + 4;

      confetti.fillStyle(color, 1);
      confetti.fillRect(0, 0, size, size * 0.6);

      const x = Math.random() * width;
      const y = -Math.random() * height - 50;
      confetti.setPosition(x, y);
      confetti.setDepth(5);
      this.particles.push(confetti);

      this.tweens.add({
        targets: confetti,
        y: height + 50,
        rotation: Math.random() * 360,
        duration: 3000 + Math.random() * 2000,
        ease: 'Linear',
        delay: Math.random() * 500,
        repeat: -1
      });

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

  // ── Stats panel ─────────────────────────────────────────────────────────────

  private createStatsPanel(width: number, height: number, stars: number): void {
    const panelY      = 200;
    const panelHeight = 220;

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x1e293b, 0.95);
    panel.fillRoundedRect(width / 2 - 200, panelY, 400, panelHeight, 12);
    panel.lineStyle(3, 0x3b82f6, 1);
    panel.strokeRoundedRect(width / 2 - 200, panelY, 400, panelHeight, 12);
    panel.setDepth(3);

    // Gem count
    const gemRatio  = this.levelData.totalGems > 0 ? this.levelData.gems / this.levelData.totalGems : 0;
    const gemColor  = gemRatio === 1 ? 0x22c55e : gemRatio >= 0.5 ? 0xfbbf24 : 0xef4444;

    this.add.text(width / 2 - 140, panelY + 30, '💎 Gems', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(4);

    this.add.text(width / 2 + 140, panelY + 30, `${this.levelData.gems} / ${this.levelData.totalGems}`, {
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
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(4);

    const timeStr = this.formatTime(this.levelData.time);
    this.add.text(width / 2 + 140, panelY + 90, timeStr, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: this.levelData.isNewBest ? '#22c55e' : '#e2e8f0'
    }).setOrigin(1, 0.5).setDepth(4);

    if (this.levelData.isNewBest) {
      this.add.text(width / 2 + 150, panelY + 90, ' ★ BEST!', {
        fontSize: '14px', fontFamily: 'Arial Black, Arial, sans-serif', color: '#fbbf24'
      }).setOrigin(0, 0.5).setDepth(4);
    }

    // Deaths
    this.add.text(width / 2 - 140, panelY + 120, '💀 Deaths', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif', color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(4);

    const deathColor = this.levelData.deaths === 0 ? '#22c55e' : this.levelData.deaths <= 3 ? '#fbbf24' : '#ef4444';
    this.add.text(width / 2 + 140, panelY + 120, this.levelData.deaths.toString(), {
      fontSize: '24px', fontFamily: 'Arial Black, Arial, sans-serif', color: deathColor
    }).setOrigin(1, 0.5).setDepth(4);

    // Star rating
    const starY       = panelY + 175;
    const starSpacing = 50;
    const starStartX  = width / 2 - starSpacing;

    for (let i = 0; i < 3; i++) {
      const starObj = this.add.text(starStartX + i * starSpacing, starY, '★', {
        fontSize: '40px',
        fontFamily: 'Arial, sans-serif',
        color: i < stars ? '#fbbf24' : '#374151'
      }).setOrigin(0.5).setDepth(4);

      if (i < stars) {
        this.tweens.add({
          targets: starObj,
          scaleX: 1.5, scaleY: 1.5,
          duration: 200,
          ease: 'Back.easeOut',
          delay: 500 + i * 120,
          yoyo: true
        });
      }
    }
  }

  // ── Star calculation ─────────────────────────────────────────────────────────

  private calculateStars(): number {
    const gemRatio    = this.levelData.totalGems > 0 ? this.levelData.gems / this.levelData.totalGems : 0;
    const deathPenalty = Math.min(this.levelData.deaths * 0.2, 0.6);
    const score       = gemRatio - deathPenalty;

    if (score >= 1.0) return 3;
    if (score >= 0.6) return 2;
    if (score >= 0.2) return 1;
    return 0;
  }

  // ── World-complete banner ────────────────────────────────────────────────────

  private showWorldCompleteBanner(width: number, height: number, stats: WorldStats): void {
    const bannerY = 30;
    const label   = stats.isPerfect ? '✨ PERFECT CLEAR — WORLD 1! ✨' : '🏆 WORLD 1 COMPLETE! 🏆';
    const color   = stats.isPerfect ? '#ffd700' : '#22c55e';

    // Semi-opaque strip
    const strip = this.add.graphics();
    strip.fillStyle(stats.isPerfect ? 0x3d2e00 : 0x0a2e0a, 0.92);
    strip.fillRect(0, bannerY, width, 50);
    strip.lineStyle(2, stats.isPerfect ? 0xffd700 : 0x22c55e, 1);
    strip.strokeRect(0, bannerY, width, 50);
    strip.setDepth(20);

    const txt = this.add.text(width / 2, bannerY + 25, label, {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.tweens.add({ targets: [strip, txt], alpha: 1, duration: 400, ease: 'Quad.easeOut' });

    // Stars summary: e.g. "★ 18 / 24"
    const starLine = this.add.text(
      width / 2,
      bannerY + 68,
      `★ ${stats.starsEarned} / ${stats.starsTotal}  |  💎 ${stats.gemsCollected} / ${stats.gemsTotal}`,
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: stats.isPerfect ? '#ffd700' : '#a3e635',
        stroke: '#000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.tweens.add({ targets: starLine, alpha: 1, duration: 400, delay: 200, ease: 'Quad.easeOut' });
  }

  // ── Buttons ──────────────────────────────────────────────────────────────────

  private createButtons(width: number, height: number): void {
    const buttonY      = height - 110;
    const buttonWidth  = 160;
    const buttonHeight = 50;
    const spacing      = 20;

    const isLastLevel = this.levelData.levelId === 'world1_level8' || this.levelData.levelId === 'sandbox';

    if (!isLastLevel) {
      this.nextLevelButton = this.createButton(
        width / 2, buttonY, buttonWidth, buttonHeight,
        'NEXT LEVEL', 0x22c55e, 0x16a34a,
        () => this.nextLevel()
      );
    }

    const sideOffset = this.nextLevelButton ? buttonWidth / 2 + spacing : 0;

    this.retryButton = this.createButton(
      width / 2 - sideOffset, buttonY + 65, buttonWidth, buttonHeight,
      'RETRY', 0x3b82f6, 0x2563eb,
      () => this.retryLevel()
    );

    this.menuButton = this.createButton(
      width / 2 + sideOffset, buttonY + 65, buttonWidth, buttonHeight,
      'LEVEL SELECT', 0x6b7280, 0x4b5563,
      () => this.returnToLevelSelect()
    );
  }

  private createButton(
    x: number, y: number, width: number, height: number,
    text: string, bgColor: number, hoverColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0x1f2937, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    const textObj = this.add.text(0, 0, text, {
      fontSize: '18px', fontFamily: 'Arial Black, Arial, sans-serif', color: '#ffffff'
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

  // ── Navigation ───────────────────────────────────────────────────────────────

  private nextLevel(): void {
    const currentNum  = parseInt(this.levelData.levelId.split('_level')[1]);
    const nextLevelId = `world1_level${currentNum + 1}`;
    this.fade(() => this.scene.start('MarblePlatform', { levelId: nextLevelId }));
  }

  private retryLevel(): void {
    this.fade(() => this.scene.start('MarblePlatform', { levelId: this.levelData.levelId }));
  }

  private returnToLevelSelect(): void {
    this.fade(() => this.scene.start('LevelSelect'));
  }

  private fade(cb: () => void): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, cb);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private formatTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0:00.00';
    const secs = Math.floor(ms / 1000);
    const cs   = Math.floor((ms % 1000) / 10);
    const m    = Math.floor(secs / 60);
    const s    = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }
}
