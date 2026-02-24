import Phaser from 'phaser';

// Marble Platform — side-scroller movement POC
// Goal: does rolling + charge-jumping + parallax feel fun as a side-scroller?
//
// Controls:
//   A / ← — roll left
//   D / → — roll right
//   SPACE  — hold to charge jump, release to launch (longer hold = higher jump)
//            tap = small hop, full charge = big air
export class MarblePlatform extends Phaser.Scene {
  private marble!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  private charging  = false;
  private chargeT0  = 0;      // time charging started (ms)
  private hudText!: Phaser.GameObjects.Text;
  private chargeGfx!: Phaser.GameObjects.Graphics;  // screen-space: charge bar
  private glowGfx!: Phaser.GameObjects.Graphics;    // world-space: energy aura around marble
  private goalReached = false;

  // Springs: visual + trigger zone
  private springs: Array<{ x: number; y: number; sprite: Phaser.GameObjects.Image }> = [];

  // Parallax tile sprites (updated every frame)
  private pxLayers: Array<{ ts: Phaser.GameObjects.TileSprite; factor: number }> = [];

  // ── World ─────────────────────────────────────────────────────────────────
  private readonly WORLD_W   = 5200;
  private readonly GROUND_Y  = 528;   // top of the main ground surface

  // ── Marble physics knobs ──────────────────────────────────────────────────
  private readonly R           = 18;    // marble radius
  private readonly GRAVITY     = 980;   // extra downward gravity (px/s²)
  private readonly ACCEL_X     = 700;   // horizontal acceleration while key held
  private readonly MAX_VX      = 420;   // max horizontal speed
  private readonly ROLL_DRAG   = 0.93;  // velocity × this per frame when no key (rolling friction)
  private readonly JUMP_MIN    = 330;   // tap-jump launch speed
  private readonly JUMP_MAX    = 740;   // full-charge launch speed
  private readonly MAX_CHARGE  = 650;   // ms to reach full charge
  private readonly SPRING_V    = 950;   // spring pad launch speed
  // ─────────────────────────────────────────────────────────────────────────

  constructor() { super({ key: 'MarblePlatform' }); }

