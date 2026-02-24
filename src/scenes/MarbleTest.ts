import Phaser from 'phaser';

type BumperDatum = {
  x: number; y: number; radius: number;
  sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  pulsing: boolean;
};

// Marble Mayhem — movement feel prototype
export class MarbleTest extends Phaser.Scene {
  private marble!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private bumpers!: Phaser.Physics.Arcade.StaticGroup;
  private bumperData: BumperDatum[] = [];

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

  // ── Physics knobs ── tweak to tune feel ──────────────────────────────────
  private readonly FORCE      = 1200;  // max accel toward cursor (px/s²)
  private readonly MAX_SPEED  = 360;   // top speed (px/s)
  // Drag expressed as velocity half-life (seconds).
  // When cursor is ON marble → DRAG_NEAR (strong braking).
  // When cursor is far       → DRAG_FAR  (gentle coast).
  // Blended linearly by cursor distance up to DRAG_DIST.
  private readonly DRAG_FAR   = 2.0;   // s to halve speed while coasting
  private readonly DRAG_NEAR  = 0.4;   // s to halve speed while braking (cursor on marble)
  private readonly DRAG_DIST  = 80;    // px — full near-drag at 0, full far-drag at DRAG_DIST
  // Bowl: inward force ramps up from BOWL_START×radius to the rim
  private readonly BOWL_FORCE = 2600;  // peak inward accel at rim (px/s²)
  private readonly BOWL_START = 0.65;  // fraction of safe radius where slope begins
  // Bumpers
  private readonly BOUNCE     = 0.72;
  private readonly BUMP_KICK  = 280;   // extra speed away from bumper on hit (px/s)
  // ─────────────────────────────────────────────────────────────────────────

  constructor() { super({ key: 'MarbleTest' }); }

  create(): void {
    this.add.rectangle(400, 300, 800, 600, 0x0b0b1a);
    this.buildPlatform();
    this.buildTextures();
    this.buildMarble();
    this.buildBumpers();
    this.setupInput();
    this.buildHUD();
  }

  // ── Platform — canvas texture so we can use radial gradients ─────────────
  private buildPlatform(): void {
    if (!this.textures.exists('platTex')) {
      const pad = 6;
      const r   = this.PLAT_R + pad;
      const s   = r * 2;
      const c   = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d')!;

      // Drop shadow (offset circle under platform)
      const shadow = ctx.createRadialGradient(r + 10, r + 14, this.PLAT_R * 0.3, r + 10, r + 14, this.PLAT_R + pad);
      shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
      shadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, s, s);

      // Bowl surface: bright center (high) → dark rim (low)
      const surf = ctx.createRadialGradient(r, r, 0, r, r, this.PLAT_R);
      surf.addColorStop(0,    '#7a8899');  // centre — bright, elevated
      surf.addColorStop(0.45, '#5a6778');
      surf.addColorStop(0.72, '#3d4e60');  // slope zone starts
      surf.addColorStop(0.90, '#2a3a4a');  // steep near rim
      surf.addColorStop(1,    '#1a2535');  // rim wall — dark
      ctx.beginPath();
      ctx.arc(r, r, this.PLAT_R, 0, Math.PI * 2);
      ctx.fillStyle = surf;
      ctx.fill();

      // Rim wall: bright top edge (light hitting the raised rim)
      ctx.beginPath();
      ctx.arc(r, r, this.PLAT_R, 0, Math.PI * 2);
      ctx.strokeStyle = '#8fa0b3';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Outer shadow edge
      ctx.beginPath();
      ctx.arc(r, r, this.PLAT_R + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Subtle concentric rings (depth cue)
      ctx.strokeStyle = 'rgba(100,120,140,0.2)';
      ctx.lineWidth = 1;
      for (let ri = 65; ri < this.PLAT_R; ri += 65) {
        ctx.beginPath();
        ctx.arc(r, r, ri, 0, Math.PI * 2);
        ctx.stroke();
      }

      this.textures.addCanvas('platTex', c);
    }

    const pad = 6;
    this.add.image(this.PLAT_X, this.PLAT_Y, 'platTex')
      .setDisplaySize((this.PLAT_R + pad) * 2, (this.PLAT_R + pad) * 2)
      .setDepth(1);
  }

