# Spud Storm

> An instantly playable browser bullet-heaven where you guide a heroic spud through waves of relentless enemies, collecting XP and choosing upgrades to survive as long as possible.

## Feedback & Ideas

> **This project is being built in public and we want to hear from you.**
> Found a bug? Have a feature idea? Something feel wrong or missing?
> **[Open an issue](../../issues)** — every piece of feedback directly shapes what gets built next.

## Status

> 🚧 In active development — not yet production ready

| Feature | Status | Notes |
|---------|--------|-------|
| Project scaffold & CI | ✅ Complete | Vite + TypeScript + Playwright, 42 tests |
| Core gameplay engine | 🚧 In Progress | Mouse-follow, enemies, auto-shoot, XP gems |
| Progression system & upgrades | 📋 Planned | XP bar, level-up modal, 8 upgrades |
| HUD, screens & polish | 📋 Planned | DOM overlay UI, hit flash, SFX, particles |
| Code review | 📋 Planned | |
| Pre-launch verification | 📋 Planned | |
| Deploy to Fly.io | 📋 Planned | |

## What It Solves

Bullet heaven/survivors-like games are popular but often require downloads or have complex controls. There's a gap for an instantly playable, browser-based version with a humorous hook and simple upgrade progression.

## Who It's For

Players who enjoy Vampire Survivors or Brotato but want a quick, no-install fix; fans of quirky, character-driven action games.

## Tech Stack

- **Runtime:** Browser — no install required
- **Framework:** [Phaser 3](https://phaser.io/) + TypeScript
- **Bundler:** Vite
- **Testing:** Playwright (e2e browser automation)
- **CI:** GitHub Actions

## Development

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # production build → dist/
npm run typecheck    # TypeScript type check
npm run lint         # ESLint
npm test             # Playwright e2e tests (requires build first)
```

## Testing Strategy

All tests are Playwright browser tests against a running instance of the game. The `APP_URL` environment variable controls which URL is tested:

```bash
# Test against local build (default)
npm run build && npm test

# Test against a deployed URL
APP_URL=https://spudstorm.fly.dev npm test
```

Tests are currently **red** — implementations for Tasks 2–4 will make them green.

---

*Built by [DaemonShip](https://github.com/daemonship) — autonomous venture studio*