  create(): void {
    this.physics.world.setBounds(0, -200, this.WORLD_W, 900);
    this.cameras.main.setBounds(0, -200, this.WORLD_W, 900);

    this.buildParallax();
    this.buildTextures();
    this.buildLevel();
    this.buildMarble();
    this.buildHUD();
    this.setupInput();

    // Smooth lerp follow with a small dead zone so camera isn't jittery
    this.cameras.main.startFollow(this.marble, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(120, 80);
  }

  // ── Parallax — 3 tile layers at different scroll rates ────────────────────
  private buildParallax(): void {
    // All layers are fixed to screen (scrollFactor 0); we shift tilePositionX manually.
    const layers: Array<{ key: string; factor: number; y: number; h: number }> = [
      { key: 'px_far',  factor: 0.12, y: 0,   h: 600 },
      { key: 'px_mid',  factor: 0.35, y: 150, h: 450 },
      { key: 'px_near', factor: 0.62, y: 280, h: 400 },
    ];

    for (const def of layers) {
      if (!this.textures.exists(def.key)) this.makeParallaxTex(def.key);
      const ts = this.add.tileSprite(400, def.y + def.h / 2, 800, def.h, def.key)
        .setScrollFactor(0)
        .setDepth(-10 + layers.indexOf(def));
      this.pxLayers.push({ ts, factor: def.factor });
    }
  }

  private makeParallaxTex(key: string): void {
    // Each parallax layer is a 400×300 tile with procedural silhouettes.
    // Tile seamlessly because shapes don't reach the edges.
    const W = 400, H = 300;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;

    if (key === 'px_far') {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#070718');
      sky.addColorStop(1, '#0f1a35');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // Stars
      for (let i = 0; i < 40; i++) {
        const sz = Math.random() * 1.5 + 0.3;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H * 0.7, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      // Very distant city: thin dark spires
      ctx.fillStyle = '#0e1530';
      for (let x = 20; x < W - 20; x += 30 + Math.floor(Math.random() * 25)) {
        const h = 50 + Math.floor(Math.random() * 80);
        const w = 12 + Math.floor(Math.random() * 18);
        ctx.fillRect(x, H - h, w, h);
      }
    }

    if (key === 'px_mid') {
      ctx.clearRect(0, 0, W, H);
      // Mid-range buildings
      ctx.fillStyle = '#0b1420';
      for (let x = 0; x < W; x += 20 + Math.floor(Math.random() * 35)) {
        const h = 60 + Math.floor(Math.random() * 110);
        const w = 20 + Math.floor(Math.random() * 30);
        ctx.fillRect(x, H - h, w, h);
        // Lit windows (occasional)
        if (Math.random() > 0.5) {
          ctx.fillStyle = 'rgba(255,220,80,0.25)';
          ctx.fillRect(x + 4, H - h + 10, 5, 5);
          ctx.fillStyle = '#0b1420';
        }
      }
    }

    if (key === 'px_near') {
      ctx.clearRect(0, 0, W, H);
      // Close foreground arches / pipes / machinery silhouettes
      ctx.fillStyle = '#080e18';
      for (let x = 0; x < W; x += 50 + Math.floor(Math.random() * 40)) {
        const h = 40 + Math.floor(Math.random() * 70);
        const w = 30 + Math.floor(Math.random() * 20);
        ctx.fillRect(x, H - h, w, h);
        // Top arch decoration
        ctx.beginPath();
        ctx.arc(x + w / 2, H - h, w / 2, Math.PI, 0);
        ctx.fill();
      }
    }

    this.textures.addCanvas(key, c);
  }

  // ── Textures ──────────────────────────────────────────────────────────────
  private buildTextures(): void {
    this.makeMarbleTex();
    this.makePlatformTex();
    this.makeSpringTex();
    this.makeGoalTex();
  }

  private makeMarbleTex(): void {
    if (this.textures.exists('marbTex')) return;
    const r = this.R, s = r * 2;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    // Base
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a8a'; ctx.fill();
    // Top hemisphere (makes rotation visible)
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 0, s, r);
    ctx.restore();
    // Equatorial band
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(147,197,253,0.4)'; ctx.fillRect(0, r - 3, s, 6);
    ctx.restore();
    // Specular
    const g = ctx.createRadialGradient(r - 6, r - 7, 1, r - 4, r - 5, 9);
    g.addColorStop(0, 'rgba(255,255,255,0.88)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    ctx.restore();
    this.textures.addCanvas('marbTex', c);
  }

  private makePlatformTex(): void {
    if (this.textures.exists('platTex')) return;
    // 64×32 tile — top highlight, bottom shadow, stone face
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#374151'; ctx.fillRect(0, 0, 64, 32);
    // top surface highlight
    ctx.fillStyle = '#4b5563'; ctx.fillRect(0, 0, 64, 5);
    // bottom dark edge
    ctx.fillStyle = '#1f2937'; ctx.fillRect(0, 28, 64, 4);
    // subtle vertical joint lines
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let x = 16; x < 64; x += 16) ctx.fillRect(x, 5, 1, 23);
    this.textures.addCanvas('platTex', c);
  }

  private makeSpringTex(): void {
    if (this.textures.exists('springTex')) return;
    const c = document.createElement('canvas');
    c.width = 48; c.height = 28;
    const ctx = c.getContext('2d')!;
    // Base plate
    ctx.fillStyle = '#92400e'; ctx.fillRect(0, 20, 48, 8);
    // Spring coils
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3;
    for (let y = 4; y <= 18; y += 7) {
      ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(42, y); ctx.stroke();
    }
    // Top pad
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, 0, 40, 6);
    this.textures.addCanvas('springTex', c);
  }

