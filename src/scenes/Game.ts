import Phaser from 'phaser';
import type { GameState, PlayerStats, UpgradeOption } from '../types.ts';
import { XPSystem } from '../systems/XPSystem.ts';
import { pickUpgrades, applyUpgrade, getCurrentFireInterval } from '../systems/UpgradeSystem.ts';
import { AttractMode } from '../systems/AttractMode.ts';
import { audioSystem } from '../main.ts';

// Game scene — main gameplay loop
export class Game extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private xpGems!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private pointer!: Phaser.Input.Pointer;
  private spawnTimer: number = 0;
  private fireTimer: number = 0;
  private gameState: GameState;
  private lastHitTime: number = 0;
  private xpSystem!: XPSystem;
  private isPaused: boolean = false;
  private pendingUpgrades: UpgradeOption[] = [];
  private attractMode!: AttractMode;
  private mouseActive: boolean = true;
  private mouseX: number = 400;
  private mouseY: number = 300;
  private mouseMoveHandler?: (e: MouseEvent) => void;

  constructor() {
    super({ key: 'Game' });
    // Access global gameState
    this.gameState = (window as any).gameState;
  }

  create(): void {
    // Reset game state
    this.gameState.phase = 'playing';
    this.gameState.kills = 0;
    this.gameState.elapsedSeconds = 0;
    this.gameState.xp = 0;
    this.gameState.level = 1;
    this.gameState.xpToNextLevel = 50; // Lower XP threshold for faster testing
    this.gameState.playerStats.health = this.gameState.playerStats.maxHealth;
    this.gameState.playerPos = { x: 400, y: 300 };
    this.isPaused = false;

    // Create particle texture for death effects
    this.createParticleTexture();

    // Create player sprite (a yellow circle)
    this.player = this.physics.add.sprite(400, 300, 'pixel');
    this.player.setCircle(20);
    this.player.setDisplaySize(40, 40);
    this.player.setTint(0xffff00);
    this.player.setCollideWorldBounds(true);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.pointer = this.input.activePointer;
    this.input.on('pointermove', () => { this.mouseActive = true; });

    // Bypass Phaser input for mouse tracking — use native canvas events for accuracy
    this.mouseMoveHandler = (e: MouseEvent) => {
      const r = this.game.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (800 / r.width);
      this.mouseY = (e.clientY - r.top) * (600 / r.height);
      this.mouseActive = true;
    };
    this.game.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.mouseMoveHandler) {
        this.game.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
      }
    });

    // Create groups
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.xpGems = this.physics.add.group();

    // Collisions
    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (obj1, obj2) => this.handleProjectileHit(obj1 as Phaser.GameObjects.GameObject, obj2 as Phaser.GameObjects.GameObject),
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (obj1, obj2) => this.handleEnemyHit(obj1 as Phaser.GameObjects.GameObject, obj2 as Phaser.GameObjects.GameObject),
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.xpGems,
      (obj1, obj2) => this.handleXPGemCollection(obj1 as Phaser.GameObjects.GameObject, obj2 as Phaser.GameObjects.GameObject),
      undefined,
      this
    );

    // Initialize XP System
    this.xpSystem = new XPSystem(this, this.player, this.xpGems, this.gameState.playerStats);
    this.xpSystem.setLevelUpCallback(() => this.handleLevelUp());

    // Initialize Attract Mode
    this.attractMode = new AttractMode(this);
    if ((window as any).attractModeActive) {
      this.attractMode.start();
    }

    // Start spawning
    this.spawnTimer = 0;
    this.fireTimer = 0;

    // Ensure global gameState enemies array is updated
    this.gameState.enemies = [];
    this.gameState.projectiles = [];

    // Hide any existing modal
    this.hideLevelUpModal();

    // Update gameState fire interval for testing
    this.updateFireInterval();
    
    // Expose the game scene on window for testing
    (window as any).gameScene = this;

    // Enable particles flag
    this.gameState.particlesEnabled = true;

    // Show brief tutorial overlay unless this is attract mode
    if (!(window as any).attractModeActive) {
      this.showTutorialOverlay();
    }
  }

  private showTutorialOverlay(): void {
    const lines = [
      'MOVE YOUR MOUSE to guide your potato',
      'Auto-fires at nearby enemies',
      'Collect green gems for XP • Level up to upgrade',
    ];
    const text = this.add.text(400, 200, lines, {
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(100).setAlpha(0.95);

    // Fade out after 3 seconds
    const timer = this.time.delayedCall(3000, () => {
      if (!text.active) return; // scene may have been torn down before this fires
      this.tweens.add({
        targets: text,
        alpha: 0,
        duration: 800,
        onComplete: () => { if (text.active) text.destroy(); },
      });
    });

    // Cancel timer and clean up text if the scene shuts down before the fade completes
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      timer.remove();
      if (text.active) text.destroy();
    });
  }

  private createParticleTexture(): void {
    // Create a simple particle texture if not exists
    if (!this.textures.exists('particle')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('particle', 8, 8);
      graphics.destroy();
    }
  }

  update(time: number, delta: number): void {
    // Skip all updates if paused
    if (this.isPaused) return;

    // Check if attract mode should end
    if (this.attractMode.isActive() && this.attractMode.shouldEnd()) {
      // Attract mode ended naturally (60 seconds elapsed)
      this.endAttractMode();
      return;
    }

    // Check if player took any input during attract mode
    if (this.attractMode.isActive()) {
      if (this.input.activePointer.isDown) {
        // Player input detected - end attract mode
        this.endAttractMode();
        return;
      }
    }

    const deltaSeconds = delta / 1000;
    this.gameState.elapsedSeconds += deltaSeconds;

    // Update player position based on mouse pointer or attract mode bot
    this.updatePlayerMovement(deltaSeconds);

    // Update enemies AI
    this.updateEnemies(deltaSeconds);

    // Spawn enemies periodically
    this.spawnTimer += deltaSeconds;
    if (this.spawnTimer >= 0.5) { // spawn every 0.5 seconds for faster gameplay
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Auto-fire at nearest enemy
    this.fireTimer += deltaSeconds;
    const fireInterval = 1.0 / this.gameState.playerStats.attackSpeed;
    if (this.fireTimer >= fireInterval) {
      this.fireAtNearestEnemy();
      this.fireTimer = 0;
    }

    // Update XP system (magnet pull)
    this.xpSystem.update(delta);

    // Update global gameState for testing
    this.updateGameState();

    // Apply health regen if any
    if (this.gameState.playerStats.healthRegen > 0) {
      this.gameState.playerStats.health = Math.min(
        this.gameState.playerStats.maxHealth,
        this.gameState.playerStats.health + this.gameState.playerStats.healthRegen * deltaSeconds
      );
    }
  }

  private updatePlayerMovement(deltaSeconds: number): void {
    let targetX: number;
    let targetY: number;

    if (this.attractMode.isActive()) {
      // Use attract mode bot control
      const botTarget = this.attractMode.update(deltaSeconds * 1000, this.player.x, this.player.y);
      targetX = botTarget.x;
      targetY = botTarget.y;
    } else {
      if (!this.mouseActive) return;
      targetX = this.pointer.x;
      targetY = this.pointer.y;
    }

    // Clamp to world bounds (viewport)
    const bounds = this.physics.world.bounds;
    targetX = Phaser.Math.Clamp(targetX, bounds.left, bounds.right);
    targetY = Phaser.Math.Clamp(targetY, bounds.top, bounds.bottom);

    // Move player towards target with speed
    const speed = this.gameState.playerStats.moveSpeed;
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1) {
      const moveX = (dx / distance) * speed * deltaSeconds;
      const moveY = (dy / distance) * speed * deltaSeconds;
      this.player.x += moveX;
      this.player.y += moveY;
    }

    // Update global position
    this.gameState.playerPos = { x: this.player.x, y: this.player.y };
  }

  private updateEnemies(deltaSeconds: number): void {
    const playerX = this.player.x;
    const playerY = this.player.y;
    this.enemies.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const enemy = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        const speed = 100; // base speed
        enemy.x += (dx / distance) * speed * deltaSeconds;
        enemy.y += (dy / distance) * speed * deltaSeconds;
      }
    });
  }

  private spawnEnemy(): void {
    const side = Phaser.Math.Between(0, 3);
    let x = 0, y = 0;
    const width = this.scale.width;
    const height = this.scale.height;
    switch (side) {
      case 0: // top
        x = Phaser.Math.Between(0, width);
        y = -20;
        break;
      case 1: // right
        x = width + 20;
        y = Phaser.Math.Between(0, height);
        break;
      case 2: // bottom
        x = Phaser.Math.Between(0, width);
        y = height + 20;
        break;
      case 3: // left
        x = -20;
        y = Phaser.Math.Between(0, height);
        break;
    }
    const enemy = this.enemies.create(x, y, 'pixel') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    enemy.setCircle(15);
    enemy.setDisplaySize(30, 30);
    enemy.setTint(0xff0000);
    // Store health as a property
    (enemy as any).health = 20;
    (enemy as any).maxHealth = 20;
    (enemy as any).xpDrop = 25; // Increased XP for faster testing
    (enemy as any).damage = 15;
  }

  private fireAtNearestEnemy(): void {
    const enemies = this.enemies.getChildren();
    if (enemies.length === 0) return;

    // Find nearest enemy
    let nearest = enemies[0] as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let minDist = Number.MAX_VALUE;
    for (const child of enemies) {
      const enemy = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }

    // Create projectile(s) based on projectileCount
    const count = this.gameState.playerStats.projectileCount;
    for (let i = 0; i < count; i++) {
      // Add slight spread for multiple projectiles
      const spreadX = count > 1 ? (i - (count - 1) / 2) * 20 : 0;
      const spreadY = count > 1 ? (i - (count - 1) / 2) * 20 : 0;
      this.createProjectile(nearest.x + spreadX, nearest.y + spreadY);
    }

    // Play shoot SFX
    audioSystem.playShoot();
  }

  private createProjectile(targetX: number, targetY: number): void {
    const projectile = this.projectiles.create(this.player.x, this.player.y, 'pixel') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    projectile.setCircle(5);
    projectile.setDisplaySize(10, 10);
    projectile.setTint(0x00aaff);
    // Set velocity towards target
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 400;
    if (distance > 0) {
      projectile.setVelocity(dx / distance * speed, dy / distance * speed);
    }
    // Set damage
    (projectile as any).damage = this.gameState.playerStats.damage;
    // Auto destroy after range
    this.time.delayedCall(2000, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  private handleProjectileHit(object1: Phaser.GameObjects.GameObject, object2: Phaser.GameObjects.GameObject): void {
    // Determine which is projectile and which is enemy
    let proj: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let e: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    
    if (this.projectiles.contains(object1 as any)) {
      proj = object1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      e = object2 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    } else {
      proj = object2 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      e = object1 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    }

    const damage = (proj as any).damage;
    let health = (e as any).health;
    health -= damage;
    (e as any).health = health;
    
    if (health <= 0) {
      // Enemy death — spawn death particles
      this.spawnDeathParticles(e.x, e.y);
      
      // Spawn XP gem
      this.spawnXPGem(e.x, e.y, (e as any).xpDrop);
      
      // Destroy enemy
      e.destroy();
      
      // Increment kills
      this.gameState.kills += 1;
    } else {
      // Hit effect (flash white)
      e.setTint(0xffffff);
      this.time.delayedCall(100, () => {
        if (e.active) {
          e.setTint(0xff0000);
        }
      });
    }
    
    // Destroy projectile
    proj.destroy();
    
    // Play hit SFX
    audioSystem.playHit();
  }

  private spawnDeathParticles(x: number, y: number): void {
    // Create a burst of particles at the enemy death location
    const particleCount = 8;
    const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Phaser.Math.Between(50, 150);
      const particle = this.add.sprite(x, y, 'particle');
      particle.setTint(Phaser.Utils.Array.GetRandom(colors));
      particle.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
      
      // Animate particle
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.tweens.add({
        targets: particle,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private handleEnemyHit(_player: Phaser.GameObjects.GameObject, enemy: Phaser.GameObjects.GameObject): void {
    const now = this.time.now;
    // Cooldown of 1 second between hits
    if (now - this.lastHitTime < 1000) return;
    this.lastHitTime = now;
    const damage = (enemy as any).damage || 10;
    this.gameState.playerStats.health -= damage;
    
    // Flash player red
    this.player.setTint(0xff6666);
    this.time.delayedCall(200, () => this.player.setTint(0xffff00));
  }

  private handleXPGemCollection(_player: Phaser.GameObjects.GameObject, gem: Phaser.GameObjects.GameObject): void {
    const xpValue = (gem as any).xpValue || 10;
    const adjustedXP = this.xpSystem.collectXP(xpValue);
    this.gameState.xp += adjustedXP;
    gem.destroy();

    // Check for level-up
    this.checkLevelUp();
  }

  private checkLevelUp(): void {
    if (this.gameState.xp >= this.gameState.xpToNextLevel) {
      this.triggerLevelUp();
    }
  }

  private triggerLevelUp(): void {
    // Increase level
    this.gameState.level += 1;
    
    // Carry over excess XP
    const excessXP = this.gameState.xp - this.gameState.xpToNextLevel;
    this.gameState.xp = excessXP;
    
    // Increase XP requirement for next level
    this.gameState.xpToNextLevel = Math.floor(this.gameState.xpToNextLevel * 1.5);
    
    // Play level-up SFX
    audioSystem.playLevelUp();
    
    // Pause the game and show level-up modal
    this.pauseAndShowLevelUpModal();
  }

  private handleLevelUp(): void {
    // This is called by XPSystem when level up should occur
    // The actual handling is done in triggerLevelUp
    this.triggerLevelUp();
  }

  private pauseAndShowLevelUpModal(): void {
    this.isPaused = true;
    this.gameState.phase = 'paused';
    
    // Pick 3 random upgrades
    this.pendingUpgrades = pickUpgrades(3);
    
    // Show the modal
    this.showLevelUpModal(this.pendingUpgrades);
  }

  private showLevelUpModal(upgrades: UpgradeOption[]): void {
    let modal = document.getElementById('level-up-modal');
    if (!modal) {
      // Create the modal if it doesn't exist
      modal = document.createElement('div');
      modal.id = 'level-up-modal';
      modal.style.position = 'absolute';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
      modal.style.zIndex = '1000';
      (document.getElementById('game-container') ?? document.body).appendChild(modal);
    }

    // Create modal content
    const content = document.createElement('div');
    content.style.textAlign = 'center';
    content.style.backgroundColor = '#2a1a3e';
    content.style.padding = '30px';
    content.style.borderRadius = '10px';
    content.style.border = '2px solid #8b5cf6';
    content.style.color = 'white';
    content.style.fontFamily = 'sans-serif';
    content.style.minWidth = '400px';

    const title = document.createElement('h2');
    title.textContent = 'Level Up!';
    title.style.marginBottom = '20px';
    title.style.color = '#fbbf24';
    content.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = `Level ${this.gameState.level}`;
    subtitle.style.marginBottom = '20px';
    subtitle.style.fontSize = '1.2rem';
    content.appendChild(subtitle);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '10px';

    upgrades.forEach((upgrade, index) => {
      const button = document.createElement('button');
      button.className = 'upgrade-option';
      button.textContent = upgrade.name;
      button.style.padding = '15px 20px';
      button.style.fontSize = '1rem';
      button.style.cursor = 'pointer';
      button.style.backgroundColor = '#4c1d95';
      button.style.color = 'white';
      button.style.border = '2px solid #8b5cf6';
      button.style.borderRadius = '5px';
      button.style.transition = 'background-color 0.2s';

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#6d28d9';
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#4c1d95';
      });

      button.addEventListener('click', () => {
        this.selectUpgrade(index);
      });

      optionsContainer.appendChild(button);
    });

    content.appendChild(optionsContainer);
    
    // Clear and append
    modal.innerHTML = '';
    modal.appendChild(content);
    modal.style.display = 'flex';
  }

  private hideLevelUpModal(): void {
    const modal = document.getElementById('level-up-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private selectUpgrade(index: number): void {
    const upgrade = this.pendingUpgrades[index];
    if (upgrade) {
      // Apply the upgrade
      this.gameState.playerStats = applyUpgrade(this.gameState.playerStats, upgrade);
      
      // Update XP system with new stats
      this.xpSystem.updateStats(this.gameState.playerStats);
      
      // Update fire interval for testing
      this.updateFireInterval();
      
      // Hide modal and resume game
      this.hideLevelUpModal();
      this.isPaused = false;
      this.gameState.phase = 'playing';
    }
  }

  private updateFireInterval(): void {
    const interval = getCurrentFireInterval(this.gameState.playerStats);
    (this.gameState as any).projectileFireInterval = interval;
  }

  private spawnXPGem(x: number, y: number, amount: number): void {
    const gem = this.xpGems.create(x, y, 'pixel') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    gem.setCircle(10);
    gem.setDisplaySize(20, 20);
    gem.setTint(0x00ff00);
    (gem as any).xpValue = amount;
  }

  private updateGameState(): void {
    // Update enemies array for testing
    this.gameState.enemies = this.enemies.getChildren().map((child: Phaser.GameObjects.GameObject) => {
      const enemy = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      return {
        x: enemy.x,
        y: enemy.y,
        health: (enemy as any).health,
        maxHealth: (enemy as any).maxHealth,
      };
    });
    // Update projectiles array
    this.gameState.projectiles = this.projectiles.getChildren().map((child: Phaser.GameObjects.GameObject) => {
      const proj = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      return {
        x: proj.x,
        y: proj.y,
      };
    });
    // Update player health
    this.gameState.playerStats.health = Math.max(0, this.gameState.playerStats.health);
    // If health <= 0 trigger game over
    if (this.gameState.playerStats.health <= 0 && this.gameState.phase === 'playing') {
      this.gameState.phase = 'gameover';

      // If in attract mode, end it and return to title
      if (this.attractMode.isActive()) {
        this.attractMode.stop();
        (window as any).attractModeEnded = true;
      } else {
        this.scene.start('GameOver');
      }
    }
  }

  private endAttractMode(): void {
    this.attractMode.stop();
    (window as any).attractModeEnded = true;

    // Return to title screen
    this.scene.stop();
    this.scene.start('MainMenu');
  }
}
