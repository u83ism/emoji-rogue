---
name: verify
description: Project-specific recipe for driving emoji-rogue's real surfaces (CLI TUI, browser demo) during verification. Use alongside the general verify skill.
---

# emoji-rogue verify recipe

## CLI (Ink TUI) — `src/main.tsx`

Ink needs a real TTY (`useInput` throws "Raw mode is not supported" on
piped/non-TTY stdin). `tmux` gives a real PTY without a physical terminal:

```bash
npm run build
tmux -L verify_emoji_rogue new-session -d -s main -x 220 -y 50
tmux -L verify_emoji_rogue send-keys -t main "node dist/main.mjs --seed=42" Enter
sleep 1
tmux -L verify_emoji_rogue capture-pane -t main -p   # full pane text, incl. emoji grid
tmux -L verify_emoji_rogue send-keys -t main "l"     # one key per send-keys call
sleep 0.3
tmux -L verify_emoji_rogue send-keys -t main "q"     # quit and exit
tmux -L verify_emoji_rogue kill-server
```

- `--seed=<n>` makes runs reproducible for comparison (two processes with
  the same seed must render an identical initial dungeon).
- State lands in `~/.emoji-rogue/` — `save.json` (suspend-save, consumed on
  load) and `replay.json` (full action log, overwritten each run, **not**
  consumed on load). Inspect these directly after a session instead of
  re-deriving state from the pane capture.
- `npx unrun scripts/replay-verify.ts` reconstructs the last session's
  `replay.json` via `buildReplayGameState` and prints floor/HP/status — a
  fast way to cross-check a live session against the reducer without
  re-reading the whole pane transcript.
- Clean up `~/.emoji-rogue/` between unrelated verification runs so an old
  save/replay doesn't leak into the next one.

## Browser demo — `demo/`

No build step of its own; serve the repo root after `npm run build` and
drive it with Playwright (Chromium is pre-installed at
`/opt/pw-browsers/chromium-*/chrome-linux/chrome` in this environment —
don't run `playwright install`). `demo/main.js` reads `?seed=` from the URL.
`npm install --no-save playwright-core` if it isn't already a project
dependency; don't add it to package.json.
