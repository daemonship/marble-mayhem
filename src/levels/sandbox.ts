// SANDBOX — Test level for all planned Marble Mayhem mechanics.
// Organized into 6 labeled zones that can be played end-to-end.
// Intended for developer testing and mechanic tuning only.
//
// GROUND_Y = 528. Marble radius R = 18. Marble center when grounded ≈ Y 510.
//
// Zone layout (left → right):
//   Zone 0 (x 0–1260)     : Warmup — movement, gaps, spring
//   Zone 1 (x 1400–3760)  : Surface strip — 7 surface types side-by-side
//   Zone 2 (x 3900–4720)  : Conveyors — left and right belts
//   Zone 3 (x 4920–5900)  : Bounce pads — spring + bounce chain
//   Zone 4 (x 6000–7700)  : Portals — gap-cross pair + momentum-chain pair
//   Zone 5 (x 7900–9350)  : Enemies — Roller patrol + Chaser
//   Zone 6 (x 9500–10600) : Gems + Checkpoints + Goal

import { LevelDef, SurfaceType, SeesawDef } from '../types/LevelDef';

const G  = 528;   // GROUND_Y — top surface of main ground

export const sandbox: LevelDef = {
  id:      'sandbox',
  world:   0,
  level:   0,
  bgTheme: 'city_night',
  worldW:  10800,
  groundY: G,
  spawnX:  80,
  spawnY:  492,   // G - R*2 (R=18)

  // ── Platforms ──────────────────────────────────────────────────────────────
  platforms: [

    // ── Zone 0: Warmup ──────────────────────────────────────────────────────
    // Spawn area → seesaw → gaps to warm up jump timing
    // Ground is split around the seesaw (pivot 310, arm span 180–440)
    { x: 0,    y: G,       w: 180, h: 32, surface: SurfaceType.CONCRETE }, // pre-seesaw
    { x: 440,  y: G,       w: 240, h: 32, surface: SurfaceType.CONCRETE }, // post-seesaw
    { x: 740,  y: G,       w: 240, h: 32, surface: SurfaceType.CONCRETE }, // gap: 60px
    { x: 1040, y: G,       w: 220, h: 32, surface: SurfaceType.CONCRETE }, // gap: 60px
    // Floating shelf above gap — reachable via spring
    { x: 760,  y: G - 108, w: 160, h: 24, surface: SurfaceType.CONCRETE },

    // ── Zone 1: Surface strip ───────────────────────────────────────────────
    // All at GROUND_Y — continuous run through 7 surface types.
    // Start with fun/slippery, end with sticky so momentum bleeds off.
    { x: 1400, y: G, w: 280, h: 32, surface: SurfaceType.CONCRETE  },
    { x: 1680, y: G, w: 280, h: 32, surface: SurfaceType.ICE       },
    { x: 1960, y: G, w: 280, h: 32, surface: SurfaceType.WET_METAL },
    { x: 2240, y: G, w: 280, h: 32, surface: SurfaceType.SNOW      },
    { x: 2520, y: G, w: 280, h: 32, surface: SurfaceType.GRASS     },
    { x: 2800, y: G, w: 280, h: 32, surface: SurfaceType.SAND      },
    { x: 3080, y: G, w: 280, h: 32, surface: SurfaceType.MUD       },
    { x: 3360, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE  }, // exit ramp

    // Floating platforms above surface strip (practice high jumps off ICE momentum)
    { x: 1740, y: G - 140, w: 140, h: 24, surface: SurfaceType.CONCRETE },
    { x: 1940, y: G - 200, w: 120, h: 24, surface: SurfaceType.CONCRETE },
    { x: 2120, y: G - 140, w: 140, h: 24, surface: SurfaceType.CONCRETE },

    // ── Zone 2: Conveyors ───────────────────────────────────────────────────
    // Gap from zone 1: 3560 → 3700 (140px). Needs a good jump or spring.
    { x: 3700, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: -300 }, // ← belt
    { x: 4000, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx:  300 }, // → belt
    { x: 4300, y: G, w: 220, h: 32, surface: SurfaceType.CONCRETE  }, // exit buffer

    // ── Zone 3: Bounce pads ─────────────────────────────────────────────────
    // Gap from zone 2: 4520 → 4700 (180px — need a conveyor boost to clear).
    { x: 4700, y: G,       w: 180, h: 32, surface: SurfaceType.CONCRETE  }, // spring platform
    // Elevated bounce pad chain — spring launches marble onto first pad.
    { x: 4920, y: G - 100, w: 160, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 5120, y: G - 180, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 5300, y: G - 100, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    // High platform at top of bounce chain — full-charge needed without spring
    { x: 5120, y: G - 310, w: 160, h: 24, surface: SurfaceType.CONCRETE  },
    { x: 5520, y: G,       w: 200, h: 32, surface: SurfaceType.CONCRETE  }, // landing zone

    // ── Zone 4: Portals ─────────────────────────────────────────────────────
    // Gap from zone 3: 5720 → 5900 (180px).

    // Portal pair CYAN — gap crossing. Gap is 480px (unjumpable without portal).
    { x: 5900, y: G, w: 280, h: 32, surface: SurfaceType.CONCRETE }, // run-up to portal A
    // Gap: 6180 → 6660 (480px — unjumpable)
    { x: 6660, y: G, w: 280, h: 32, surface: SurfaceType.CONCRETE }, // portal B landing
    { x: 6940, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE }, // buffer

    // Portal pair MAGENTA — momentum chain. Enter at ground, exit on high platform.
    // Running into portal C teleports marble to portal D, 264px higher.
    { x: 7140, y: G,       w: 280, h: 32, surface: SurfaceType.CONCRETE }, // run-up to portal C
    { x: 7060, y: G - 264, w: 260, h: 24, surface: SurfaceType.CONCRETE }, // high platform (portal D exits here)
    { x: 7480, y: G,       w: 220, h: 32, surface: SurfaceType.CONCRETE }, // landing after coming down

    // ── Zone 5: Enemies ─────────────────────────────────────────────────────
    // Gap from zone 4: 7700 → 7900 (200px).
    // Checkpoint just before enemies so dying doesn't replay the whole level.
    { x: 7900, y: G, w: 480, h: 32, surface: SurfaceType.CONCRETE }, // Roller arena
    // Gap 60px
    { x: 8440, y: G, w: 480, h: 32, surface: SurfaceType.CONCRETE }, // Chaser arena
    // Gap 60px
    { x: 8980, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE }, // safe exit

    // ── Zone 6: Gems + Goal ─────────────────────────────────────────────────
    // Gap from zone 5: 9180 → 9350 (170px).
    { x: 9350, y: G,       w: 200, h: 32, surface: SurfaceType.CONCRETE }, // gem 1 platform
    // Gap 60px
    { x: 9610, y: G,       w: 200, h: 32, surface: SurfaceType.CONCRETE }, // platform to gem 2
    { x: 9650, y: G - 130, w: 130, h: 24, surface: SurfaceType.CONCRETE }, // elevated shelf for gem 2
    // Gap 80px
    { x: 9880, y: G,       w: 220, h: 32, surface: SurfaceType.CONCRETE }, // spring platform
    { x: 10080, y: G - 240, w: 150, h: 24, surface: SurfaceType.CONCRETE }, // gem 3 (high, spring needed)
    { x: 10300, y: G,      w: 400, h: 32, surface: SurfaceType.CONCRETE }, // final approach + goal
  ],

  // ── Springs ─────────────────────────────────────────────────────────────────
  springs: [
    { x: 660,  y: 500 },           // Zone 0: launch to floating shelf
    { x: 4760, y: 500 },           // Zone 3: launch to bounce pad chain (within zone 3 entry platform)
    { x: 9920, y: 500 },           // Zone 6: reach gem 3 high platform
  ],

  // ── Portals ─────────────────────────────────────────────────────────────────
  portals: [
    // Pair 1 (CYAN): obvious gap-crossing — 480px gap, unjumpable without portal
    { ax: 6100, ay: 510,  bx: 6720, by: 510  },

    // Pair 2 (MAGENTA): momentum chain — enter at ground level, exit on high platform
    // Marble runs right into C, appears at D (264px up) still moving right
    { ax: 7340, ay: 510,  bx: 7190, by: 246  },
  ],

  // ── Enemies ──────────────────────────────────────────────────────────────────
  enemies: [
    // Roller: slow patrol — low-speed hit = knockback, high-speed hit = kill
    { type: 'roller', x: 8120, y: 504, patrol: { x1: 7920, x2: 8360 } },

    // Chaser: detects marble within 300px and chases
    { type: 'chaser', x: 8680, y: 508 },
  ],

  // ── Gems ─────────────────────────────────────────────────────────────────────
  gems: [
    { x: 9440, y: 504 },    // Gem 1: easy, on ground level
    { x: 9715, y: 386 },    // Gem 2: elevated shelf (short jump)
    { x: 10155, y: 266 },   // Gem 3: high platform (spring required)
  ],

  // ── Checkpoints ──────────────────────────────────────────────────────────────
  checkpoints: [
    { x: 4500, y: 510 },    // After surface strip / before conveyors
    { x: 7980, y: 510 },    // Before enemies
  ],

  // ── Goal ─────────────────────────────────────────────────────────────────────
  goal: { x: 10550, y: 464 },

  // ── Zone signs ───────────────────────────────────────────────────────────────
  signs: [
    // Zone 0
    { x: 100,  y: 488, text: 'A/D  ROLL    SPACE  charge jump' },
    { x: 310,  y: G - 46, text: '← SEESAW →' },
    { x: 830,  y: 393, text: 'spring here →' },

    // Zone transition banners
    { x: 1540, y: 466, text: '▌ SURFACES' },

    // Surface labels (floating above strip)
    { x: 1540, y: 508, text: 'CONCRETE' },
    { x: 1820, y: 508, text: 'ICE' },
    { x: 2100, y: 508, text: 'WET METAL' },
    { x: 2380, y: 508, text: 'SNOW' },
    { x: 2660, y: 508, text: 'GRASS' },
    { x: 2940, y: 508, text: 'SAND' },
    { x: 3220, y: 508, text: 'MUD' },

    // Zone 2
    { x: 3850, y: 466, text: '▌ CONVEYORS' },
    { x: 3850, y: 508, text: '← belt' },
    { x: 4150, y: 508, text: 'belt →' },

    // Zone 3
    { x: 4800, y: 466, text: '▌ BOUNCE PADS' },
    { x: 5180, y: 306, text: 'try a full-charge jump\nfrom the pads!' },

    // Zone 4
    { x: 6040, y: 466, text: '▌ PORTALS' },
    { x: 6060, y: 500, text: 'A →' },
    { x: 6690, y: 500, text: '← B' },
    { x: 6700, y: 466, text: 'portal crossed the gap!' },
    { x: 7220, y: 500, text: 'C →' },
    { x: 7130, y: 226, text: '← D  (264px higher!)' },

    // Zone 5
    { x: 8060, y: 466, text: '▌ ENEMIES' },
    { x: 8050, y: 490, text: 'slow: knockback' },
    { x: 8300, y: 490, text: 'fast: kill →' },
    { x: 8590, y: 466, text: 'CHASER' },

    // Zone 6
    { x: 9420, y: 466, text: '▌ GEMS (3)' },
    { x: 9440, y: 500, text: '1' },
    { x: 9715, y: 372, text: '2' },
    { x: 10155, y: 252, text: '3' },
  ],

  // ── Seesaws ───────────────────────────────────────────────────────────────
  seesaws: [
    {
      // Zone 0: introductory seesaw — pre-balanced right-heavy by counterweight gem.
      // Marble rolling on from the left outweighs the gem and tilts the plank.
      pivotX:   310,
      pivotY:   G,            // plank top surface at rest = ground level
      length:   260,          // arm span: x 180–440
      maxAngle: Math.PI / 8,  // ≈22.5° max tilt
      rotMass:  8000,         // rotational inertia (higher = slower response)
      damping:  0.94,         // angular velocity decay per 60fps frame
      gems: [
        { xOffset: 80, mass: 0.5 },   // counterweight on right arm
      ],
    } as SeesawDef,
  ],
};
