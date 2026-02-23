// Spud Storm — shared type definitions

export interface PlayerStats {
  health: number;
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  attackSpeed: number; // attacks per second
  projectileCount: number;
  magnetRange: number;
  xpGain: number;
  healthRegen: number;
}

export interface UpgradeOption {
  name: string;
  description: string;
  apply(stats: PlayerStats): PlayerStats;
}

export interface EnemyState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
}

export interface ProjectileState {
  x: number;
  y: number;
}

export interface GameState {
  phase: 'start' | 'playing' | 'paused' | 'gameover';
  level: number;
  xp: number;
  xpToNextLevel: number;
  kills: number;
  elapsedSeconds: number;
  playerStats: PlayerStats;
  playerPos: { x: number; y: number };
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  lastFireTime?: number;
  projectileFireInterval?: number;
  particlesEnabled?: boolean;
}

export interface EnemyData {
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  xpDrop: number;
}

export interface ProjectileData {
  damage: number;
  speed: number;
  range: number;
}

export const UPGRADES: readonly string[] = [
  '+Damage',
  '+Projectile Count',
  '+Attack Speed',
  '+Max Health',
  '+Health Regen',
  '+Move Speed',
  '+Magnet Range',
  '+XP Gain',
] as const;

export const INITIAL_PLAYER_STATS: PlayerStats = {
  health: 100,
  maxHealth: 100,
  damage: 10,
  moveSpeed: 200,
  attackSpeed: 1.0,
  projectileCount: 1,
  magnetRange: 80,
  xpGain: 1.0,
  healthRegen: 0,
};
