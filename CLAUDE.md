# emoji-rogue

A CLI roguelike rendered in emoji, built on a modernized fork of rot.js's map generation / FOV / pathfinding / turn scheduling algorithms.

- Concept: a modernization of original Rogue 5.4 — visuals and code are modernized, **game rules and balance deliberately stay exactly as in 5.4**. Any deviation from 5.4 is to be fixed toward 5.4 by default, not raised as an open question (see `docs/design.md`'s コンセプト方針 for the only exceptions).

- Read `docs/architecture.md` (codebase reading guide) first, then `docs/design.md` (product brief) and `docs/tasks/game.md` (active task tracker), before investigating or starting work. `docs/tasks/modernization.md` is the completed modernization history — consult it only when digging into why the fork diverged from upstream rot.js.
- Source comments: English. Commit messages: Japanese, Gitmoji-prefixed — see `.claude/rules/commits.md`.
- See `.claude/rules/` for coding conventions (functional style, error handling, naming, file structure, constraints).
