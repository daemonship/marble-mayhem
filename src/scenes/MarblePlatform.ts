import Phaser from 'phaser';
import { LevelDef, SurfaceType, PlatformDef, SpeedPadDef } from '../types/LevelDef';
import { sandbox } from '../levels/sandbox';
import { SeesawSystem, SeesawContact } from '../systems/SeesawSystem';

// ── Surface physics table ─────────────────────────────────────────────────────
// drag            — absolute per-frame drag coefficient (NOT a multiplier on base drag)
//                   applied as Math.pow(drag, delta/16.67). Higher = more momentum.
// accelMultiplier — multiplied against ACCEL_X (how fast marble responds to keys)
// maxVxMultiplier — caps MAX_VX (MUD slows the marble's top speed)
// bounceY         — vertical restitution coefficient (BOUNCE_PAD = very high)
// jumpMultiplier  — scales jump power (soft surfaces reduce jump height)
interface SurfaceProps {
  drag:            number;
  accelMultiplier: number;
  maxVxMultiplier: number;
  bounceY:         number;
  jumpMultiplier:  number;
}

const SURFACE_PROPS: Record<SurfaceType, SurfaceProps> = {
  //                          drag    accel   maxVx   bounceY  jump
  [SurfaceType.CONCRETE]:   { drag: 0.930, accelMultiplier: 1.00, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 1.00 },
  [SurfaceType.GRASS]:      { drag: 0.905, accelMultiplier: 0.90, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 0.92 },
  [SurfaceType.SAND]:       { drag: 0.860, accelMultiplier: 0.65, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 0.80 },
  [SurfaceType.MUD]:        { drag: 0.820, accelMultiplier: 0.45, maxVxMultiplier: 0.40, bounceY: 0.00, jumpMultiplier: 0.65 },
  [SurfaceType.ICE]:        { drag: 0.998, accelMultiplier: 0.20, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 0.90 },
  [SurfaceType.SNOW]:       { drag: 0.972, accelMultiplier: 0.75, maxVxMultiplier: 1.00, bounceY: 0.10, jumpMultiplier: 0.82 },
  [SurfaceType.WET_METAL]:  { drag: 0.958, accelMultiplier: 0.35, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 0.95 },
  [SurfaceType.BOUNCE_PAD]: { drag: 0.930, accelMultiplier: 1.00, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 1.00 },
  [SurfaceType.CONVEYOR]:   { drag: 0.930, accelMultiplier: 1.00, maxVxMultiplier: 1.00, bounceY: 0.00, jumpMultiplier: 1.00 },
};

// Canvas colours per surface type: [main fill, top highlight, bottom shadow]
const SURFACE_COLOR: Record<SurfaceType, [string, string, string]> = {
  [SurfaceType.CONCRETE]:   ['#374151', '#4b5563', '#1f2937'],
  [SurfaceType.GRASS]:      ['#166534', '#16a34a', '#14532d'],
  [SurfaceType.SAND]:       ['#a16207', '#ca8a04', '#713f12'],
  [SurfaceType.MUD]:        ['#431407', '#7c2d12', '#1c0a00'],
  [SurfaceType.ICE]:        ['#164e63', '#67e8f9', '#0e7490'],
  [SurfaceType.SNOW]:       ['#cbd5e1', '#f1f5f9', '#94a3b8'],
  [SurfaceType.WET_METAL]:  ['#1e293b', '#475569', '#0f172a'],
  [SurfaceType.BOUNCE_PAD]: ['#78350f', '#f59e0b', '#451a03'],
  [SurfaceType.CONVEYOR]:   ['#1e3a5f', '#3b82f6', '#0f172a'],
};

// Portal pair colours (cycled)
const PORTAL_COLORS = [0x00e5ff, 0xff00c8, 0x00ff88, 0xffaa00];

// ── Runtime object types ──────────────────────────────────────────────────────
interface RuntimeEnemy {
  img:        Phaser.GameObjects.Image;
  type:       'roller' | 'chaser';
  alive:      boolean;
  x:          number;
  y:          number;
  vx:         number;
  patrolMin:  number;
  patrolMax:  number;
  patrolDir:  1 | -1;
  radius:     number;
}

interface RuntimeGem {
  img:       Phaser.GameObjects.Image;
  x:         number;
  y:         number;
  collected: boolean;
}

interface RuntimeCheckpoint {
  img:       Phaser.GameObjects.Image;
  x:         number;
  y:         number;
  activated: boolean;
}

interface RuntimePortal {
  ax: number; ay: number;
  bx: number; by: number;
  gfx: Phaser.GameObjects.Graphics;
  color: number;
}

interface ScatteredGem {
  img:       Phaser.GameObjects.Image;
  x:         number;
  y:         number;
  vx:        number;
  vy:        number;
  readonly spawnTime: number;
}

interface RuntimeSpeedPad {
  def:     SpeedPadDef;
  img:     Phaser.GameObjects.Image;
  exitPos: { x: number; y: number } | null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
export class MarblePlatform extends Phaser.Scene {
  private marble!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  private levelDef!: LevelDef;

  // ── Core marble state ──────────────────────────────────────────────────────
  private charging           = false;   // space held, charge building
  private chargeT0           = 0;
  private chargeStartSurface: SurfaceType = SurfaceType.CONCRETE;
  private goalReached        = false;

  // Charge-lock mechanic:
  //   Hold SPACE → charge builds.  Release quickly → 250ms window opens.
  //   Re-press within window → charge locked at that level, bar freezes.
  //   Release again → fire at locked level.
  //   If 250ms expires without re-press → auto-fire at released level.
  private chargeLocked    = false;  // charge locked, waiting for final release
  private chargeLockedT   = 0;      // locked t value (0-1)
  private chargeArmedUntil = 0;     // >0 = "armed" period: fire on timeout or lock on re-press
  private readonly LOCK_WINDOW_MS = 250;

  // Space edge detection (JustDown() is unreliable on some Phaser builds)
  private prevSpace = false;

  // Coyote time: treat marble as grounded for 80ms after leaving a platform.
  // Prevents 1-2 frame grounded flickers from blocking KICK and jump initiation.
  private lastGroundedAt = 0;
  private readonly COYOTE_MS = 80;

  // Respawn anchor — updated when a checkpoint is activated
  private respawnX = 0;
  private respawnY = 0;

  // Portal exit lock — destination portal is inactive until marble moves far enough away.
  // Distance-based (not time-based) so slow-moving marbles can't bounce forever.
  private portalExitPos: { x: number; y: number } | null = null;

  // Knockback invincibility — brief grace period after enemy hit
  private invincibleUntil = 0;

  // ── Physics knobs ─────────────────────────────────────────────────────────
  private readonly R           = 18;
  private readonly GRAVITY     = 980;
  private readonly ACCEL_X     = 700;
  private readonly MAX_VX      = 420;
  private readonly JUMP_MIN    = 330;
  private readonly JUMP_MAX    = 740;
  private readonly MAX_CHARGE  = 650;
  private readonly SPRING_V    = 950;

  // Enemy tuning
  private readonly ROLLER_SPEED     = 100;   // px/s patrol speed
  private readonly CHASER_SPEED     = 220;   // px/s chase speed
  private readonly CHASER_RANGE     = 320;   // px detection radius
  private readonly ENEMY_KILL_VX    = 200;   // marble speed threshold to kill enemy
  private readonly KNOCKBACK_VX     = 400;   // knockback impulse speed
  private readonly INVINCIBLE_MS    = 600;   // knockback invincibility window

  // ── Runtime collections ────────────────────────────────────────────────────
  private springs:     Array<{ x: number; y: number; power: number; sprite: Phaser.GameObjects.Image }> = [];
  private portals:     RuntimePortal[]    = [];
  private enemies:     RuntimeEnemy[]     = [];
  private gems:        RuntimeGem[]       = [];
  private checkpoints: RuntimeCheckpoint[] = [];

