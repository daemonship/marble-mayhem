// World 1 — Level 1: "Rolling Start"
// The tutorial level. Introduces: gaps, charge-jump steps, springs, hidden shelf.
//
// Ground Y = 528. All platform y values are top-left corner (absolute).
// Spawn: (80, 492) — marble center just above the first ground section.

import { LevelDef, SurfaceType } from '../types/LevelDef';

export const world1_level1: LevelDef = {
  id: 'world1_level1',
  world:   1,
  level:   1,
  bgTheme: 'city_night',
  worldW:  5200,
  groundY: 528,
  spawnX:  80,
  spawnY:  492,   // GROUND_Y(528) - R*2(36)

  // ── Platforms ─────────────────────────────────────────────────────────────
  platforms: [
    // Ground sections — gaps between them teach basic jumping
    { x: 0,    y: 528, w: 560,  h: 32, surface: SurfaceType.CONCRETE }, // spawn area — wide, safe
    { x: 620,  y: 528, w: 300,  h: 32, surface: SurfaceType.CONCRETE }, // gap: 60px — easy first hop
    { x: 980,  y: 528, w: 260,  h: 32, surface: SurfaceType.CONCRETE }, // gap: 60px
    { x: 1320, y: 528, w: 200,  h: 32, surface: SurfaceType.CONCRETE }, // gap: 80px — before step section
    { x: 1700, y: 528, w: 800,  h: 32, surface: SurfaceType.CONCRETE }, // long safe stretch (springs here)
    { x: 2620, y: 528, w: 220,  h: 32, surface: SurfaceType.CONCRETE },
    { x: 2960, y: 528, w: 220,  h: 32, surface: SurfaceType.CONCRETE },
    { x: 3340, y: 528, w: 1860, h: 32, surface: SurfaceType.CONCRETE }, // final stretch to goal

    // Step platforms — ascending stairs, teach charge-jump
    { x: 1340, y: 438, w: 160, h: 32, surface: SurfaceType.CONCRETE }, // one step up
    { x: 1560, y: 353, w: 160, h: 32, surface: SurfaceType.CONCRETE }, // two steps up
    { x: 1760, y: 433, w: 160, h: 24, surface: SurfaceType.CONCRETE }, // partial step back down

    // Floating islands — mid-air platforms, harder to reach
    { x: 700,  y: 408, w: 140, h: 24, surface: SurfaceType.CONCRETE }, // early secret shelf
    { x: 1060, y: 378, w: 120, h: 24, surface: SurfaceType.CONCRETE }, // over the gap
    { x: 2000, y: 328, w: 180, h: 24, surface: SurfaceType.CONCRETE }, // high — full-charge only
    { x: 2260, y: 398, w: 140, h: 24, surface: SurfaceType.CONCRETE },
    { x: 2700, y: 348, w: 140, h: 24, surface: SurfaceType.CONCRETE },
    { x: 3000, y: 288, w: 160, h: 24, surface: SurfaceType.CONCRETE }, // very high — chain jumps
    { x: 3260, y: 363, w: 140, h: 24, surface: SurfaceType.CONCRETE },

    // Ceiling shelf — hidden above, reachable via spring
    { x: 1900, y: 198, w: 300, h: 20, surface: SurfaceType.CONCRETE },
  ],

  // ── Springs ───────────────────────────────────────────────────────────────
  springs: [
    { x: 530,  y: 500 }, // just before first gap — launch to secret shelf
    { x: 1710, y: 500 }, // start of long stretch — can reach ceiling shelf
    { x: 2940, y: 500 },
  ],

  // ── Goal ──────────────────────────────────────────────────────────────────
  goal: { x: 5080, y: 448 },

  // ── Unpopulated for now — infrastructure in place for future levels ───────
  portals:     [],
  enemies:     [],
  gems:        [],
  checkpoints: [],
};
