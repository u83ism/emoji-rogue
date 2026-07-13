---
name: develop
description: Spec check → implement → test (if logic involved) → update progress docs. Use for a single, focused development task in this repo (e.g. "convert MinHeap to a factory function", "add a test file for util.ts").
---

1. **Prep**: read `docs/design.md` (product brief) and `docs/tasks/game.md` (active task tracker) to
   understand the spec/constraints for the task at hand.
2. **Implement**: form an implementation plan, then write code following `.claude/rules/`.
3. **Test**: if the change involves logic (not pure config/docs), write or update the corresponding
   `foo.test.ts` and run `npm test`. Skip only for changes that touch no logic.
4. **Update progress docs**: update `docs/tasks/game.md` to check off the completed item(s) and note any
   new follow-up tasks discovered along the way. No broader spec-consistency check is performed here.