  private makeGoalTex(): void {
    if (this.textures.exists('goalTex')) return;
    const c = document.createElement('canvas');
    c.width = 24; c.height = 80;
    const ctx = c.getContext('2d')!;
    // Pole
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(10, 0, 4, 80);
    // Flag
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(14, 2); ctx.lineTo(14, 26); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();
    this.textures.addCanvas('goalTex', c);
  }

  // ── Level ─────────────────────────────────────────────────────────────────
  private buildLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    const G = this.GROUND_Y;

    //  Helper: add a visible tiled platform + matching static physics body.
    //  Must use platforms.create() (not physics.add.staticImage + add()) so
    //  the body is properly registered with the group and found by the collider.
    const plat = (x: number, y: number, w: number, h = 32) => {
      // Visual: tileSprite tiles the texture at native resolution
      this.add.tileSprite(x + w / 2, y + h / 2, w, h, 'platTex').setDepth(4);
      // Physics: created through the group so the collider can find it
      const pb = this.platforms.create(x + w / 2, y + h / 2, 'platTex') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      pb.setDisplaySize(w, h).setVisible(false);
      pb.refreshBody();
    };

    // ── Ground sections (gaps between them test jumping) ─────────────────
    plat(0,    G, 560);           // spawn area — wide, safe
    plat(620,  G, 300);           // gap: 60px — easy first hop
    plat(980,  G, 260);           // gap: 60px
    plat(1320, G, 200);           // gap: 80px — gap before step section
    plat(1700, G, 800);           // long safe stretch (springs here)
    plat(2620, G, 220);
    plat(2960, G, 220);
    plat(3340, G, 1860);          // final long stretch to goal

    // ── Step platforms (ascending, teach charge jump) ─────────────────────
    plat(1340, G - 90,  160);     // one step up
    plat(1560, G - 175, 160);     // two steps up
    plat(1760, G - 95,  160, 24); // partial step back down

    // ── Floating islands (mid-air, harder to reach) ───────────────────────
    plat(700,  G - 120, 140, 24); // early secret shelf
    plat(1060, G - 150, 120, 24); // over the gap
    plat(2000, G - 200, 180, 24); // high platform — full-charge only
    plat(2260, G - 130, 140, 24);
    plat(2700, G - 180, 140, 24);
    plat(3000, G - 240, 160, 24); // very high — chain jumps
    plat(3260, G - 165, 140, 24);

    // ── Ceiling shelf (hidden above, explore with spring) ─────────────────
    plat(1900, G - 330, 300, 20);

    // ── Spring pads ───────────────────────────────────────────────────────
    this.addSpring(530,  G - 28);   // just before first gap — launch to shelf
    this.addSpring(1710, G - 28);   // start of long stretch — reach ceiling shelf
    this.addSpring(2940, G - 28);

    // ── Goal marker ───────────────────────────────────────────────────────
    this.add.image(5080, G - 80, 'goalTex').setDepth(5).setOrigin(0.5, 1);

