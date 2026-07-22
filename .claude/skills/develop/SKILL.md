---
name: develop
description: Spec check → implement → test (if logic involved) → update progress docs. Use for a single, focused development task in this repo (e.g. "convert MinHeap to a factory function", "add a test file for util.ts").
---

1. **Prep**: read `docs/design.md` (product brief) and `docs/tasks/game.md` (active task tracker) to
   understand the spec/constraints for the task at hand.
2. **Implement**: form an implementation plan, then write code following `.claude/rules/`.
3. **Test**: if the change involves logic (not pure config/docs), write or update the corresponding
   `foo.test.ts` and run `npm test`. Skip only for changes that touch no logic.
4. **Structure check**: run `npm run lint` (which includes `scripts/check-structure.ts`) and act on
   what it reports per `.claude/rules/file-structure.md`: errors must be resolved within this task — by
   splitting, or by a **human-approved** justification (never self-authorized); a folder-limit error means
   proposing a domain split for the human to ratify. Hints are worth mentioning in the completion report.
   (This step exists because 50 milestones of "append one branch per feature" quietly grew
   `advanceTurn.ts` to 805 lines before anyone checked.)
5. **Update progress docs**: update `docs/tasks/game.md` to check off the completed item(s) and note any
   new follow-up tasks discovered along the way.
6. **Keep documentation truthful**: if the change makes any project documentation wrong — player-facing
   behavior, codebase structure, commands, whatever document describes the thing you just changed — update
   that documentation in the same task. Deliberately phrased abstractly: the point is "docs must not lie
   about the current state", not a fixed file list. (This step exists because the codebase reading guide
   still said "the game layer does not exist yet" 61 milestones after it started existing.)
