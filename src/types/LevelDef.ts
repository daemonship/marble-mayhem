// LevelDef — declarative level data format for Marble Mayhem
// All coordinates are absolute world-space pixels.
// x/y for platforms is the TOP-LEFT corner.

export enum SurfaceType {
  CONCRETE   = 'CONCRETE',   // default; normal friction
  GRASS      = 'GRASS',      // light friction, slight bounce
  SAND       = 'SAND',       // high friction, kills momentum fast
  MUD        = 'MUD',        // very high friction, sticky
  ICE        = 'ICE',        // near-zero friction, very slippery
  SNOW       = 'SNOW',       // low friction, soft landing
  WET_METAL  = 'WET_METAL',  // low friction, metallic
  BOUNCE_PAD = 'BOUNCE_PAD', // high restitution (built-in spring effect)
  CONVEYOR   = 'CONVEYOR',   // applies horizontal force to marble
}

export interface PlatformDef {
  x: number;
  y: number;
  w: number;
  h: number;
  surface: SurfaceType;
  /** Conveyor belt direction and speed (px/s). Only used when surface = CONVEYOR. */
  conveyorVx?: number;
}

export interface PortalDef {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface SpringDef {
  x: number;
  y: number;
  /** Launch speed (px/s). Defaults to scene SPRING_V constant if omitted. */
  power?: number;
}

export interface EnemyDef {
  type: string;
  x: number;
  y: number;
  patrol?: { x1: number; x2: number };
}

export interface GemDef {
  x: number;
  y: number;
}

export interface CheckpointDef {
  x: number;
  y: number;
}

export interface GoalDef {
  x: number;
  y: number;
}

export interface SecretExitDef {
  x: number;
  y: number;
  dest: string;
}

export interface SignDef {
  x: number;
  y: number;
  text: string;
}

export interface LevelDef {
  id: string;
  /** World number (1-indexed). */
  world: number;
  /** Level number within the world (1-indexed). */
  level: number;
  /** Background theme identifier — e.g. 'city_night', 'underground', 'sky'. */
  bgTheme: string;
  worldW: number;
  /** Y coordinate of the main ground surface. Used for death detection. */
  groundY: number;
  spawnX: number;
  spawnY: number;
  platforms: PlatformDef[];
  portals: PortalDef[];
  springs: SpringDef[];
  enemies: EnemyDef[];
  gems: GemDef[];
  checkpoints: CheckpointDef[];
  goal: GoalDef;
  secretExit?: SecretExitDef;
  /** In-world text labels — zone names, hints, mechanic callouts. */
  signs?: SignDef[];
}