    // ── Decorative floor under world (death plane visual) ─────────────────
    const deco = this.add.graphics().setDepth(2);
    deco.fillStyle(0x111827);
    deco.fillRect(0, G + 32, this.WORLD_W, 300);
    deco.fillStyle(0x1f2937);
    deco.fillRect(0, G + 32, this.WORLD_W, 6);
  }

  private addSpring(x: number, y: number): void {
    const sprite = this.add.image(x, y, 'springTex').setDepth(5).setOrigin(0.5, 1);
    this.springs.push({ x, y, sprite });
  }

  // ── Marble ────────────────────────────────────────────────────────────────
  private buildMarble(): void {
    this.marble = this.physics.add.sprite(80, this.GROUND_Y - this.R * 2, 'marbTex');
    this.marble.setDepth(10);

    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.R, 0, 0);
    body.syncBounds = false;
    body.setAllowGravity(true);
    body.setGravityY(this.GRAVITY);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(this.MAX_VX, 1400);
    body.setBounce(0.12, 0.05);    // slight ground bounce, negligible wall bounce

    this.physics.add.collider(this.marble, this.platforms);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  private buildHUD(): void {
    const s = { fontSize: '13px', fontFamily: 'monospace', color: '#e2e8f0', stroke: '#000', strokeThickness: 3 };
    this.hudText   = this.add.text(10, 10, '', s).setScrollFactor(0).setDepth(50);
    this.chargeGfx = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.glowGfx   = this.add.graphics().setDepth(9);   // world-space, drawn under marble

    this.add.text(400, 593,
      'A / ←  roll    D / →  roll    SPACE  hold to charge jump, release to launch',
      { fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', align: 'center' },
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(50);
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  update(time: number, delta: number): void {
    const body    = this.marble.body as Phaser.Physics.Arcade.Body;
    const dt      = delta / 1000;
    const grounded = body.blocked.down;

    // ── Parallax scroll ──────────────────────────────────────────────────
    const camX = this.cameras.main.scrollX;
    for (const layer of this.pxLayers) {
      layer.ts.tilePositionX = camX * layer.factor;
    }

    // ── Horizontal movement ──────────────────────────────────────────────
    const goLeft  = this.cursors.left.isDown  || this.keys.A.isDown;
    const goRight = this.cursors.right.isDown || this.keys.D.isDown;

    if (goLeft) {
      body.setAccelerationX(-this.ACCEL_X);
    } else if (goRight) {
      body.setAccelerationX(this.ACCEL_X);
    } else {
      body.setAccelerationX(0);
      // Rolling friction: decelerate when no key held — higher ROLL_DRAG = more momentum
      if (grounded && Math.abs(body.velocity.x) > 1) {
        body.setVelocityX(body.velocity.x * Math.pow(this.ROLL_DRAG, delta / 16.67));
      } else if (grounded) {
        body.setVelocityX(0);
      }
    }

    // ── Jump (charge-and-release) ────────────────────────────────────────
    const space = this.cursors.space;

    if (Phaser.Input.Keyboard.JustDown(space) && grounded && !this.charging) {
      this.charging = true;
      this.chargeT0 = time;
    }

    if (this.charging) {
      const t = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);

      // ── Jiggle + squish while charging ────────────────────────────────
      // Frequency climbs from ~8 Hz to ~28 Hz; amplitude grows with charge.
      // Two out-of-phase oscillators (x/y) create "shaking" not just pulsing.
      if (!this.goalReached) {
        const jiggleFreq = (0.014 + t * 0.038);     // radians per ms
        const jiggleAmp  = t * 0.07;                 // max ±7% scale deviation
        const jX =  Math.sin(time * jiggleFreq)        * jiggleAmp;
        const jY =  Math.sin(time * jiggleFreq * 1.31) * jiggleAmp;
        const baseX = 1 + t * 0.28;
        const baseY = 1 - t * 0.22;
        this.marble.setScale(baseX + jX, baseY + jY);
      }

      if (!space.isDown || t >= 1) {
        // Release: launch upward
        const jumpV = Phaser.Math.Linear(this.JUMP_MIN, this.JUMP_MAX, t);
        body.setVelocityY(-jumpV);
        this.charging = false;

        // Spring-back pop — brief stretch opposite to squish direction
        this.tweens.add({
          targets: this.marble,
          scaleX: 1 - t * 0.22, scaleY: 1 + t * 0.28,
          duration: 60, yoyo: true,
          onComplete: () => this.marble.setScale(1),
        });
      }
    }

    // Reset charging if somehow we left the ground mid-charge
    if (this.charging && !grounded && (time - this.chargeT0) > 100) {
      this.charging = false;
      this.marble.setScale(1);
    }

    // ── Spring pads ──────────────────────────────────────────────────────
    if (!this.charging && grounded) {
      for (const sp of this.springs) {
        const dx = Math.abs(this.marble.x - sp.x);
        const dy = Math.abs(this.marble.y - sp.y);        // marble bottom ≈ marble.y + R
        if (dx < 22 && dy < this.R + 14) {
          body.setVelocityY(-this.SPRING_V);
          this.tweens.add({ targets: sp.sprite, scaleY: 0.45, duration: 70, yoyo: true });
          break;
        }
      }
    }

    // ── Visual rolling ───────────────────────────────────────────────────
    // Marble rotates as it rolls; squish overrides rotation during charge
    if (!this.charging) {
      this.marble.rotation += (body.velocity.x / this.R) * dt;
    }

    // ── Goal check ───────────────────────────────────────────────────────
    if (!this.goalReached && this.marble.x > 5050) {
      this.goalReached = true;
      this.showGoalMessage();
    }

    // ── Death / respawn ──────────────────────────────────────────────────
    if (this.marble.y > this.GROUND_Y + 160) {
      this.respawn();
    }

    // ── Energy aura (world-space glow around marble while charging) ───────
    this.glowGfx.clear();
    if (this.charging) {
      const t    = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);
      const mx   = this.marble.x;
      const my   = this.marble.y;

      // Color ramp: blue → amber → red as charge fills
      const color = t < 0.5 ? 0x3b82f6 : t < 0.85 ? 0xf59e0b : 0xef4444;

      // Outer halo pulses in and out (slow breathe)
      const pulse     = Math.sin(time * 0.009) * 0.5 + 0.5;
      const outerR    = this.R + 6 + t * 18 + pulse * 5;
      this.glowGfx.fillStyle(color, (0.12 + t * 0.22) * (0.6 + pulse * 0.4));
      this.glowGfx.fillCircle(mx, my, outerR);

      // Inner ring — tighter, more opaque
      const innerR    = this.R + 1 + t * 7;
      this.glowGfx.fillStyle(color, 0.35 + t * 0.35);
      this.glowGfx.fillCircle(mx, my, innerR);

      // Core flash at full charge
      if (t >= 1) {
        const flash = Math.sin(time * 0.03) * 0.5 + 0.5;
        this.glowGfx.fillStyle(0xffffff, 0.25 * flash);
        this.glowGfx.fillCircle(mx, my, this.R - 2);
      }
    }

    // ── Charge bar ───────────────────────────────────────────────────────
    this.chargeGfx.clear();
    if (this.charging) {
      const t   = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);
      const bx  = 340, by = 565, bw = 120;
      this.chargeGfx.fillStyle(0x1f2937);
      this.chargeGfx.fillRect(bx - 1, by - 1, bw + 2, 14);
      this.chargeGfx.fillStyle(t < 0.5 ? 0x3b82f6 : t < 0.85 ? 0xf59e0b : 0xef4444);
      this.chargeGfx.fillRect(bx, by, Math.round(bw * t), 12);
      this.chargeGfx.lineStyle(1, 0x4b5563);
      this.chargeGfx.strokeRect(bx - 1, by - 1, bw + 2, 14);
    }

    // ── HUD ──────────────────────────────────────────────────────────────
    const spd = Math.round(Math.abs(body.velocity.x));
    const airSpd = Math.round(Math.abs(body.velocity.y));
    this.hudText.setText(
      `hspd: ${spd}  vspd: ${airSpd}  ${grounded ? '▓ ground' : '  air'}` +
      (this.charging ? `  ⚡ charge` : ''),
    );
  }

  private respawn(): void {
    this.charging = false;
    this.marble.setScale(1);
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.reset(80, this.GROUND_Y - this.R * 2);
    // Flash
    this.tweens.add({
      targets: this.marble, alpha: 0.2, duration: 90,
      yoyo: true, repeat: 3,
      onComplete: () => this.marble.setAlpha(1),
    });
  }

  private showGoalMessage(): void {
    const txt = this.add.text(
      this.marble.x, this.GROUND_Y - 120,
      '🎉  YOU MADE IT!\nFeel good?',
      { fontSize: '28px', fontFamily: 'monospace', color: '#fbbf24', stroke: '#000', strokeThickness: 5, align: 'center' },
    ).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, delay: 2500, duration: 800 });
  }
}