  // ── HUD elements ───────────────────────────────────────────────────────────
  private hudText!:    Phaser.GameObjects.Text;
  private chargeGfx!: Phaser.GameObjects.Graphics;
  private glowGfx!:   Phaser.GameObjects.Graphics;

  // ── Foot drag brake ────────────────────────────────────────────────────────
  private braking        = false;
  private shiftKey!:       Phaser.Input.Keyboard.Key;
  private footGfx!:        Phaser.GameObjects.Graphics;
  private brakeExtension = 0;   // animated leg length (0 = retracted, R*2 = fully stretched)
  private brakeDir       = 1;   // last travel direction while braking (for retract visual)

  // ── Jump legs ──────────────────────────────────────────────────────────────
  private legsGfx!:  Phaser.GameObjects.Graphics;
  private legLaunchT       = 0;  // 1.0 at fire, counts down to 0 over ~200ms
  private legLaunchGroundY = 0;  // world Y of ground surface at jump moment

  // ── Parallax layers ────────────────────────────────────────────────────────
  private pxLayers: Array<{ ts: Phaser.GameObjects.TileSprite; factor: number }> = [];

  // ── Seesaw system ──────────────────────────────────────────────────────────
  private seesawSystem!: SeesawSystem;

  // ── Gem counter + scattered gems (Sonic-style loss on hit) ─────────────────
  private gemCount      = 0;
  private scatteredGems: ScatteredGem[] = [];

  // ── Speed pads ─────────────────────────────────────────────────────────────
  private speedPads: RuntimeSpeedPad[] = [];
  private readonly SPEED_PAD_RADIUS    = 28;
  private readonly SPEED_PAD_EXIT_DIST = 64;

  // ── Time trial ─────────────────────────────────────────────────────────────
  private trialStartMs = -1;
  private bestTime     = 0;
  private timerText!:  Phaser.GameObjects.Text;

  // True whenever any part of the charge state is active (blocks springs, rotation, etc.)
  private get isChargeActive(): boolean {
    return this.charging || this.chargeLocked || this.chargeArmedUntil > 0;
  }

