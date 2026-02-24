# Resume: Spudstorm — 2026-02-23

## Status

Tasks 1-5 complete. Code review done. Three HIGH bugs identified, not yet fixed. Uncommitted simplifier changes in working tree.

## Immediate Next Task

**Fix three HIGH issues from silent-failure-hunter, then commit everything and run ship-check.**

### Step 1: Commit existing simplifier changes
```bash
cd /home/shazbot/Projects/products/games/spudstorm
git add src/main.ts src/scenes/Game.ts
git commit -m "refactor: apply simplifier cleanup from PR review"
```

### Step 2: Fix the three HIGH bugs in src/main.ts and src/scenes/Game.ts

**Fix A — Move attract mode flag resets inside setTimeout (src/main.ts)**

In the start button click handler, the lines:
```typescript
window.attractModeActive = false;
window.attractModeEnded = false;
```
...must move INSIDE the `setTimeout(() => { ... }, 50)` callback, after `scene.stop('Game')` has had time to complete. Currently they are before `scene.stop`, creating a race with the ticking update loop.

**Fix B — Guard showTutorialOverlay timer on scene shutdown (src/scenes/Game.ts)**

In `showTutorialOverlay()`, store the timer handle and cancel it on SHUTDOWN:
```typescript
const timer = this.time.delayedCall(3000, () => {
  if (!this.scene?.isActive('Game') || !text.active) {
    if (text.active) text.destroy();
    return;
  }
  this.tweens.add({ ... });
});
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  timer.remove();
  if (text.active) text.destroy();
});
```

**Fix C — Reset attract mode flags on Play Again path (src/main.ts)**

Find the "Play Again" button handler and add the same flag resets inside its setTimeout:
```typescript
window.attractModeActive = false;
window.attractModeEnded = false;
```

### Step 3: Commit fixes
```bash
git add src/main.ts src/scenes/Game.ts
git commit -m "fix: resolve attract mode race condition and tutorial tween lifecycle"
```

### Step 4: Run Task 6 — ship-check
```bash
# In project dir
/ship-check
```

### Step 5: Run Task 7 — deploy verification
Verify all 5 Playwright e2e scenarios pass against the live Cloudflare Pages URL.

## Active Plan Reference

CTO plan is embedded in `memory/working_memory.md` (full plan at lines 179-307).

## Key Context

- Game is playable and deployed at Cloudflare Pages
- PR review identified 3 HIGH bugs (race condition, tween lifecycle, play-again path) — all in src/main.ts and src/scenes/Game.ts
- Simplifier already applied cosmetic fixes (uncommitted): redundant font-family removed, comment corrected, typed window casts
- `(window as any)` pattern used throughout codebase — 14+ occurrences remain as pre-existing tech debt, not blocking

## Full Context

See: `/home/shazbot/Projects/products/games/spudstorm/CONTEXT_SPUDSTORM.md`
