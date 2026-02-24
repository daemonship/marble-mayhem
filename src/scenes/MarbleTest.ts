import Phaser from 'phaser';

// Marble Mayhem — movement feel prototype
// Goal: answer one question: does rolling a marble with momentum feel fun?
// Physics constants are tunable at the top of the class.
export class MarbleTest extends Phaser.Scene {
  private marble!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private bumpers!: Phaser.Physics.Arcade.StaticGroup;

  private mouseX = 400;
  private mouseY = 300;
  private mouseMoveHandler?: (e: MouseEvent) => void;

  private isFalling = false;
  private fallCount = 0;
  private hudText!: Phaser.GameObjects.Text;
  private cursorDot!: Phaser.GameObjects.Arc;

  // Platform geometry
  private readonly PLAT_X   = 400;
  private readonly PLAT_Y   = 305;
  private readonly PLAT_R   = 255;
  private readonly MARBLE_R = 20;

  // ── Physics knobs ── tweak these to tune the feel ────────────────────────
  private readonly FORCE     = 1500;  // max acceleration toward cursor (px/s²)
  private readonly MAX_SPEED = 480;   // top speed (px/s)
  private readonly DRAG      = 240;   // deceleration while coasting (px/s²)
  private readonly BOUNCE    = 0.82;  // restitution: 0 = dead stop, 1 = perfect elastic
  // ─────────────────────────────────────────────────────────────────────────

  constructor() { super({ key: 'MarbleTest' }); }

  create(): void {
    this.add.rectangle(400, 300, 800, 600, 0x0d0d1f);
    this.buildPlatform();
    this.buildTextures();
    this.buildMarble();
    this.buildBumpers();
    this.setupInput();
    this.buildHUD();
  }

  // ── Platform (visual only, no physics body) ──────────────────────────────
  private buildPlatform(): void {
    const g = this.add.graphics().setDepth(1);

    // Drop shadow
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(this.PLAT_X + 9, this.PLAT_Y + 12, this.PLAT_R);

    // Surface
    g.fillStyle(0x374151);
    g.fillCircle(this.PLAT_X, this.PLAT_Y, this.PLAT_R);

    // Concentric depth rings
    for (let r = 60; r < this.PLAT_R; r += 60) {
      g.lineStyle(1, 0x4b5563, 0.45);
      g.strokeCircle(this.PLAT_X, this.PLAT_Y, r);
    }

    // Outer rim
    g.lineStyle(5, 0x6b7280);
    g.strokeCircle(this.PLAT_X, this.PLAT_Y, this.PLAT_R);

    // Inner rim highlight
    g.lineStyle(2, 0x9ca3af, 0.5);
    g.strokeCircle(this.PLAT_X, this.PLAT_Y, this.PLAT_R - 3);
  }

  // ── Textures via HTML Canvas (allows arc clipping) ───────────────────────
  private buildTextures(): void {
    this.makeMarbleTexture();
    this.makeBumperTexture();
  }

  private makeMarbleTexture(): void {
    if (this.textures.exists('marbTex')) return;
    const r = this.MARBLE_R;
    const s = r * 2;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    // Dark navy base
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a8a';
    ctx.fill();

    // Lighter top hemisphere (shows rotation clearly when marble spins)
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, s, r);       // top half of the bounding box, clipped to circle
    ctx.restore();

    // Equatorial stripe
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(147,197,253,0.45)';
    ctx.fillRect(0, r - 3, s, 6);
    ctx.restore();

