// World 1 — Level 5: "Frozen Caverns"
// Introduces: SNOW surface, enemy encounters
// Theme: Ice cave with crystalline formations and slippery hazards

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528;

export const world1_level5: LevelDef = {
  id: 'world1_level5',
  world: 1,
  level: 5,
  bgTheme: 'icy_cavern',
  worldW: 6000,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Cave entrance - snow and ice mix
    { x: 0, y: G, w: 300, h: 32, surface: SurfaceType.SNOW },
    { x: 350, y: G, w: 300, h: 32, surface: SurfaceType.ICE },
    
    // First gap - requires careful ice momentum
    { x: 700, y: G, w: 250, h: 32, surface: SurfaceType.ICE },
    
    // Snow bank - safe zone
    { x: 1000, y: G, w: 200, h: 32, surface: SurfaceType.SNOW },
    
    // Icy descent
    { x: 1250, y: G, w: 400, h: 32, surface: SurfaceType.ICE },
    { x: 1700, y: G + 30, w: 300, h: 32, surface: SurfaceType.ICE },
    { x: 2050, y: G + 60, w: 300, h: 32, surface: SurfaceType.ICE },
    
    // Recovery platform
    { x: 2400, y: G, w: 250, h: 32, surface: SurfaceType.SNOW },
    
    // Vertical ice climb with bounce pads
    { x: 2720, y: G, w: 150, h: 32, surface: SurfaceType.SNOW },
    { x: 2670, y: G - 140, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 2720, y: G - 280, w: 150, h: 24, surface: SurfaceType.ICE },
    { x: 2770, y: G - 420, w: 200, h: 24, surface: SurfaceType.SNOW },
    
    // High ice bridge
    { x: 3040, y: G - 420, w: 600, h: 24, surface: SurfaceType.ICE },
    
    // Portal section - cross a dangerous gap
    { x: 3720, y: G - 420, w: 200, h: 24, surface: SurfaceType.SNOW },
    { x: 3720, y: G, w: 300, h: 32, surface: SurfaceType.SNOW },
    
    // Deep ice field with enemies
    { x: 4100, y: G, w: 500, h: 32, surface: SurfaceType.ICE },
    
    // Snow sanctuary before goal
    { x: 4700, y: G, w: 300, h: 32, surface: SurfaceType.SNOW },
    { x: 5080, y: G, w: 400, h: 32, surface: SurfaceType.SNOW },
  ],

  portals: [
    // Down from high bridge
    { ax: 3800, ay: 396, bx: 3800, by: 510 },
  ],

  springs: [
    { x: 200, y: 500 },
    { x: 2780, y: 500 }, // Help start vertical climb
  ],

  enemies: [
    { type: 'roller', x: 550, y: 504, patrol: { x1: 360, x2: 630 } }, // On first ice
    { type: 'roller', x: 1450, y: 504, patrol: { x1: 1270, x2: 1620 } }, // Icy descent
    { type: 'chaser', x: 3400, y: 458 }, // On high ice bridge
    { type: 'roller', x: 4350, y: 504, patrol: { x1: 4120, x2: 4560 } }, // Deep ice field
    { type: 'chaser', x: 4900, y: 508 }, // Snow sanctuary
  ],

  gems: [
    { x: 1500, y: 474 }, // On icy descent
    { x: 3340, y: 396 }, // On high ice bridge
    { x: 5260, y: 504 }, // Near goal
  ],

  checkpoints: [
    { x: 1100, y: 510 }, // After first ice section
    { x: 2520, y: 510 }, // Recovery platform
    { x: 4800, y: 510 }, // Before final section
  ],

  goal: { x: 5760, y: 448 },

  signs: [
    { x: 175, y: 488, text: 'SNOW: Soft landing, low friction' },
    { x: 850, y: 488, text: 'ICE: Near-zero friction!' },
    { x: 3360, y: 396, text: 'Careful: Slippery bridge' },
    { x: 5440, y: 488, text: 'Cave exit ahead' },
  ],
};
