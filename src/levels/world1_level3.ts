// World 1 — Level 3: "Laboratory"
// Introduces: BOUNCE_PADS, CONVEYOR belts
// Theme: High-tech lab with experimental surfaces

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528;

export const world1_level3: LevelDef = {
  id: 'world1_level3',
  world: 1,
  level: 3,
  bgTheme: 'laboratory',
  worldW: 5600,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Spawn - clean lab floor
    { x: 0, y: G, w: 350, h: 32, surface: SurfaceType.CONCRETE },
    
    // Bounce pad introduction
    { x: 400, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE },
    { x: 620, y: G - 120, w: 160, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 820, y: G - 240, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // Descent with bounce chain
    { x: 1060, y: G - 180, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 1240, y: G - 80, w: 180, h: 32, surface: SurfaceType.CONCRETE },
    
    // Conveyor belt section - moving walkways
    { x: 1480, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 200 },
    { x: 1820, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: -200 },
    { x: 2160, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 300 },
    
    // Recovery platform
    { x: 2520, y: G, w: 250, h: 32, surface: SurfaceType.CONCRETE },
    
    // Vertical bounce challenge
    { x: 2830, y: G, w: 150, h: 32, surface: SurfaceType.CONCRETE },
    { x: 2780, y: G - 150, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 2830, y: G - 300, w: 150, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 2880, y: G - 450, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // High conveyor run
    { x: 3160, y: G - 450, w: 400, h: 24, surface: SurfaceType.CONVEYOR, conveyorVx: 250 },
    
    // Portal to cross down
    { x: 3640, y: G - 450, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 3640, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    
    // Final lab section - precision bouncing
    { x: 4000, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE },
    { x: 4260, y: G - 100, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4460, y: G - 200, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4660, y: G - 100, w: 180, h: 24, surface: SurfaceType.CONCRETE },
    { x: 4900, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
  ],

  portals: [
    // Downward portal - from high platform to ground
    { ax: 3740, ay: 246, bx: 3740, by: 510 },
  ],

  springs: [
    { x: 280, y: 500 }, // Initial boost option
    { x: 2940, y: 200 }, // Help reach high conveyor
  ],

  enemies: [
    { type: 'roller', x: 1600, y: 504, patrol: { x1: 1500, x2: 1760 } }, // On first conveyor
    { type: 'roller', x: 2000, y: 504, patrol: { x1: 1840, x2: 2100 } }, // On reverse conveyor
    { type: 'chaser', x: 3400, y: 458 }, // On high conveyor
    { type: 'roller', x: 4800, y: 504, patrol: { x1: 4600, x2: 5000 } }, // Near goal
  ],

  gems: [
    { x: 920, y: 216 }, // After first bounce sequence
    { x: 2100, y: 504 }, // On fast conveyor
    { x: 3360, y: 416 }, // On high conveyor
  ],

  checkpoints: [
    { x: 1300, y: 510 }, // After bounce intro
    { x: 2620, y: 510 }, // After conveyors
    { x: 3740, y: 246 }, // On high platform
  ],

  goal: { x: 5200, y: 448 },

  signs: [
    { x: 500, y: 488, text: 'BOUNCE PADS launch you upward!' },
    { x: 1650, y: 488, text: 'Conveyors push you →' },
    { x: 1970, y: 488, text: '← Against the flow' },
    { x: 2900, y: 316, text: 'Chain bounces to climb!' },
    { x: 3360, y: 416, text: 'High speed conveyor' },
    { x: 5060, y: 488, text: 'Lab exit' },
  ],
};
