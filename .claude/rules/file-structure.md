# File structure

- `.ts`/`.tsx` files: aim for ≤150 lines; 200 is the enforced limit.
- Folders: aim for ≤10 non-test source files; 15 is the enforced limit.
- Split a file once it holds more than one responsibility, regardless of line count.
- If a file exports 3 or more things, consider whether it should be split.
- One test file per source file, colocated: `foo.ts` → `foo.test.ts` in the same directory (not a separate
  `tests/` tree).

## Enforcement: justification-based lint

`scripts/check-structure.mjs` (wired into `npm run lint`) enforces both limits with Kaachan-style tiers:
**hint** (over the aim — informational only) → **error** (over the limit — blocks) → **justified**
(allowed, with the human-approved reason on record).

- A file over 200 lines is allowed only with a `file-size-exception: <reason>` comment in its first lines.
- A folder over 15 files is allowed only with a reasoned entry in `scripts/structure-exceptions.json`.
- **AI must never write a justification on its own.** A justification records a human decision; getting one
  means proposing the alternatives (split vs. keep) and letting the human choose. Keeping things as they
  are is a legitimate outcome — folder splits cost import churn and are not automatically better.

## Folder splits are domain modeling — propose, never do unilaterally

When the folder limit trips (or a split otherwise seems warranted), the response is a **proposal**, not an
action: candidate groupings, a name for each, and the option to keep flat. Folder names are domain
vocabulary and only a human can ratify them.

Label every proposed name with its provenance:

- **既存語彙 (established)** — traceable to something the human actually said or previously ratified.
  Appearing in AI-written docs or code identifiers does NOT count: AI coinages laundered through the
  tracker look established but aren't (the "tick" incident, 2026-07-18 — the human approved the folder
  only after asking what the word even meant).
- **AI造語 (coinage)** — anything else. Needs explicit approval, and expect it to be questioned.

## The reverse direction: re-cutting or aggregating, not just splitting

Checks 1-2 only ever detect monotonic growth — a file or folder got too big. They cannot detect the
opposite failure modes: the current split is along the wrong axis, or a group of small files/folders
should be aggregated back because the earlier split turned out to be a modeling mistake. Neither is
detectable by a line/file-count threshold — both need a semantic read (co-change patterns in git history,
duplicated responsibility across siblings) that only a human-led review can make.

`scripts/check-structure.mjs`'s third check is a **hint-only, never-blocking** nudge toward that review:
it diffs `src/` against the commit recorded in `scripts/structure-audit-state.json` and hints once enough
has changed (`DRIFT_HINT_FILES` / `DRIFT_HINT_LINES`). It intentionally cannot escalate to error — unlike
size/granularity, "this needs a fresh look" is not something a human should ever be blocked from
overriding, or it would just get an exception written against it out of annoyance.

Run the actual review via the `structure-audit` skill when the hint fires (or on request). Re-cuts and
aggregations follow the same rule as folder splits above: **AI proposes, human ratifies** — this is not a
step that sediments into the lint.
