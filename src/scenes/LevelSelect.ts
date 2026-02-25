import Phaser from 'phaser';
import * as Levels from '../levels';

// Level completion tracking
interface LevelProgress {
  levelId: string;
  completed: boolean;
  gems: number;
  totalGems: number;
  bestTime: number;
}

// LevelSelect scene — grid of levels with locked/unlocked states
export class LevelSelect extends Phaser.Scene {
  private levels: Array<{ id: string; world: number; level: number; name: string }> = [];
  private progress: Map<string, LevelProgress> = new Map();
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private backButton!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'LevelSelect' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Load progress from localStorage
    this.loadProgress();

    // Build level list
    this.buildLevelList();

    // Create background
    this.createBackground(width, height);

    // Title
    this.add.text(width / 2, 50, 'SELECT LEVEL', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#fbbf24',
      stroke: '#1e3a8a',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(10);

    // Create level grid
    this.createLevelGrid(width, height);

    // Back button
    this.createBackButton(width, height);

    // Instructions
    this.add.text(width / 2, height - 40, 'Click a level to play • ESC to return', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#6b7280'
    }).setOrigin(0.5).setDepth(10);

    // ESC to return to title
    this.input.keyboard!.once('keydown-ESC', () => {
      this.returnToTitle();
    });
  }

  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('marble_mayhem_progress');
      if (saved) {
        const data = JSON.parse(saved);
        for (const entry of data) {
          this.progress.set(entry.levelId, entry);
        }
      }
    } catch (e) {
      console.warn('Failed to load progress:', e);
    }
  }

  private saveProgress(): void {
    try {
      const data = Array.from(this.progress.values());
      localStorage.setItem('marble_mayhem_progress', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save progress:', e);
    }
  }

  private buildLevelList(): void {
    // Build level list from imported levels
    const levelDefs = [
      { id: 'world1_level1', key: 'world1_level1', world: 1, level: 1, name: 'City Start' },
      { id: 'world1_level2', key: 'world1_level2', world: 1, level: 2, name: 'Pipe Dreams' },
      { id: 'world1_level3', key: 'world1_level3', world: 1, level: 3, name: 'Lab Test' },
      { id: 'world1_level4', key: 'world1_level4', world: 1, level: 4, name: 'Factory Floor' },
      { id: 'world1_level5', key: 'world1_level5', world: 1, level: 5, name: 'Icy Cavern' },
      { id: 'world1_level6', key: 'world1_level6', world: 1, level: 6, name: 'Sand Dunes' },
      { id: 'world1_level7', key: 'world1_level7', world: 1, level: 7, name: 'Rainy Rooftop' },
      { id: 'world1_level8', key: 'world1_level8', world: 1, level: 8, name: 'Final Showdown' },
      { id: 'sandbox', key: 'sandbox', world: 0, level: 0, name: 'Sandbox' },
    ];

    this.levels = levelDefs;
  }

  private createBackground(width: number, height: number): void {
    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1e1e3f, 0x1e1e3f, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);
  }

  private createLevelGrid(width: number, height: number): void {
    const startX = 100;
    const startY = 120;
    const buttonWidth = 180;
    const buttonHeight = 100;
    const gapX = 20;
    const gapY = 20;
    const cols = 4;

    // Filter out sandbox for main grid (we'll add it separately)
    const mainLevels = this.levels.filter(l => l.world > 0);

    for (let i = 0; i < mainLevels.length; i++) {
      const level = mainLevels[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = startX + col * (buttonWidth + gapX);
      const y = startY + row * (buttonHeight + gapY);

      const button = this.createLevelButton(x, y, buttonWidth, buttonHeight, level);
      this.levelButtons.push(button);
    }

    // Add sandbox button at the bottom
    const sandbox = this.levels.find(l => l.id === 'sandbox');
    if (sandbox) {
      const x = width / 2;
      const y = height - 150;
      const button = this.createLevelButton(x, y, 200, 60, sandbox, true);
      this.levelButtons.push(button);
    }
  }

  private createLevelButton(
    x: number,
    y: number,
    width: number,
    height: number,
    level: { id: string; world: number; level: number; name: string },
    isSandbox: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Check if level is unlocked
    const isUnlocked = this.isLevelUnlocked(level);
    const progress = this.progress.get(level.id);

    // Button background
    const bg = this.add.graphics();
    const bgColor = isUnlocked ? 0x1e3a8a : 0x374151;
    const borderColor = isUnlocked ? 0x3b82f6 : 0x4b5563;

    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    // Level number
    const levelNum = this.add.text(
      -width / 2 + 20,
      -height / 2 + 20,
      isSandbox ? '∞' : `${level.level}`,
      {
        fontSize: isSandbox ? '32px' : '28px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        color: isUnlocked ? '#fbbf24' : '#6b7280'
      }
    ).setOrigin(0.5);

    // Level name
    const nameText = this.add.text(
      0,
      isSandbox ? 5 : 5,
      level.name,
      {
        fontSize: isSandbox ? '20px' : '18px',
        fontFamily: 'Arial, sans-serif',
        color: isUnlocked ? '#e2e8f0' : '#6b7280',
        fontStyle: isSandbox ? 'italic' : 'normal'
      }
    ).setOrigin(0.5);

    // Progress indicators (gems and completion)
    if (isUnlocked && progress && !isSandbox) {
      // Gem count
      const gemText = this.add.text(
        0,
        height / 2 - 25,
        `💎 ${progress.gems}/${progress.totalGems}`,
        {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#22d3ee'
        }
      ).setOrigin(0.5);

      // Completion checkmark
      if (progress.completed) {
        const checkmark = this.add.text(width / 2 - 20, -height / 2 + 20, '✓', {
          fontSize: '24px',
          color: '#22c55e'
        }).setOrigin(0.5);
        container.add(checkmark);
      }

      container.add(gemText);
    } else if (!isUnlocked && !isSandbox) {
      // Lock icon
      const lockIcon = this.add.text(0, 10, '🔒', {
        fontSize: '32px'
      }).setOrigin(0.5);
      container.add(lockIcon);
    }

    container.add([bg, levelNum, nameText]);
    container.setSize(width, height);

    // Make interactive if unlocked
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

      container.on('pointerdown', () => {
        this.startLevel(level.id);
      });
    }

    container.setDepth(5);
    return container;
  }

  private isLevelUnlocked(level: { id: string; world: number; level: number }): boolean {
    // Sandbox is always unlocked
    if (level.id === 'sandbox') return true;

    // First level is always unlocked
    if (level.world === 1 && level.level === 1) return true;

    // Level is unlocked if previous level is completed
    const prevLevel = this.levels.find(
      l => l.world === level.world && l.level === level.level - 1
    );
    if (prevLevel) {
      const prevProgress = this.progress.get(prevLevel.id);
      return prevProgress?.completed ?? false;
    }

    return false;
  }

  private startLevel(levelId: string): void {
    // Store selected level for game scene to load
    this.registry.set('selectedLevel', levelId);

    // Fade out and transition
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('MarblePlatform', { levelId });
    });
  }

  private createBackButton(width: number, height: number): void {
    this.backButton = this.add.container(80, 40);

    const bg = this.add.graphics();
    bg.fillStyle(0x374151, 1);
    bg.fillRoundedRect(-50, -18, 100, 36, 8);
    bg.lineStyle(2, 0x4b5563, 1);
    bg.strokeRoundedRect(-50, -18, 100, 36, 8);

    const text = this.add.text(0, 0, '← BACK', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    this.backButton.add([bg, text]);
    this.backButton.setSize(100, 36);
    this.backButton.setInteractive({ useHandCursor: true });

    this.backButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x4b5563, 1);
      bg.fillRoundedRect(-50, -18, 100, 36, 8);
      bg.lineStyle(2, 0x6b7280, 1);
      bg.strokeRoundedRect(-50, -18, 100, 36, 8);
    });

    this.backButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x374151, 1);
      bg.fillRoundedRect(-50, -18, 100, 36, 8);
      bg.lineStyle(2, 0x4b5563, 1);
      bg.strokeRoundedRect(-50, -18, 100, 36, 8);
    });

    this.backButton.on('pointerdown', () => {
      this.returnToTitle();
    });

    this.backButton.setDepth(10);
  }

  private returnToTitle(): void {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('TitleScreen');
    });
  }
}
