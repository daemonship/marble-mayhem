import Phaser from 'phaser';
import type { PlayerStats } from '../types.ts';

// XPSystem — gem collection with magnet range, XP bar fill, level-up trigger
export class XPSystem {
  private scene: Phaser.Scene;
  private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private gems: Phaser.Physics.Arcade.Group;
  private magnetRange: number;
  private xpGainMultiplier: number;
  private onLevelUp: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
    gems: Phaser.Physics.Arcade.Group,
    stats: PlayerStats
  ) {
    this.scene = scene;
    this.player = player;
    this.gems = gems;
    this.magnetRange = stats.magnetRange;
    this.xpGainMultiplier = stats.xpGain;
  }

  // Update magnet range and XP gain from stats
  updateStats(stats: PlayerStats): void {
    this.magnetRange = stats.magnetRange;
    this.xpGainMultiplier = stats.xpGain;
  }

  // Set callback for level-up
  setLevelUpCallback(callback: () => void): void {
    this.onLevelUp = callback;
  }

  // Update — pull gems within magnet range
  update(delta: number): void {
    const deltaSeconds = delta / 1000;
    const playerX = this.player.x;
    const playerY = this.player.y;

    this.gems.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const gem = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      if (!gem.active) return;

      const dx = playerX - gem.x;
      const dy = playerY - gem.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if within magnet range
      if (distance < this.magnetRange) {
        // Pull gem towards player
        const pullSpeed = 300; // Magnet pull speed
        if (distance > 5) {
          gem.x += (dx / distance) * pullSpeed * deltaSeconds;
          gem.y += (dy / distance) * pullSpeed * deltaSeconds;
        }
      }
    });
  }

  // Apply XP gain multiplier to collected XP
  collectXP(xpValue: number): number {
    return Math.floor(xpValue * this.xpGainMultiplier);
  }

  // Trigger level-up
  triggerLevelUp(): void {
    if (this.onLevelUp) {
      this.onLevelUp();
    }
  }
}
