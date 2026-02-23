// AttractMode system — handles demo mode bot that plays the game automatically
import Phaser from 'phaser';

export class AttractMode {
  private scene: Phaser.Scene;
  private active: boolean = false;
  private startTime: number = 0;
  private maxDuration: number = 60000; // 60 seconds of bot play
  private reactionDelay: number = 300; // 300ms reaction time (average player)
  private missRate: number = 0.15; // 15% miss rate
  private lastDecisionTime: number = 0;
  private targetX: number = 400;
  private targetY: number = 300;
  private moveTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  start(): void {
    this.active = true;
    this.startTime = this.scene.time.now;
    this.lastDecisionTime = this.scene.time.now;
    this.targetX = 400;
    this.targetY = 300;

    // Set attract mode flag on window for testing
    (window as any).attractModeActive = true;

    // Mute audio during attract mode
    if (this.scene.game.sound) {
      this.scene.game.sound.mute = true;
    }

    // Update mute button if it exists
    this.updateMuteButton();
  }

  stop(): void {
    this.active = false;
    (window as any).attractModeActive = false;

    // Restore audio
    if (this.scene.game.sound) {
      this.scene.game.sound.mute = (window as any).userMuted || false;
    }

    // Update mute button
    this.updateMuteButton();
  }

  isActive(): boolean {
    return this.active;
  }

  shouldEnd(): boolean {
    if (!this.active) return false;
    const elapsed = this.scene.time.now - this.startTime;
    return elapsed >= this.maxDuration;
  }

  update(delta: number, playerX: number, playerY: number): { x: number; y: number } {
    if (!this.active) {
      return { x: playerX, y: playerY };
    }

    const now = this.scene.time.now;

    // Check if we should end attract mode
    if (this.shouldEnd()) {
      this.stop();
      // Signal to return to title screen
      (window as any).attractModeEnded = true;
      return { x: playerX, y: playerY };
    }

    // Bot decision making with reaction delay
    if (now - this.lastDecisionTime >= this.reactionDelay) {
      this.lastDecisionTime = now;
      this.makeBotDecision(playerX, playerY);
    }

    // Smooth movement toward target
    this.moveTimer += delta;
    const lerpFactor = Math.min(this.moveTimer / this.reactionDelay, 1.0);

    return {
      x: Phaser.Math.Linear(playerX, this.targetX, lerpFactor * 0.1),
      y: Phaser.Math.Linear(playerY, this.targetY, lerpFactor * 0.1),
    };
  }

  private makeBotDecision(playerX: number, playerY: number): void {
    // Get game state to find enemies
    const gameState = (window as any).gameState;
    if (!gameState || !gameState.enemies || gameState.enemies.length === 0) {
      // No enemies, move to center or wander
      this.targetX = 400 + (Math.random() - 0.5) * 200;
      this.targetY = 300 + (Math.random() - 0.5) * 150;
      return;
    }

    // Find nearest enemy
    let nearestEnemy = gameState.enemies[0];
    let minDist = Number.MAX_VALUE;

    for (const enemy of gameState.enemies) {
      const dx = enemy.x - playerX;
      const dy = enemy.y - playerY;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearestEnemy = enemy;
      }
    }

    // Bot strategy: sometimes miss (move away from nearest enemy)
    if (Math.random() < this.missRate) {
      // Miss: move away from enemy
      const dx = playerX - nearestEnemy.x;
      const dy = playerY - nearestEnemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        this.targetX = playerX + (dx / dist) * 150;
        this.targetY = playerY + (dy / dist) * 150;
      }
    } else {
      // Hit: move toward enemy but maintain some distance (kiting)
      const dx = nearestEnemy.x - playerX;
      const dy = nearestEnemy.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Maintain optimal distance (150-200 pixels)
      const optimalDist = 175;
      if (dist > optimalDist + 50) {
        // Too far, move closer
        this.targetX = playerX + (dx / dist) * 100;
        this.targetY = playerY + (dy / dist) * 100;
      } else if (dist < optimalDist - 50) {
        // Too close, back away
        this.targetX = playerX - (dx / dist) * 100;
        this.targetY = playerY - (dy / dist) * 100;
      } else {
        // Good distance, strafe
        this.targetX = playerX + (dy / dist) * 80;
        this.targetY = playerY - (dx / dist) * 80;
      }
    }

    // Clamp to screen bounds
    this.targetX = Phaser.Math.Clamp(this.targetX, 50, 750);
    this.targetY = Phaser.Math.Clamp(this.targetY, 50, 550);
  }

  private updateMuteButton(): void {
    const muteButton = document.getElementById('mute-button');
    if (muteButton) {
      const icon = this.scene.game.sound.mute ? '🔇' : '🔊';
      muteButton.textContent = icon;
    }
  }
}
