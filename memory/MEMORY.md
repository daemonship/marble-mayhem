# Spud Storm — Project Memory

## Deployment
- **Live URL:** https://spudstorm.pages.dev
- **Platform:** Cloudflare Pages (NOT GitHub Pages)
- Auto-deploys from pushes to `main` on GitHub (`daemonship/spudstorm`)
- GitHub Actions CI runs tests on every push but deploy is Cloudflare-driven

## Git Remote
- Remote requires credentials — copy pattern from `shard-surge` remote if push fails:
  `git remote set-url origin https://daemonship:<token>@github.com/daemonship/spudstorm.git`

## Tech Stack
- Phaser 3 + TypeScript, bundled with Vite
- Playwright e2e tests (run against built dist or live URL via APP_URL env var)
- All game repos live under `/home/shazbot/Projects/products/games/`
- All repos are under the `daemonship` GitHub org

## Architecture
- Entry: `src/main.ts` — Phaser config, global gameState, DOM overlay (HUD, start screen, game over)
- Scenes: Boot → Preload → MainMenu → Game → GameOver
- Systems: `EnemySystem`, `ProjectileSystem`, `UpgradeSystem`, `XPSystem`, `AttractMode`
- Global state on `window.gameState` (typed in Window interface in main.ts)
- DOM overlays managed in `createDOMOverlay()` in main.ts; HUD updated via `setInterval`

## Known Issues / Notes
- `(window as any)` pattern used throughout for attract mode flags — typed Window interface
  in main.ts already covers these, could be cleaned up globally
- `window.gameScene` set in Game.create() for test access, never cleared on shutdown
- `gameState` assigned in Game constructor (before window.gameState set) — works because
  Phaser instantiates scenes on first frame, after main.ts has finished executing
