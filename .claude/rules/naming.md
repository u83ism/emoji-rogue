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
- Union member names (item kinds, enemy kinds, event types) must be self-describing without positional
  context: `"teleport-scroll"`, never a category-generic `"scroll"` that actually means one specific scroll.
  The first member of a category never gets to squat on the category's generic name — later members would
  end up asymmetric (`"scroll"` vs `"mapping"` vs `"identify"`) and readers would need tribal knowledge to
  decode them.
