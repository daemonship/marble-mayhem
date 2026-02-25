// World 1 — Level 7: "Rainy Rooftops"
// Introduces: WET_METAL surface prominently, challenging platforming
// Theme: City rooftops in a storm, slippery and dangerous

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528;

export const world1_level7: LevelDef = {
  id: 'world1_level7',
  world: 1,
  level: 7,
  bgTheme: 'rainy_rooftop',
  worldW: 6800,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Rooftop start - wet and slippery
    { x: 0, y: G, w: 250, h: 32, surface: SurfaceType.WET_METAL },
    { x: 300, y: G, w: 200, h: 32, surface: SurfaceType.WET_METAL },
    
    // Gap to next building
    { x: 550, y: G, w: 250, h: 32, surface: SurfaceType.CONCRETE },
    
    // AC unit platforms - small and tricky
    { x: 850, y: G - 60, w: 100, h: 24, surface: SurfaceType.WET_METAL },
    { x: 1000, y: G - 120, w: 100, h: 24, surface: SurfaceType.WET_METAL },
    { x: 1150, y: G - 60, w: 100, h: 24, surface: SurfaceType.WET_METAL },
    
    // Main rooftop
    { x: 1300, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
    
    // Water tower climb
    { x: 1750, y: G - 80, w: 150, h: 24, surface: SurfaceType.WET_METAL },
    { x: 1950, y: G - 160, w: 150, h: 24, surface: SurfaceType.WET_METAL },
    { x: 2150, y: G - 240, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    
    // High wire (ice-like slippery beam)
    { x: 2400, y: G - 240, w: 500, h: 20, surface: SurfaceType.ICE },
    
    // Portal building - high to low
    { x: 2960, y: G - 240, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 2960, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    
    // Conveyor vent section
    { x: 3320, y: G, w: 250, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: -300 },
    { x: 3620, y: G, w: 250, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 300 },
    { x: 3920, y: G, w: 250, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: -300 },
    
    // Bounce pad chimney descent
    { x: 4220, y: G, w: 150, h: 32, surface: SurfaceType.CONCRETE },
    { x: 4170, y: G - 120, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4220, y: G - 240, w: 150, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4270, y: G - 360, w: 200, h: 24, surface: SurfaceType.WET_METAL },
    
    // Highest rooftop - final challenge
    { x: 4540, y: G - 360, w: 400, h: 24, surface: SurfaceType.WET_METAL },
    { x: 5000, y: G - 360, w: 200, h: 24, surface: SurfaceType.ICE },
    { x: 5260, y: G - 360, w: 400, h: 24, surface: SurfaceType.WET_METAL },
    
    // Portal to goal
    { x: 5720, y: G - 360, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 5720, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    
    // Goal platform
    { x: 6100, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
  ],

  portals: [
    // Down from water tower
    { ax: 3040, ay: 246, bx: 3040, by: 510 },
    // From highest rooftop to goal area
    { ax: 5800, ay: 396, bx: 5800, by: 510 },
  ],

  springs: [
    { x: 150, y: 500 },
    { x: 1375, y: 500 }, // Help reach water tower
    { x: 4290, y: 500 }, // Help reach chimney
  ],

  enemies: [
    { type: 'roller', x: 400, y: 504, patrol: { x1: 310, x2: 480 } }, // Start
    { type: 'chaser', x: 1500, y: 508 }, // Main rooftop
    { type: 'roller', x: 2650, y: 266 }, // High wire
    { type: 'chaser', x: 4120, y: 508 }, // Conveyor section
    { type: 'roller', x: 4740, y: 376 }, // Highest rooftop
    { type: 'chaser', x: 5460, y: 376 }, // Near final portal
  ],

  gems: [
    { x: 1050, y: 384 }, // AC unit platforms
    { x: 2250, y: 266 }, // Top of water tower
    { x: 6280, y: 504 }, // Near goal
  ],

  checkpoints: [
    { x: 1500, y: 510 }, // Main rooftop
    { x: 3040, y: 510 }, // After portal down
    { x: 5800, y: 510 }, // Goal area
  ],

  goal: { x: 6560, y: 448 },

  signs: [
    { x: 125, y: 488, text: 'WET METAL: Slippery when raining' },
    { x: 1050, y: 426, text: 'Jump across AC units' },
    { x: 2650, y: 266, text: 'High wire - very slippery!' },
    { x: 3720, y: 466, text: 'Fight the vents!' },
    { x: 4740, y: 346, text: 'Almost at the top' },
    { x: 6320, y: 488, text: 'Building exit' },
  ],
};
