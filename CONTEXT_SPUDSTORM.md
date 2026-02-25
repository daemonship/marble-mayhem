# Session Summary

## Human

Continue: Implement gem scatter on hit + speed pads + time trial in MarblePlatform.ts. First run `git diff src/scenes/MarblePlatform.ts` to see partial edits from last session, then complete: (1) gem scatter — on enemy contact scatter N gems radially, marble loses collected gem count; (2) speed pads — read speedPads from LevelDef, render as yellow arrows, apply vx/vy impulse on contact; (3) time trial timer — elapsed time top-right, save best to localStorage. Then build, typecheck, commit, and deploy: `CLOUDFLARE_API_TOKEN=$(cat ~/credentials/cloudflare-token.txt) npx wrangler pages deploy dist --project-name spudstorm --branch marble-mayhem`. See RESUME_SPUDSTORM.md for full context. Branch: marble-mayhem. Project: /home/shazbot/Projects/products/games/spudstorm

## Assistant

[Tool: Bash cmd="git diff src/scenes/MarblePlatform.ts | head -200"]
[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/RESUME_SPUDSTORM.md"]
[Tool: Bash cmd="git diff src/scenes/MarblePlatform.ts | wc -l && git diff src/types/LevelDef.ts"]
[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/src/types/LevelDef.ts"]
Good - only one line changed in MarblePlatform.ts so far (the import). Let me read the full scene file to understand where to add things.

[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts"]
[Tool: Bash cmd="cat -n /home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatf..."]
Now let me read sandbox.ts to understand the structure before making all edits.

[Tool: Read file="/home/shazbot/Projects/products/games/spudstorm/src/levels/sandbox.ts"]
I have everything I need. Let me now implement all three features in sequence.

[Tool: Edit file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts"]
Now add the `makeSpeedPadTex()` method right before `makeEnemyTex`:

Now add speed pads to `buildLevel()`:

Now add the `timerText` to `buildHUD()`:

Now update `update()` to start timer on first movement and call `updateSpeedPads()`:

Now update `updateEnemies()` to scatter gems on knockback:

Now update `updateCollectibles()` to track `gemCount` and handle scattered gems:

Now update `updateHUD()` to use `gemCount` and show timer:

Now update `showGoalMessage()` to save best time:

Now update `respawn()` to reset timer and gem count:

Now add the three new methods before the closing `}` of the class:

Now add a speed pad to sandbox.ts (Zone 2, after the conveyors where marble has good momentum):

[Tool: Edit file="/home/shazbot/Projects/products/games/spudstorm/src/levels/sandbox.ts"]
Also add a sign label for the speed pads in sandbox.ts:

Now build and typecheck:

[Tool: Bash cmd="npm run build 2>&1"]
Build clean. Now typecheck:

[Tool: Bash cmd="npm run typecheck 2>&1"]
That's the pre-existing error in `main.ts` (unrelated to our work). Let me confirm our files are clean:

[Tool: Bash cmd="npx tsc --noEmit 2>&1 | grep -v "main.ts""]
Only the pre-existing `main.ts` error. Our code is clean. Now commit and deploy:

[Tool: Bash cmd="git add src/scenes/MarblePlatform.ts src/types/LevelDef.ts src/levels/sandbox..."]
[Tool: Bash cmd="git commit -m "$(cat <<'EOF'
feat: gem scatter on hit + speed pads + time tri..."]
[Tool: Bash cmd="CLOUDFLARE_API_TOKEN=$(cat ~/credentials/cloudflare-token.txt) npx wrangler p..."]
Deployed. Let me update the RESUME file to reflect the completed work:

[Tool: Write file="/home/shazbot/Projects/products/games/spudstorm/RESUME_SPUDSTORM.md"]
All three features implemented and deployed. Here's the summary:

---

**Deployed:** https://marble-mayhem.spudstorm.pages.dev

**What was added:**

**Gem scatter (Sonic ring-loss)**
- Enemy knockback now calls `scatterGems()` — spawns `max(gemCount, 5)` gems radially from the marble with random velocities
- Scattered gems have manual gravity+bounce physics, fade out after 5 seconds
- Re-collecting them restores `gemCount` (capped at level total)
- Respawn clears all scattered gems and resets count to 0

**Speed pads**
- New `SpeedPadDef` in `LevelDef` with `x, y, vx, vy` fields
- Rendered as dark amber pads with `>>` chevron texture
- One-shot impulse on contact — distance-locked so marble doesn't get stuck in a loop
- Two pads in sandbox: Zone 2 exit gap boost (vx=520, vy=-200) and Zone 5 roller assist (vx=480)

**Time trial timer**
- Starts on first marble movement, displayed top-right
- Format: `M:SS.cs` (centiseconds)
- Saves best time to `localStorage` per level ID
- Shows `★` suffix when goal is reached with a new best; shows `best: X:XX.xx` when idle between runs
- Resets on respawn/death

## Human

<command-message>pr-review-toolkit:review-pr</command-message>
<command-name>/pr-review-toolkit:review-pr</command-name>
# Comprehensive PR Review

Run a comprehensive pull request review using multiple specialized agents, each focusing on a different aspect of code quality.

**Review Aspects (optional):** ""

## Review Workflow:

1. **Determine Review Scope**
   - Check git status to identify changed files
   - Parse arguments to see if user requested specific review aspects
   - Default: Run all applicable reviews

2. **Available Review Aspects:**

   - **comments** - Analyze code comment accuracy and maintainability
   - **tests** - Review test coverage quality and completeness
   - **errors** - Check error handling for silent failures
   - **types** - Analyze type design and invariants (if new types added)
   - **code** - General code review for project guidelines
   - **simplify** - Simplify code for clarity and maintainability
   - **all** - Run all applicable reviews (default)

3. **Identify Changed Files**
   - Run `git diff --name-only` to see modified files
   - Check if PR already exists: `gh pr view`
   - Identify file types and what reviews apply

4. **Determine Applicable Reviews**

   Based on changes:
   - **Always applicable**: code-reviewer (general quality)
   - **If test files changed**: pr-test-analyzer
   - **If comments/docs added**: comment-analyzer
   - **If error handling changed**: silent-failure-hunter
   - **If types added/modified**: type-design-analyzer
   - **After passing review**: code-simplifier (polish and refine)

5. **Launch Review Agents**

   **Sequential approach** (one at a time):
   - Easier to understand and act on
   - Each report is complete before next
   - Good for interactive review

   **Parallel approach** (user can request):
   - Launch all agents simultaneously
   - Faster for comprehensive review
   - Results come back together

6. **Aggregate Results**

   After agents complete, summarize:
   - **Critical Issues** (must fix before merge)
   - **Important Issues** (should fix)
   - **Suggestions** (nice to have)
   - **Positive Observations** (what's good)

7. **Provide Action Plan**

   Organize findings:
   ```markdown
   # PR Review Summary

   ## Critical Issues (X found)
   - [agent-name]: Issue description [file:line]

   ## Important Issues (X found)
   - [agent-name]: Issue description [file:line]

   ## Suggestions (X found)
   - [agent-name]: Suggestion [file:line]

   ## Strengths
   - What's well-done in this PR

   ## Recommended Action
   1. Fix critical issues first
   2. Address important issues
   3. Consider suggestions
   4. Re-run review after fixes
   ```

## Usage Examples:

**Full review (default):**
```
/pr-review-toolkit:review-pr
```

**Specific aspects:**
```
/pr-review-toolkit:review-pr tests errors
# Reviews only test coverage and error handling

/pr-review-toolkit:review-pr comments
# Reviews only code comments

/pr-review-toolkit:review-pr simplify
# Simplifies code after passing review
```

**Parallel review:**
```
/pr-review-toolkit:review-pr all parallel
# Launches all agents in parallel
```

## Agent Descriptions:

**comment-analyzer**:
- Verifies comment accuracy vs code
- Identifies comment rot
- Checks documentation completeness

**pr-test-analyzer**:
- Reviews behavioral test coverage
- Identifies critical gaps
- Evaluates test quality

**silent-failure-hunter**:
- Finds silent failures
- Reviews catch blocks
- Checks error logging

**type-design-analyzer**:
- Analyzes type encapsulation
- Reviews invariant expression
- Rates type design quality

**code-reviewer**:
- Checks CLAUDE.md compliance
- Detects bugs and issues
- Reviews general code quality

**code-simplifier**:
- Simplifies complex code
- Improves clarity and readability
- Applies project standards
- Preserves functionality

## Tips:

- **Run early**: Before creating PR, not after
- **Focus on changes**: Agents analyze git diff by default
- **Address critical first**: Fix high-priority issues before lower priority
- **Re-run after fixes**: Verify issues are resolved
- **Use specific reviews**: Target specific aspects when you know the concern

## Workflow Integration:

**Before committing:**
```
1. Write code
2. Run: /pr-review-toolkit:review-pr code errors
3. Fix any critical issues
4. Commit
```

**Before creating PR:**
```
1. Stage all changes
2. Run: /pr-review-toolkit:review-pr all
3. Address all critical and important issues
4. Run specific reviews again to verify
5. Create PR
```

**After PR feedback:**
```
1. Make requested changes
2. Run targeted reviews based on feedback
3. Verify issues are resolved
4. Push updates
```

## Notes:

- Agents run autonomously and return detailed reports
- Each agent focuses on its specialty for deep analysis
- Results are actionable with specific file:line references
- Agents use appropriate models for their complexity
- All agents available in `/agents` list

## Assistant

[Tool: Bash cmd="git diff HEAD~1 --name-only && echo "---" && git diff HEAD~1 --stat"]
Code changes are in `MarblePlatform.ts`, `LevelDef.ts`, and `sandbox.ts`. Launching four specialized agents in parallel — code review, error handling, type design, and simplification:

[Tool: Task desc="Code review MarblePlatform changes" type="pr-review-toolkit:code-reviewer"]
[Tool: Task desc="Hunt silent failures in error handling" type="pr-review-toolkit:silent-failure-hunter"]
[Tool: Task desc="Analyze SpeedPadDef type design" type="pr-review-toolkit:type-design-analyzer"]
[Tool: Task desc="Simplify new code sections" type="pr-review-toolkit:code-simplifier"]
All four agents are running in parallel — waiting for results.

## Human

<task-notification>
<task-id>ad880425a5b102eaf</task-id>
<tool-use-id>toolu_01CmxybCxUUnnAcE3v6E1enL</tool-use-id>
<status>completed</status>
<summary>Agent "Code review MarblePlatform changes" completed</summary>
<result>Now I have enough context. Let me compile the review.

---

## Code Review: Commit `6d046dc` -- gem scatter on hit + speed pads + time trial timer

**Files reviewed:**
- `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`
- `/home/shazbot/Projects/products/games/spudstorm/src/types/LevelDef.ts`
- `/home/shazbot/Projects/products/games/spudstorm/src/levels/sandbox.ts`

---

### Critical (90-100)

**1. `scatterGems` always spawns at least 5 gems even when player has 0 -- free gem duplication (Confidence: 95)**

File: `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`, line 1201

```typescript
const n = Math.max(this.gemCount, 5);
this.gemCount = 0;
```

When `gemCount` is 0 (e.g., the player hasn't collected any gems yet, or was already hit once and lost them all), `Math.max(0, 5)` produces 5. The method then spawns 5 recoverable scattered gems and sets `gemCount = 0`. Since `updateCollectibles` lets you pick up scattered gems (capped at `this.gems.length`), the player can gain gems they never earned by getting hit repeatedly with 0 gems. This is a logic bug -- the scatter should be a no-op when `gemCount === 0`.

**Fix:** Guard the method at the top:
```typescript
private scatterGems(time: number): void {
    if (this.gemCount === 0) return;
    const n = this.gemCount;
    this.gemCount = 0;
    // ... rest of scatter logic
}
```

---

**2. `respawn()` resets `gemCount` to 0 but does not reset static gems' `collected` flags -- gem count permanently desynchronized (Confidence: 92)**

File: `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`, line 1186

```typescript
this.gemCount = 0;
```

On respawn, `gemCount` is set to 0, but the `RuntimeGem` objects in `this.gems` keep `collected = true`. This means:
- The HUD will show `gems: 0/3` after respawn.
- The player cannot re-collect those gems because the `if (gem.collected) continue;` check on line 1038 skips them permanently.
- `gemCount` can never reach `total` again after a death, which may affect completion logic.

Since the user instruction says "gem count tracked separately as `gemCount` field," the `collected` flags on the RuntimeGem objects and `gemCount` must stay consistent. Either reset the `collected` flags and re-show the gem images on respawn, or do not reset `gemCount` to 0.

**Fix:** In `respawn()`, also reset static gems:
```typescript
for (const gem of this.gems) {
    gem.collected = false;
    gem.img.setAlpha(1).setY(gem.y); // restore visual
}
```

---

### Important (80-89)

**3. `goalReached` is never reset on respawn -- timer and goal permanently broken after first completion (Confidence: 88)**

File: `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`, line 1181-1197

The `respawn()` method resets `trialStartMs = -1` and `gemCount = 0`, but `goalReached` (line 113, initialized to `false`) is never set back to `false`. After the player reaches the goal once, `checkGoalAndDeath` on line 1169 will never trigger `showGoalMessage` again, and the timer condition on line 1160 (`!this.goalReached`) prevents the timer from displaying on subsequent runs.

If respawning after goal is not intended to allow re-play, this is minor. But since `trialStartMs` is explicitly reset to `-1` (enabling a new timer run), it looks like re-playability was intended.

**Fix:** Add to `respawn()`:
```typescript
this.goalReached = false;
```

---

**4. Speed pad `vy: 0` impulse is silently ignored -- marble could get stuck with only horizontal boost (Confidence: 82)**

File: `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`, lines 1236-1237

```typescript
if (sp.def.vx !== 0) body.setVelocityX(sp.def.vx);
if (sp.def.vy !== 0) body.setVelocityY(sp.def.vy);
```

The second speed pad in sandbox.ts is `{ x: 8200, y: G, vx: 480, vy: 0 }`. Since `vy === 0`, the `setVelocityY` call is skipped. If the marble happens to be falling slightly when it contacts the pad (e.g., rolling off the edge of a platform), the downward velocity is preserved while horizontal velocity is overwritten. This is likely fine for ground-level pads, but if a pad is ever placed on a slope or edge, it becomes a bug. More importantly, the `!== 0` check makes it impossible to design a speed pad that intentionally zeroes out vertical velocity (a "flatten trajectory" pad).

This is a design trap rather than an immediate gameplay bug. Consider using `undefined` checks or a separate flag instead of `!== 0` to distinguish "no impulse" from "zero impulse."

**Fix:** Use `undefined` for "do not touch this axis":
```typescript
if (sp.def.vx !== undefined) body.setVelocityX(sp.def.vx);
if (sp.def.vy !== undefined) body.setVelocityY(sp.def.vy);
```
And make `vx`/`vy` optional in `SpeedPadDef`.

---

### Summary

The `SpeedPadDef` type definition, the distance-lock cooldown pattern on speed pads, the timer formatting, and the canvas texture generation are all clean and consistent with project conventions. The `LevelDef` extension and sandbox level data are well-organized.

The two critical issues (gem duplication via scatter-when-empty, and `gemCount`/`collected` desynchronization on respawn) will cause visible gameplay bugs and should be fixed before shipping. The `goalReached` not resetting is closely related and should be addressed at the same time.</result>
<usage><total_tokens>38617</total_tokens><tool_uses>15</tool_uses><duration_ms>70142</duration_ms></usage>
</task-notification>
Full transcript available at: /tmp/claude-1000/-home-shazbot-Projects-products-games-spudstorm/tasks/ad880425a5b102eaf.output

## Assistant

Code reviewer done — 3 real bugs found. Waiting for the remaining agents...

## Human

<task-notification>
<task-id>abc559b0d78c246db</task-id>
<tool-use-id>toolu_01HRhnzcppxqUPLi48xhXnya</tool-use-id>
<status>completed</status>
<summary>Agent "Analyze SpeedPadDef type design" completed</summary>
<result>I have a complete picture of all three types and their usage. Here is the full analysis.

---

## Type: `SpeedPadDef`

(`/home/shazbot/Projects/products/games/spudstorm/src/types/LevelDef.ts`, lines 131-137)

### Invariants Identified

- `x` and `y` are world-space pixel coordinates. No constraint prevents placing a pad in mid-air or off the world boundary.
- `vx` and `vy` together represent the impulse vector. The type permits both being zero simultaneously, which defines a speed pad that does nothing — a silent no-op. It also permits both being non-zero (diagonal boost), which the comment does describe but which the actual contact logic in `updateSpeedPads` handles correctly.
- The comment says "negative = up" for `vy`, which is a coordinate-system convention that lives only in the JSDoc and is completely invisible to the type.
- No directional constraint: a positive `vx` launches right, but the type does not distinguish a left-facing pad from a right-facing one. If a level author writes `vx: -520` they get a left launcher. That is fine, but the intent (direction) is not expressed structurally.
- `as SpeedPadDef` casts in `sandbox.ts` are unnecessary — the object literals already satisfy the interface — and they suppress any excess-property TypeScript warnings. Minor but worth noting.

### Ratings

- **Encapsulation**: 7/10
  This is a pure data-transfer object used only to carry level configuration from a file into the scene. Full encapsulation of a DTO is not appropriate or expected here. The interface is correctly minimal for that role. No interior mutability leaks out because the scene wraps it in `RuntimeSpeedPad` and only reads `def` properties.

- **Invariant Expression**: 4/10
  The interface communicates almost nothing about what constitutes a valid speed pad. Both `vx` and `vy` being zero is structurally valid but operationally meaningless. The "negative = up" coordinate convention for `vy` exists only in a comment. A level designer reading just the interface type gets no signal that a zero impulse is a mistake or that the y-axis is inverted. The valid domain of both fields is unbounded `number`, which is honest but leaves the reader with no sense of the game's tuned range (the sandbox uses 200–520 px/s).

- **Invariant Usefulness**: 6/10
  The type prevents wrong-kind errors (strings, missing fields) but enforces none of the game-relevant constraints: minimum useful impulse magnitude, coordinate system orientation, or the prohibition on a fully-zero impulse. For a prototype with two pads in a sandbox level this is proportionate. If the level count grows and other developers author levels, the lack of invariants will start producing subtle bugs.

- **Invariant Enforcement**: 3/10
  There is zero runtime validation between `LevelDef` data and the scene. `def.speedPads ?? []` is iterated directly in `buildLevel`; a zeroed or nonsensical pad would be constructed and silently do nothing. There is no factory function, no `validateLevel` step, and no assertion that `x` is within `[0, worldW]` or that the impulse magnitude is non-trivial.

### Strengths

- The field names `vx`/`vy` are consistent with the velocity naming convention used everywhere else in this codebase (`SurfaceProps`, `RuntimeEnemy`, `ScatteredGem`).
- The JSDoc on the `vx`/`vy` pair is the clearest documentation on any def type in the file — the "negative = up" note is genuinely useful.
- Placing `SpeedPadDef` below `LevelDef` in the file is a layout inconsistency (all other defs are defined before `LevelDef`), but this is cosmetic.

### Concerns

1. **Both-zero silently does nothing.** `{ x, y, vx: 0, vy: 0 }` is structurally valid but produces a pad that fires and clears `exitPos` without applying any velocity. There is no error or warning.
2. **The `as SpeedPadDef` casts in `sandbox.ts` are a smell.** They are unnecessary (the literals already conform) and they would suppress TypeScript's excess-property checking if a misnamed field were added. Remove them.
3. **Coordinate convention is comment-only.** The game uses screen-space where negative y is up, but nothing in the type expresses this. A level author seeing `vy: -200` must read the JSDoc to understand what "up" means here, and there is no check that they got it right.
4. **No min/max tuning hints.** The sandbox uses 480–520 for `vx`. A new level author has no signal that `vx: 5` would be imperceptible and `vx: 5000` would shoot the marble off-screen at warp speed.

### Recommended Improvements

The type is appropriately simple for a DTO in a game prototype. These are ordered by bang-for-buck:

1. **Move the definition above `LevelDef`** to match the established file convention. Every other `*Def` type appears before it. This is a one-line cut-and-paste.

2. **Remove the `as SpeedPadDef` casts in `sandbox.ts`.** They are not needed and suppress excess-property checks.

3. **Express the non-zero impulse constraint via a discriminated type or a comment-as-contract.** The lightest-weight option is a JSDoc `@remarks` note: `At least one of vx or vy must be non-zero; a fully-zero impulse is a configuration error.` A stronger option, appropriate only if the level count grows, is a type alias that makes direction part of the shape:

```typescript
// Example — only warranted if levels become numerous
type Axis = 'x' | 'y' | 'both';
interface SpeedPadDef {
  x: number;
  y: number;
  axis: Axis;       // which components the pad sets
  vx: number;
  vy: number;
}
```

That would also make `updateSpeedPads`'s `if (sp.def.vx !== 0)` guards redundant and deletable.

---

## Type: `RuntimeSpeedPad`

(`/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`, lines 94-98)

### Invariants Identified

- `def` is a direct reference to the `SpeedPadDef` from the level definition. It is never mutated by the runtime, which is correct: def data is treated as read-only configuration.
- `img` is the scene's `Image` game object, created at build time and persistent for the level's lifetime.
- `exitPos` is the one-shot-lock field. The invariant is: `exitPos` is `null` when the pad is armed, and holds the marble's position at the moment of last activation when the pad is cooling down. The pad re-arms when the marble's distance from `exitPos` exceeds `SPEED_PAD_EXIT_DIST`. This is the core behavioral invariant of the type.
- The exit-lock invariant has a subtle flaw: `exitPos` is set to the marble's position at contact, not the pad's position. If the marble is moving fast, the stored position could be dozens of pixels away from the pad already. The cooldown distance check then fires against a moving reference point that is itself in motion relative to the pad. In practice for a 28-pixel-radius pad and a 64-pixel exit distance this is usually fine, but it is an imprecise implementation of the intended invariant ("marble must leave the pad's footprint before it can re-fire").

### Ratings

- **Encapsulation**: 6/10
  `RuntimeSpeedPad` is a file-private interface, never exported. That is the right call — it is an implementation detail of the scene. However, `exitPos` is a mutable field on a plain object, and `updateSpeedPads` sets it directly. This is standard for this codebase's pattern (compare `RuntimeGem.collected`, `RuntimeCheckpoint.activated`) so it is consistent, even if not maximally encapsulated.

- **Invariant Expression**: 5/10
  The `null`/`{x,y}` union on `exitPos` cleanly expresses the two states (armed vs. cooling). The field name `exitPos` is evocative but not precise — a reader must look at `updateSpeedPads` to understand it is the marble's position at the moment of firing, not the pad's exit edge. A name like `lastFirePos` or `cooldownOrigin` would be more self-documenting.

- **Invariant Usefulness**: 8/10
  The exit-lock mechanism solves a real problem: without it, a speed pad would re-fire every frame the marble is in contact, producing runaway acceleration. The `null | position` union is exactly the right shape to represent "unarmed" vs. "waiting for marble to clear". This invariant is directly preventing a real gameplay bug.

- **Invariant Enforcement**: 6/10
  The lock is enforced consistently: `exitPos` is set on every activation and cleared only when the distance threshold is met. The logic in `updateSpeedPads` uses `continue` to skip an armed pad entirely, which is correct. The flaw is that the exit distance (64px) and the radius check (28px horizontal + 20px vertical) are separate constants that are not co-defined — they describe overlapping geometry but are not derived from each other. If `SPEED_PAD_RADIUS` were increased, `SPEED_PAD_EXIT_DIST` would need to be updated manually to remain correct.

### Strengths

- The `null | { x: number; y: number }` union is idiomatic TypeScript and cleanly expresses the binary state without an extra boolean field.
- Holding a `def` reference rather than copying individual fields is efficient and ensures the runtime object stays in sync with its definition trivially.
- The interface is compact — three fields, each with a clear purpose.

### Concerns

1. **`exitPos` stores marble position, not pad position.** The intended invariant is "marble must leave the pad area." Storing the marble's position at fire time means the clearance check drifts depending on how fast the marble was moving at the moment of activation. For a horizontally fast marble at a horizontal pad this is usually fine; for a slow approach it could produce a slightly generous or tight lock window. A pad-relative check (`distance from pad center`) would be exact and remove the dependency on marble velocity at activation time.

2. **`SPEED_PAD_RADIUS` and `SPEED_PAD_EXIT_DIST` are uncoupled constants.** The exit distance (64) should be at least the radius (28) plus the marble radius (18 = `R`) to guarantee the marble has fully cleared. Currently `64 > 28 + 18 = 46` so the margin holds, but this relationship is not expressed anywhere. If `R` or `SPEED_PAD_RADIUS` changes, the exit distance could silently become too small.

3. **The flash graphic is created inside the update loop** (`updateSpeedPads`) on every activation. It is not stored on `RuntimeSpeedPad`. This is not a type design issue, but it means there is no way to suppress a second flash if the pad fires twice in close succession due to timing.

### Recommended Improvements

1. **Rename `exitPos` to `cooldownOrigin` or `lastFirePos`** to make the intent legible without reading the implementation.

2. **Consider storing pad-center distance threshold rather than marble position.** The check in `updateSpeedPads` would become:

```typescript
// Instead of: exitPos: { x: number; y: number } | null
// Use:
cooldownActive: boolean;
```

With the re-arm trigger being `distance(marble, pad_center) > SPEED_PAD_EXIT_DIST`. This removes the velocity-at-activation drift entirely. The position reference point becomes the stable pad position, which is already available as `sp.def.x / sp.def.y`.

3. **Co-define the exit distance as a function of the radius and marble radius** with a comment explaining the relationship, to prevent silent regressions if either constant changes.

---

## Type: `ScatteredGem`

(`/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`, lines 85-92)

### Invariants Identified

- `x`, `y`, `vx`, `vy` form a 2D kinematic state. They are mutated every frame by `updateCollectibles`'s Euler integration. The invariant is that they represent the gem's current world-space position and velocity.
- `spawnTime` is a timestamp in Phaser's `time.now` units (milliseconds). It is set once at construction in `scatterGems` and is never mutated afterward. The invariant is: `spawnTime` is immutable after creation.
- `img` is the live scene object. The invariant is: `img` is valid (not destroyed) while the gem is in the `scatteredGems` array. Destruction is always followed by `splice`. This invariant is correctly maintained in all three removal paths (timeout, collection, respawn).
- The type has an implicit lifetime invariant: gems older than 5000ms are removed. This is enforced in `updateCollectibles` but there is nothing in the type itself that hints at the existence of a TTL.
- `vy` can accumulate negative → positive as gravity is applied; `vx` decays due to friction bounce. These are valid physical state transitions. No spurious constraint is needed here.

### Ratings

- **Encapsulation**: 7/10
  File-private, never exported. The mutable fields are correct for a simulation object — immutability here would require a copy per frame, which is the wrong tradeoff in a game loop. The `img` / position duality (the Image has its own internal position that is kept in sync via `setPosition`) is an unavoidable Phaser coupling rather than a design flaw.

- **Invariant Expression**: 4/10
  The 5-second TTL is invisible in the type. `spawnTime` appears to be a mutable field alongside `vx`/`vy`/`x`/`y`, but it is semantically different — it is set once and read to compute age. Nothing in the type distinguishes "mutable simulation state" from "immutable creation metadata." A `readonly` modifier on `spawnTime` would express this distinction precisely and at no runtime cost.

- **Invariant Usefulness**: 7/10
  The fields are the minimal necessary set for a 2D projectile with a sprite. No field is redundant. The design correctly mirrors the Sonic ring-loss mechanic: scatter outward, apply gravity, bounce off ground, collect to recover, expire after timeout.

- **Invariant Enforcement**: 5/10
  There are two points worth noting:
  - In `scatterGems`, the count `n = Math.max(this.gemCount, 5)` always scatters at least 5 gems even if the marble has collected zero gems. This is a game-feel choice, but it means scattered gems can be collected to push `gemCount` above the marble's actual pre-hit count, since `scatterGems` zeroes `gemCount` first. The guard `if (this.gemCount < this.gems.length) this.gemCount++` in collection partially mitigates this, capping at total gem count, but the invariant "scattered gems represent lost collected gems" is imprecise.
  - `sg.img.setPosition` and `sg.x / sg.y` are always kept in sync within the same loop body. This pairing is a manual invariant — there is nothing preventing code from updating one without the other.

### Strengths

- The type is the right shape for a game-loop simulation object. No over-engineering.
- Cleanup is comprehensive: all three removal paths (timeout, collection, respawn) call `sg.img.destroy()` before splicing. This is the critical invariant for preventing Phaser scene object leaks, and it is correctly maintained.
- Reverse iteration (`for (let i = length-1; i >= 0; i--)`) is the correct pattern for splice-during-iteration. Whoever wrote this knows Phaser.

### Concerns

1. **`spawnTime` should be `readonly`.** It is set once at construction and never changed. The current type allows any code to reassign it, which would corrupt the TTL calculation. This is a free, zero-cost fix:

```typescript
interface ScatteredGem {
  img:             Phaser.GameObjects.Image;
  x:               number;
  y:               number;
  vx:              number;
  vy:              number;
  readonly spawnTime: number;
}
```

2. **The minimum-5 scatter count in `scatterGems` creates a gem-count invariant violation.** If `gemCount === 0`, the marble scatters 5 phantom gems. Collecting all 5 would push `gemCount` from 0 to 5 (capped at `gems.length`), giving the player gems they never actually collected. The `gemCount < gems.length` guard prevents overshooting the total but does not prevent inflating from zero. Whether this is an intentional "consolation" mechanic or an oversight is a design call, but it deserves a code comment either way.

3. **The `x`/`y` duality with `img.x`/`img.y` is a manual sync obligation.** Phaser's `Image` internally tracks its position. The type stores position separately and syncs via `setPosition` every frame. This is the standard Phaser pattern for objects with custom physics (consistent with how `RuntimeEnemy` is handled), but a comment on the type noting "x/y are authoritative; img position is derived" would help future maintainers avoid the temptation to read `sg.img.x` directly.

### Recommended Improvements

1. **Add `readonly` to `spawnTime`.** This is the most impactful single-character change in this PR. It costs nothing and enforces the immutability that is already assumed by the entire update loop.

2. **Add a comment to the minimum-5 scatter behavior in `scatterGems`** explaining whether it is intentional ("minimum scatter count for visual impact even with no gems held") or a known edge-case.

3. **No structural change to `ScatteredGem` is needed.** The type is well-matched to its domain. The simulation fields are correct, the lifetime is managed correctly at all call sites, and the pattern is consistent with other runtime types in the file.

---

## Summary Across All Three Types

The three types form a coherent, well-patterned set that is consistent with the rest of the codebase. The clearest wins available with minimal disruption are:

| Fix | Type | Cost |
|-----|------|------|
| Move `SpeedPadDef` above `LevelDef` in the file | `SpeedPadDef` | Trivial |
| Remove `as SpeedPadDef` casts in `sandbox.ts` | `SpeedPadDef` | Trivial |
| Add `readonly spawnTime` to `ScatteredGem` | `ScatteredGem` | Trivial |
| Rename `exitPos` to `lastFirePos` or `cooldownOrigin` | `RuntimeSpeedPad` | Trivial |
| Anchor exit-distance check to pad center, not marble-at-fire | `RuntimeSpeedPad` | Small refactor |
| Comment or guard the minimum-5 scatter rule | `ScatteredGem` / `scatterGems` | Trivial |

The `exitPos`-vs-pad-center issue in `RuntimeSpeedPad` is the only concern that could produce a subtle, hard-to-reproduce bug at higher marble velocities. The `readonly spawnTime` omission on `ScatteredGem` is the clearest expression-quality miss. Everything else is polish.</result>
<usage><total_tokens>27927</total_tokens><tool_uses>8</tool_uses><duration_ms>133610</duration_ms></usage>
</task-notification>
Full transcript available at: /tmp/claude-1000/-home-shazbot-Projects-products-games-spudstorm/tasks/abc559b0d78c246db.output

## Assistant

Type design agent done too. Still waiting on silent-failure-hunter and code-simplifier...

## Human

<task-notification>
<task-id>a9be173959d8da799</task-id>
<tool-use-id>toolu_0157FgZeugztXqByKqyqLnrK</tool-use-id>
<status>completed</status>
<summary>Agent "Simplify new code sections" completed</summary>
<result>After thorough analysis, the only change is an improved comment. Here is my full assessment.

---

## Review Summary

I reviewed all four newly added methods in `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`:

### `scatterGems()` (line 1200) -- No changes needed

The method is already concise. Each local variable (`angle`, `speed`, `img`) maps to a clear purpose. The `Math.max(this.gemCount, 5)` correctly ensures a minimum visual scatter even when the player has zero gems. No redundancy or verbosity to address.

### `updateSpeedPads()` (line 1220) -- No changes needed

I considered three potential simplifications and rejected each:

- **The `if (sp.def.vx !== 0)` / `if (sp.def.vy !== 0)` guards** appear redundant at first glance, but they are necessary. They preserve the marble's existing velocity on the unconfigured axis. For example, the second speed pad (`vx: 480, vy: 0`) must NOT reset vertical velocity to 0 -- it should only apply the horizontal boost. Removing the guards would break behavior.

- **The `exitPos` distance-lock pattern** is the same pattern used by portals elsewhere in the codebase. It is idiomatic for this project and reads clearly.

- **Hoisting `body` inside the contact branch** would save one cast in the no-contact path but would duplicate the cast if multiple pads could trigger per frame. Current placement is correct.

### `fmtTime()` (line 1249) -- No changes needed

Four intermediate variables (`secs`, `cs`, `m`, `s`) map directly to the output format `m:ss.cc`. Eliminating any of them would reduce readability. The method is already minimal.

### `updateCollectibles()` scattered-gem section (line 1046) -- One comment improved

I initially attempted to consolidate the duplicated `destroy + splice` removal code (expiration at line 1050 and collection at line 1067) into a single removal path. However, the collection distance check **must** run after physics updates the gem position (`sg.x`, `sg.y`), so moving it before the physics step would subtly change which frame a gem becomes collectible. Given the user's requirement to preserve all existing behavior, I kept the original structure.

The only change I applied was clarifying the comment on the collection check from:

```typescript
// Collect scattered gem
```

to:

```typescript
// Collect scattered gem (after physics so distance uses updated position)
```

This documents the ordering dependency that makes the two removal sites non-consolidatable, which will help future readers understand why the pattern is not deduplicated.

### Timer display in `updateHUD()` (line 1160) -- Verified, no changes

The `this.trialStartMs < 0` guard in the `else if` branch appears redundant but is actually necessary. It distinguishes between "timer never started" (show best time) and "goal reached with timer running" (preserve the final time text set by `showGoalMessage()`). Removing it would cause the best-time display to overwrite the goal completion time after reaching the goal.

### Conclusion

The newly added code is already well-structured and consistent with the rest of the codebase. The methods are appropriately sized, variable names are clear, and the conditional logic -- while initially appearing to have redundancies -- is correct in every case. No meaningful simplifications are available without changing behavior.</result>
<usage><total_tokens>34490</total_tokens><tool_uses>16</tool_uses><duration_ms>137289</duration_ms></usage>
</task-notification>
Full transcript available at: /tmp/claude-1000/-home-shazbot-Projects-products-games-spudstorm/tasks/a9be173959d8da799.output

## Assistant

Simplifier done (clean - only a clarifying comment). Still waiting on silent-failure-hunter...

## Human

<task-notification>
<task-id>a844eae30e8619b1b</task-id>
<tool-use-id>toolu_01SZatgbhf8F2oYKdqZQGYxe</tool-use-id>
<status>completed</status>
<summary>Agent "Hunt silent failures in error handling" completed</summary>
<result>I now have a complete picture of every changed area. Let me compile the full audit report.

---

## Error Handling Audit — `marble-mayhem` Branch (HEAD~1 diff)

Files audited:
- `/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts`
- `/home/shazbot/Projects/products/games/spudstorm/src/types/LevelDef.ts`
- `/home/shazbot/Projects/products/games/spudstorm/src/levels/sandbox.ts`

---

### ISSUE 1 — CRITICAL: `localStorage.getItem` silently returns `null` in private browsing, cross-origin iframes, and storage-quota-exceeded states

**Location:** `src/scenes/MarblePlatform.ts`, lines 208–209

**Current code:**
```typescript
const stored   = localStorage.getItem(`best_${this.levelDef.id}`);
this.bestTime  = stored ? parseInt(stored, 10) : 0;
```

**What can fail here:**

`localStorage` access throws a `SecurityError` (or `DOMException`) in at least three real-world situations:
1. Private browsing mode in Safari (throws outright on `.getItem`, does not just return null)
2. Embedded iframe from a cross-origin parent with the `sandbox` attribute and no `allow-same-origin`
3. Some corporate browser policies that block storage APIs entirely

Because the expression `localStorage.getItem(...)` is bare — not inside a try-catch — any thrown `SecurityError` propagates up and crashes the entire `create()` method. When `create()` throws, Phaser does not produce a user-visible error message and the scene simply fails to initialize. The player sees a blank canvas with no feedback about what went wrong.

**Additionally:** `parseInt` on a corrupted stored value (e.g. `"NaN"`, `""`, or something a user accidentally wrote via DevTools) returns `NaN`. The guard `stored ? ... : 0` does not catch this. `this.bestTime = NaN` then propagates into `fmtTime`, producing `NaN:NaN.NaN` in the HUD timer — a silent display corruption with no log anywhere.

**User impact:** In private browsing, the game never loads and the user has no idea why. If the stored value is corrupted, the timer display silently shows garbage.

**Recommendation:**
```typescript
// Lines 208–209 — wrap both localStorage calls in try-catch
let stored: string | null = null;
try {
  stored = localStorage.getItem(`best_${this.levelDef.id}`);
} catch (e) {
  console.warn('[MarblePlatform] localStorage unavailable — best time will not persist:', e);
}
const parsed = stored ? parseInt(stored, 10) : NaN;
this.bestTime = Number.isFinite(parsed) ? parsed : 0;
```

---

### ISSUE 2 — CRITICAL: `localStorage.setItem` in `showGoalMessage()` silently throws and aborts goal completion logic

**Location:** `src/scenes/MarblePlatform.ts`, lines 1260–1263

**Current code:**
```typescript
if (this.bestTime === 0 || elapsed < this.bestTime) {
  this.bestTime = elapsed;
  localStorage.setItem(`best_${this.levelDef.id}`, String(elapsed));
}
this.timerText.setText(`${this.fmtTime(elapsed)}  ★`);
```

`localStorage.setItem` throws a `QuotaExceededError` when storage is full, and a `SecurityError` in the same restricted environments as `.getItem`. This throw is uncaught. When it fires, execution aborts mid-method before `timerText.setText(...)` is reached, meaning the star display never renders, the goal UI is partially initialized, and the player sees nothing to indicate they finished.

Unlike Issue 1, this fails at goal completion — the worst possible moment to silently break. The player completes the level and gets no feedback.

**Recommendation:**
```typescript
if (this.bestTime === 0 || elapsed < this.bestTime) {
  this.bestTime = elapsed;
  try {
    localStorage.setItem(`best_${this.levelDef.id}`, String(elapsed));
  } catch (e) {
    console.warn('[MarblePlatform] Could not persist best time:', e);
  }
}
this.timerText.setText(`${this.fmtTime(elapsed)}  ★`);
```

---

### ISSUE 3 — CRITICAL: Ten canvas `getContext('2d')!` calls use TypeScript's non-null assertion to bypass a real null return

**Location:** `src/scenes/MarblePlatform.ts`, lines 249, 317, 338, 393, 404, 414, 430, 437, 448, 470

**Every texture factory method in the file follows this pattern:**
```typescript
const c = document.createElement('canvas');
const ctx = c.getContext('2d')!;  // <-- non-null assertion
```

`getContext('2d')` legitimately returns `null` in three production scenarios:
1. The canvas has already been given a different context type (e.g. `'webgl'`) in the same document
2. The browser has exceeded its canvas context limit (mobile browsers enforce this aggressively — iOS Safari caps at ~16 simultaneous contexts)
3. WebGL/2D hardware acceleration is unavailable or disabled by the user

There are **10 separate canvas contexts** being created here — `makeParallaxTex`, `makeMarbleTex`, `makePlatformTex` (called once per `SurfaceType` in a loop, which creates 9 more), `makeSpringTex`, `makeGoalTex`, `makeGemTex`, `makeCheckpointTex` (two canvases), `makeSpeedPadTex`, `makeEnemyTex`. That is well over 16 contexts on a system with a tight cap.

The `!` operator tells TypeScript to trust the developer's assumption that this cannot be null. When it is null at runtime, calling `ctx.fillRect(...)` immediately throws `TypeError: Cannot read properties of null`. Because this happens inside Phaser's scene construction flow (called from `buildTextures()`, called from `create()`), the scene fails to initialize with a JavaScript exception that Phaser swallows silently, leaving the user with a blank canvas.

The new `makeSpeedPadTex` method introduced in this PR adds one more unguarded instance to the existing set.

**Recommendation for each texture factory:**
```typescript
private makeSpeedPadTex(): void {
  if (this.textures.exists('speedPadTex')) return;
  const W = 48, H = 18;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) {
    console.error('[MarblePlatform] makeSpeedPadTex: canvas 2d context unavailable — speed pad texture will be missing');
    return;  // texture simply won't exist; the image call later will fallback to Phaser's missing-texture placeholder rather than crashing
  }
  // ... rest of drawing
}
```

The same guard should be applied to all 10 instances. This converts a crash-on-null into a logged degraded state where the texture is absent but the game remains functional.

---

### ISSUE 4 — HIGH: `scatterGems` uses `Math.max(this.gemCount, 5)` to scatter gems the player never collected

**Location:** `src/scenes/MarblePlatform.ts`, lines 1200–1217

**Current code:**
```typescript
private scatterGems(time: number): void {
  const n = Math.max(this.gemCount, 5);
  this.gemCount = 0;
  for (let i = 0; i < n; i++) {
    // ...
    const img = this.add.image(this.marble.x, this.marble.y, 'gemTex')
```

When `this.gemCount` is 0 (player has collected no gems), this still scatters 5 gems. That is not a crashing error, but it is a silent inconsistency: the HUD shows `gems: 0/N`, then 5 phantom gems appear and can be collected, incrementing `gemCount` beyond zero for gems that were never real. The cap `if (this.gemCount < this.gems.length) this.gemCount++` in the collector partially masks this but it produces a count that does not match actual collected gems.

This fallback to a minimum of 5 is unjustified and not documented. Whether it's intentional game design or a bug is ambiguous, but it is silently inconsistent with the displayed gem count.

**Recommendation:** If the minimum-5 scatter is intentional (always give the player something to lose even early on), document it explicitly with a named constant and a comment. If unintentional, the correct behavior when `gemCount == 0` is either to not scatter at all, or to scatter exactly 0 gems. The current code hides the distinction entirely.

---

### ISSUE 5 — HIGH: Collected scattered gem can increment `gemCount` past `this.gems.length` if multiple pickups occur in the same frame

**Location:** `src/scenes/MarblePlatform.ts`, lines 1066–1069

**Current code:**
```typescript
if (Phaser.Math.Distance.Between(mx, my, sg.x, sg.y) < this.R + 14) {
  if (this.gemCount < this.gems.length) this.gemCount++;
  sg.img.destroy();
  this.scatteredGems.splice(i, 1);
}
```

The guard `this.gemCount < this.gems.length` is evaluated independently for each scattered gem in the same frame iteration. If the marble is positioned such that it overlaps two scattered gems simultaneously (entirely possible when gems explode from a tight cluster), both guards can pass in the same frame — because the first iteration increments `gemCount` but the second iteration's guard is evaluated with the post-increment value only if it has already crossed the boundary. With only 1 gem remaining to the cap, two simultaneous pickups produce a correct result, but if `gemCount` is 2 below the cap, both pass, both increment, and the display shows `gems: N/N` (or beyond) before all static gems are collected. No log is emitted.

The check is also conceptually wrong for the stated system: `gemCount` is supposed to track collected gems; counting scattered gems (which are copies, not originals) as unique collections makes `gemCount` a meaningless number that cannot be relied on for any future win-condition logic.

**Recommendation:** Log when `gemCount` would exceed `this.gems.length` so the inconsistency is detectable, or redesign the scattered gem counter to be separate from the static gem counter.

---

### ISSUE 6 — HIGH: `scatterGems` spawns `ScatteredGem` objects backed by `Phaser.GameObjects.Image` but has no upper bound on the number of simultaneous scattered gems

**Location:** `src/scenes/MarblePlatform.ts`, lines 1200–1217

If the marble is hit repeatedly within 5 seconds (the scatter gem lifetime), each call to `scatterGems` pushes `n` new images into `this.scatteredGems`. With `n = Math.max(gemCount, 5)`, two rapid hits produce at least 10 images, and with `gemCount` accumulated between respawns the number scales upward. Phaser's `GameObjects.Image` objects are not pooled here — each call does `this.add.image(...)` which allocates a new display object.

There is no cap, no warning when the array grows large, and no console output if this causes a performance or memory issue. The failure mode is a gradual frame-rate collapse that is impossible to diagnose because nothing is logged.

**Recommendation:** Add a constant (e.g. `MAX_SCATTERED_GEMS = 20`) and log a warning when the limit is hit, trimming the oldest entries if exceeded.

---

### ISSUE 7 — HIGH: Flash graphics object in `updateSpeedPads` is allocated every frame the marble is in contact, creating runaway `Graphics` object accumulation

**Location:** `src/scenes/MarblePlatform.ts`, lines 1239–1243

**Current code:**
```typescript
const flash = this.add.graphics().setDepth(20);
flash.fillStyle(0xfbbf24, 0.7);
flash.fillRect(sp.def.x - 24, sp.def.y - 18, 48, 18);
this.tweens.add({ targets: flash, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
```

`updateSpeedPads` runs every update tick. The `exitPos` lock prevents re-triggering on the same pass, so this only fires once per contact — unless the tween completes (180ms) and the marble is still within `SPEED_PAD_EXIT_DIST`. In that edge case, the guard resets to `null` and the next tick creates another `flash`. Each one allocates a new `Phaser.GameObjects.Graphics` instance and adds a new tween. They accumulate on the display list and in the tween manager until the tween fires its `onComplete`.

More directly: this is a silent resource allocation happening inside `update()`. If something goes wrong with tween completion (scene pause, tween manager reset), the `flash` objects are orphaned in the display list permanently. No log, no cap, no pool.

**Recommendation:** Pre-allocate a single reusable `Graphics` object for the flash effect in scene construction (like `glowGfx` already is), clear and redraw it on contact, and tween its alpha. This removes the per-contact allocation entirely.

---

### ISSUE 8 — MEDIUM: `parseInt(stored, 10)` result is used without a `Number.isFinite` guard, producing a `NaN` bestTime that passes all numeric comparisons incorrectly

**Location:** `src/scenes/MarblePlatform.ts`, line 209

Noted as a secondary concern under Issue 1. If the stored value is the string `"NaN"` or any non-numeric string, `parseInt` returns `NaN`. The ternary guard `stored ? parseInt(stored, 10) : 0` only checks that `stored` is a non-empty string — it does not validate the parse result. `NaN` then becomes `this.bestTime`, which causes `this.bestTime === 0` to evaluate to `false` and `elapsed < this.bestTime` to evaluate to `false` (NaN comparisons always return false in JavaScript). The consequence is that the best time is never updated even when the player finishes the level, silently discarding their result. No log is produced.

---

### ISSUE 9 — MEDIUM: Scattered gem position is not clamped to world bounds — gems can fly off the left/right edge of the world and become unreachable orphans

**Location:** `src/scenes/MarblePlatform.ts`, lines 1055–1063

The scattered gem physics update applies `sg.x += sg.vx * dt` and `sg.y += sg.vy * dt` without any horizontal bounds check. Gems are only cleaned up by age timeout (5000ms) or marble collection. A gem launched leftward at the world edge (x near 0, vx negative) will have a negative `sg.x` coordinate, be invisible to the player, and sit in `this.scatteredGems` until the 5-second timeout elapses. During that time it occupies an array slot, performs distance calculations every frame, and calls `sg.img.setPosition(sg.x, sg.y)` with out-of-world coordinates. There is no log and the player has no indication gems exist off-screen.

**Recommendation:** Clamp `sg.x` to `[0, this.levelDef.worldW]` in the update loop, or bounce horizontally like the ground bounce, or mark the gem for immediate destruction when it exits world bounds.

---

### ISSUE 10 — MEDIUM: `fmtTime` receives `time - this.trialStartMs` but `time` is Phaser scene time, not wall-clock time — no guard against negative `ms`

**Location:** `src/scenes/MarblePlatform.ts`, lines 1248–1255 and 1160–1161

**Current code:**
```typescript
this.timerText.setText(this.fmtTime(time - this.trialStartMs));
```

`time` is Phaser's `this.time.now` which is scene-relative and can be reset on scene restart. If `trialStartMs` is set in one scene run and then `time` resets (scene restart via Phaser scene manager), the subtraction produces a large negative number. `Math.floor(ms / 1000)` on a negative value returns a negative integer. `padStart` will not produce readable output for negative numbers. The result is a corrupted timer string with no log.

Similarly, `showGoalMessage` uses `this.time.now - this.trialStartMs` without checking that the result is non-negative or finite before passing it to `fmtTime` and writing it to `localStorage`.

**Recommendation:** Add a guard in `fmtTime`:
```typescript
private fmtTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    console.warn('[MarblePlatform] fmtTime called with invalid ms:', ms);
    return '0:00.00';
  }
  // ...
}
```

---

### Summary Table

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | CRITICAL | Line 208–209 | `localStorage.getItem` uncaught — crashes `create()` in private browsing |
| 2 | CRITICAL | Lines 1260–1263 | `localStorage.setItem` uncaught — aborts goal completion, no star display |
| 3 | CRITICAL | Lines 249, 317, 338, 393, 404, 414, 430, 437, 448, 470 | 10x `getContext('2d')!` non-null assertions — null at runtime crashes scene silently |
| 4 | HIGH | Lines 1200–1217 | Phantom gem scatter minimum of 5 when 0 gems collected — silent inconsistency |
| 5 | HIGH | Lines 1066–1069 | Simultaneous scattered gem pickup race — `gemCount` can exceed `gems.length` silently |
| 6 | HIGH | Lines 1200–1217 | No cap on accumulated `ScatteredGem` objects — unbounded allocation, silent perf degradation |
| 7 | HIGH | Lines 1239–1243 | Per-contact `Graphics` allocation in `update()` — orphaned objects if tween misfires |
| 8 | MEDIUM | Line 209 | `parseInt` result not validated — `NaN` bestTime silently discards all future records |
| 9 | MEDIUM | Lines 1055–1063 | No horizontal world-bounds clamp on scattered gems — unreachable off-screen orphans |
| 10 | MEDIUM | Lines 1160, 1249 | `fmtTime` no guard on negative or non-finite input — corrupted HUD string on scene restart |

The three CRITICAL issues all share the same root cause: production code that reaches into browser APIs with no exception handling. All three will manifest for real players in common environments (private browsing, mobile with context limits). They should be addressed before the next deploy to `marble-mayhem.spudstorm.pages.dev`.</result>
<usage><total_tokens>43644</total_tokens><tool_uses>19</tool_uses><duration_ms>145581</duration_ms></usage>
</task-notification>
Full transcript available at: /tmp/claude-1000/-home-shazbot-Projects-products-games-spudstorm/tasks/a844eae30e8619b1b.output

## Assistant

All four agents done. Let me compile the full report and immediately fix the real bugs.

---

## PR Review Summary

### Critical Issues (fix before next deploy)

| # | Agent | Issue | Location |
|---|-------|-------|----------|
| C1 | code-reviewer | `scatterGems()` always spawns ≥5 phantom gems when `gemCount=0` — player can farm free gems by getting hit | `MarblePlatform.ts:1200` |
| C2 | code-reviewer | `respawn()` resets `gemCount=0` but static gem `collected` flags stay `true` — gems can never be re-collected after death | `MarblePlatform.ts:1186` |
| C3 | code-reviewer | `goalReached` never reset on respawn — timer and goal permanently broken after first completion | `MarblePlatform.ts` |
| C4 | error-hunter | `localStorage.getItem` uncaught — crashes `create()` in private browsing (Safari throws, doesn't return null) | `MarblePlatform.ts:208` |
| C5 | error-hunter | `localStorage.setItem` uncaught — goal completion aborts mid-method, star display never renders | `MarblePlatform.ts:1260` |
| C6 | error-hunter | `parseInt` not validated — `NaN` bestTime silently discards all future records | `MarblePlatform.ts:209` |

### Important Issues

| # | Agent | Issue |
|---|-------|-------|
| I1 | error-hunter | Per-contact `this.add.graphics()` in `updateSpeedPads()` — should use pre-allocated object like `glowGfx` |
| I2 | error-hunter | `fmtTime` no guard against negative/NaN input — corrupted HUD on scene restart |
| I3 | error-hunter | Scattered gems not clamped to world bounds — can fly off-screen and sit unreachable for 5s |

### Suggestions (polish, trivial)

- type-analyzer: `readonly spawnTime` on `ScatteredGem`
- type-analyzer: Remove unnecessary `as SpeedPadDef` casts in `sandbox.ts`
- type-analyzer: Move `SpeedPadDef` definition above `LevelDef` in `LevelDef.ts`
- type-analyzer: Rename `exitPos` → `lastFirePos` for clarity
- simplifier: One comment clarified (already applied by linter)

### Strengths
- Distance-lock cooldown pattern on speed pads is idiomatic and correct
- Reverse-iteration splice in scattered gem loop is correct
- All `sg.img.destroy()` paths are covered (no Phaser object leaks)
- `fmtTime` intermediate variables are clear, not over-compressed

---

Fixing all Critical and Important issues now:

[Tool: Edit file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts"]
[Tool: Bash cmd="grep -n "localStorage\|bestTime\|respawn\|goalReached\|scatterGems\|fmtTime\|..."]
[Tool: Bash cmd="sed -n '1181,1220p' /home/shazbot/Projects/products/games/spudstorm/src/scene..."]
[Tool: Bash cmd="sed -n '1220,1260p' /home/shazbot/Projects/products/games/spudstorm/src/scene..."]
Now applying all fixes. Starting with `localStorage` safety and `fmtTime` guard:

[Tool: Edit file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts"]
[Tool: Bash cmd="sed -n '205,215p' /home/shazbot/Projects/products/games/spudstorm/src/scenes/..."]
[Tool: Bash cmd="
# Apply all fixes as a single Python script to avoid repeated file-changed e..."]
Now apply the trivial type/style improvements:

[Tool: Bash cmd="
python3 << 'EOF'
# Fix 7: readonly spawnTime in ScatteredGem interface
with ..."]
[Tool: Bash cmd="npm run build 2>&1 | tail -8 && npx tsc --noEmit 2>&1 | grep -v "main.ts""]
Clean build. Commit and deploy:

[Tool: Bash cmd="git add src/scenes/MarblePlatform.ts src/types/LevelDef.ts src/levels/sandbox..."]
[Tool: Bash cmd="CLOUDFLARE_API_TOKEN=$(cat ~/credentials/cloudflare-token.txt) npx wrangler p..."]
Deployed. Here's the full review summary and what was fixed:

---

## Review Complete — All Critical Issues Fixed

**6 bug fixes committed + deployed:**

| Fix | What was wrong |
|-----|----------------|
| `scatterGems()` guard | Was spawning 5 phantom gems when you had 0 collected — free gem farming by getting hit repeatedly |
| `respawn()` reset | `goalReached` wasn't cleared (timer permanently broken after first completion); static gem images not restored (gems couldn't be re-collected after death) |
| `localStorage.getItem` | Safari private browsing throws `SecurityError` (not null) — would silently crash `create()`, blank canvas |
| `localStorage.setItem` | Same throw on `QuotaExceededError` — would abort goal completion before the `★` star rendered |
| `parseInt` NaN guard | Corrupted localStorage value → `NaN` bestTime → silently discards all future records |
| `fmtTime()` guard | Negative/NaN input on scene restart → corrupted `NaN:NaN.NaN` HUD display |
| Scattered gem bounds clamp | Gems flying off world edge sat unreachable for 5 seconds, doing pointless distance checks each frame |

**Type polish (trivial, no behavior change):**
- `readonly spawnTime` on `ScatteredGem`
- `SpeedPadDef` moved above `LevelDef` in the file
- Removed unnecessary `as SpeedPadDef` casts in sandbox.ts
- JSDoc clarified: at least one axis must be non-zero

**Not changed (agents flagged, but not warranted for a prototype):**
- `getContext('2d')!` — pre-existing pattern across the whole file, 10+ instances. Not introduced by this PR.
- Per-contact flash `Graphics` allocation — the `exitPos` lock guarantees it fires once per pass; acceptable for a game prototype
- No cap on `ScatteredGem` array — max 3 gems in sandbox, bounded in practice

## Human

deploy and let me try it out

## Assistant

Already deployed in the last step — the fixes are live now.

[Tool: Bash cmd="git log --oneline -3"]
You're good — both commits are live:

**https://marble-mayhem.spudstorm.pages.dev**

Things to try:
- **Gem scatter** — get hit by the Roller in Zone 5 with some gems collected; they'll fly out radially and you can chase them down
- **Speed pads** — Zone 2 exit has a `>>` amber pad that blasts you over the gap; Zone 5 has one to help you kill the Roller at speed
- **Timer** — starts on first movement, top-right corner; finishes with `★` at the goal and saves to localStorage

## Human

Theres no gem scatter.  Also, I think the mid-air movement correction needs to be a bit increased.  Right now it's just frustrating and very hard to precisely position oneself.  Increase mid-air course correction by say 25% and let's try it out.

## Assistant

Two things to check — the scatter not firing is almost certainly because gems are in Zone 6 *after* the enemies in Zone 5, so `gemCount` is always 0 when you hit them. Let me verify and fix both.

[Tool: Bash cmd="grep -n "ACCEL_X\|0\.12\|grounded ? 1\|air" /home/shazbot/Projects/products/g..."]
Confirmed — air accel is `0.12` at line 782. And the gems are all in Zone 6 (x≥9350) but enemies are Zone 5 (x≈7900-8980) — no gems to scatter. Both fixes:

[Tool: Edit file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts"]
[Tool: Bash cmd="
# Both fixes in one pass
python3 << 'EOF'
# Fix air accel
with open('/home/s..."]
[Tool: Bash cmd="npm run build 2>&1 | tail -5"]
[Tool: Bash cmd="CLOUDFLARE_API_TOKEN=$(cat ~/credentials/cloudflare-token.txt) npx wrangler p..."]
[Tool: Bash cmd="git add src/scenes/MarblePlatform.ts src/levels/sandbox.ts && git commit -m "..."]
Live at **https://marble-mayhem.spudstorm.pages.dev**

Two fixes:

1. **Gem scatter** — root cause was a level design problem: all 3 gems were in Zone 6 (past the goal flag area), enemies are Zone 5. `gemCount` was always 0 when you hit them → scatter silently bailed out. Added 7 gems distributed across Zones 1–5, including 2 right in the enemy arena as scatter bait. Hit the Roller with gems in your count and they should fly.

2. **Mid-air control** — air accel multiplier bumped from `0.12` to `0.15` (+25%). Should feel noticeably more responsive without making air control feel floaty/arcade-y.

## Human

1. mid-air control feels the same still
2. The orange platforms just seem like normal platforms, what are they supposed to do?
3. The speed pad just acts as a bumper, when you touch it you get shoved.  Is that what it's meant to do?
4. Stll no gem scatter when hit with gems

## Assistant

Four separate bugs. Let me look at each carefully before fixing:

[Tool: Bash cmd="grep -n "0\.15\|BOUNCE_PAD\|bounceY\|scatteredGems\|updateEnemies\|updateColl..."]
Found four separate bugs:

1. **Air accel** — is at 0.15 but apparently needs more. Going to 0.22.
2. **Bounce pads** — `body.setBounce(0.82)` has a 1-frame lag: physics resolves *before* the bounce coefficient is set for that frame. First landing always uses the previous frame's coefficient (CONCRETE = 0), so it feels like a normal platform. Need manual impulse instead.
3. **Speed pads** — `setVelocityX(520)` is a snap, not a boost. If you're already at 420, it does boost. But it also slows you if you're faster, and if vy also fires it's jarring. Need directional-max logic.
4. **Gem scatter** — critical bug: `updateEnemies` (line 675) calls `scatterGems()`, then `updateCollectibles` (line 676) runs *immediately after in the same frame*. All scattered gems spawn at marble position → distance = 0 → instantly re-collected before the player ever sees them.

[Tool: Bash cmd="python3 << 'EOF'
with open('/home/shazbot/Projects/products/games/spudstorm/s..."]
[Tool: Bash cmd="grep -n "age <= 5000\|age > 250\|collected = " /home/shazbot/Projects/product..."]
The linter restructured the scattered gem collection loop. Let me see what it looks like now:

[Tool: Bash cmd="sed -n '1053,1090p' /home/shazbot/Projects/products/games/spudstorm/src/scene..."]
[Tool: Edit file="/home/shazbot/Projects/products/games/spudstorm/src/scenes/MarblePlatform.ts"]
[Tool: Bash cmd="python3 << 'EOF'
with open('/home/shazbot/Projects/products/games/spudstorm/s..."]
[Tool: Bash cmd="npm run build 2>&1 | tail -5 && npx tsc --noEmit 2>&1 | grep -v "main.ts""]
[Tool: Bash cmd="git add src/scenes/MarblePlatform.ts && git commit -m "$(cat <<'EOF'
fix: bou..."]
Live at **https://marble-mayhem.spudstorm.pages.dev**

What was wrong and what's fixed:

**Bounce pads** — completely broken. `body.setBounce()` is applied *after* physics resolves each frame, so the first landing always used CONCRETE's 0.0 coefficient. Replaced with a direct `-720 px/s` impulse that fires the instant you land (when `vy > -50`). Orange platforms should now have a very obvious trampoline feel.

**Gem scatter** — the root bug: `updateEnemies()` calls `scatterGems()`, then `updateCollectibles()` runs **immediately after in the same frame**. Every scattered gem spawns at marble position (distance = 0) and gets re-collected before a single pixel of movement. Added a 250ms minimum age — gems physically separate from the marble in that time and can then be chased.

**Speed pads** — `setVelocityX(520)` was snapping, which also *slowed* you if already faster. Now uses directional-max: pad ensures you're going **at least** that fast, never reduces your existing momentum.

**Air control** — bumped to 0.22 (+47% from original 0.12, not the puny +25% from last time).

## Human

I had an idea of something visually very silly, but that MIGHT just add a useful mechanic and add to a bit of the "mayhem" wacky feel that this game could have.

When moving at one speed, when you want to slow down you move in the opposite direction and your momentum reduces.  But what if we added a "brake" mechanic, where you could slow down much faster (maybe 1/3 to 1/2 the stopping distance?) but the visual for this, is a human hand (think "Thing" from Adams family) emerges in front of the ball and presses against the ground (and shoudl be impacted by terrain physics accordingly) to act as the brake, then once momentum has stopped, it disappears back into the ball.  The actual function to enable the brake could just be a modifier key, maybe shift?  Or the "S" of WASD?

This makes no sense whatsoever, is completely silly/bizarre, but might be a fun visual to "explain" a brake mechanic that otherwise has no real grounding in the game universe.  I suppose it could be a foot too, maybe that would make more sense, like slowing down on a bicycle?  Anyway, what do you think?  Or do you have any other ideas about how we could add a brake mechanic that would be visually unique?

## Assistant

I love this idea — the absurdity is exactly the right energy for a game called *Marble Mayhem*. Here's my honest take:

**The hand vs foot:** The hand (Thing) is funnier and more iconic, but the foot wins on visual clarity — players will immediately understand "foot dragging on ground = slowing down" from bikes/scooters. The hand requires a half-second of "wait, what is that?" A foot dragging with a cartoon skid trail needs zero explanation.

**My implementation take:**
- The foot/appendage only appears when: grounded + moving + brake held. Goes away in air.
- It extends from the *bottom-front* of the marble in the direction of travel, pressing down at ground level
- Compression/squish scales with current speed — at full speed it's jammed flat against the ground and vibrating, at near-stop it's gently resting
- A small dust/spark puff at the contact point
- Snaps back into the ball with a little "retract" tween when you stop or release

**Key binding:** Shift over S. With WASD, S mentally reads as "down/crouch" and you'd be pressing it when you actually want to stop — potentially confusing. Shift is a clean modifier and works naturally held alongside A or D if you want to brake mid-turn.

**One alternative visual that's equally unhinged:** a tiny grappling hook fires into the ground ahead of the marble and goes taut — marble yanks to a halt, hook retracts. Mechanically identical, different flavor of absurd.

**My honest opinion:** Do the foot. It's the best ratio of "immediately legible" to "completely unhinged." The hand is funnier in concept but foot communicates the mechanic in one glance, which matters in a fast game.

Want me to implement it? The foot would be a canvas-drawn appendage (toes, ankle, slight leg stub) as a `Graphics` object positioned dynamically relative to the marble, with a compression tween and dust particle at contact. Shift = brake, 3x deceleration force.

## Human

Good points.  In fact thinking about the foot some more... maybe it makes more sense to be dragging behind?  Like slowing yourself down on rollerblades or a skateboard?  You wouldn't put the foot out in front of you - probably break your ankle.  You'd drag behind.  Might read better visually too?

## Assistant

Yes, exactly right — and it also solves a readability problem I hadn't considered: if the foot is *behind*, the direction of drag is immediately obvious from the velocity. Moving right, foot trails left → clearly braking. The front placement would look like you're trying to trip yourself.

It also means the visual gets *more dramatic* the faster you're going — at high speed the foot is stretched way behind the marble, nearly horizontal, sparks flying. As you slow it gradually rises to a more natural angle until it tucks back in. That speed-proportional stretching gives you instant visual feedback on how much momentum you're shedding, which makes it a better game mechanic readout too, not just a visual gag.

The rollerblade/skateboard stop drag is also a *recognizable real thing* so it lands immediately — zero explanation needed. The hand would've required a beat of "wait, is that a hand? why is there a hand?" The foot gets processed in under a frame.

One detail worth deciding before implementation: does the foot drag along the ground surface (so it follows terrain height and tilts with seesaws/slopes), or does it just hang at a fixed offset from the marble center? The terrain-following version is funnier and more physically coherent but adds complexity. The fixed-offset version is simple and probably fine since most of the level is flat ground anyway. I'd lean fixed-offset for now with the option to revisit.

Ready to build it — want me to go ahead?

## Human

Yeah I think it should interact with terrain, and it needs to account for terrain physics so less effective (maybe does nothing?) on ice, more effective on sand where it completely digs in, neutral on grass, concrete, etc.

Hang on - this just gave me another thought.  The jump!  What if instead of a random "energy charge" jump mechanic, what if TWO little legs with fee popped out when you jumped and literally jumped?  I think it would look COMPELTELY unhinged/hilarious!  And be completely unexpected to the first time player.  Although, how would that work for jumping while moving?  Maybe not so good after all.  But I can't shake the goofy image.  Thoughts?

## Assistant

The legs idea is genuinely great and I think your worry about mid-movement is solvable — here's why:

**The legs don't need to be there the whole jump.** The funniest version is: legs *only appear at the launch moment* — they pop out for maybe 3-4 frames, fully extended, then snap back in as the marble goes airborne. Like a cartoon spring-jump. You barely see them but your brain registers it completely. The marble is just a marble in the air, it did its weird leg thing, and now it's a marble again. The brevity actually makes it funnier — it's a blink-and-you-miss-it moment on first play, then once you see it you're watching for it every jump.

**The charge squish already sets it up perfectly.** The marble already compresses vertically during charge — the legs could emerge *from the squish*, like they're being squeezed out from underneath. Marble compresses → two stubby legs poke out from the bottom, also crouching → release → legs SPRING straight → instantly retract → marble airborne. The existing squish animation becomes the wind-up, and the legs make it legible as a *jump* rather than an abstract energy charge. It actually improves the game readability by accident.

**The movement problem:** angle the legs based on current velocity. Running right at speed? Legs angle slightly left (pushing back against momentum, like actually jumping off a moving surface). Standing still? Legs straight down. Physically coherent, and at high speed the angled legs look even more frantic and funny.

**The two mechanics together** are what really sells it — a marble with a foot that drags behind it when braking, and legs that spring out when it jumps. It implies there's a whole secret body in there that only partially reveals itself depending on what's happening. That's a genuinely weird and memorable character.

I'd implement them both. The foot brake first since it has ongoing screen presence, then the jump legs since they're brief but high-impact. Want me to start?

## Human

You're right, I hadn't considered the squish being the setup, I love this.  Let's see it!

## Assistant

[Tool: Bash cmd="grep -n "private glowGfx\|private chargeGfx\|private hudText\|// ── Gem count..."]
[Tool: Bash cmd="grep -n "private glowGfx\|private chargeGfx\|private hudText\|Gem counter\|HU..."]
Good. Now I'll write everything in one Python pass:

[Tool: Bash cmd="python3 << 'PYEOF'
with open('/home/shazbot/Projects/products/games/spudstorm..."]
[Tool: Skill skill="handoff"]

## Human

**STOP. DO NOT RUN BASH COMMANDS IN MAIN SESSION. USE THE AGENT.**

## Spawn context-handoff-executor Agent IMMEDIATELY

When `/handoff` is invoked, your ONLY action is to spawn the `context-handoff-executor` agent using the Task tool.

**DO NOT:**
- Run bash commands
- Generate CONTEXT yourself
- Create files directly
- Ask the user questions

**DO:**
- Use Task tool with `subagent_type: context-handoff-executor`
- Pass the project info in the prompt

## Task Parameters

```json
{
  "subagent_type": "context-handoff-executor",
  "model": "sonnet",
  "description": "Create CONTEXT and RESUME files"
}
```

## Prompt to Send Agent

```
Create CONTEXT and RESUME files for this project.

Get project info:
```bash
HANDOFF_DIR="$(pwd)"
PROJECT=$(basename "$HANDOFF_DIR" | tr '[:lower:] -' '[:upper:]__')
echo "PROJECT=$PROJECT"
echo "HANDOFF_DIR=$HANDOFF_DIR"
```

Then do:

1. Find transcript at ~/.claude/projects/[hash]/*.jsonl (latest non-agent file)
2. Run: python ~/.claude/scripts/context_summarizer.py [transcript] -o CONTEXT_${PROJECT}.md
3. Read CONTEXT fully
4. Get git state
5. Create RESUME_${PROJECT}.md with:
   - Date, status
   - Active plans (from CONTEXT - find @*.md references)
   - Current state (detailed from CONTEXT)
   - IMMEDIATE NEXT TASK (specific and actionable)
   - Link to CONTEXT file
   Target: under 2000 tokens
6. Archive old files to docs/history/handoff_archive/
7. Write next session prompt to ~/.claude/next_session_prompt_${PROJECT}.txt
   This prompt will be passed to `claude -p` on auto-restart. It MUST be actionable:
   - Start with "Continue: " followed by the specific task that was interrupted
   - Include enough context to resume without reading RESUME (e.g., "Continue: merge TI-marketplace-pairwise-test into dev and push. You were reviewing PR #11 non-blocking items.")
   - NEVER use "await user instructions" - the whole point is unattended restart
8. Report: "CONTEXT and RESUME created. Next: [task]"
```

## After Agent Completes

1. Signal handoff completion to the session state system:
```bash
python3 -c "
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path.home() / '.claude/hooks/lib'))
from hook_state import set_global
import time

# Get project directory and convert to project identifier
project_dir = Path.cwd()
project_id = str(project_dir).replace('/', '-').lstrip('-')

# Include pane_id so only THIS session's Stop hook triggers the restart
set_global('handoff_ready', {
    'timestamp': time.time(),
    'project': project_id,
    'pane_id': os.environ.get('TMUX_PANE', '')
})
print(f'✓ handoff_ready set for {project_id} (pane {os.environ.get(\"TMUX_PANE\", \"no-tmux\")})')
"
```

2. Tell user: "Handoff complete. Ctrl+D to exit - session will restart automatically."

## Assistant

[Tool: Task desc="Create CONTEXT and RESUME files" type="context-handoff-executor"]
[Tool: Bash cmd="python3 -c "
import sys, os
from pathlib import Path
sys.path.insert(0, str(P..."]
Handoff complete. Ctrl+D to exit — session will restart automatically.

**What was in progress:** Implementing foot drag brake (Shift key) + jump legs visual. All 16 checks passed, build not yet run — next session picks up with `npm run build`, typecheck, commit, and deploy. Also noted your super-jump discovery (charge + bounce pad) — that's captured for secret areas design.
