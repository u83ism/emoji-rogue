---
name: develop-loop
description: Autonomous version of develop — pick the next task from docs/tasks/game.md, implement, test, update docs, commit and push, repeat until no tasks remain. Use when asked to work through the task tracker unattended (e.g. "run develop-loop", "work through milestone 1 on your own").
---

**Basic policy**: proceed autonomously without waiting for user confirmation at each step. Commit and push
after every completed task. The loop ends only when no tasks remain in `docs/tasks/game.md`, or a fatal
error blocks further progress.

## Loop (repeat until no tasks remain)

1. **Task selection**: read `docs/tasks/game.md` for the next unchecked item, considering milestone order
   and dependencies (don't jump ahead into the backlog while a milestone has unchecked items).
   If nothing remains, end the loop and report.
2. **Spec check**: read related context from `docs/design.md` and the design-policy section at the top of
   `docs/tasks/game.md`. Summarize the implementation approach internally; proceed even under some
   ambiguity, using judgment consistent with `.claude/rules/`.
3. **Implementation**: follow `.claude/rules/`. Large items may be split into multiple commits, each of
   which must still build.
4. **Testing**: if the item involves logic, write/update tests and run `npm test`; on failure, fix and
   retest before proceeding.
5. **Doc update**: check off the completed item in `docs/tasks/game.md`; add any newly discovered
   follow-up tasks.
6. **Commit & push**: follow `.claude/rules/commits.md`. `git add` / `git commit` / `git push`. Return to
   step 1.

## Completion report

When the loop ends, report: completed tasks, created/changed files, and commit hashes (or count).
