import Phaser from 'phaser';
import * as PM from '../progression/ProgressManager';
import type { LevelProgress, WorldStats } from '../progression/ProgressManager';

// LevelSelect scene — grid of levels with locked/unlocked states, world stats bar.
export class LevelSelect extends Phaser.Scene {
  private progress: Map<string, LevelProgress> = new Map();
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private backButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'LevelSelect' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.progress = PM.loadAll();

    this.createBackground(width, height);

    // Title
    this.add.text(width / 2, 45, 'SELECT LEVEL', {
      fontSize: '44px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#fbbf24',
      stroke: '#1e3a8a',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);

    // World stats bar (always shown; turns gold on completion)
    this.createWorldStatsBar(width);

    // Level grid
    this.createLevelGrid(width, height);

    // Back button
    this.createBackButton();

    // Instructions
    this.add.text(width / 2, height - 30, 'Click a level to play  •  ESC to return', {
      fontSize: '13px', fontFamily: 'monospace', color: '#6b7280'
    }).setOrigin(0.5).setDepth(10);

    // ESC to return to title
    this.input.keyboard!.once('keydown-ESC', () => this.returnToTitle());
  }

  // ── Background ──────────────────────────────────────────────────────────────

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1e1e3f, 0x1e1e3f, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);
  }

  // ── World stats bar ─────────────────────────────────────────────────────────

  private createWorldStatsBar(width: number): void {
    const stats      = PM.getWorldStats();
    const isComplete = PM.isWorld1Complete() || stats.isComplete;
    const isPerfect  = PM.isWorld1Perfect()  || stats.isPerfect;

    const barY    = 88;
    const barH    = 34;
    const barFill = isPerfect ? 0x3d2e00 : isComplete ? 0x0a2e0a : 0x1e293b;
    const border  = isPerfect ? 0xffd700  : isComplete ? 0x22c55e  : 0x3b82f6;

    const bg = this.add.graphics();
    bg.fillStyle(barFill, 0.95);
    bg.fillRoundedRect(width / 2 - 320, barY, 640, barH, 6);
    bg.lineStyle(2, border, 1);
    bg.strokeRoundedRect(width / 2 - 320, barY, 640, barH, 6);
    bg.setDepth(10);

    // Stars
    const starColor  = isPerfect ? '#ffd700' : isComplete ? '#a3e635' : '#fbbf24';
    const starLabel  = `★ ${stats.starsEarned}/${stats.starsTotal}`;

    this.add.text(width / 2 - 300, barY + barH / 2, starLabel, {
      fontSize: '18px', fontFamily: 'Arial Black, Arial, sans-serif', color: starColor
    }).setOrigin(0, 0.5).setDepth(11);

    // Gem tally
    const gemLabel = `💎 ${stats.gemsCollected}/${stats.gemsTotal}`;
    this.add.text(width / 2 - 120, barY + barH / 2, gemLabel, {
      fontSize: '18px', fontFamily: 'monospace', color: '#22d3ee'
    }).setOrigin(0, 0.5).setDepth(11);

    // Progress fraction
    const levLabel = `Levels ${stats.levelsCompleted}/${stats.levelsTotal}`;
    this.add.text(width / 2 + 80, barY + barH / 2, levLabel, {
      fontSize: '16px', fontFamily: 'monospace', color: '#94a3b8'
    }).setOrigin(0, 0.5).setDepth(11);

    // Badge (right-aligned)
    if (isPerfect) {
      this.add.text(width / 2 + 300, barY + barH / 2, '✨ PERFECT CLEAR', {
        fontSize: '16px', fontFamily: 'Arial Black, Arial, sans-serif', color: '#ffd700'
      }).setOrigin(1, 0.5).setDepth(11);
    } else if (isComplete) {
      this.add.text(width / 2 + 300, barY + barH / 2, '🏆 WORLD COMPLETE', {
        fontSize: '16px', fontFamily: 'Arial Black, Arial, sans-serif', color: '#22c55e'
      }).setOrigin(1, 0.5).setDepth(11);
    }
  }

  // ── Level grid ──────────────────────────────────────────────────────────────

  private createLevelGrid(width: number, height: number): void {
    const levels = [
      { id: 'world1_level1', world: 1, level: 1, name: 'City Start' },
      { id: 'world1_level2', world: 1, level: 2, name: 'Pipe Dreams' },
      { id: 'world1_level3', world: 1, level: 3, name: 'Lab Test' },
      { id: 'world1_level4', world: 1, level: 4, name: 'Factory Floor' },
      { id: 'world1_level5', world: 1, level: 5, name: 'Icy Cavern' },
      { id: 'world1_level6', world: 1, level: 6, name: 'Sand Dunes' },
      { id: 'world1_level7', world: 1, level: 7, name: 'Rainy Rooftop' },
      { id: 'world1_level8', world: 1, level: 8, name: 'Final Showdown' },
    ];

    const cols        = 4;
    const buttonW     = 182;
    const buttonH     = 105;
    const gapX        = 18;
    const gapY        = 16;
    const gridW       = cols * buttonW + (cols - 1) * gapX;
    const startX      = (width - gridW) / 2 + buttonW / 2;
    const startY      = 148;

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const col   = i % cols;
      const row   = Math.floor(i / cols);
      const x     = startX + col * (buttonW + gapX);
      const y     = startY + row * (buttonH + gapY);
      this.levelButtons.push(this.createLevelButton(x, y, buttonW, buttonH, level, false));
    }

    // Sandbox button at the bottom
    const sandboxY = startY + 2 * (buttonH + gapY) + 20;
    this.levelButtons.push(
      this.createLevelButton(width / 2, sandboxY, 200, 62, { id: 'sandbox', world: 0, level: 0, name: 'Sandbox' }, true)
    );
  }

  private createLevelButton(
    x: number, y: number, width: number, height: number,
    level: { id: string; world: number; level: number; name: string },
    isSandbox: boolean,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isUnlocked = PM.isLevelUnlocked(level.id, this.progress);
    const prog       = this.progress.get(level.id);

    const bgColor     = isUnlocked ? 0x1e3a8a : 0x374151;
    const borderColor = isUnlocked ? 0x3b82f6 : 0x4b5563;

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    // Level number (top-left)
    const numText = this.add.text(-width / 2 + 14, -height / 2 + 14,
      isSandbox ? '∞' : `${level.level}`, {
        fontSize: isSandbox ? '28px' : '26px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: isUnlocked ? '#fbbf24' : '#6b7280',
      }
    ).setOrigin(0, 0);

    // Level name (centre)
    const nameText = this.add.text(0, isSandbox ? 4 : -8, level.name, {
      fontSize: isSandbox ? '19px' : '17px',
      fontFamily: 'Arial, sans-serif',
      color: isUnlocked ? '#e2e8f0' : '#6b7280',
      fontStyle: isSandbox ? 'italic' : 'normal',
    }).setOrigin(0.5);

    container.add([bg, numText, nameText]);

    if (!isSandbox && isUnlocked && prog) {
      // Gem count (bottom centre)
      const gemText = this.add.text(0, height / 2 - 20, `💎 ${prog.gems}/${prog.totalGems}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#22d3ee'
      }).setOrigin(0.5);

      // Star row (below gem text)
      const starStr = '★'.repeat(prog.stars) + '☆'.repeat(3 - prog.stars);
      const starText = this.add.text(0, height / 2 - 5, starStr, {
        fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#fbbf24'
      }).setOrigin(0.5);

      container.add([gemText, starText]);

      // Completion tick (top-right corner)
      if (prog.completed) {
        container.add(
          this.add.text(width / 2 - 12, -height / 2 + 14, '✓', {
            fontSize: '20px', color: '#22c55e'
          }).setOrigin(0.5, 0)
        );
      }
    } else if (!isUnlocked && !isSandbox) {
      container.add(
        this.add.text(0, 12, '🔒', { fontSize: '28px' }).setOrigin(0.5)
      );
    }

    container.setSize(width, height);

    if (isUnlocked) {
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x2563eb, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, 0x60a5fa, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
        container.setScale(1.05);
      });

      container.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(bgColor, 0.9);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, borderColor, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
        container.setScale(1);
      });

      container.on('pointerdown', () => this.startLevel(level.id));
    }

    container.setDepth(5);
    return container;
  }

  // ── Back button ─────────────────────────────────────────────────────────────

  private createBackButton(): void {
    this.backButton = this.add.container(75, 40);

    const bg = this.add.graphics();
    bg.fillStyle(0x374151, 1);
    bg.fillRoundedRect(-50, -18, 100, 36, 8);
    bg.lineStyle(2, 0x4b5563, 1);
    bg.strokeRoundedRect(-50, -18, 100, 36, 8);

    const text = this.add.text(0, 0, '← BACK', {
      fontSize: '15px', fontFamily: 'Arial, sans-serif', color: '#e2e8f0'
    }).setOrigin(0.5);

    this.backButton.add([bg, text]);
    this.backButton.setSize(100, 36);
    this.backButton.setInteractive({ useHandCursor: true });

    this.backButton.on('pointerover', () => {
      bg.clear(); bg.fillStyle(0x4b5563, 1);
      bg.fillRoundedRect(-50, -18, 100, 36, 8);
      bg.lineStyle(2, 0x6b7280, 1);
      bg.strokeRoundedRect(-50, -18, 100, 36, 8);
    });

    this.backButton.on('pointerout', () => {
      bg.clear(); bg.fillStyle(0x374151, 1);
      bg.fillRoundedRect(-50, -18, 100, 36, 8);
      bg.lineStyle(2, 0x4b5563, 1);
      bg.strokeRoundedRect(-50, -18, 100, 36, 8);
    });

    this.backButton.on('pointerdown', () => this.returnToTitle());
    this.backButton.setDepth(10);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  private startLevel(levelId: string): void {
    this.registry.set('selectedLevel', levelId);
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('MarblePlatform', { levelId }));
  }

  private returnToTitle(): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('TitleScreen'));
  }
}
