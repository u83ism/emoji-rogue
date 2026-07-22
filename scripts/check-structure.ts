// Structure lint for .claude/rules/file-structure.md, redesigned around
// justification (2026-07-18): a violation is allowed if — and only if — a
// human-approved justification is recorded at the violation site. Kaachan-style
// three-tier feedback: hint (informational) → error (blocks) → justified
// (allowed, reason on record). AI must never write a justification on its own;
// see the rule file for the proposal/approval flow.
//
// Checks:
// 1. File size — game/shell layer source files. hint > HINT_LINES,
//    error > MAX_LINES. Justify inline: put a comment containing
//    `file-size-exception: <reason>` in the file's first few lines.
// 2. Folder granularity — every folder under src/. hint > HINT_FILES,
//    error > MAX_FILES non-test source files. Justify declaratively in
//    scripts/structure-exceptions.json ({"folders": {"src/game": "<reason>"}}).
// 3. Structural drift since last audit — hint-only, never blocks. Checks 1-2
//    only ever detect monotonic growth (a file/folder got too big). They
//    can't detect the reverse: a split along the wrong axis, or small files
//    that should be aggregated back. That judgment call needs a human-led
//    audit (.claude/skills/structure-audit), not a lint rule — this check
//    only nudges "it might be time for one" once enough of src/ has churned
//    since scripts/structure-audit-state.json's recorded checkpoint.
//
// Scope notes (deliberate):
// - The modernized rot.js fork layer (src/map/, src/fov/, src/color.ts, ...)
//   is size-exempt: ported algorithm code with its own history
//   (docs/tasks/modernization.md). Its folders ARE counted — folder bloat is
//   a project-wide concern.
// - *.test.ts files are exempt from both checks: the one-test-file-per-source
//   rule pins their granularity to the source's.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HINT_LINES = 150;
const MAX_LINES = 200;
const HINT_FILES = 10;
const MAX_FILES = 15;
const DRIFT_HINT_FILES = 60;
const DRIFT_HINT_LINES = 3000;
const PRAGMA = "file-size-exception:";
const PRAGMA_SEARCH_LINES = 5;

interface FolderExceptions {
	readonly folders?: Record<string, string>;
}

interface AuditState {
	readonly lastAuditCommit: string;
	readonly lastAuditDate: string;
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const exceptionsPath = join(scriptDirectory, "structure-exceptions.json");
const folderExceptions = new Map(
	Object.entries(
		existsSync(exceptionsPath)
			? ((JSON.parse(readFileSync(exceptionsPath, "utf8")) as FolderExceptions)
					.folders ?? {})
			: {},
	),
);

const isSourceFile = (name: string): boolean =>
	(name.endsWith(".ts") || name.endsWith(".tsx")) &&
	!name.endsWith(".test.ts") &&
	!name.endsWith(".test.tsx");

/** Every folder under (and including) `root`, depth-first. */
const collectFolders = (root: string): string[] => {
	const folders = [root];
	for (const entry of readdirSync(root)) {
		const path = join(root, entry);
		if (statSync(path).isDirectory()) {
			folders.push(...collectFolders(path));
		}
	}
	return folders;
};

const hints: string[] = [];
const errors: string[] = [];

/* --- Check 1: file sizes (game + shell layers only) --- */
const sizeCheckedFolders = [
	...collectFolders("src/game"),
	...collectFolders("src/shell"),
];
const sizeCheckedFiles = sizeCheckedFolders
	.flatMap((folder) =>
		readdirSync(folder)
			.filter(isSourceFile)
			.map((name) => join(folder, name)),
	)
	.concat(["src/main.tsx"]);

for (const path of sizeCheckedFiles) {
	const normalized = path.replaceAll("\\", "/");
	const lines = readFileSync(path, "utf8").split("\n");
	if (lines.length <= HINT_LINES) {
		continue;
	}
	const justification = lines
		.slice(0, PRAGMA_SEARCH_LINES)
		.find((line) => line.includes(PRAGMA));
	if (justification !== undefined) {
		continue; /* justified — reason recorded at the violation site */
	}
	if (lines.length > MAX_LINES) {
		errors.push(
			`${normalized}: ${lines.length} lines (limit ${MAX_LINES}) — split it, or record a human-approved reason in the first ${PRAGMA_SEARCH_LINES} lines: /* ${PRAGMA} <reason> */`,
		);
	} else {
		hints.push(`${normalized}: ${lines.length} lines (aim ≤${HINT_LINES})`);
	}
}

/* --- Check 2: folder granularity (all of src/) --- */
for (const folder of collectFolders("src")) {
	const normalized = folder.replaceAll("\\", "/");
	const count = readdirSync(folder).filter(isSourceFile).length;
	if (count <= HINT_FILES) {
		continue;
	}
	if (folderExceptions.has(normalized)) {
		continue; /* justified in structure-exceptions.json */
	}
	if (count > MAX_FILES) {
		errors.push(
			`${normalized}/: ${count} source files (limit ${MAX_FILES}) — propose a domain split (see .claude/rules/file-structure.md), or record a human-approved reason in scripts/structure-exceptions.json`,
		);
	} else {
		hints.push(`${normalized}/: ${count} source files (aim ≤${HINT_FILES})`);
	}
}

/* --- Check 3: structural drift since last audit (hint-only) --- */
const auditStatePath = join(scriptDirectory, "structure-audit-state.json");
if (existsSync(auditStatePath)) {
	const auditState = JSON.parse(
		readFileSync(auditStatePath, "utf8"),
	) as AuditState;
	try {
		const diffStat = execSync(
			`git diff --stat ${auditState.lastAuditCommit}..HEAD -- src`,
			{ encoding: "utf8" },
		);
		const summary = diffStat.trim().split("\n").at(-1) ?? "";
		const filesChanged = Number(
			summary.match(/(\d+) files? changed/)?.[1] ?? 0,
		);
		const linesChanged =
			Number(summary.match(/(\d+) insertions?\(\+\)/)?.[1] ?? 0) +
			Number(summary.match(/(\d+) deletions?\(-\)/)?.[1] ?? 0);
		if (filesChanged > DRIFT_HINT_FILES || linesChanged > DRIFT_HINT_LINES) {
			hints.push(
				`structure audit: ${filesChanged} files / ${linesChanged} lines changed in src/ since last audit (${auditState.lastAuditDate}, ${auditState.lastAuditCommit.slice(0, 7)}) — consider running the structure-audit skill`,
			);
		}
	} catch {
		/* baseline commit unreachable (e.g. shallow clone) — advisory only, skip silently */
	}
}

for (const hint of hints) {
	console.log(`  hint: ${hint}`);
}
if (errors.length > 0) {
	console.error(`check-structure: ${errors.length} violation(s):`);
	for (const error of errors) {
		console.error(`  ${error}`);
	}
	process.exit(1);
}
console.log(
	`check-structure: OK (${sizeCheckedFiles.length} files sized, folder exceptions: ${folderExceptions.size}, hints: ${hints.length})`,
);
