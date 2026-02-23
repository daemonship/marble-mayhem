import Phaser from 'phaser';
import type { PlayerStats, UpgradeOption } from '../types.ts';
import { UPGRADES } from '../types.ts';

// Define upgrade implementations
const UPGRADE_DEFINITIONS: Record<string, (stats: PlayerStats) => PlayerStats> = {
  '+Damage': (stats: PlayerStats) => ({
    ...stats,
    damage: stats.damage + 5,
  }),
  '+Projectile Count': (stats: PlayerStats) => ({
    ...stats,
    projectileCount: stats.projectileCount + 1,
  }),
  '+Attack Speed': (stats: PlayerStats) => ({
    ...stats,
    attackSpeed: stats.attackSpeed * 1.2, // 20% faster
  }),
  '+Max Health': (stats: PlayerStats) => ({
    ...stats,
    maxHealth: stats.maxHealth + 25,
    health: stats.health + 25, // Also heal the amount added
  }),
  '+Health Regen': (stats: PlayerStats) => ({
    ...stats,
    healthRegen: (stats.healthRegen || 0) + 1, // Track regen separately if needed
  }),
  '+Move Speed': (stats: PlayerStats) => ({
    ...stats,
    moveSpeed: stats.moveSpeed + 30,
  }),
  '+Magnet Range': (stats: PlayerStats) => ({
    ...stats,
    magnetRange: stats.magnetRange + 30,
  }),
  '+XP Gain': (stats: PlayerStats) => ({
    ...stats,
    xpGain: stats.xpGain * 1.2, // 20% more XP
  }),
};

// UpgradeSystem — pick 3 unique random upgrades, apply chosen stat changes
export function pickUpgrades(count: number): UpgradeOption[] {
  const available = [...UPGRADES];
  const selected: UpgradeOption[] = [];
  
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Phaser.Math.Between(0, available.length - 1);
    const name = available.splice(idx, 1)[0];
    
    selected.push({
      name,
      description: getUpgradeDescription(name),
      apply: UPGRADE_DEFINITIONS[name] || ((stats) => stats),
    });
  }
  
  return selected;
}

function getUpgradeDescription(name: string): string {
  const descriptions: Record<string, string> = {
    '+Damage': 'Increase projectile damage by 5',
    '+Projectile Count': 'Fire one additional projectile',
    '+Attack Speed': 'Increase attack speed by 20%',
    '+Max Health': 'Increase max health by 25 and heal',
    '+Health Regen': 'Regenerate health over time',
    '+Move Speed': 'Increase movement speed',
    '+Magnet Range': 'Attract XP gems from further away',
    '+XP Gain': 'Gain 20% more XP from enemies',
  };
  return descriptions[name] || '';
}

export function applyUpgrade(stats: PlayerStats, upgrade: UpgradeOption): PlayerStats {
  return upgrade.apply(stats);
}

// Helper to get the attack fire interval (in ms) based on attack speed
export function getFireInterval(attackSpeed: number): number {
  return 1000 / attackSpeed;
}

// Helper to get the current fire interval from player stats
export function getCurrentFireInterval(stats: PlayerStats): number {
  return getFireInterval(stats.attackSpeed);
}
