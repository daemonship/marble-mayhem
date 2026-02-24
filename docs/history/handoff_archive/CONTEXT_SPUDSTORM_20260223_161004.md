# Context: Spudstorm — 2026-02-23

## Project Overview

Spud Storm is a browser bullet-heaven game built with Phaser 3 + TypeScript + Vite. Static deploy, no backend. Hosted on Cloudflare Pages (and GitHub Pages CI exists). Repo: https://github.com/daemonship/spudstorm

## Current State

All tasks 1-5 are implemented and committed. The game is playable. Recent work (commit d592da5) addressed user feedback: the game was not playable on click (health counted down but no gameplay), and there were no instructions, title screen, or explanation of controls.

**Fixes applied in d592da5:**
- Added title/start screen with game name, description, controls, and "Start Run" button
- Added attract mode flag resets (`attractModeActive = false`, `attractModeEnded = false`) when starting a new game
- Added tutorial overlay that shows movement/gameplay instructions at game start
- Fixed attract mode delta bug (was passing raw delta to attractMode.update)

## Git State

```
Branch: main
Latest commits:
d592da5 fix: add instructions, title screen, and fix attract mode bugs
63d6e93 docs: add live Cloudflare Pages link, remove Fly.io references
2b36498 ci: add GitHub Pages deploy workflow
857998a feat: implement core game, progression, HUD, attract mode (tasks 2–5)
740cad7 docs: update status after task 1 — project scaffold & CI
bf26334 feat: scaffold TypeScript + Phaser 3 project with full test suite

Uncommitted changes:
 M src/main.ts
 M src/scenes/Game.ts
```

There are uncommitted modifications to `src/main.ts` and `src/scenes/Game.ts` — these are the simplifications applied by the code-simplifier agent during the PR review session (see below).

## PR Review Findings

A comprehensive PR review was run on commit d592da5. Three review agents completed:

### Code Reviewer Findings
- `Game.ts:136` comment says "3.5 seconds" but delay is 3000ms — fixed by simplifier
- `Game.ts:223` `deltaSeconds * 1000` is a no-op (equals original `delta`) — noted as misleading but functionally identical

### Code Simplifier Applied
1. Removed redundant `font-family: sans-serif` from start screen child elements (inherited from parent)
2. Fixed misleading "3.5 seconds" comment to "3 seconds"
3. Replaced `(window as any).attractModeActive` with typed `window.attractModeActive` in main.ts (Window interface already declares these)

### Silent Failure Hunter Findings (HIGH PRIORITY — NOT YET FIXED)

Critical issues identified that need fixing:

1. **Race condition (HIGH)** — `attractModeActive`/`attractModeEnded` flags are reset BEFORE `scene.stop('Game')`, so the still-ticking update loop can overwrite them in the 50ms gap before scene teardown. Fix: move flag resets inside the `setTimeout` callback.

2. **Tutorial tween lifecycle (HIGH)** — `showTutorialOverlay()` schedules a 3000ms `delayedCall` + 800ms tween. If player dies in <3.8s, `delayedCall` fires on a torn-down scene and `this.tweens.add()` throws on a dead manager. Fix: add `SHUTDOWN` event handler to cancel the timer and store timer handle.

3. **Play Again path missing flag resets (HIGH)** — The "Play Again" button calls `resetGameState()` but does NOT reset `attractModeActive`/`attractModeEnded`, meaning the same bot-control bug can occur when restarting from game over.

Other issues noted as pre-existing (not from this PR):
- `window.game` unguarded in start click handler
- `startBtn` null guard has no error branch
- `AudioSystem` broad catch blocks suppress all errors
- `window.gameScene` not cleared on scene shutdown
- `gameState` assigned in constructor before `window.gameState` is set

## CTO Plan Tasks Status

| Task | Status |
|------|--------|
| Task 1: Scaffold + CI | Complete |
| Task 2: Core gameplay engine | Complete |
| Task 3: Progression + upgrades | Complete |
| Task 4: HUD, screens, polish | Complete |
| Task 5: Code review | In progress (review done, fixes needed) |
| Task 6: Pre-launch verification (ship-check) | Not started |
| Task 7: Deploy and verify | Not started |

## Key Files

- `/home/shazbot/Projects/products/games/spudstorm/src/main.ts` — game entry, DOM overlay, audio system, start/game-over screens
- `/home/shazbot/Projects/products/games/spudstorm/src/scenes/Game.ts` — main game scene, tutorial overlay, attract mode
- `/home/shazbot/Projects/products/games/spudstorm/src/systems/AttractMode.ts` — bot AI for attract mode
- `/home/shazbot/Projects/products/games/spudstorm/tests/` — Playwright e2e tests

## Immediate Next Steps

1. **Commit the simplifier changes** currently staged in `src/main.ts` and `src/scenes/Game.ts`
2. **Fix the three HIGH issues** from silent-failure-hunter:
   - Move attract mode flag resets inside the `setTimeout` in start button handler
   - Add `SHUTDOWN` event listener to `showTutorialOverlay()` to cancel timer
   - Add attract mode flag resets to the "Play Again" handler path
3. Commit the fixes
4. Run Task 6: ship-check + Playwright verification
5. Run Task 7: deploy verification against live URL