  // ── Marble + bumper textures ──────────────────────────────────────────────
  private buildTextures(): void {
    if (!this.textures.exists('marbTex')) {
      const r = this.MARBLE_R, s = r * 2;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d')!;

      // Dark navy base
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fillStyle = '#1e3a8a';
      ctx.fill();

      // Lighter top hemisphere — makes rotation visible when marble spins
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, s, r);   // top half, clipped to circle
      ctx.restore();

      // Equatorial stripe
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(147,197,253,0.4)';
      ctx.fillRect(0, r - 3, s, 6);
      ctx.restore();

      // Specular highlight (glassy)
      const g = ctx.createRadialGradient(r - 6, r - 7, 1, r - 4, r - 5, 9);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.restore();

      this.textures.addCanvas('marbTex', c);
    }

    if (!this.textures.exists('bumpTex')) {
      const r = 18, s = r * 2;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(r - 4, r - 5, 2, r, r, r);
      g.addColorStop(0, '#fbbf24');
      g.addColorStop(0.55, '#d97706');
      g.addColorStop(1, '#92400e');
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      this.textures.addCanvas('bumpTex', c);
    }
  }

  // ── Marble (physics body, drag managed manually) ──────────────────────────
  private buildMarble(): void {
    this.marble = this.physics.add.sprite(this.PLAT_X, this.PLAT_Y, 'marbTex');
    this.marble.setDepth(10);
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.MARBLE_R, 0, 0);
    body.syncBounds = false;
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    body.setBounce(this.BOUNCE, this.BOUNCE);
    body.setDrag(0, 0);              // drag managed in update() for fine control
    body.setMaxVelocity(this.MAX_SPEED, this.MAX_SPEED);
  }

  // ── Bumpers (static, with collision callback for pulse) ───────────────────
  private buildBumpers(): void {
    this.bumpers = this.physics.add.staticGroup();
    const BUMP_R = 18;
    const positions = [
      { x: this.PLAT_X - 115, y: this.PLAT_Y - 95  },
      { x: this.PLAT_X + 125, y: this.PLAT_Y + 55  },
      { x: this.PLAT_X - 55,  y: this.PLAT_Y + 145 },
    ];
    for (const pos of positions) {
      const sprite = this.bumpers.create(pos.x, pos.y, 'bumpTex') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      sprite.setDepth(9);
      (sprite.body as Phaser.Physics.Arcade.StaticBody).setCircle(BUMP_R, 0, 0);
      sprite.refreshBody();
      this.bumperData.push({ ...pos, radius: BUMP_R, sprite, pulsing: false });
    }

    // Collision callback fires on actual contact — perfect hook for pulse + kick
    this.physics.add.collider(
      this.marble, this.bumpers,
      (_m, b) => {
        const bd = this.bumperData.find(d => d.sprite === b);
        if (bd && !bd.pulsing) this.pulseBumper(bd);
      },
      undefined, this,
    );
  }

  private pulseBumper(bd: BumperDatum): void {
    bd.pulsing = true;

    // Extra outward velocity kick so the marble clearly bounces away
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    const dx = this.marble.x - bd.x;
    const dy = this.marble.y - bd.y;
    const d  = Math.hypot(dx, dy) || 1;
    body.velocity.x += (dx / d) * this.BUMP_KICK;
    body.velocity.y += (dy / d) * this.BUMP_KICK;
    const spd = Math.hypot(body.velocity.x, body.velocity.y);
    if (spd > this.MAX_SPEED) {
      body.velocity.x *= this.MAX_SPEED / spd;
      body.velocity.y *= this.MAX_SPEED / spd;
    }

    // Bumper pulses outward
    this.tweens.add({
      targets: bd.sprite, scaleX: 1.5, scaleY: 1.5,
      duration: 80, yoyo: true, ease: 'Power2',
      onComplete: () => { bd.sprite.setScale(1); bd.pulsing = false; },
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────
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

  // ── HUD ───────────────────────────────────────────────────────────────────
  private buildHUD(): void {
    const s = { fontSize: '14px', fontFamily: 'monospace', color: '#e2e8f0', stroke: '#000000', strokeThickness: 3 };
    this.hudText = this.add.text(10, 10, '', s).setDepth(20);
    this.add.text(400, 592,
      'Move mouse to roll  •  Stay on the platform  •  Cursor ON marble = brake',
      { fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', align: 'center' },
    ).setOrigin(0.5, 1).setDepth(20);
    this.cursorDot = this.add.circle(this.mouseX, this.mouseY, 4, 0xffffff, 0.6).setDepth(25);
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  update(_time: number, delta: number): void {
    this.cursorDot.setPosition(this.mouseX, this.mouseY);
    if (this.isFalling) return;

    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    const dt   = delta / 1000;

    // Read velocity — Phaser has already applied bounce from this frame's collisions
    let vx = body.velocity.x;
    let vy = body.velocity.y;

    // ── Force toward cursor ──────────────────────────────────────────────
    const dx   = this.mouseX - this.marble.x;
    const dy   = this.mouseY - this.marble.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 6) {
      const mag = Math.min(dist * 5, this.FORCE);
      vx += (dx / dist) * mag * dt;
      vy += (dy / dist) * mag * dt;
    }

    // ── Bowl effect: inward force ramps up near the rim ──────────────────
    // Simulates the marble rolling uphill toward the raised edge.
    // Force is zero at BOWL_START × safeRadius, and peaks at the rim.
    const fromCenter = Math.hypot(this.marble.x - this.PLAT_X, this.marble.y - this.PLAT_Y);
    const safeR      = this.PLAT_R - this.MARBLE_R;
    if (fromCenter > 0) {
      const norm = fromCenter / safeR;
      if (norm > this.BOWL_START) {
        const t = Math.min(1, (norm - this.BOWL_START) / (1 - this.BOWL_START));
        const bowlForce = t * t * this.BOWL_FORCE;   // quadratic ramp
        const nx = (this.PLAT_X - this.marble.x) / fromCenter;
        const ny = (this.PLAT_Y - this.marble.y) / fromCenter;
        vx += nx * bowlForce * dt;
        vy += ny * bowlForce * dt;
      }
    }

    // ── Drag (multiplicative, frame-rate independent) ────────────────────
    // Half-life blends from DRAG_FAR (cursor away) to DRAG_NEAR (cursor on marble).
    // Placing the cursor directly on the marble acts as a brake pedal.
    const brakeFactor = Phaser.Math.Clamp(1 - dist / this.DRAG_DIST, 0, 1);
    const halfLife    = Phaser.Math.Linear(this.DRAG_FAR, this.DRAG_NEAR, brakeFactor);
    const decay       = Math.pow(0.5, dt / halfLife);
    vx *= decay;
    vy *= decay;

    // ── Speed cap ────────────────────────────────────────────────────────
    const speed = Math.hypot(vx, vy);
    if (speed > this.MAX_SPEED) {
      const s = this.MAX_SPEED / speed;
      vx *= s;
      vy *= s;
    }

    body.setVelocity(vx, vy);
    body.setAcceleration(0, 0);  // prevent Phaser from double-counting

    // ── Visual roll: sprite rotates proportional to horizontal velocity ──
    if (speed > 3) {
      this.marble.rotation += (vx / this.MARBLE_R) * dt;
    }

    // ── Platform edge — fell off? ─────────────────────────────────────────
    if (fromCenter > safeR + 2) {
      this.triggerFall();
      return;
    }

    // ── HUD ──────────────────────────────────────────────────────────────
    const pct = Math.round((fromCenter / safeR) * 100);
    this.hudText.setText(
      `Speed: ${Math.round(speed)} px/s\nFalls: ${this.fallCount}\nEdge:  ${pct}%`,
    );
  }

  // ── Fall & respawn ────────────────────────────────────────────────────────
  private triggerFall(): void {
    if (this.isFalling) return;
    this.isFalling = true;
    this.fallCount++;

    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);

    const label = this.add.text(this.marble.x, this.marble.y - 24, 'FELL!', {
      fontSize: '22px', color: '#f87171', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: label, y: label.y - 55, alpha: 0, duration: 900, onComplete: () => label.destroy() });

    this.tweens.add({
      targets: this.marble, scaleX: 0, scaleY: 0, alpha: 0,
      duration: 420, ease: 'Power2', onComplete: () => this.respawn(),
    });
  }

  private respawn(): void {
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.reset(this.PLAT_X, this.PLAT_Y);
    this.marble.setPosition(this.PLAT_X, this.PLAT_Y).setScale(1).setAlpha(1);
    this.marble.rotation = 0;
    this.tweens.add({
      targets: this.marble, alpha: 0.15, duration: 110, yoyo: true, repeat: 3,
      onComplete: () => { this.marble.setAlpha(1); this.isFalling = false; },
    });
  }
}
