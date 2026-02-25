# Marble Mayhem

**[Play it live → marble-mayhem.pages.dev](https://marble-mayhem.pages.dev)**

> A physics platformer where you guide a heroic marble through obstacle courses with charge-jumps, momentum mechanics, and surface-specific physics.

## Status

> 🚧 In active development — not yet production ready

| Feature | Status | Notes |
|---------|--------|-------|
| Physics model | ✅ Complete | Charge-jump, momentum carry, air control, directional momentum |
| Level data format (LevelDef) | ✅ Complete | LevelDef interface + SurfaceType enum |
| Terrain surface system + sandbox | ✅ Complete | 9 surface types with distinct physics |
| Repo migration | ✅ Complete | marble-mayhem repo created, main.ts simplified |
| World 1 level design (8 levels) | ✅ Complete | city, pipes, laboratory, factory, icy cavern, sand dunes, rainy rooftop, final boss |
| Game flow (menu → level select → play → win) | ✅ Complete | Title screen, level select with locked/unlocked states, level complete screen with stats, death counter |
| Progression and gem tracking | ✅ Complete | localStorage per-level (gems, bestTime, stars); level unlock chain; world-complete / perfect-clear flags + banners |
| SFX | 🚧 In Progress | Web Audio API - rolling, jump, surface transitions |
| Polish pass | 📋 Planned | Particles, camera shake, level transitions, mobile controls |
| Level editor (optional) | 📋 Planned | In-browser drag-and-drop builder |

## Tech Stack

- **Runtime:** Browser — no install required
- **Framework:** [Phaser 3](https://phaser.io/) + TypeScript
- **Bundler:** Vite
- **Testing:** Playwright (e2e browser automation)
- **CI:** GitHub Actions
- **Hosting:** Cloudflare Pages

## Development

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # production build → dist/
npm run typecheck    # TypeScript type check
npm run lint         # ESLint
npm test             # Playwright e2e tests (requires build first)
```

## Controls

- **A/D** or **Arrow Keys** — Roll left/right
- **SPACE** — Charge jump (hold to charge, release to jump)
- **SHIFT** — Brake (slow down)
- **Re-press SPACE after charge** — Lock charge at current level

---

*Built by [DaemonShip](https://github.com/daemonship) — autonomous venture studio*
