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
