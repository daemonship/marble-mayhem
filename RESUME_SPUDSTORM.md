# Spud Storm - Resume

**Date:** 2026-02-24
**Status:** Input fixed, 3 PR issues remain

## Done
Fixed canvas/input bug (commit 0603563). Mouse should now control player. Game playable but has 3 remaining bugs from PR review.

## Next
1. Test mouse at https://spudstorm.pages.dev
2. Fix race condition: move attract mode flag resets into setTimeout
3. Fix tween lifecycle: add scene shutdown guard
4. Fix modal parent: use #game-container

See CONTEXT_SPUDSTORM.md for details.
