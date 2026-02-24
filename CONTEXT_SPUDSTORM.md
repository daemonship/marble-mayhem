# Spud Storm - Session Context

## Current Status
Game is **playable but has input bugs**. Latest commit (0603563) fixed canvas layout and input system. Game deploys to https://spudstorm.pages.dev via GitHub Pages.

## Work Done This Session

### Problems Fixed
1. **Canvas centering bug** - CSS transform was breaking Phaser's pointer coordinate mapping. Fixed by using Phaser's `autoCenter: CENTER_BOTH` and removing the CSS transform rule.
2. **Mouse input not working** - Phaser's `InputManager` uses `offsetLeft`/`offsetTop` to map coordinates. Pointer coords were offset by 400px/300px from actual cursor.
3. **mouseActive guard** - Added `mouseActive = true` on game start so movement works immediately.

### Remaining Issues from PR Review
1. **Race condition** - Flag resets before `scene.stop()`, update loop can overwrite them in 50ms gap
2. **Tutorial tween lifecycle** - If player dies in <3.8s, `delayedCall` fires on torn-down scene
3. **Level-up modal** - Appended to `document.body` instead of `#game-container`

## Deployment
- GitHub Pages (not Cloudflare - earlier mistake)
- URL: https://spudstorm.pages.dev
