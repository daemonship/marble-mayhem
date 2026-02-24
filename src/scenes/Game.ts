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
  private spawnTimer: number = 0;
  private fireTimer: number = 0;
  private gameState: GameState;
  private lastHitTime: number = 0;
  private xpSystem!: XPSystem;
  private isPaused: boolean = false;
  private pendingUpgrades: UpgradeOption[] = [];
  private attractMode!: AttractMode;
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

    // Create all game textures at proper sizes (avoids Phaser 3.90 body-scale bug)
    this.createGameTextures();

    // Create player sprite using properly-sized texture (scaleX=1 → body.halfWidth=radius)
    this.player = this.physics.add.sprite(400, 300, 'playerTex');
    this.player.setCircle(20, 0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).syncBounds = false;
    this.player.body.setAllowGravity(false);
    this.player.setCollideWorldBounds(true);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Track mouse on window (not just canvas) so events fire in the black margins.
    // Use Phaser's displayScale to convert screen coords → game coords.
    this.mouseMoveHandler = (e: MouseEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      // Convert CSS pixel offset to game coordinates using canvas rect dimensions.
      // Avoids DPR issues with this.scale.displayScale which includes physical pixels.
      const scaleX = rect.width > 0 ? this.scale.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.scale.height / rect.height : 1;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.mouseMoveHandler) window.removeEventListener('mousemove', this.mouseMoveHandler);
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
    make('enemyTex', 30, 0xff0000, 15);    // 30×30 red circle
    make('projTex', 10, 0x00aaff, 5);      // 10×10 blue circle
    make('gemTex', 20, 0x00ff00, 10);      // 20×20 green circle
    make('particle', 8, 0xffffff, 4);      // 8×8 white circle (death particles)
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
      targetX = this.mouseX;
      targetY = this.mouseY;
    }

    // Clamp mouse target to canvas bounds
    targetX = Phaser.Math.Clamp(targetX, 0, this.scale.width);
    targetY = Phaser.Math.Clamp(targetY, 0, this.scale.height);

    // Velocity-based movement: physics engine moves the body, sprite follows.
    // setCollideWorldBounds keeps the player inside the arena.
    const speed = this.gameState.playerStats.moveSpeed;
    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 2) {
      this.player.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    } else {
      this.player.setVelocity(0, 0);
    }

    // Update global position
    this.gameState.playerPos = { x: this.player.x, y: this.player.y };
  }

  private updateEnemies(_deltaSeconds: number): void {
    const playerX = this.player.x;
    const playerY = this.player.y;
    this.enemies.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const enemy = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        const speed = 100;
        enemy.setVelocity((dx / distance) * speed, (dy / distance) * speed);
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
    const enemy = this.enemies.create(x, y, 'enemyTex') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    enemy.setCircle(15, 0, 0);
    (enemy.body as Phaser.Physics.Arcade.Body).syncBounds = false;
    enemy.body.setAllowGravity(false);
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

    // Lead the target: enemy moves toward player at 100px/s, bullet at 400px/s.
    // Bullet travel time ≈ dist/400; enemy covers dist/4 in that time toward player.
    // Predicted position = 25% lerp from enemy toward player.
    const leadX = nearest.x + (this.player.x - nearest.x) * 0.25;
    const leadY = nearest.y + (this.player.y - nearest.y) * 0.25;

    // Create projectile(s) based on projectileCount
    const count = this.gameState.playerStats.projectileCount;
    for (let i = 0; i < count; i++) {
      // Add slight spread for multiple projectiles
      const spreadX = count > 1 ? (i - (count - 1) / 2) * 20 : 0;
      const spreadY = count > 1 ? (i - (count - 1) / 2) * 20 : 0;
      this.createProjectile(leadX + spreadX, leadY + spreadY);
    }

    // Play shoot SFX
    audioSystem.playShoot();
  }

  private createProjectile(targetX: number, targetY: number): void {
    const projectile = this.projectiles.create(this.player.x, this.player.y, 'projTex') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    projectile.setCircle(5, 0, 0);
    (projectile.body as Phaser.Physics.Arcade.Body).syncBounds = false;
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
    if (this.isPaused) return; // don't take damage during upgrade selection
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

    // Freeze physics (stops enemy/player/projectile movement) and Phaser
    // time events (pauses bullet auto-destroy timers so they don't fire
    // during the modal and destroy in-flight bullets).
    this.physics.world.pause();
    this.time.paused = true;

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
      // Ensure player survives if health hit 0 during the same frame as level-up
      if (this.gameState.playerStats.health <= 0) {
        this.gameState.playerStats.health = 1;
      }
      // Resume physics and timers — all velocities and positions are preserved
      this.time.paused = false;
      this.physics.world.resume();
      this.lastHitTime = this.time.now; // 1-second invincibility window on resume
      this.isPaused = false;
      this.gameState.phase = 'playing';
    }
  }

  private updateFireInterval(): void {
    const interval = getCurrentFireInterval(this.gameState.playerStats);
    (this.gameState as any).projectileFireInterval = interval;
  }

  private spawnXPGem(x: number, y: number, amount: number): void {
    const gem = this.xpGems.create(x, y, 'gemTex') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    gem.setCircle(10, 0, 0);
    (gem.body as Phaser.Physics.Arcade.Body).syncBounds = false;
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
