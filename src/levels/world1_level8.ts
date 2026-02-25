// World 1 — Level 8: "Boss Platform"
// All mechanics combined - longest and hardest level
// Theme: Final confrontation platform with all surface types and hazards

import { LevelDef, SurfaceType } from '../types/LevelDef';

const G = 528;

export const world1_level8: LevelDef = {
  id: 'world1_level8',
  world: 1,
  level: 8,
  bgTheme: 'boss_arena',
  worldW: 8000,
  groundY: G,
  spawnX: 80,
  spawnY: 492,

  platforms: [
    // Entrance gauntlet - all surface types in sequence
    { x: 0, y: G, w: 200, h: 32, surface: SurfaceType.CONCRETE },
    { x: 250, y: G, w: 150, h: 32, surface: SurfaceType.GRASS },
    { x: 450, y: G, w: 150, h: 32, surface: SurfaceType.SAND },
    { x: 650, y: G, w: 150, h: 32, surface: SurfaceType.MUD },
    { x: 850, y: G, w: 200, h: 32, surface: SurfaceType.ICE },
    
    // Recovery and checkpoint
    { x: 1100, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    
    // Vertical challenge - all surfaces going up
    { x: 1450, y: G, w: 120, h: 32, surface: SurfaceType.CONCRETE },
    { x: 1420, y: G - 100, w: 100, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 1450, y: G - 200, w: 120, h: 24, surface: SurfaceType.WET_METAL },
    { x: 1480, y: G - 300, w: 120, h: 24, surface: SurfaceType.ICE },
    { x: 1510, y: G - 400, w: 150, h: 24, surface: SurfaceType.CONCRETE },
    
    // High arena - the main challenge
    { x: 1720, y: G - 400, w: 600, h: 24, surface: SurfaceType.WET_METAL },
    
    // Portal maze section
    { x: 2380, y: G - 400, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 2380, y: G - 200, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 2380, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    
    // Conveyor hell
    { x: 2740, y: G, w: 200, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: -350 },
    { x: 2980, y: G, w: 200, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 350 },
    { x: 3220, y: G, w: 200, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: -350 },
    { x: 3460, y: G, w: 200, h: 32, surface: SurfaceType.CONVEYOR, conveyorVx: 350 },
    
    // Sand and mud trap field
    { x: 3720, y: G, w: 200, h: 32, surface: SurfaceType.SAND },
    { x: 3980, y: G, w: 150, h: 32, surface: SurfaceType.MUD },
    { x: 4180, y: G, w: 200, h: 32, surface: SurfaceType.SAND },
    { x: 4430, y: G, w: 150, h: 32, surface: SurfaceType.MUD },
    { x: 4630, y: G, w: 250, h: 32, surface: SurfaceType.CONCRETE },
    
    // Bounce pad mountain
    { x: 4930, y: G, w: 150, h: 32, surface: SurfaceType.CONCRETE },
    { x: 4880, y: G - 120, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4930, y: G - 240, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 4980, y: G - 360, w: 120, h: 24, surface: SurfaceType.BOUNCE_PAD },
    { x: 5030, y: G - 480, w: 150, h: 24, surface: SurfaceType.CONCRETE },
    
    // Final ice bridge
    { x: 5230, y: G - 480, w: 800, h: 24, surface: SurfaceType.ICE },
    
    // Boss platform - mixed surfaces, many enemies
    { x: 6080, y: G - 480, w: 200, h: 24, surface: SurfaceType.CONCRETE },
    { x: 6320, y: G - 400, w: 300, h: 24, surface: SurfaceType.WET_METAL },
    { x: 6660, y: G - 320, w: 200, h: 24, surface: SurfaceType.ICE },
    { x: 6920, y: G - 240, w: 300, h: 24, surface: SurfaceType.CONCRETE },
    
    // Portal to final goal
    { x: 6920, y: G, w: 300, h: 32, surface: SurfaceType.CONCRETE },
    { x: 7280, y: G, w: 400, h: 32, surface: SurfaceType.CONCRETE },
  ],

  portals: [
    // Portal pair 1 - vertical transport
    { ax: 2460, ay: 396, bx: 2460, by: 196 },
    // Portal pair 2 - escape from high arena
    { ax: 2480, ay: 296, bx: 2820, by: 510 },
    // Portal pair 3 - final descent
    { ax: 7060, ay: 266, bx: 7060, by: 510 },
  ],

  springs: [
    { x: 150, y: 500 },
    { x: 1250, y: 500 }, // After entrance gauntlet
    { x: 5005, y: 500 }, // Before bounce mountain
    { x: 7060, y: 500 }, // Final area
  ],

  enemies: [
    // Entrance gauntlet
    { type: 'roller', x: 325, y: 504, patrol: { x1: 260, x2: 390 } },
    { type: 'roller', x: 525, y: 504, patrol: { x1: 460, x2: 590 } },
    { type: 'roller', x: 725, y: 504, patrol: { x1: 660, x2: 790 } },
    { type: 'roller', x: 950, y: 504, patrol: { x1: 860, x2: 1030 } },
    
    // High arena
    { type: 'chaser', x: 1900, y: 376 },
    { type: 'chaser', x: 2100, y: 376 },
    
    // Conveyor hell
    { type: 'roller', x: 2840, y: 504, patrol: { x1: 2760, x2: 2920 } },
    { type: 'roller', x: 3320, y: 504, patrol: { x1: 3240, x2: 3400 } },
    
    // Sand/mud field
    { type: 'chaser', x: 3820, y: 508 },
    { type: 'chaser', x: 4280, y: 508 },
    
    // Ice bridge
    { type: 'roller', x: 5430, y: 456, patrol: { x1: 5250, x2: 5610 } },
    { type: 'roller', x: 5830, y: 456, patrol: { x1: 5650, x2: 6010 } },
    
    // Boss platform - heavy enemy presence
    { type: 'chaser', x: 6470, y: 336 },
    { type: 'chaser', x: 6760, y: 296 },
    { type: 'roller', x: 7060, y: 504, patrol: { x1: 6940, x2: 7200 } },
  ],

  gems: [
    { x: 1575, y: 426 }, // Top of vertical challenge
    { x: 2020, y: 376 }, // High arena
    { x: 4750, y: 504 }, // After sand/mud field
    { x: 5630, y: 456 }, // Middle of ice bridge
    { x: 7480, y: 504 }, // Near final goal
  ],

  checkpoints: [
    { x: 1250, y: 510 }, // After entrance gauntlet
    { x: 2460, y: 196 }, // High arena portal
    { x: 4750, y: 510 }, // After conveyor hell
    { x: 7060, y: 510 }, // Final area
  ],

  goal: { x: 7760, y: 448 },

  signs: [
    { x: 450, y: 488, text: 'SURFACE GAUNTLET - Master them all!' },
    { x: 1575, y: 426, text: 'Vertical mastery required' },
    { x: 2020, y: 346, text: 'HIGH ARENA - Danger zone' },
    { x: 3080, y: 466, text: 'CONVEYOR HELL' },
    { x: 4205, y: 488, text: 'Quicksand traps ahead' },
    { x: 5630, y: 426, text: 'Ice bridge - no mistakes!' },
    { x: 6470, y: 336, text: 'BOSS PLATFORM' },
    { x: 7480, y: 488, text: 'FINAL GOAL - You made it!' },
  ],
};
