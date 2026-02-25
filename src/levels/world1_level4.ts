// World 1 — Level 4: "Factory Floor"
// Introduces: SAND surface, complex portal puzzles
// Theme: Industrial factory with machinery and hazards

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528;

export const world1_level4: LevelDef = {
  id: 'world1_level4',
  world: 1,
  level: 4,
  bgTheme: 'factory',
  worldW: 6200,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Factory entrance
    { x: 0, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    { x: 350, y: G, w: 250, h: 32, surface: SurfaceType.WET_METAL },
    
    // Sand pit - slows you down
    { x: 650, y: G, w: 400, h: 32, surface: SurfaceType.SAND },
    
    // Recovery
    { x: 1100, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE },
    
    // Elevated conveyor system
    { x: 1360, y: G - 80, w: 300, h: 24, surface: SurfaceType.CONVEYOR, conveyorVx: 250 },
    { x: 1720, y: G - 160, w: 300, h: 24, surface: SurfaceType.CONVEYOR, conveyorVx: 250 },
    { x: 2080, y: G - 240, w: 300, h: 24, surface: SurfaceType.CONVEYOR, conveyorVx: 250 },
    
    // High platform with portal
    { x: 2440, y: G - 240, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // Lower factory floor - sand and machinery
    { x: 2200, y: G, w: 300, h: 32, surface: SurfaceType.SAND },
    { x: 2560, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    { x: 2920, y: G, w: 300, h: 32, surface: SurfaceType.SAND },
    
    // Vertical shaft with bounce pads
    { x: 3300, y: G, w: 150, h: 32, surface: SurfaceType.CONCRETE },
    { x: 3250, y: G - 150, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 3300, y: G - 300, w: 150, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 3350, y: G - 450, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // Upper factory catwalk
    { x: 3640, y: G - 450, w: 500, h: 24, surface: SurfaceType.WET_METAL },
    { x: 4200, y: G - 450, w: 200, h: 24, surface: SurfaceType.ICE },
    { x: 4460, y: G - 450, w: 400, h: 24, surface: SurfaceType.WET_METAL },
    
    // Portal destination - high to low
    { x: 4940, y: G - 200, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // Final assembly line
    { x: 4600, y: G, w: 300, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 300 },
    { x: 4960, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    { x: 5320, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
    
    // Secret high platform (optional)
    { x: 5500, y: G - 200, w: 150, h: 24, surface: SurfaceType.CONCRETE },
  ],

  portals: [
    // Upward momentum portal
    { ax: 2520, ay: 246, bx: 3340, by: 486 },
    // Downward escape portal
    { ax: 4660, ay: 426, bx: 5020, by: 246 },
  ],

  springs: [
    { x: 200, y: 500 },
    { x: 3340, y: 500 }, // Help with vertical shaft
    { x: 5540, y: 300 }, // Secret platform
  ],

  enemies: [
    { type: 'roller', x: 850, y: 504, patrol: { x1: 670, x2: 1030 } }, // In sand
    { type: 'roller', x: 2400, y: 504, patrol: { x1: 2220, x2: 2480 } }, // Lower floor
    { type: 'chaser', x: 3900, y: 458 }, // On catwalk
    { type: 'roller', x: 5160, y: 504, patrol: { x1: 4980, x2: 5240 } }, // Assembly line
  ],

  gems: [
    { x: 850, y: 504 }, // In sand pit
    { x: 1900, y: 424 }, // On elevated conveyor
    { x: 5020, y: 226 }, // Portal destination (high)
  ],

  checkpoints: [
    { x: 1200, y: 510 }, // After sand pit
    { x: 3400, y: 486 }, // After vertical shaft
    { x: 5060, y: 510 }, // Before final section
  ],

  goal: { x: 5960, y: 448 },

  signs: [
    { x: 850, y: 488, text: 'SAND: High friction, kills momentum' },
    { x: 1800, y: 400, text: 'Ride the conveyor up' },
    { x: 3800, y: 416, text: 'Factory catwalk' },
    { x: 5560, y: 316, text: 'Secret area!' },
    { x: 5700, y: 488, text: 'Factory exit' },
  ],
};
