---
name: develop
description: Spec check → implement → test (if logic involved) → update progress docs. Use for a single, focused development task in this repo (e.g. "convert MinHeap to a factory function", "add a test file for util.ts").
---

1. **Prep**: read `docs/design.md` (product brief) and `docs/tasks/game.md` (active task tracker) to
   understand the spec/constraints for the task at hand.
2. **Implement**: form an implementation plan, then write code following `.claude/rules/`.
3. **Test**: if the change involves logic (not pure config/docs), write or update the corresponding
   `foo.test.ts` and run `npm test`. Skip only for changes that touch no logic.
4. **File-size check**: check every source file this task touched against `.claude/rules/file-structure.md`
   (aim ≤150 lines, split past 200). If a touched file is over the limit, either split it within this task
   or add an explicit split task to `docs/tasks/game.md` — never leave the overflow unrecorded. (This step
   exists because 50 milestones of "append one branch per feature" quietly grew `advanceTurn.ts` to 805
   lines before anyone checked.)
5. **Update progress docs**: update `docs/tasks/game.md` to check off the completed item(s) and note any
   new follow-up tasks discovered along the way. No broader spec-consistency check is performed here.
