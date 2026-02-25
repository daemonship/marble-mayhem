// World 1 — Level 6: "Desert Dunes"
// Introduces: MUD surface, complex surface combinations
// Theme: Hot desert with oasis, mud pits, and sand dunes

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528;

export const world1_level6: LevelDef = {
  id: 'world1_level6',
  world: 1,
  level: 6,
  bgTheme: 'desert',
  worldW: 6400,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Desert entrance - hot sand
    { x: 0, y: G, w: 300, h: 32, surface: SurfaceType.SAND },
    { x: 350, y: G, w: 300, h: 32, surface: SurfaceType.SAND },
    
    // Mud pit - very sticky, slows to crawl
    { x: 700, y: G, w: 300, h: 32, surface: SurfaceType.MUD },
    
    // Oasis - grass and concrete
    { x: 1050, y: G, w: 200, h: 32, surface: SurfaceType.GRASS },
    { x: 1300, y: G, w: 250, h: 32, surface: SurfaceType.CONCRETE },
    
    // Dune climb - alternating sand and grass
    { x: 1600, y: G - 50, w: 200, h: 32, surface: SurfaceType.SAND },
    { x: 1850, y: G - 100, w: 200, h: 32, surface: SurfaceType.GRASS },
    { x: 2100, y: G - 150, w: 200, h: 32, surface: SurfaceType.SAND },
    { x: 2350, y: G - 200, w: 250, h: 24, surface: SurfaceType.GRASS },
    
    // High dune ridge - sand and mud traps
    { x: 2650, y: G - 200, w: 200, h: 24, surface: SurfaceType.SAND },
    { x: 2900, y: G - 200, w: 150, h: 24, surface: SurfaceType.MUD },
    { x: 3100, y: G - 200, w: 200, h: 24, surface: SurfaceType.SAND },
    { x: 3350, y: G - 200, w: 150, h: 24, surface: SurfaceType.MUD },
    { x: 3550, y: G - 200, w: 250, h: 24, surface: SurfaceType.SAND },
    
    // Descent with bounce pads
    { x: 3850, y: G - 150, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4050, y: G - 80, w: 140, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4250, y: G, w: 300, h: 32, surface: SurfaceType.SAND },
    
    // Underground cave section - wet and muddy
    { x: 4600, y: G, w: 200, h: 32, surface: SurfaceType.WET_METAL },
    { x: 4860, y: G, w: 300, h: 32, surface: SurfaceType.MUD },
    { x: 5200, y: G, w: 200, h: 32, surface: SurfaceType.WET_METAL },
    
    // Conveyor escape
    { x: 5460, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 350 },
    { x: 5820, y: G, w: 300, h: 32, surface: SurfaceType.SAND },
  ],

  portals: [
    // Skip the mud pit shortcut
    { ax: 1150, ay: 510, bx: 2750, by: 246 },
  ],

  springs: [
    { x: 200, y: 500 },
    { x: 1425, y: 500 }, // Help start dune climb
    { x: 4300, y: 500 }, // After bounce descent
  ],

  enemies: [
    { type: 'roller', x: 500, y: 504, patrol: { x1: 360, x2: 630 } }, // First sand
    { type: 'roller', x: 850, y: 504, patrol: { x1: 720, x2: 980 } }, // Mud pit
    { type: 'chaser', x: 2800, y: 246 }, // High dune ridge
    { type: 'roller', x: 5010, y: 504, patrol: { x1: 4880, x2: 5140 } }, // Underground mud
    { type: 'chaser', x: 5600, y: 508 }, // Conveyor escape
  ],

  gems: [
    { x: 850, y: 504 }, // In mud pit
    { x: 2475, y: 246 }, // Top of dune climb
    { x: 5960, y: 504 }, // Near goal
  ],

  checkpoints: [
    { x: 1200, y: 510 }, // Oasis
    { x: 2725, y: 246 }, // High dune ridge
    { x: 5300, y: 510 }, // After underground
  ],

  goal: { x: 6160, y: 448 },

  signs: [
    { x: 850, y: 488, text: 'MUD: Very sticky! Jump to escape' },
    { x: 2000, y: 438, text: 'Climb the dunes' },
    { x: 2975, y: 246, text: 'Avoid the mud traps!' },
    { x: 4120, y: 346, text: 'Bounce down safely' },
    { x: 5010, y: 488, text: 'Underground passage' },
    { x: 5960, y: 488, text: 'Desert edge' },
  ],
};
