---
name: structure-audit
description: Human-led review of src/'s domain-split axis — re-cutting or aggregating folders/files that the size-based structure lint can't detect. Use when scripts/check-structure.ts's drift hint fires, or when asked to "run a structure audit" / "structure-auditして".
---

# Structure audit

Complements `.claude/rules/file-structure.md`'s size lint, which only catches monotonic growth (a file or
folder got too big). This reviews the opposite failure modes: a split along the wrong axis, or
over-fragmentation that should be aggregated back into fewer files/folders. Always run on request —
never auto-triggered, since judging an existing structure as newly wrong is inherently a human call.

1. **Establish the drift window**: read `lastAuditCommit` from `scripts/structure-audit-state.json`.
2. **Surface co-change candidates**: `git log --name-only <lastAuditCommit>..HEAD -- src` — look for
   files/folders that keep changing together across unrelated commits. Repeated co-change across files
   that live in different folders is a shotgun-surgery smell: the current split may not track the real
   boundary. At this project's history size, reading the log directly is enough — don't write a dedicated
   correlation script for this.
3. **Surface duplication candidates**: for folders/files flagged above (or any that look suspiciously
   small and numerous), read them and judge whether they've converged on sharing one responsibility that
   the split obscures, rather than genuinely separate ones.
4. **Propose, don't act**: present findings the same way folder splits are proposed elsewhere in
   `.claude/rules/file-structure.md` — candidate re-groupings or merges, each named with its 既存語彙
   (established) / AI造語 (coinage) provenance, plus "keep as-is" as a legitimate option. Wait for the
   human to ratify before touching any file.
5. **Apply only what's ratified**: rename/merge/move, update imports, then confirm with `npm run lint`,
   `npm run typecheck`, `npm test` — run them from a cwd with an upper-case drive letter (see the
   lower-case-drive Vitest note under `docs/architecture.md`'s test commands; 2026-11-21, this step
   hit it because it didn't point there).
6. **Close the audit**: commit the ratified changes first, then update `scripts/structure-audit-state.json`
   to that commit's hash and today's date, as a separate commit (recording HEAD before committing would
   leave the checkpoint one step behind the refactor it just audited — what happened on 2026-11-12) — even if the conclusion was "no change needed". An audit that finds nothing wrong still
   resets the drift clock; leaving the old checkpoint in place would make the lint's drift hint re-fire
   immediately on the next run.
