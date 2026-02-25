// World 1 — Level 2: "Pipe Dreams"
// Introduces: Portals, ICE surface
// Theme: Underground pipe network with glowing portal technology

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528; // Ground Y

export const world1_level2: LevelDef = {
  id: 'world1_level2',
  world: 1,
  level: 2,
  bgTheme: 'underground_pipes',
  worldW: 4800,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Spawn area - safe concrete start
    { x: 0, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
    
    // First gap - introduces basic jumping
    { x: 480, y: G, w: 280, h: 32, surface: SurfaceType.CONCRETE },
    
    // ICE introduction - slippery section
    { x: 820, y: G, w: 500, h: 32, surface: SurfaceType.ICE },
    
    // Recovery platform after ice
    { x: 1380, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE },
    
    // Portal tutorial section - two platforms with gap
    { x: 1640, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    // Gap with portal to cross
    { x: 2100, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
    
    // Elevated platform (reachable via portal momentum)
    { x: 2020, y: G - 180, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // Pipe tunnel section - mixed surfaces
    { x: 2600, y: G, w: 300, h: 32, surface: SurfaceType.WET_METAL },
    { x: 2960, y: G, w: 200, h: 32, surface: SurfaceType.ICE },
    { x: 3220, y: G, w: 300, h: 32, surface: SurfaceType.WET_METAL },
    
    // Vertical pipe climb - platforms going up
    { x: 3600, y: G, w: 180, h: 32, surface: SurfaceType.CONCRETE },
    { x: 3680, y: G - 100, w: 140, h: 24, surface: SurfaceType.CONCRETE },
    { x: 3760, y: G - 200, w: 140, h: 24, surface: SurfaceType.CONCRETE },
    { x: 3840, y: G - 300, w: 180, h: 24, surface: SurfaceType.CONCRETE },
    
    // High pipe run - all ice (slippery challenge)
    { x: 4100, y: G - 300, w: 600, h: 24, surface: SurfaceType.ICE },
    
    // Final descent to goal
    { x: 4300, y: G - 150, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 4400, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
  ],

  portals: [
    // First portal pair - gap crossing tutorial
    { ax: 1900, ay: 510, bx: 2140, by: 510 },
    // Second portal pair - momentum to high platform
    { ax: 1880, ay: 350, bx: 2060, by: 246 },
  ],

  springs: [
    { x: 350, y: 500 }, // Help over first gap
    { x: 3640, y: 500 }, // Help start the vertical climb
    { x: 4360, y: 500 }, // Help reach goal platform
  ],

  enemies: [
    { type: 'roller', x: 1100, y: 504, patrol: { x1: 840, x2: 1300 } }, // On ice section
    { type: 'roller', x: 2800, y: 504, patrol: { x1: 2620, x2: 2880 } }, // In pipe tunnel
    { type: 'chaser', x: 3900, y: 488 }, // On high platform
  ],

  gems: [
    { x: 1070, y: 504 }, // On ice section
    { x: 2100, y: 226 }, // On elevated platform (portal reward)
    { x: 4400, y: 504 }, // Near goal
  ],

  checkpoints: [
    { x: 1500, y: 510 }, // After ice section
    { x: 3660, y: 510 }, // Before vertical climb
  ],

  goal: { x: 4680, y: 448 },

  signs: [
    { x: 200, y: 488, text: 'ICE is slippery! Build momentum carefully' },
    { x: 1750, y: 488, text: 'Portals teleport you instantly' },
    { x: 2800, y: 466, text: 'WET METAL: low friction' },
    { x: 3720, y: 466, text: 'Climb the pipes!' },
    { x: 4400, y: 466, text: 'Exit ahead' },
  ],
};
