import type { PlayerStats, UpgradeOption } from '../types.ts';
import { UPGRADES } from '../types.ts';

// UpgradeSystem — pick 3 unique random upgrades, apply chosen stat changes
// TODO (Task 3): implement random selection from UPGRADES pool, stat application

export function pickUpgrades(_count: number): UpgradeOption[] {
  // TODO: return _count unique UpgradeOption objects from the 8-upgrade pool
  void UPGRADES;
  return [];
}

export function applyUpgrade(_stats: PlayerStats, _upgrade: UpgradeOption): PlayerStats {
  // TODO: delegate to upgrade.apply()
  return _stats;
}
