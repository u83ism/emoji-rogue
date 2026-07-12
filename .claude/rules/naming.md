# Naming

- No abbreviations, except loop counters `i`/`j`/`k`.
- No 1-2 character variable names (loop counters excepted).
- Common forbidden abbreviations and their replacements:
  - `res` → `response`
  - `dir` → `directory`
  - `idx` → `index`
  - `fn` → `function` (or a more specific name for what the function does)
  - `cb` → `callback`
  - `cfg` → `config`
  - `ctx` → `context`
  - `tmp` → `tempXxx` (name what it's temporarily holding)
- Comparator/pair arguments get concrete names, not generic `a`/`b`: e.g. `(roomA, roomB)`, not `(a, b)`.