    // Specular highlight (glassy look)
    const grd = ctx.createRadialGradient(r - 6, r - 7, 1, r - 4, r - 5, 9);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, s, s);
    ctx.restore();

    this.textures.addCanvas('marbTex', canvas);
  }

  private makeBumperTexture(): void {
    if (this.textures.exists('bumpTex')) return;
    const r = 18;
    const s = r * 2;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    const grd = ctx.createRadialGradient(r - 4, r - 5, 2, r, r, r);
    grd.addColorStop(0, '#fbbf24');
    grd.addColorStop(0.55, '#d97706');
    grd.addColorStop(1, '#92400e');
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.textures.addCanvas('bumpTex', canvas);
  }

  // ── Marble ───────────────────────────────────────────────────────────────
  private buildMarble(): void {
    this.marble = this.physics.add.sprite(this.PLAT_X, this.PLAT_Y, 'marbTex');
    this.marble.setDepth(10);
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.MARBLE_R, 0, 0);
    body.syncBounds = false;
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    body.setBounce(this.BOUNCE, this.BOUNCE);
    body.setDrag(this.DRAG, this.DRAG);
    body.setMaxVelocity(this.MAX_SPEED, this.MAX_SPEED);
  }

  // ── Bumpers (static obstacles to bounce off) ─────────────────────────────
  private buildBumpers(): void {
    this.bumpers = this.physics.add.staticGroup();

    const positions = [
      { x: this.PLAT_X - 115, y: this.PLAT_Y - 95 },
      { x: this.PLAT_X + 125, y: this.PLAT_Y + 55 },
      { x: this.PLAT_X - 55,  y: this.PLAT_Y + 145 },
    ];

    for (const pos of positions) {
      const b = this.bumpers.create(pos.x, pos.y, 'bumpTex') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      b.setDepth(9);
      (b.body as Phaser.Physics.Arcade.StaticBody).setCircle(18, 0, 0);
      b.refreshBody();
    }

    this.physics.add.collider(this.marble, this.bumpers);
  }

  // ── Input ────────────────────────────────────────────────────────────────
  private setupInput(): void {
    this.mouseMoveHandler = (e: MouseEvent) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const sx = this.scale.width / rect.width;
      const sy = this.scale.height / rect.height;
      if (document.pointerLockElement === this.game.canvas) {
        this.mouseX = Phaser.Math.Clamp(this.mouseX + e.movementX * sx, 0, this.scale.width);
        this.mouseY = Phaser.Math.Clamp(this.mouseY + e.movementY * sy, 0, this.scale.height);
      } else {
        this.mouseX = (e.clientX - rect.left) * sx;
        this.mouseY = (e.clientY - rect.top)  * sy;
      }
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);

    const lock = () => {
      if (document.pointerLockElement !== this.game.canvas)
        try { this.game.canvas.requestPointerLock(); } catch (_) {}
    };
    this.game.canvas.addEventListener('pointerdown', lock);
    try { this.game.canvas.requestPointerLock(); } catch (_) {}

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.mouseMoveHandler) window.removeEventListener('mousemove', this.mouseMoveHandler);
      this.game.canvas.removeEventListener('pointerdown', lock);
      if (document.pointerLockElement === this.game.canvas) document.exitPointerLock();
    });
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  private buildHUD(): void {
    const s = {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#e2e8f0', stroke: '#000000', strokeThickness: 3,
    };
    this.hudText = this.add.text(10, 10, '', s).setDepth(20);
    this.add.text(400, 592, 'Move mouse to roll  •  Stay on the platform', {
      fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5, 1).setDepth(20);
    this.cursorDot = this.add.circle(this.mouseX, this.mouseY, 4, 0xffffff, 0.6).setDepth(25);
  }

  // ── Game loop ─────────────────────────────────────────────────────────────
  update(_time: number, delta: number): void {
    this.cursorDot.setPosition(this.mouseX, this.mouseY);
    if (this.isFalling) return;

    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    const dt   = delta / 1000;

    // Accelerate toward cursor — scales with distance so nearby = gentle nudge
    const dx   = this.mouseX - this.marble.x;
    const dy   = this.mouseY - this.marble.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const mag = Math.min(dist * 6, this.FORCE);
      body.setAcceleration((dx / dist) * mag, (dy / dist) * mag);
    } else {
      body.setAcceleration(0, 0);
    }

    // Visual roll: sprite rotates based on horizontal velocity
    // (1 radian per MARBLE_R pixels traveled — correct for a rolling circle)
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed > 4) {
      this.marble.rotation += (body.velocity.x / this.MARBLE_R) * dt;
    }

    // Platform edge — did the marble roll off?
    const offEdge = Math.hypot(this.marble.x - this.PLAT_X, this.marble.y - this.PLAT_Y);
    if (offEdge > this.PLAT_R - this.MARBLE_R + 2) {
      this.triggerFall();
    }

    this.hudText.setText(`Speed: ${Math.round(speed)} px/s\nFalls: ${this.fallCount}`);
  }

  // ── Fall & respawn ────────────────────────────────────────────────────────
  private triggerFall(): void {
    if (this.isFalling) return;
    this.isFalling = true;
    this.fallCount++;

    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);

    // "FELL!" text floats up
    const label = this.add.text(this.marble.x, this.marble.y - 24, 'FELL!', {
      fontSize: '22px', color: '#f87171', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: label, y: label.y - 55, alpha: 0,
      duration: 900, onComplete: () => label.destroy(),
    });

    // Marble shrinks as it "falls away"
    this.tweens.add({
      targets: this.marble, scaleX: 0, scaleY: 0, alpha: 0,
      duration: 420, ease: 'Power2', onComplete: () => this.respawn(),
    });
  }

  private respawn(): void {
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.reset(this.PLAT_X, this.PLAT_Y);
    this.marble.setPosition(this.PLAT_X, this.PLAT_Y);
    this.marble.setScale(1).setAlpha(1);
    this.marble.rotation = 0;

    // Brief blink, then re-enable input
    this.tweens.add({
      targets: this.marble, alpha: 0.15, duration: 110, yoyo: true, repeat: 3,
      onComplete: () => { this.marble.setAlpha(1); this.isFalling = false; },
    });
  }
}
