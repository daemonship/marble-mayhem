import Phaser from 'phaser';
import { LevelDef, SurfaceType, PlatformDef } from '../types/LevelDef';
import { sandbox } from '../levels/sandbox';

// ── Surface physics table ─────────────────────────────────────────────────────
// dragMultiplier  — multiplied against ROLL_DRAG coefficient (higher = more momentum)
// accelMultiplier — multiplied against ACCEL_X (how fast marble responds to keys)
// maxVxMultiplier — caps MAX_VX (MUD slows the marble's top speed)
// bounceY         — vertical restitution coefficient (BOUNCE_PAD = very high)
interface SurfaceProps {
  dragMultiplier:  number;
  accelMultiplier: number;
  maxVxMultiplier: number;
  bounceY:         number;
}

const SURFACE_PROPS: Record<SurfaceType, SurfaceProps> = {
  [SurfaceType.CONCRETE]:   { dragMultiplier: 1.000, accelMultiplier: 1.00, maxVxMultiplier: 1.00, bounceY: 0.05 },
  [SurfaceType.GRASS]:      { dragMultiplier: 0.970, accelMultiplier: 0.90, maxVxMultiplier: 1.00, bounceY: 0.08 },
  [SurfaceType.SAND]:       { dragMultiplier: 0.750, accelMultiplier: 0.65, maxVxMultiplier: 1.00, bounceY: 0.02 },
  [SurfaceType.MUD]:        { dragMultiplier: 0.550, accelMultiplier: 0.45, maxVxMultiplier: 0.40, bounceY: 0.00 },
  [SurfaceType.ICE]:        { dragMultiplier: 0.999, accelMultiplier: 0.20, maxVxMultiplier: 1.00, bounceY: 0.05 },
  [SurfaceType.SNOW]:       { dragMultiplier: 0.920, accelMultiplier: 0.75, maxVxMultiplier: 1.00, bounceY: 0.12 },
  [SurfaceType.WET_METAL]:  { dragMultiplier: 0.985, accelMultiplier: 0.35, maxVxMultiplier: 1.00, bounceY: 0.05 },
  [SurfaceType.BOUNCE_PAD]: { dragMultiplier: 1.000, accelMultiplier: 1.00, maxVxMultiplier: 1.00, bounceY: 0.82 },
  [SurfaceType.CONVEYOR]:   { dragMultiplier: 1.000, accelMultiplier: 1.00, maxVxMultiplier: 1.00, bounceY: 0.05 },
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

// ── Scene ─────────────────────────────────────────────────────────────────────
export class MarblePlatform extends Phaser.Scene {
  private marble!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { A: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  private levelDef!: LevelDef;

  // ── Core marble state ──────────────────────────────────────────────────────
  private charging    = false;
  private chargeT0    = 0;
  private goalReached = false;

  // Manual edge detection (JustDown() is unreliable on some Phaser builds)
  private prevSpace = false;
  private prevLeft  = false;
  private prevRight = false;

  // Respawn anchor — updated when a checkpoint is activated
  private respawnX = 0;
  private respawnY = 0;

  // Portal cooldown — prevents immediate re-entry after teleport
  private portalCooldownUntil = 0;

  // Knockback invincibility — brief grace period after enemy hit
  private invincibleUntil = 0;

  // ── Physics knobs ─────────────────────────────────────────────────────────
  private readonly R           = 18;
  private readonly GRAVITY     = 980;
  private readonly ACCEL_X     = 700;
  private readonly MAX_VX      = 420;
  private readonly ROLL_DRAG   = 0.93;
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

  // ── Parallax layers ────────────────────────────────────────────────────────
  private pxLayers: Array<{ ts: Phaser.GameObjects.TileSprite; factor: number }> = [];

  constructor() { super({ key: 'MarblePlatform' }); }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════
  create(): void {
    this.levelDef  = sandbox;
    this.respawnX  = this.levelDef.spawnX;
    this.respawnY  = this.levelDef.spawnY;

    this.physics.world.setBounds(0, -400, this.levelDef.worldW, 1100);
    this.cameras.main.setBounds(0, -400, this.levelDef.worldW, 1100);

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

    // Zone-divider banners (taller, brighter)
    // (Signs already contain these — see sandbox.ts ▌ prefix entries)

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
    this.chargeGfx = this.add.graphics().setScrollFactor(0).setDepth(50);
    this.glowGfx   = this.add.graphics().setDepth(9);
    this.add.text(400, 593, 'A/← roll   D/→ roll   SPACE hold+release = jump', {
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
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE — main loop
  // ═══════════════════════════════════════════════════════════════════════════
  update(time: number, delta: number): void {
    const body     = this.marble.body as Phaser.Physics.Arcade.Body;
    const dt       = delta / 1000;
    const grounded = body.blocked.down;

    this.updateParallax();
    const surface = this.getSurface(grounded);
    this.updateSurface(body, grounded, surface, dt);
    this.updateMovement(body, grounded, surface, dt);
    this.updateJump(time, body, grounded);
    this.updateSprings(body, grounded);
    this.updatePortals(time);
    this.updateEnemies(time, dt);
    this.updateCollectibles();
    this.updateVisuals(time, body, dt, grounded);
    this.updateHUD(time, body, grounded, surface);
    this.checkGoalAndDeath();

    this.prevSpace = this.cursors.space.isDown;
    this.prevLeft  = this.cursors.left.isDown  || this.keys.A.isDown;
    this.prevRight = this.cursors.right.isDown || this.keys.D.isDown;
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
  ): void {
    const goLeft  = this.cursors.left.isDown  || this.keys.A.isDown;
    const goRight = this.cursors.right.isDown || this.keys.D.isDown;
    const justLeft  = goLeft  && !this.prevLeft;
    const justRight = goRight && !this.prevRight;

    const KICK = 120;
    if (grounded && justLeft  && body.velocity.x >= 0) body.setVelocityX(-KICK);
    if (grounded && justRight && body.velocity.x <= 0) body.setVelocityX( KICK);

    const props = SURFACE_PROPS[surface];
    const accel = this.ACCEL_X * (grounded ? 1.0 : 0.12) * props.accelMultiplier;

    if (goLeft) {
      body.setAccelerationX(-accel);
    } else if (goRight) {
      body.setAccelerationX(accel);
    } else {
      body.setAccelerationX(0);
      if (grounded && Math.abs(body.velocity.x) > 1) {
        const drag = Math.pow(this.ROLL_DRAG * props.dragMultiplier, delta / 16.67);
        body.setVelocityX(body.velocity.x * drag);
      } else if (grounded) {
        body.setVelocityX(0);
      }
    }
  }

  // ── Jump ─────────────────────────────────────────────────────────────────
  private updateJump(time: number, body: Phaser.Physics.Arcade.Body, grounded: boolean): void {
    const space         = this.cursors.space;
    const spaceJustDown = space.isDown && !this.prevSpace;

    if (spaceJustDown && grounded && !this.charging) {
      this.charging = true;
      this.chargeT0 = time;
    }

    if (this.charging) {
      const t = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);

      if (!this.goalReached) {
        const jiggleFreq = 0.014 + t * 0.038;
        const jiggleAmp  = t * 0.07;
        const jX = Math.sin(time * jiggleFreq) * jiggleAmp;
        const jY = Math.sin(time * jiggleFreq * 1.31) * jiggleAmp;
        this.marble.setScale(1 + t * 0.28 + jX, 1 - t * 0.22 + jY);
      }

      if (!space.isDown || t >= 1) {
        const jumpV = Phaser.Math.Linear(this.JUMP_MIN, this.JUMP_MAX, t);
        body.setVelocityY(-jumpV);
        this.charging = false;
        this.tweens.add({
          targets: this.marble,
          scaleX: 1 - t * 0.22, scaleY: 1 + t * 0.28,
          duration: 60, yoyo: true,
          onComplete: () => this.marble.setScale(1),
        });
      }
    }
  }

  // ── Springs ───────────────────────────────────────────────────────────────
  private updateSprings(body: Phaser.Physics.Arcade.Body, grounded: boolean): void {
    if (this.charging || !grounded) return;
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
  private readonly PORTAL_RADIUS = 36;

  private updatePortals(time: number): void {
    if (time < this.portalCooldownUntil) return;

    const mx = this.marble.x, my = this.marble.y;
    const body = this.marble.body as Phaser.Physics.Arcade.Body;

    for (const portal of this.portals) {
      const distA = Phaser.Math.Distance.Between(mx, my, portal.ax, portal.ay);
      const distB = Phaser.Math.Distance.Between(mx, my, portal.bx, portal.by);

      if (distA < this.PORTAL_RADIUS) {
        // Teleport A → B, preserving velocity
        const vx = body.velocity.x, vy = body.velocity.y;
        body.reset(portal.bx, portal.by);
        body.setVelocity(vx, vy);
        this.portalCooldownUntil = time + 500;
        this.showPortalFlash(portal.bx, portal.by, portal.color);
        break;
      } else if (distB < this.PORTAL_RADIUS) {
        // Teleport B → A, preserving velocity
        const vx = body.velocity.x, vy = body.velocity.y;
        body.reset(portal.ax, portal.ay);
        body.setVelocity(vx, vy);
        this.portalCooldownUntil = time + 500;
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
          // Knockback marble
          const knockDir = dx >= 0 ? 1 : -1;
          body.setVelocityX(knockDir * this.KNOCKBACK_VX);
          body.setVelocityY(-280);
          this.invincibleUntil = time + this.INVINCIBLE_MS;
          this.tweens.add({ targets: this.marble, alpha: 0.3, duration: 80, yoyo: true, repeat: 3, onComplete: () => this.marble.setAlpha(1) });
        }
      }
    }
  }

  // ── Gems + Checkpoints ────────────────────────────────────────────────────
  private updateCollectibles(): void {
    const mx = this.marble.x, my = this.marble.y;

    for (const gem of this.gems) {
      if (gem.collected) continue;
      if (Phaser.Math.Distance.Between(mx, my, gem.x, gem.y) < this.R + 14) {
        gem.collected = true;
        this.tweens.add({ targets: gem.img, y: gem.y - 40, alpha: 0, duration: 400 });
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
    // Rolling rotation
    if (!this.charging) {
      this.marble.rotation += (body.velocity.x / this.R) * dt;
    }

    // Charge aura
    this.glowGfx.clear();
    if (this.charging) {
      const t     = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);
      const mx    = this.marble.x, my = this.marble.y;
      const color = t < 0.5 ? 0x3b82f6 : t < 0.85 ? 0xf59e0b : 0xef4444;
      const pulse = Math.sin(time * 0.009) * 0.5 + 0.5;
      this.glowGfx.fillStyle(color, (0.12 + t * 0.22) * (0.6 + pulse * 0.4));
      this.glowGfx.fillCircle(mx, my, this.R + 6 + t * 18 + pulse * 5);
      this.glowGfx.fillStyle(color, 0.35 + t * 0.35);
      this.glowGfx.fillCircle(mx, my, this.R + 1 + t * 7);
      if (t >= 1) {
        const flash = Math.sin(time * 0.03) * 0.5 + 0.5;
        this.glowGfx.fillStyle(0xffffff, 0.25 * flash);
        this.glowGfx.fillCircle(mx, my, this.R - 2);
      }
    }

    // Charge bar
    this.chargeGfx.clear();
    if (this.charging) {
      const t  = Math.min((time - this.chargeT0) / this.MAX_CHARGE, 1);
      const bx = 340, by = 565, bw = 120;
      this.chargeGfx.fillStyle(0x1f2937); this.chargeGfx.fillRect(bx - 1, by - 1, bw + 2, 14);
      this.chargeGfx.fillStyle(t < 0.5 ? 0x3b82f6 : t < 0.85 ? 0xf59e0b : 0xef4444);
      this.chargeGfx.fillRect(bx, by, Math.round(bw * t), 12);
      this.chargeGfx.lineStyle(1, 0x4b5563); this.chargeGfx.strokeRect(bx - 1, by - 1, bw + 2, 14);
    }

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
    const spd    = Math.round(Math.abs(body.velocity.x));
    const vspd   = Math.round(Math.abs(body.velocity.y));
    const gems   = this.gems.filter(g => g.collected).length;
    const total  = this.gems.length;
    const surfLabel = surface.replace('_', ' ');

    this.hudText.setText(
      `hspd: ${spd}  vspd: ${vspd}  ${grounded ? '▓ ' + surfLabel : '  air'}` +
      (this.charging ? '  ⚡' : '') +
      `  gems: ${gems}/${total}`,
    );
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
    this.charging = false;
    this.marble.setScale(1);
    const body = this.marble.body as Phaser.Physics.Arcade.Body;
    body.reset(this.respawnX, this.respawnY);
    this.tweens.add({
      targets: this.marble, alpha: 0.2, duration: 90,
      yoyo: true, repeat: 3, onComplete: () => this.marble.setAlpha(1),
    });
  }

  private showGoalMessage(): void {
    const txt = this.add.text(
      this.marble.x, this.levelDef.groundY - 120,
      '🎉  SANDBOX COMPLETE!\nAll mechanics tested.',
      { fontSize: '26px', fontFamily: 'monospace', color: '#fbbf24', stroke: '#000', strokeThickness: 5, align: 'center' },
    ).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: txt, y: txt.y - 60, alpha: 0, delay: 3000, duration: 800 });
  }
}