  constructor() { super({ key: 'MarblePlatform' }); }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════
  create(): void {
    this.levelDef  = sandbox;
    this.respawnX  = this.levelDef.spawnX;
    this.respawnY  = this.levelDef.spawnY;
    let stored: string | null = null;
    try { stored = localStorage.getItem(`best_${this.levelDef.id}`); } catch { /* private/restricted browsing */ }
    const parsed  = stored ? parseInt(stored, 10) : NaN;
    this.bestTime = Number.isFinite(parsed) ? parsed : 0;

    this.physics.world.setBounds(0, -400, this.levelDef.worldW, 1100);
    this.cameras.main.setBounds(0, -400, this.levelDef.worldW, 1100);

    this.seesawSystem = new SeesawSystem(this);

    this.buildParallax();
    this.buildTextures();
    this.buildLevel(this.levelDef);
    this.buildMarble();
    this.buildHUD();
    this.setupInput();

    this.cameras.main.startFollow(this.marble, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(120, 80);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARALLAX
  // ═══════════════════════════════════════════════════════════════════════════
  private buildParallax(): void {
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
    const W = 400, H = 300;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;

    if (key === 'px_far') {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#070718');
      sky.addColorStop(1, '#0f1a35');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const sz = Math.random() * 1.5 + 0.3;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.5})`;
        ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H * 0.7, sz, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#0e1530';
      for (let x = 20; x < W - 20; x += 30 + Math.floor(Math.random() * 25)) {
        const h = 50 + Math.floor(Math.random() * 80);
        const w = 12 + Math.floor(Math.random() * 18);
        ctx.fillRect(x, H - h, w, h);
      }
    }
    if (key === 'px_mid') {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0b1420';
      for (let x = 0; x < W; x += 20 + Math.floor(Math.random() * 35)) {
        const h = 60 + Math.floor(Math.random() * 110);
        const w = 20 + Math.floor(Math.random() * 30);
        ctx.fillRect(x, H - h, w, h);
        if (Math.random() > 0.5) {
          ctx.fillStyle = 'rgba(255,220,80,0.25)';
          ctx.fillRect(x + 4, H - h + 10, 5, 5);
          ctx.fillStyle = '#0b1420';
        }
      }
    }
    if (key === 'px_near') {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#080e18';
      for (let x = 0; x < W; x += 50 + Math.floor(Math.random() * 40)) {
        const h = 40 + Math.floor(Math.random() * 70);
        const w = 30 + Math.floor(Math.random() * 20);
        ctx.fillRect(x, H - h, w, h);
        ctx.beginPath(); ctx.arc(x + w / 2, H - h, w / 2, Math.PI, 0); ctx.fill();
      }
    }
    this.textures.addCanvas(key, c);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  private buildTextures(): void {
    this.makeMarbleTex();
    this.makeGoalTex();
    this.makeSpringTex();
    this.makeGemTex();
    this.makeCheckpointTex();
    this.makeSpeedPadTex();
    this.makeEnemyTex('roller');
    this.makeEnemyTex('chaser');
    // Platform texture per surface type
    for (const s of Object.values(SurfaceType)) {
      this.makePlatformTex(s as SurfaceType);
    }
  }

  private makeMarbleTex(): void {
    if (this.textures.exists('marbTex')) return;
    const r = this.R, s = r * 2;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a8a'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 0, s, r);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(147,197,253,0.4)'; ctx.fillRect(0, r - 3, s, 6);
    ctx.restore();
    const g = ctx.createRadialGradient(r - 6, r - 7, 1, r - 4, r - 5, 9);
    g.addColorStop(0, 'rgba(255,255,255,0.88)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); ctx.restore();
    this.textures.addCanvas('marbTex', c);
  }

  private makePlatformTex(surface: SurfaceType): void {
    const key = `platTex_${surface}`;
    if (this.textures.exists(key)) return;
    const [main, top, bot] = SURFACE_COLOR[surface];
    const c = document.createElement('canvas'); c.width = 64; c.height = 32;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = main; ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = top;  ctx.fillRect(0, 0, 64, 5);
    ctx.fillStyle = bot;  ctx.fillRect(0, 28, 64, 4);

    if (surface === SurfaceType.ICE) {
      // Shimmery diagonal streaks
      ctx.fillStyle = 'rgba(180,240,255,0.25)';
      for (let x = -10; x < 64; x += 14) {
        ctx.fillRect(x, 5, 4, 23);
      }
    } else if (surface === SurfaceType.BOUNCE_PAD) {
      // Upward arrows
      ctx.fillStyle = 'rgba(255,220,0,0.6)';
      for (let x = 8; x < 64; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, 25); ctx.lineTo(x + 6, 12); ctx.lineTo(x + 12, 25); ctx.fill();
      }
    } else if (surface === SurfaceType.CONVEYOR) {
      // Rightward chevrons (direction shown via sign, not texture)
      ctx.fillStyle = 'rgba(100,180,255,0.35)';
      for (let x = 0; x < 64; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x + 6, 16); ctx.lineTo(x, 27);
        ctx.lineTo(x + 2, 27); ctx.lineTo(x + 8, 16); ctx.lineTo(x + 2, 5);
        ctx.fill();
      }
    } else if (surface === SurfaceType.MUD) {
      // Rough lumps
      ctx.fillStyle = 'rgba(180,80,20,0.3)';
      for (let x = 4; x < 60; x += 10) {
        ctx.beginPath(); ctx.ellipse(x, 4, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (surface === SurfaceType.SNOW) {
      // Dotted snowflake hints
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let x = 6; x < 60; x += 10) {
        ctx.fillRect(x, 2, 2, 2);
      }
    } else if (surface === SurfaceType.GRASS) {
      // Grass tufts
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5;
      for (let x = 4; x < 64; x += 10) {
        ctx.beginPath(); ctx.moveTo(x, 5); ctx.lineTo(x - 3, -1); ctx.moveTo(x, 5); ctx.lineTo(x + 3, -1); ctx.stroke();
      }
    } else if (surface === SurfaceType.CONCRETE) {
      // Subtle joint lines
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let x = 16; x < 64; x += 16) ctx.fillRect(x, 5, 1, 23);
    }

    this.textures.addCanvas(key, c);
  }

  private makeSpringTex(): void {
    if (this.textures.exists('springTex')) return;
    const c = document.createElement('canvas'); c.width = 48; c.height = 28;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#92400e'; ctx.fillRect(0, 20, 48, 8);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3;
    for (let y = 4; y <= 18; y += 7) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(42, y); ctx.stroke(); }
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(4, 0, 40, 6);
    this.textures.addCanvas('springTex', c);
  }

  private makeGoalTex(): void {
    if (this.textures.exists('goalTex')) return;
    const c = document.createElement('canvas'); c.width = 24; c.height = 80;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(10, 0, 4, 80);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(14, 2); ctx.lineTo(14, 26); ctx.lineTo(30, 14); ctx.closePath(); ctx.fill();
    this.textures.addCanvas('goalTex', c);
  }

  private makeGemTex(): void {
    if (this.textures.exists('gemTex')) return;
    const c = document.createElement('canvas'); c.width = 20; c.height = 24;
    const ctx = c.getContext('2d')!;
    // Diamond shape
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(20, 8); ctx.lineTo(10, 24); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
    // Top facet
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(20, 8); ctx.lineTo(10, 8); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(7, 6, 2, 0, Math.PI * 2); ctx.fill();
    this.textures.addCanvas('gemTex', c);
  }

  private makeCheckpointTex(): void {
    if (!this.textures.exists('cpTex')) {
      const c = document.createElement('canvas'); c.width = 12; c.height = 52;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(5, 0, 2, 52);
      ctx.fillStyle = '#6b7280'; ctx.fillRect(5, 0, 2, 6);
      this.textures.addCanvas('cpTex', c);
    }
    if (!this.textures.exists('cpTexOn')) {
      const c2 = document.createElement('canvas'); c2.width = 12; c2.height = 52;
      const ctx2 = c2.getContext('2d')!;
      ctx2.fillStyle = '#9ca3af'; ctx2.fillRect(5, 0, 2, 52);
      ctx2.fillStyle = '#22c55e'; ctx2.fillRect(4, 0, 4, 8);
      this.textures.addCanvas('cpTexOn', c2);
    }
  }

  private makeSpeedPadTex(): void {
    if (this.textures.exists('speedPadTex')) return;
    const W = 48, H = 18;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    // Dark base + amber top stripe
    ctx.fillStyle = '#1a1200'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, 0, W, 3);
    // Double-chevron >> (speed boost symbol)
    ctx.fillStyle = 'rgba(251,191,36,0.9)';
    for (let ox = 6; ox <= 24; ox += 14) {
      ctx.beginPath();
      ctx.moveTo(ox, 5); ctx.lineTo(ox + 8, 9); ctx.lineTo(ox, 13);
      ctx.lineTo(ox + 2, 13); ctx.lineTo(ox + 10, 9); ctx.lineTo(ox + 2, 5);
      ctx.closePath(); ctx.fill();
    }
    this.textures.addCanvas('speedPadTex', c);
  }

  private makeEnemyTex(type: 'roller' | 'chaser'): void {
    const key = `enemyTex_${type}`;
    if (this.textures.exists(key)) return;

    const r = type === 'roller' ? 24 : 20;
    const s = r * 2;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const ctx = c.getContext('2d')!;

    if (type === 'roller') {
      // Dark slate marble
      ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b'; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, s, r);
      ctx.fillStyle = 'rgba(100,120,150,0.3)'; ctx.fillRect(0, r - 3, s, 6);
      ctx.restore();
      // Specular
      const g = ctx.createRadialGradient(r - 7, r - 8, 1, r - 5, r - 6, 8);
      g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); ctx.restore();
    } else {
      // Red chaser with eye
      ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fillStyle = '#7f1d1d'; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#dc2626'; ctx.fillRect(0, 0, s, r);
      ctx.restore();
      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(r + 4, r - 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(r + 5, r - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      // Specular
      const g2 = ctx.createRadialGradient(r - 6, r - 7, 1, r - 4, r - 5, 7);
      g2.addColorStop(0, 'rgba(255,255,255,0.5)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = g2; ctx.fillRect(0, 0, s, s); ctx.restore();
    }
    this.textures.addCanvas(key, c);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL BUILD
  // ═══════════════════════════════════════════════════════════════════════════
  private buildLevel(def: LevelDef): void {
    this.platforms = this.physics.add.staticGroup();

    // Platform: tiled visual + invisible static physics body
    const addPlat = (p: PlatformDef) => {
      const key = `platTex_${p.surface}`;
      this.add.tileSprite(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, key).setDepth(4);
      const pb = this.platforms.create(p.x + p.w / 2, p.y + p.h / 2, key) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
      pb.setDisplaySize(p.w, p.h).setVisible(false).refreshBody();
    };
    for (const p of def.platforms) addPlat(p);

    // Springs
    for (const sp of def.springs) {
      const sprite = this.add.image(sp.x, sp.y, 'springTex').setDepth(5).setOrigin(0.5, 1);
      this.springs.push({ x: sp.x, y: sp.y, power: sp.power ?? this.SPRING_V, sprite });
    }

    // Portals
    const portalGfx = this.add.graphics().setDepth(8);
    for (let i = 0; i < def.portals.length; i++) {
      const pd = def.portals[i];
      this.portals.push({
        ax: pd.ax, ay: pd.ay,
        bx: pd.bx, by: pd.by,
        gfx:   portalGfx,
        color: PORTAL_COLORS[i % PORTAL_COLORS.length],
      });
    }

    // Enemies
    for (const ed of def.enemies) {
      const type = ed.type as 'roller' | 'chaser';
      const radius = type === 'roller' ? 24 : 20;
      const img = this.add.image(ed.x, ed.y, `enemyTex_${type}`).setDepth(7);
      this.enemies.push({
        img, type, alive: true,
        x: ed.x, y: ed.y, vx: 0,
        patrolMin: ed.patrol?.x1 ?? ed.x - 200,
        patrolMax: ed.patrol?.x2 ?? ed.x + 200,
        patrolDir: 1,
        radius,
      });
    }

    // Gems
    for (const gd of def.gems) {
      const img = this.add.image(gd.x, gd.y, 'gemTex').setDepth(6).setOrigin(0.5, 0.5);
      this.gems.push({ img, x: gd.x, y: gd.y, collected: false });
    }

    // Checkpoints
    for (const cpd of def.checkpoints) {
      const img = this.add.image(cpd.x, cpd.y, 'cpTex').setDepth(5).setOrigin(0.5, 1);
      this.checkpoints.push({ img, x: cpd.x, y: cpd.y, activated: false });
    }

    // Goal
    this.add.image(def.goal.x, def.goal.y, 'goalTex').setDepth(5).setOrigin(0.5, 1);

    // Signs
    const signStyle = { fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', stroke: '#000', strokeThickness: 2 };
    for (const s of def.signs ?? []) {
      this.add.text(s.x, s.y, s.text, signStyle).setOrigin(0.5, 1).setDepth(6);
    }

    // Seesaws
    this.seesawSystem.build(def.seesaws ?? []);

    // Speed pads
    for (const sp of def.speedPads ?? []) {
      const img = this.add.image(sp.x, sp.y, 'speedPadTex').setDepth(5).setOrigin(0.5, 1);
      this.speedPads.push({ def: sp, img, exitPos: null });
    }

    // Decorative floor
    const G = def.groundY;
    const deco = this.add.graphics().setDepth(2);
    deco.fillStyle(0x111827); deco.fillRect(0, G + 32, def.worldW, 400);
    deco.fillStyle(0x1f2937); deco.fillRect(0, G + 32, def.worldW, 6);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MARBLE
  // ═══════════════════════════════════════════════════════════════════════════
  private buildMarble(): void {
    this.marble = this.physics.add.sprite(this.levelDef.spawnX, this.levelDef.spawnY, 'marbTex');
    this.marble.setDepth(10);
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.R, 0, 0);
    body.syncBounds = false;
    body.setAllowGravity(true);
    body.setGravityY(this.GRAVITY);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(this.MAX_VX, 1400);
    body.setBounce(0.12, 0.05);
    this.physics.add.collider(this.marble, this.platforms);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════════════════════════
  private buildHUD(): void {
    const s = { fontSize: '13px', fontFamily: 'monospace', color: '#e2e8f0', stroke: '#000', strokeThickness: 3 };
    this.hudText   = this.add.text(10, 10, '', s).setScrollFactor(0).setDepth(50);
    this.timerText = this.add.text(790, 10, '', s).setScrollFactor(0).setDepth(50).setOrigin(1, 0);
    this.chargeGfx = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.glowGfx   = this.add.graphics().setDepth(9);
    this.footGfx   = this.add.graphics().setDepth(8);
    this.legsGfx   = this.add.graphics().setDepth(9);
    this.add.text(400, 593, 'A/D  roll     SPACE  charge+jump     SHIFT  brake', {
      fontSize: '11px', fontFamily: 'monospace', color: '#4b5563', align: 'center',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(50);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════════════════════
  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    this.input.keyboard!.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE — main loop
  // ═══════════════════════════════════════════════════════════════════════════
  update(time: number, delta: number): void {
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    const dt   = delta / 1000;
    this.braking = this.shiftKey.isDown;

    // ── Grounded detection ─────────────────────────────────────────────────
    // body.blocked.down is unreliable for circular bodies — supplement with
    // a position-based check: marble bottom within a few pixels of any platform top.
    const mBottom    = this.marble.y + this.R;
    const posGrounded = this.levelDef.platforms.some(p =>
      this.marble.x >= p.x       &&
      this.marble.x <= p.x + p.w &&
      mBottom >= p.y - 2          &&
      mBottom <= p.y + 8          &&
      body.velocity.y >= -80,
    );
    if (body.blocked.down || posGrounded) this.lastGroundedAt = time;

    // ── Seesaw physics update (uses this frame's marble position) ──────────
    const contact = this.seesawSystem.update(dt, this.marble.x, this.marble.y, this.R);

    const grounded = body.blocked.down || posGrounded || contact.onSeesaw ||
                     (time - this.lastGroundedAt < this.COYOTE_MS);

    this.updateParallax();
    const surface = contact.onSeesaw ? SurfaceType.CONCRETE : this.getSurface(grounded);
    this.updateSurface(body, grounded, surface, dt);
    this.updateMovement(body, grounded, surface, dt, time);
    this.updateBrake(body, grounded, surface, dt);

    // Apply gravity component along seesaw slope (marble slides toward lower arm)
    if (contact.onSeesaw) {
      body.setVelocityX(body.velocity.x + contact.slideAccelX * dt);
    }

    this.updateJump(time, body, grounded, surface);
    this.updateSprings(body, grounded);
    this.updatePortals();
    this.updateEnemies(time, dt);
    this.updateCollectibles();

    // ── Seesaw position correction ─────────────────────────────────────────
    // Push marble up to plank surface if it has sunk into it this frame.
    if (contact.onSeesaw) {
      const targetCenterY = contact.plankTopY - this.R;
      if (this.marble.y > targetCenterY + 1) {
        this.marble.y  = targetCenterY;
        body.y         = targetCenterY - this.R;
        if (body.velocity.y > contact.surfaceVy) {
          body.setVelocityY(contact.surfaceVy);
        }
      }
    }

    // Start trial timer on first marble movement
    if (this.trialStartMs < 0 && (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5)) {
      this.trialStartMs = time;
    }

    this.updateSpeedPads();
    if (this.legLaunchT > 0) this.legLaunchT = Math.max(0, this.legLaunchT - dt * 5);
    this.updateVisuals(time, body, dt, grounded);
    this.updateHUD(time, body, grounded, surface);
    this.checkGoalAndDeath();

    // ── Seesaw draw (after all position updates) ───────────────────────────
    this.seesawSystem.draw();

    this.prevSpace = this.cursors.space.isDown;
  }

  // ── Parallax ──────────────────────────────────────────────────────────────
  private updateParallax(): void {
    const camX = this.cameras.main.scrollX;
    for (const layer of this.pxLayers) layer.ts.tilePositionX = camX * layer.factor;
  }

  // ── Surface detection (spatial lookup) ────────────────────────────────────
  private getSurface(grounded: boolean): SurfaceType {
    if (!grounded) return SurfaceType.CONCRETE;
    const mx      = this.marble.x;
    const mBottom = this.marble.y + this.R;
    for (const p of this.levelDef.platforms) {
      if (mx >= p.x && mx <= p.x + p.w && Math.abs(p.y - mBottom) < 16) {
        return p.surface;
      }
    }
    return SurfaceType.CONCRETE;
  }

  // Returns the full platform def under the marble (for conveyorVx)
  private getPlatformAtFeet(): PlatformDef | null {
    if (!(this.marble.body as Phaser.Physics.Arcade.Body).blocked.down) return null;
    const mx      = this.marble.x;
    const mBottom = this.marble.y + this.R;
    for (const p of this.levelDef.platforms) {
      if (mx >= p.x && mx <= p.x + p.w && Math.abs(p.y - mBottom) < 16) return p;
    }
    return null;
  }

  // ── Surface physics application ───────────────────────────────────────────
  private updateSurface(
    body: Phaser.Physics.Arcade.Body,
    grounded: boolean,
    surface: SurfaceType,
    dt: number,
  ): void {
    const props = SURFACE_PROPS[surface];
    // Set vertical bounce for next physics step
    body.setBounce(0.12, props.bounceY);

    // BOUNCE_PAD: Arcade Physics bounce has a 1-frame lag, so apply a direct impulse.
    // Fires once per landing: vy > -50 means "not already bouncing hard upward".
    if (surface === SurfaceType.BOUNCE_PAD && grounded && body.velocity.y > -50) {
      body.setVelocityY(-720);
    }

    // Conveyor: push marble horizontally
    if (grounded && surface === SurfaceType.CONVEYOR) {
      const plat = this.getPlatformAtFeet();
      if (plat?.conveyorVx) {
        const cVx   = plat.conveyorVx;
        const newVx = Phaser.Math.Clamp(body.velocity.x + cVx * dt, -this.MAX_VX * 1.25, this.MAX_VX * 1.25);
        body.setVelocityX(newVx);
      }
    }

    // MUD: hard cap on max speed
    if (grounded && surface === SurfaceType.MUD) {
      const cap = this.MAX_VX * props.maxVxMultiplier;
      body.setVelocityX(Phaser.Math.Clamp(body.velocity.x, -cap, cap));
    }
  }

  // ── Horizontal movement ───────────────────────────────────────────────────
  private updateMovement(
    body: Phaser.Physics.Arcade.Body,
    grounded: boolean,
    surface: SurfaceType,
    dt: number,
    time: number,
  ): void {
    const goLeft  = this.cursors.left.isDown  || this.keys.A.isDown;
    const goRight = this.cursors.right.isDown || this.keys.D.isDown;

    // If stopped (or near-stopped) while charging and a direction key is pressed,
    // discharge the charge (fire the jump) — you can't move without jumping first.
    if (this.isChargeActive && (goLeft || goRight) && Math.abs(body.velocity.x) < 30) {
      const t = (this.chargeLocked || this.chargeArmedUntil > 0)
        ? this.chargeLockedT
        : Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);
      this.charging         = false;
      this.chargeLocked     = false;
      this.chargeArmedUntil = 0;
      this.fireJump(body, t);
      // Fall through — movement input applies as air control this frame.
    }

    // No movement while a charge is active — you're planted.
    // Clear acceleration first or Phaser keeps applying whatever was set last frame.
    if (this.isChargeActive) { body.setAccelerationX(0); return; }

    // Startup kick: fires whenever grounded, key held, and speed is near-zero.
    // Ensures responsive restart from rest even when key was held while decelerating.
    const KICK = 150;
    if (grounded && goLeft  && Math.abs(body.velocity.x) < 30) body.setVelocityX(-KICK);
    if (grounded && goRight && Math.abs(body.velocity.x) < 30) body.setVelocityX( KICK);

    const props = SURFACE_PROPS[surface];
    const accel = this.ACCEL_X * (grounded ? 1.0 : 0.22) * props.accelMultiplier;

    if (goLeft) {
      body.setAccelerationX(-accel);
    } else if (goRight) {
      body.setAccelerationX(accel);
    } else {
      body.setAccelerationX(0);
      if (grounded && Math.abs(body.velocity.x) > 1) {
        // Free-roll: minimal rolling friction only.
        // To stop intentionally, use the brake (Shift) or run into something.
        const rollFriction = 1 - (1 - props.drag) * 0.08;
        body.setVelocityX(body.velocity.x * Math.pow(rollFriction, dt / 0.01667));
      } else if (grounded) {
        body.setVelocityX(0);
      }
    }
  }

  // ── Jump ─────────────────────────────────────────────────────────────────
  // Charge states:
  //   IDLE      → charging=false, chargeLocked=false, chargeArmedUntil=0
  //   CHARGING  → charging=true (space held, t growing)
  //   ARMED     → chargeArmedUntil>0 (space released, 250ms window open)
  //   LOCKED    → chargeLocked=true (re-pressed in window, charge frozen at lockedT)
  private updateJump(time: number, body: Phaser.Physics.Arcade.Body, grounded: boolean, surface: SurfaceType): void {
    const space        = this.cursors.space;
    const spaceDown    = space.isDown;
    const spaceJustDown = spaceDown && !this.prevSpace;
    const spaceJustUp  = !spaceDown && this.prevSpace;

    // ── ARMED: check for re-press (lock) or timeout (fire) ─────────────────
    if (this.chargeArmedUntil > 0) {
      if (spaceJustDown) {
        // Re-pressed within window → lock the charge
        this.chargeLocked     = true;
        this.chargeArmedUntil = 0;
      } else if (time >= this.chargeArmedUntil) {
        // Timed out without re-press → fire at locked level
        this.fireJump(body, this.chargeLockedT);
        this.chargeArmedUntil = 0;
      }
      return;  // no further processing while armed
    }

    // ── LOCKED: hold at locked level, fire on release ──────────────────────
    if (this.chargeLocked) {
      if (!this.goalReached) {
        const t = this.chargeLockedT;
        const jiggleFreq = 0.018 + t * 0.038;
        const jiggleAmp  = 0.03 + t * 0.05;
        const jX = Math.sin(time * jiggleFreq) * jiggleAmp;
        const jY = Math.sin(time * jiggleFreq * 1.31) * jiggleAmp;
        this.marble.setScale(1 + t * 0.28 + jX, 1 - t * 0.22 + jY);
      }
      if (spaceJustUp) {
        this.chargeLocked = false;
        this.fireJump(body, this.chargeLockedT);
      }
      return;
    }

    // ── CHARGING: space held, t growing ────────────────────────────────────
    if (this.charging) {
      const t            = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);
      const chargeVisible = (time - this.chargeT0) >= 150;
      if (!this.goalReached) {
        if (chargeVisible) {
          const jiggleFreq = 0.014 + t * 0.038;
          const jiggleAmp  = t * 0.07;
          const jX = Math.sin(time * jiggleFreq) * jiggleAmp;
          const jY = Math.sin(time * jiggleFreq * 1.31) * jiggleAmp;
          this.marble.setScale(1 + t * 0.28 + jX, 1 - t * 0.22 + jY);
        } else {
          this.marble.setScale(1);
        }
      }
      if (spaceJustUp) {
        this.charging = false;
        if (time - this.chargeT0 < 150) {
          // Quick tap (<150ms) — fire immediately at minimum power, skip ARMED
          this.fireJump(body, 0);
        } else {
          // Normal release: enter ARMED state — 250ms window to re-press and lock
          this.chargeLockedT    = t;
          this.chargeArmedUntil = time + this.LOCK_WINDOW_MS;
        }
      }
      return;
    }

    // ── IDLE: start charging on fresh press ────────────────────────────────
    if (spaceJustDown && grounded) {
      this.charging           = true;
      this.chargeT0           = time;
      this.chargeStartSurface = surface;
    }
  }

  private fireJump(body: Phaser.Physics.Arcade.Body, t: number): void {
    this.legLaunchT       = 1.0;
    this.legLaunchGroundY = this.marble.y + this.R;
    const props = SURFACE_PROPS[this.chargeStartSurface];
    const jumpV = Phaser.Math.Linear(this.JUMP_MIN, this.JUMP_MAX, t) * props.jumpMultiplier;
    body.setVelocityY(-jumpV);
    this.marble.setScale(1);
    this.tweens.add({
      targets: this.marble,
      scaleX: 1 - t * 0.22, scaleY: 1 + t * 0.28,
      duration: 60, yoyo: true,
      onComplete: () => this.marble.setScale(1),
    });
  }

  // ── Springs ───────────────────────────────────────────────────────────────
  private updateSprings(body: Phaser.Physics.Arcade.Body, grounded: boolean): void {
    if (this.isChargeActive || !grounded) return;
    for (const sp of this.springs) {
      const dx = Math.abs(this.marble.x - sp.x);
      const dy = Math.abs(this.marble.y - sp.y);
      if (dx < 22 && dy < this.R + 14) {
        body.setVelocityY(-sp.power);
        this.tweens.add({ targets: sp.sprite, scaleY: 0.45, duration: 70, yoyo: true });
        break;
      }
    }
  }

  // ── Portals ───────────────────────────────────────────────────────────────
  private readonly PORTAL_RADIUS    = 36;
  // Marble must move this far from the exit portal before it can teleport again.
  // Must exceed PORTAL_RADIUS so the marble fully clears the destination ring.
  private readonly PORTAL_EXIT_DIST = 80;

  private updatePortals(): void {
    const mx = this.marble.x, my = this.marble.y;

    // Unlock destination portal once marble has walked far enough away
    if (this.portalExitPos) {
      const d = Phaser.Math.Distance.Between(mx, my, this.portalExitPos.x, this.portalExitPos.y);
      if (d < this.PORTAL_EXIT_DIST) return;   // still too close — no portals active
      this.portalExitPos = null;
    }

    const body = this.marble.body as Phaser.Physics.Arcade.Body;

    for (const portal of this.portals) {
      const distA = Phaser.Math.Distance.Between(mx, my, portal.ax, portal.ay);
      const distB = Phaser.Math.Distance.Between(mx, my, portal.bx, portal.by);

      if (distA < this.PORTAL_RADIUS) {
        const vx = body.velocity.x, vy = body.velocity.y;
        body.reset(portal.bx, portal.by);
        body.setVelocity(vx, vy);
        this.portalExitPos = { x: portal.bx, y: portal.by };
        this.showPortalFlash(portal.bx, portal.by, portal.color);
        break;
      } else if (distB < this.PORTAL_RADIUS) {
        const vx = body.velocity.x, vy = body.velocity.y;
        body.reset(portal.ax, portal.ay);
        body.setVelocity(vx, vy);
        this.portalExitPos = { x: portal.ax, y: portal.ay };
        this.showPortalFlash(portal.ax, portal.ay, portal.color);
        break;
      }
    }
  }

  private showPortalFlash(x: number, y: number, color: number): void {
    const gfx = this.add.graphics().setDepth(20);
    gfx.fillStyle(color, 0.7);
    gfx.fillCircle(x, y, 40);
    this.tweens.add({ targets: gfx, alpha: 0, duration: 250, onComplete: () => gfx.destroy() });
  }

  // Portal visual rendering — called every frame
  private drawPortals(time: number): void {
    // Each portal uses a shared graphics object (created in buildLevel)
    // We need per-portal graphics to avoid clearing them all at once.
    // Since we stored a shared gfx, let's clear and redraw all portals each frame.
    if (this.portals.length === 0) return;

    const gfx = this.portals[0].gfx;
    gfx.clear();

    for (const portal of this.portals) {
      const angle  = time * 0.0018;
      const pulse  = Math.sin(time * 0.006) * 0.5 + 0.5;
      const alpha  = 0.7 + pulse * 0.3;
      const outerR = this.PORTAL_RADIUS + 2 + pulse * 4;

      for (const [px, py] of [[portal.ax, portal.ay], [portal.bx, portal.by]]) {
        // Outer ring
        gfx.lineStyle(3, portal.color, alpha);
        gfx.strokeCircle(px, py, outerR);
        // Inner fill (semi-transparent)
        gfx.fillStyle(portal.color, 0.12 + pulse * 0.08);
        gfx.fillCircle(px, py, outerR - 2);
        // Rotating spokes
        gfx.lineStyle(1.5, portal.color, 0.6 + pulse * 0.3);
        for (let i = 0; i < 6; i++) {
          const a = angle + (i * Math.PI * 2 / 6);
          const x1 = px + Math.cos(a) * (outerR - 10);
          const y1 = py + Math.sin(a) * (outerR - 10);
          const x2 = px + Math.cos(a) * (outerR + 3);
          const y2 = py + Math.sin(a) * (outerR + 3);
          gfx.lineBetween(x1, y1, x2, y2);
        }
      }
    }
  }

  // ── Enemies ───────────────────────────────────────────────────────────────
  private updateEnemies(time: number, dt: number): void {
    const mx = this.marble.x, my = this.marble.y;
    const body = this.marble.body as Phaser.Physics.Arcade.Body;

    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.type === 'roller') {
        // Patrol back and forth
        e.vx = this.ROLLER_SPEED * e.patrolDir;
        e.x += e.vx * dt;
        if (e.x >= e.patrolMax) { e.x = e.patrolMax; e.patrolDir = -1; }
        if (e.x <= e.patrolMin) { e.x = e.patrolMin; e.patrolDir =  1; }
        e.img.x = e.x;
        e.img.rotation += (e.vx / e.radius) * dt;

      } else if (e.type === 'chaser') {
        // Chase when in range
        const dist = Phaser.Math.Distance.Between(mx, my, e.x, e.y);
        if (dist < this.CHASER_RANGE) {
          const dir = mx < e.x ? -1 : 1;
          e.vx = dir * this.CHASER_SPEED;
          e.x += e.vx * dt;
          e.img.x = e.x;
          e.img.rotation += (e.vx / e.radius) * dt;
        }
      }

      // Collision check
      const dx   = mx - e.x;
      const dy   = my - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.R + e.radius && time > this.invincibleUntil) {
        const approachVx = Math.abs(body.velocity.x);
        if (approachVx >= this.ENEMY_KILL_VX) {
          // Kill enemy
          e.alive = false;
          this.tweens.add({ targets: e.img, scaleX: 0, scaleY: 0, alpha: 0, duration: 200 });
        } else {
          // Knockback marble — scatter gems Sonic-style
          const knockDir = dx >= 0 ? 1 : -1;
          body.setVelocityX(knockDir * this.KNOCKBACK_VX);
          body.setVelocityY(-280);
          this.invincibleUntil = time + this.INVINCIBLE_MS;
          this.scatterGems(time);
          this.tweens.add({ targets: this.marble, alpha: 0.3, duration: 80, yoyo: true, repeat: 3, onComplete: () => this.marble.setAlpha(1) });
        }
      }
    }
  }

  // ── Gems + Checkpoints ────────────────────────────────────────────────────
  private updateCollectibles(): void {
    const mx  = this.marble.x, my = this.marble.y;
    const dt  = this.game.loop.delta / 1000;
    const now = this.time.now;

    // Static gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      if (Phaser.Math.Distance.Between(mx, my, gem.x, gem.y) < this.R + 14) {
        gem.collected = true;
        this.gemCount++;
        this.tweens.add({ targets: gem.img, y: gem.y - 40, alpha: 0, duration: 400 });
      }
    }

    // Scattered gems — manual gravity + bounce + collection
    for (let i = this.scatteredGems.length - 1; i >= 0; i--) {
      const sg  = this.scatteredGems[i];
      const age = now - sg.spawnTime;
      if (age > 5000) {
        sg.img.destroy();
        this.scatteredGems.splice(i, 1);
        continue;
      }
      sg.vy += 700 * dt;
      sg.x  += sg.vx * dt;
      sg.y  += sg.vy * dt;
      // Clamp to world bounds horizontally so gems don't fly off-screen indefinitely
      sg.x = Phaser.Math.Clamp(sg.x, 0, this.levelDef.worldW);
      // Bounce off ground
      if (sg.y > this.levelDef.groundY - 14) {
        sg.y   = this.levelDef.groundY - 14;
        sg.vy *= -0.4;
        sg.vx *= 0.75;
      }
      sg.img.setPosition(sg.x, sg.y).setAlpha(Math.min(1, (5000 - age) / 800));
      // age > 250ms: gems spawn at marble pos (dist=0); without this guard
      // updateCollectibles re-collects them instantly in the same frame they scatter.
      if (age > 250 && Phaser.Math.Distance.Between(mx, my, sg.x, sg.y) < this.R + 14) {
        if (this.gemCount < this.gems.length) this.gemCount++;
        sg.img.destroy();
        this.scatteredGems.splice(i, 1);
      }
    }

    for (const cp of this.checkpoints) {
      if (cp.activated) continue;
      if (Phaser.Math.Distance.Between(mx, my, cp.x, cp.y) < 40) {
        cp.activated  = true;
        this.respawnX = cp.x;
        this.respawnY = cp.y - this.R * 2;
        cp.img.setTexture('cpTexOn');
        // Float-up label to signal activation
        const label = this.add.text(cp.x, cp.y - 60, 'CHECKPOINT', {
          fontSize: '12px', fontFamily: 'monospace', color: '#22c55e', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({ targets: label, y: cp.y - 100, alpha: 0, duration: 1200, onComplete: () => label.destroy() });
      }
    }
  }

  // ── Visuals: rolling + charge aura + charge bar + portals ─────────────────
  private updateVisuals(time: number, body: Phaser.Physics.Arcade.Body, dt: number, grounded: boolean): void {
    // Rolling rotation — disabled while any charge state is active
    if (!this.isChargeActive) {
      this.marble.rotation += (body.velocity.x / this.R) * dt;
    }

    // Resolve charge t for visual purposes — suppressed during 150ms tap window
    const chargeAge = this.charging ? (time - this.chargeT0) : Infinity;
    const visualT = this.charging && chargeAge >= 150
      ? Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1)
      : (!this.charging && this.isChargeActive) ? this.chargeLockedT : null;

    // Charge aura
    this.glowGfx.clear();
    if (visualT !== null) {
      const t     = visualT;
      const mx    = this.marble.x, my = this.marble.y;
      // Locked state: shift color toward green to indicate "ready to fire"
      const color = this.chargeLocked
        ? 0x22c55e
        : (t < 0.5 ? 0x3b82f6 : t < 0.85 ? 0xf59e0b : 0xef4444);
      const pulse = Math.sin(time * (this.chargeLocked ? 0.014 : 0.009)) * 0.5 + 0.5;
      this.glowGfx.fillStyle(color, (0.12 + t * 0.22) * (0.6 + pulse * 0.4));
      this.glowGfx.fillCircle(mx, my, this.R + 6 + t * 18 + pulse * 5);
      this.glowGfx.fillStyle(color, 0.35 + t * 0.35);
      this.glowGfx.fillCircle(mx, my, this.R + 1 + t * 7);
      if (t >= 1 && !this.chargeLocked) {
        const flash = Math.sin(time * 0.03) * 0.5 + 0.5;
        this.glowGfx.fillStyle(0xffffff, 0.25 * flash);
        this.glowGfx.fillCircle(mx, my, this.R - 2);
      }
    }

    // Charge bar
    this.chargeGfx.clear();
    if (visualT !== null) {
      const t  = visualT;
      const bx = 340, by = 565, bw = 120;
      this.chargeGfx.fillStyle(0x1f2937); this.chargeGfx.fillRect(bx - 1, by - 1, bw + 2, 14);
      const barColor = this.chargeLocked
        ? 0x22c55e
        : (t < 0.5 ? 0x3b82f6 : t < 0.85 ? 0xf59e0b : 0xef4444);
      this.chargeGfx.fillStyle(barColor);
      this.chargeGfx.fillRect(bx, by, Math.round(bw * t), 12);
      this.chargeGfx.lineStyle(1, 0x4b5563); this.chargeGfx.strokeRect(bx - 1, by - 1, bw + 2, 14);
    }

    // Legs visual (charge coil + launch spring)
    this.drawLegs(this.marble.x, this.marble.y, visualT, body);

    // Portal visuals
    this.drawPortals(time);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  private updateHUD(
    time: number,
    body: Phaser.Physics.Arcade.Body,
    grounded: boolean,
    surface: SurfaceType,
  ): void {
    const spd       = Math.round(Math.abs(body.velocity.x));
    const vspd      = Math.round(Math.abs(body.velocity.y));
    const total     = this.gems.length;
    const surfLabel = surface.replace('_', ' ');

    this.hudText.setText(
      `hspd: ${spd}  vspd: ${vspd}  ${grounded ? '▓ ' + surfLabel : '  air'}` +
      (this.isChargeActive ? (this.chargeLocked ? '  🔒' : '  ⚡') : '') +
      `  gems: ${this.gemCount}/${total}`,
    );

    // Timer — show elapsed while running, best time when idle
    if (this.trialStartMs >= 0 && !this.goalReached) {
      this.timerText.setText(this.fmtTime(time - this.trialStartMs));
    } else if (this.bestTime > 0 && this.trialStartMs < 0) {
      this.timerText.setText(`best: ${this.fmtTime(this.bestTime)}`);
    }
  }

  // ── Goal + death ──────────────────────────────────────────────────────────
  private checkGoalAndDeath(): void {
    if (!this.goalReached && this.marble.x > this.levelDef.goal.x - 30) {
      this.goalReached = true;
      this.showGoalMessage();
    }
    if (this.marble.y > this.levelDef.groundY + 200) {
      this.respawn();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  private respawn(): void {
    this.charging         = false;
    this.chargeLocked     = false;
    this.chargeArmedUntil = 0;
    this.trialStartMs     = -1;
    this.gemCount         = 0;
    this.goalReached      = false;
    this.marble.setScale(1);
    // Destroy any in-flight scattered gems
    for (const sg of this.scatteredGems) sg.img.destroy();
    this.scatteredGems = [];
    // Restore static gems so they can be collected again after death
    for (const gem of this.gems) {
      if (gem.collected) {
        gem.collected = false;
        gem.img.setPosition(gem.x, gem.y).setAlpha(1);
      }
    }
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.reset(this.respawnX, this.respawnY);
    this.tweens.add({
      targets: this.marble, alpha: 0.2, duration: 90,
      yoyo: true, repeat: 3, onComplete: () => this.marble.setAlpha(1),
    });
  }

  // ── Foot drag brake ─────────────────────────────────────────────────────────
  // Trailing foot that drags against the surface — terrain-aware deceleration.
  private updateBrake(
    body:     Phaser.Physics.Arcade.Body,
    grounded: boolean,
    surface:  SurfaceType,
    dt:       number,
  ): void {
    this.footGfx.clear();
    const vx    = body.velocity.x;
    const speed = Math.abs(vx);
    // Charging also acts as a brake — you're planting your feet to jump.
    // Foot visual stays Shift-only; charge legs handle the charge visual.
    const activelyBraking = (this.braking || this.isChargeActive) && grounded && speed > 8;

    // Remember last direction of travel so retract visual aims the right way
    if (speed > 8) this.brakeDir = vx > 0 ? 1 : -1;

    // ── Animate extension: shoot out fast, retract slower ──────────────────
    const maxExt    = this.R * 2.0;
    const targetExt = (this.braking && grounded && speed > 8) ? maxExt : 0;
    const rate      = targetExt > this.brakeExtension ? 22 : 9;
    this.brakeExtension += (targetExt - this.brakeExtension) * dt * rate;
    this.brakeExtension  = Math.max(0, this.brakeExtension);

    // ── Physics: decelerate to a full stop ─────────────────────────────────
    if (activelyBraking) {
      let coeff: number;
      if (this.isChargeActive) {
        // Charge brake: strong enough to stop from MAX_VX within the 650ms charge window.
        // Surface-independent — you're planting your feet regardless of what you're on.
        coeff = 0.92;
      } else {
        // Shift brake: per-surface coefficients, gentler and surface-aware.
        const brakeDrag: Record<SurfaceType, number> = {
          [SurfaceType.ICE]:       0.997,  // foot skates — almost useless
          [SurfaceType.WET_METAL]: 0.978,
          [SurfaceType.SNOW]:      0.962,
          [SurfaceType.BOUNCE_PAD]:0.958,
          [SurfaceType.CONVEYOR]:  0.953,
          [SurfaceType.GRASS]:     0.948,
          [SurfaceType.CONCRETE]:  0.942,
          [SurfaceType.SAND]:      0.928,  // foot digs in
          [SurfaceType.MUD]:       0.908,  // maximum grip
        };
        coeff = brakeDrag[surface] ?? 0.942;
      }
      const newVx = vx * Math.pow(coeff, dt / 0.01667);
      body.setVelocityX(Math.abs(newVx) < 20 ? 0 : newVx);
    }

    // ── Visual: draw whenever leg is at all visible ─────────────────────────
    if (this.brakeExtension < 0.5) return;

    const mx  = this.marble.x;
    const my  = this.marble.y;
    const dir = this.brakeDir;

    // Surface dig depth (visual compression into ground)
    const digDepth: Record<SurfaceType, number> = {
      [SurfaceType.MUD]:       9,
      [SurfaceType.SAND]:      6,
      [SurfaceType.SNOW]:      4,
      [SurfaceType.CONCRETE]:  2,
      [SurfaceType.GRASS]:     2,
      [SurfaceType.BOUNCE_PAD]:1,
      [SurfaceType.CONVEYOR]:  1,
      [SurfaceType.WET_METAL]: 1,
      [SurfaceType.ICE]:       0,
    };
    const dig = digDepth[surface] ?? 2;

    // Ankle origin: back-lower quadrant of marble
    const ox = mx - dir * this.R * 0.55;
    const oy = my + this.R * 0.65;

    // Foot contact point: behind marble, distance = animated extension
    const fx = mx - dir * (this.R * 0.9 + this.brakeExtension);
    const fy = my + this.R + dig;

    // Shin line (skin tone)
    this.footGfx.lineStyle(4, 0xf4c98a, 0.95);
    this.footGfx.lineBetween(ox, oy, fx, fy - 3);

    // Shoe (elongated, toe pointing backward away from marble)
    const shoeW = 15 + this.brakeExtension * 0.12;
    const toeX  = fx - dir * shoeW * 0.58;
    this.footGfx.fillStyle(0x2c2c4a, 1.0);
    this.footGfx.fillRoundedRect(Math.min(toeX, fx + dir * shoeW * 0.42), fy - 4, shoeW, 7, 3);
    // Sneaker accent stripe
    this.footGfx.fillStyle(0x5ba4e8, 0.85);
    this.footGfx.fillRect(Math.min(toeX, fx + dir * shoeW * 0.42) + 2, fy - 3, shoeW - 4, 2);

    // Dust / dirt particles at contact (surface-specific colours)
    if (dig > 1 && speed > 50) {
      const dustColors: Partial<Record<SurfaceType, number>> = {
        [SurfaceType.MUD]:  0x7c4a1a,
        [SurfaceType.SAND]: 0xd4a96a,
        [SurfaceType.SNOW]: 0xdce8ff,
      };
      this.footGfx.fillStyle(dustColors[surface] ?? 0x9ca3af, 0.45);
      for (let i = 0; i < 4; i++) {
        this.footGfx.fillCircle(fx - dir * i * 5, fy - 2 - i * 2, 1.5 + speed / 250);
      }
    }
  }

  // ── Jump legs ─────────────────────────────────────────────────────────────
  // Two cartoon legs emerge from the squish during charge, spring at launch.
  private drawLegs(
    mx:      number,
    my:      number,
    visualT: number | null,
    body:    Phaser.Physics.Arcade.Body,
  ): void {
    this.legsGfx.clear();
    const launchT = this.legLaunchT;
    if (visualT === null && launchT === 0) return;

    // Legs angle backward from direction of travel (physically correct lean)
    const velTilt = (body.velocity.x / this.MAX_VX) * 0.22;
    const legSep  = this.R * 0.52;
    const SKIN    = 0xf4c98a;
    const SHOE    = 0x2c2c4a;
    const STRIPE  = 0x5ba4e8;

    if (launchT > 0) {
      // Launch spring: legs retract back into ball (endpoint walks from foot to marble)
      const groundY = this.legLaunchGroundY;
      for (const side of [-1, 1]) {
        const ox    = mx + side * legSep;
        const oy    = my + this.R;
        const footX = mx + side * this.R * 1.3 - velTilt * this.R;
        const footY = groundY;  // anchored to where ground was at jump
        // Visible tip walks from foot back toward marble origin as launchT → 0
        const tipX = ox + (footX - ox) * launchT;
        const tipY = oy + (footY - oy) * launchT;
        this.legsGfx.lineStyle(5, SKIN, 0.93);
        this.legsGfx.lineBetween(ox, oy, tipX, tipY);
        if (launchT > 0.25) {  // shoe disappears as it tucks back in
          this.legsGfx.fillStyle(SHOE, 0.95);
          this.legsGfx.fillRoundedRect(tipX - 8, tipY - 4, 16, 7, 3);
          this.legsGfx.fillStyle(STRIPE, 0.85);
          this.legsGfx.fillRect(tipX - 6, tipY - 3, 12, 2);
        }
      }
      return;
    }

    // Charge coil: frog-leg crouch — feet planted at ground, knees arc up and out
    const t = visualT!;

    for (const side of [-1, 1]) {
      // Hip: bottom edge of marble
      const ox = mx + side * legSep;
      const oy = my + this.R;

      // Feet stay at ground level, spreading outward as charge builds
      const spread = this.R * (0.7 + 1.1 * t);
      const footX  = mx + side * spread - velTilt * spread;
      const footY  = my + this.R;  // anchored at ground

      // Knee arcs up and out — deeper crouch at higher t
      const kneeRise  = this.R * 1.0 * t;
      const kneeSplay = this.R * (0.3 + 0.8 * t);
      const kneeX = mx + side * kneeSplay;
      const kneeY = oy - kneeRise;

      this.legsGfx.lineStyle(5, SKIN, 0.93);
      this.legsGfx.lineBetween(ox, oy, kneeX, kneeY);        // thigh (up + out)
      this.legsGfx.lineBetween(kneeX, kneeY, footX, footY);  // calf (back down)

      this.legsGfx.fillStyle(SHOE, 0.95);
      this.legsGfx.fillRoundedRect(footX - 8, footY - 4, 16, 7, 3);
      this.legsGfx.fillStyle(STRIPE, 0.85);
      this.legsGfx.fillRect(footX - 6, footY - 3, 12, 2);
    }
  }

  // ── Gem scatter (Sonic ring-loss) ─────────────────────────────────────────
  private scatterGems(time: number): void {
    if (this.gemCount === 0) return;   // nothing to lose — no phantom gems
    const n = this.gemCount;
    this.gemCount = 0;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const speed = 180 + Math.random() * 240;
      const img   = this.add.image(this.marble.x, this.marble.y, 'gemTex')
        .setDepth(6).setScale(0.75).setOrigin(0.5);
      this.scatteredGems.push({
        img,
        x: this.marble.x,
        y: this.marble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 160,
        spawnTime: time,
      });
    }
  }

  // ── Speed pads ─────────────────────────────────────────────────────────────
  private updateSpeedPads(): void {
    const mx   = this.marble.x;
    const my   = this.marble.y;
    const body = this.marble.body as Phaser.Physics.Arcade.Body;

    for (const sp of this.speedPads) {
      // Clear exit lock once marble has moved far enough away
      if (sp.exitPos) {
        const d = Phaser.Math.Distance.Between(mx, my, sp.exitPos.x, sp.exitPos.y);
        if (d < this.SPEED_PAD_EXIT_DIST) continue;
        sp.exitPos = null;
      }
      // Contact: horizontal proximity + marble bottom near pad top
      const dx = Math.abs(mx - sp.def.x);
      const dy = Math.abs((my + this.R) - sp.def.y);
      if (dx < this.SPEED_PAD_RADIUS && dy < 20) {
        // Boost to at least this speed in the pad's direction — never reduce existing speed
        if (sp.def.vx !== 0) {
          body.setVelocityX(sp.def.vx > 0
            ? Math.max(body.velocity.x, sp.def.vx)
            : Math.min(body.velocity.x, sp.def.vx));
        }
        if (sp.def.vy !== 0) {
          body.setVelocityY(sp.def.vy < 0
            ? Math.min(body.velocity.y, sp.def.vy)  // upward: ensure at least this fast upward
            : Math.max(body.velocity.y, sp.def.vy)); // downward: ensure at least this fast down
        }
        sp.exitPos = { x: mx, y: my };
        // Brief yellow flash
        const flash = this.add.graphics().setDepth(20);
        flash.fillStyle(0xfbbf24, 0.7);
        flash.fillRect(sp.def.x - 24, sp.def.y - 18, 48, 18);
        this.tweens.add({ targets: flash, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
      }
    }
  }

  // ── Timer format ───────────────────────────────────────────────────────────
  private fmtTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0:00.00';
    const secs = Math.floor(ms / 1000);
    const cs   = Math.floor((ms % 1000) / 10);
    const m    = Math.floor(secs / 60);
    const s    = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }

  private showGoalMessage(): void {
    if (this.trialStartMs >= 0) {
      const elapsed = this.time.now - this.trialStartMs;
      if (this.bestTime === 0 || elapsed < this.bestTime) {
        this.bestTime = elapsed;
        try { localStorage.setItem(`best_${this.levelDef.id}`, String(elapsed)); } catch { /* storage full / restricted */ }
      }
      this.timerText.setText(`${this.fmtTime(elapsed)}  ★`);
    }
    const txt = this.add.text(
      this.marble.x, this.levelDef.groundY - 120,
      '🎉  SANDBOX COMPLETE!\nAll mechanics tested.',
      { fontSize: '26px', fontFamily: 'monospace', color: '#fbbf24', stroke: '#000', strokeThickness: 5, align: 'center' },
    ).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: txt, y: txt.y - 60, alpha: 0, delay: 3000, duration: 800 });
  }
}
