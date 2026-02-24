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
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private hudHpText!: Phaser.GameObjects.Text;
  private hudXpText!: Phaser.GameObjects.Text;
  private hudStatsText!: Phaser.GameObjects.Text;
  // Pickups
  private pickups!: Phaser.Physics.Arcade.Group;
  private pickupSpawnTimer: number = 0;
  // Temporary effect expiry times (Phaser clock ms)
  private shieldEndTime: number = 0;
  private speedBoostEndTime: number = 0;

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

    // Mouse tracking: use Pointer Lock when available so the cursor is confined
    // to the canvas and can't escape to the OS desktop mid-game.
    // When locked, movementX/Y give raw deltas; accumulate them into game coords.
    // When not locked (upgrade modal, lock not yet acquired), fall back to
    // absolute position so the upgrade buttons still work correctly.
    this.mouseMoveHandler = (e: MouseEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? this.scale.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.scale.height / rect.height : 1;
      if (document.pointerLockElement === this.game.canvas) {
        this.mouseX = Phaser.Math.Clamp(this.mouseX + e.movementX * scaleX, 0, this.scale.width);
        this.mouseY = Phaser.Math.Clamp(this.mouseY + e.movementY * scaleY, 0, this.scale.height);
      } else {
        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;
      }
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);

    // Request pointer lock on canvas click (must be user gesture).
    // Also try immediately — succeeds when create() is within a gesture chain.
    const requestLock = () => {
      if (!this.isPaused && document.pointerLockElement !== this.game.canvas) {
        try { this.game.canvas.requestPointerLock(); } catch (_) {}
      }
    };
    this.game.canvas.addEventListener('pointerdown', requestLock);
    try { this.game.canvas.requestPointerLock(); } catch (_) {}

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.mouseMoveHandler) window.removeEventListener('mousemove', this.mouseMoveHandler);
      this.game.canvas.removeEventListener('pointerdown', requestLock);
      if (document.pointerLockElement === this.game.canvas) document.exitPointerLock();
    });

    // Reset effect timers
    this.shieldEndTime = 0;
    this.speedBoostEndTime = 0;
    this.pickupSpawnTimer = 0;

    // Create groups
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.xpGems = this.physics.add.group();
    this.pickups = this.physics.add.group();

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
    this.physics.add.overlap(
      this.player,
      this.pickups,
      (obj1, obj2) => this.handlePickupCollect(obj1 as Phaser.GameObjects.GameObject, obj2 as Phaser.GameObjects.GameObject),
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

    // Build the in-canvas HUD
    this.createHUD();

    // Show brief tutorial overlay unless this is attract mode
    if (!(window as any).attractModeActive) {
      this.showTutorialOverlay();
    }
  }

  private createHUD(): void {
    const style = {
      fontSize: '13px',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    };
    const depth = 95;
    this.hudGraphics = this.add.graphics().setDepth(depth);
    // Text centered in each of the three sections (canvas is 800px wide)
    this.hudHpText    = this.add.text(133, 4, '', style).setOrigin(0.5, 0).setDepth(depth + 1);
    this.hudXpText    = this.add.text(400, 4, '', style).setOrigin(0.5, 0).setDepth(depth + 1);
    this.hudStatsText = this.add.text(667, 4, '', style).setOrigin(0.5, 0).setDepth(depth + 1);
  }

  private renderHUD(): void {
    const g = this.hudGraphics;
    g.clear();

    const hp    = Math.max(0, this.gameState.playerStats.health);
    const maxHp = this.gameState.playerStats.maxHealth;
    const xp    = this.gameState.xp;
    const xpMax = this.gameState.xpToNextLevel;

    // Dark strip across the top of the canvas
    g.fillStyle(0x000000, 0.65);
    g.fillRect(0, 0, 800, 22);

    // Subtle dividers between sections
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(266, 1, 1, 20);
    g.fillRect(533, 1, 1, 20);

    // === HP bar (section 1: x 4–262) ===
    const hpRatio = hp / maxHp;
    g.fillStyle(0x4a1010);
    g.fillRect(4, 6, 258, 10);
    g.fillStyle(hpRatio > 0.5 ? 0x33ee66 : hpRatio > 0.25 ? 0xffaa00 : 0xff2200);
    g.fillRect(4, 6, Math.round(258 * hpRatio), 10);

    // === XP bar (section 2: x 270–529) ===
    const xpRatio = Math.min(1, xp / xpMax);
    g.fillStyle(0x1a0044);
    g.fillRect(270, 6, 259, 10);
    g.fillStyle(0x9944ff);
    g.fillRect(270, 6, Math.round(259 * xpRatio), 10);

    // === Text (drawn over bars with stroke for readability) ===
    this.hudHpText.setText(`HP  ${Math.ceil(hp)} / ${maxHp}`);
    this.hudXpText.setText(`Lv ${this.gameState.level}   XP  ${xp} / ${xpMax}`);
    this.hudStatsText.setText(`${this.gameState.kills} kills   ${Math.floor(this.gameState.elapsedSeconds)}s`);
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

  update(time: number, delta: number): void {
    // HUD renders every frame regardless of pause state
    this.renderHUD();

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

    // Spawn enemies — interval shrinks with difficulty
    const spawnInterval = this.getDifficultyScale().spawnInterval;
    this.spawnTimer += deltaSeconds;
    if (this.spawnTimer >= spawnInterval) {
      this.spawnEnemy();
      // At high difficulty spawn a second enemy in the same tick
      if (this.getDifficultyScale().doubleSpawn) this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Spawn temporary pickups every ~12 seconds
    this.pickupSpawnTimer += deltaSeconds;
    if (this.pickupSpawnTimer >= 12) {
      this.spawnPickup();
      this.pickupSpawnTimer = 0;
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

    const dx = targetX - this.player.x;
    const dy = targetY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 4) {
      this.player.setVelocity(0, 0);
    } else {
      // Distance-proportional speed: v = distance * k, capped at a maximum.
      // This gives fast catch-up when the cursor is far away and smooth
      // deceleration as the player closes in — no more "always behind" lag.
      // k=6 is the responsiveness tuning constant.
      const k = 6;
      const speedBoostMult = this.time.now < this.speedBoostEndTime ? 1.5 : 1;
      const maxSpeed = this.gameState.playerStats.moveSpeed * 3 * speedBoostMult; // 600 px/s base
      const speed = Math.min(distance * k, maxSpeed);
      this.player.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    }

    // Update global position
    this.gameState.playerPos = { x: this.player.x, y: this.player.y };
  }

  private updateEnemies(deltaSeconds: number): void {
    const playerX = this.player.x;
    const playerY = this.player.y;
    const now = this.time.now;
    this.enemies.getChildren().forEach((child: Phaser.GameObjects.GameObject) => {
      const enemy = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0) return;

      const baseSpeed: number = (enemy as any).speed ?? 100;
      const type: string = (enemy as any).enemyType ?? 'grunt';

      let vx = (dx / distance) * baseSpeed;
      let vy = (dy / distance) * baseSpeed;

      // Speeder: weaves side-to-side with a fast sine offset
      if (type === 'speeder') {
        const phase: number = (enemy as any).wavePhase ?? ((enemy as any).wavePhase = Math.random() * Math.PI * 2);
        (enemy as any).wavePhase += deltaSeconds * 4;
        const perp = Math.sin((enemy as any).wavePhase) * baseSpeed * 0.6;
        // perpendicular direction (rotate 90°)
        vx += (-dy / distance) * perp;
        vy += ( dx / distance) * perp;
      }

      enemy.setVelocity(vx, vy);
    });
  }

  private spawnEnemy(): void {
    const { width, height } = this.scale;
    const side = Phaser.Math.Between(0, 3);
    let x = 0, y = 0;
    switch (side) {
      case 0: x = Phaser.Math.Between(0, width); y = -30; break;
      case 1: x = width + 30; y = Phaser.Math.Between(0, height); break;
      case 2: x = Phaser.Math.Between(0, width); y = height + 30; break;
      case 3: x = -30; y = Phaser.Math.Between(0, height); break;
    }
    const diff = this.getDifficultyScale();
    const type = this.chooseEnemyType();

    type EnemyDef = { tex: string; radius: number; hp: number; speed: number; damage: number; xp: number };
    const defs: Record<string, EnemyDef> = {
      grunt:   { tex: 'enemyTex',   radius: 15, hp: 20,  speed: 100, damage: 15, xp: 25 },
      speeder: { tex: 'speederTex', radius:  8, hp: 10,  speed: 200, damage: 10, xp: 20 },
      tank:    { tex: 'tankTex',    radius: 25, hp: 80,  speed:  50, damage: 30, xp: 60 },
    };
    const def = defs[type];

    const enemy = this.enemies.create(x, y, def.tex) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    enemy.setCircle(def.radius, 0, 0);
    (enemy.body as Phaser.Physics.Arcade.Body).syncBounds = false;
    enemy.body.setAllowGravity(false);

    const hp = Math.round(def.hp * diff.hpMult);
    (enemy as any).health    = hp;
    (enemy as any).maxHealth = hp;
    (enemy as any).speed     = def.speed * diff.speedMult;
    (enemy as any).damage    = Math.round(def.damage * diff.damageMult);
    (enemy as any).xpDrop    = def.xp;
    (enemy as any).enemyType = type;
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
    if (now < this.shieldEndTime) return; // shield active — absorb hit
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

    // Release pointer lock so the cursor is visible for clicking upgrade buttons
    if (document.pointerLockElement === this.game.canvas) document.exitPointerLock();

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

      // Re-acquire pointer lock (upgrade button click is a valid user gesture)
      try { this.game.canvas.requestPointerLock(); } catch (_) {}
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

  // ── Difficulty scaling ────────────────────────────────────────────────────
  private getDifficultyScale(): { hpMult: number; speedMult: number; damageMult: number; spawnInterval: number; doubleSpawn: boolean } {
    const t = this.gameState.elapsedSeconds;
    const scale = 1 + t / 60;           // 1.0 at 0s → 2.0 at 60s → 3.0 at 120s
    return {
      hpMult:        scale,
      speedMult:     Math.min(scale, 2.5),        // cap so game stays playable
      damageMult:    scale,
      spawnInterval: Math.max(0.5, 2.0 / scale),  // 2s → 0.5s floor
      doubleSpawn:   t >= 120,
    };
  }

  // ── Enemy-type selection ──────────────────────────────────────────────────
  private chooseEnemyType(): 'grunt' | 'speeder' | 'tank' {
    const t = this.gameState.elapsedSeconds;
    const r = Math.random();
    if (t < 30) return 'grunt';
    if (t < 60) return r < 0.30 ? 'speeder' : 'grunt';
    return r < 0.10 ? 'tank' : r < 0.40 ? 'speeder' : 'grunt';
  }

  // ── Pickups ───────────────────────────────────────────────────────────────
  private spawnPickup(): void {
    const types = ['heal', 'shield', 'bomb', 'speed'] as const;
    const type  = types[Phaser.Math.Between(0, types.length - 1)];
    const texMap: Record<string, string> = {
      heal: 'pickupHeal', shield: 'pickupShield', bomb: 'pickupBomb', speed: 'pickupSpeed',
    };
    const x = Phaser.Math.Between(60, this.scale.width  - 60);
    const y = Phaser.Math.Between(60, this.scale.height - 60);
    const pickup = this.pickups.create(x, y, texMap[type]) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    pickup.setCircle(13, 0, 0);
    (pickup.body as Phaser.Physics.Arcade.Body).syncBounds = false;
    pickup.body.setAllowGravity(false);
    (pickup as any).pickupType = type;

    // Blink warning at 6s, auto-destroy at 8s
    this.time.delayedCall(6000, () => {
      if (!pickup.active) return;
      this.tweens.add({ targets: pickup, alpha: 0.1, duration: 200, yoyo: true, repeat: -1 });
    });
    this.time.delayedCall(8000, () => { if (pickup.active) pickup.destroy(); });
  }

  private handlePickupCollect(_player: Phaser.GameObjects.GameObject, pickupObj: Phaser.GameObjects.GameObject): void {
    const pickup = pickupObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const type: string = (pickup as any).pickupType ?? 'heal';
    pickup.destroy();

    switch (type) {
      case 'heal': {
        const healAmt = Math.round(this.gameState.playerStats.maxHealth * 0.25);
        this.gameState.playerStats.health = Math.min(
          this.gameState.playerStats.maxHealth,
          this.gameState.playerStats.health + healAmt
        );
        break;
      }
      case 'shield':
        this.shieldEndTime = this.time.now + 8000;
        break;
      case 'bomb':
        this.enemies.getChildren().slice().forEach(child => {
          const e = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          this.spawnDeathParticles(e.x, e.y);
          this.spawnXPGem(e.x, e.y, (e as any).xpDrop ?? 25);
          this.gameState.kills += 1;
          e.destroy();
        });
        break;
      case 'speed':
        this.speedBoostEndTime = this.time.now + 8000;
        break;
    }
  }
}
