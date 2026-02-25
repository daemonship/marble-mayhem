// ProgressManager — centralised localStorage layer for Marble Mayhem progress.
//
// Storage key: 'marble_mayhem_progress'
// Schema: LevelProgress[]  (array so it JSON-serialises trivially)

export interface LevelProgress {
  levelId:   string;
  completed: boolean;
  gems:      number;   // best gem count across all plays
  totalGems: number;
  bestTime:  number;   // best (lowest) completion time in ms
  stars:     number;   // 0-3 best star rating
}

export interface WorldStats {
  levelsCompleted: number;
  levelsTotal:     number;
  gemsCollected:   number;
  gemsTotal:       number;
  starsEarned:     number;
  starsTotal:      number;
  isComplete:      boolean;  // all levels beaten
  isPerfect:       boolean;  // all gems in all levels
}

// World 1 level IDs in order.
export const WORLD1_LEVELS = [
  'world1_level1',
  'world1_level2',
  'world1_level3',
  'world1_level4',
  'world1_level5',
  'world1_level6',
  'world1_level7',
  'world1_level8',
] as const;

const STORAGE_KEY        = 'marble_mayhem_progress';
const WORLD1_COMPLETE_KEY = 'marble_mayhem_world1_complete';
const WORLD1_PERFECT_KEY  = 'marble_mayhem_world1_perfect';

// ── Public API ────────────────────────────────────────────────────────────────

/** Load all saved progress. Returns an empty Map if nothing is stored. */
export function loadAll(): Map<string, LevelProgress> {
  const map = new Map<string, LevelProgress>();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr: LevelProgress[] = JSON.parse(raw);
      for (const entry of arr) {
        map.set(entry.levelId, entry);
      }
    }
  } catch {
    // Swallow — private/sandboxed browsing or corrupt data.
  }
  return map;
}

/** Save a completed level run, merging bests with any existing entry.
 *  Returns the updated WorldStats for World 1 so callers can react immediately.
 */
export function saveLevel(
  levelId:   string,
  gems:      number,
  totalGems: number,
  time:      number,
  stars:     number,
): WorldStats {
  const all = loadAll();
  const existing = all.get(levelId);

  const merged: LevelProgress = {
    levelId,
    completed: true,
    gems:      Math.max(gems, existing?.gems ?? 0),
    totalGems,
    bestTime:  existing?.bestTime != null
                 ? Math.min(time, existing.bestTime)
                 : time,
    stars:     Math.max(stars, existing?.stars ?? 0),
  };

  all.set(levelId, merged);
  persist(all);

  // Update world-completion flags.
  const stats = getWorldStatsFrom(all);
  try {
    if (stats.isComplete)  localStorage.setItem(WORLD1_COMPLETE_KEY, 'true');
    if (stats.isPerfect)   localStorage.setItem(WORLD1_PERFECT_KEY,  'true');
  } catch { /* ignore */ }

  return stats;
}

/** Check whether a level is unlocked.
 *  Sandbox is always unlocked. Level 1 is always unlocked.
 *  Any other level is unlocked if the previous level is completed.
 */
export function isLevelUnlocked(
  levelId: string,
  progress: Map<string, LevelProgress>,
): boolean {
  if (levelId === 'sandbox') return true;

  const idx = WORLD1_LEVELS.indexOf(levelId as typeof WORLD1_LEVELS[number]);
  if (idx === 0) return true;   // world1_level1 always unlocked
  if (idx < 0)   return false;  // unknown level

  const prevId = WORLD1_LEVELS[idx - 1];
  return progress.get(prevId)?.completed ?? false;
}

/** Returns aggregated stats for World 1. */
export function getWorldStats(): WorldStats {
  return getWorldStatsFrom(loadAll());
}

/** Whether World 1 was ever completed (persisted flag). */
export function isWorld1Complete(): boolean {
  try { return localStorage.getItem(WORLD1_COMPLETE_KEY) === 'true'; } catch { return false; }
}

/** Whether World 1 was ever perfect-cleared (persisted flag). */
export function isWorld1Perfect(): boolean {
  try { return localStorage.getItem(WORLD1_PERFECT_KEY) === 'true'; } catch { return false; }
}

// ── Internal ──────────────────────────────────────────────────────────────────

function persist(all: Map<string, LevelProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(all.values())));
  } catch { /* ignore write errors */ }
}

function getWorldStatsFrom(all: Map<string, LevelProgress>): WorldStats {
  let levelsCompleted = 0;
  let gemsCollected   = 0;
  let gemsTotal       = 0;
  let starsEarned     = 0;
  const starsTotal    = WORLD1_LEVELS.length * 3;

  for (const id of WORLD1_LEVELS) {
    const p = all.get(id);
    if (p?.completed) levelsCompleted++;
    gemsCollected += p?.gems      ?? 0;
    gemsTotal     += p?.totalGems ?? 3; // default 3 gems per level if unvisited
    starsEarned   += p?.stars     ?? 0;
  }

  const isComplete = levelsCompleted === WORLD1_LEVELS.length;
  const isPerfect  = isComplete && gemsCollected >= gemsTotal && gemsTotal > 0;

  return {
    levelsCompleted,
    levelsTotal: WORLD1_LEVELS.length,
    gemsCollected,
    gemsTotal,
    starsEarned,
    starsTotal,
    isComplete,
    isPerfect,
  };
}
