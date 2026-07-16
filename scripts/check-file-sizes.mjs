// Enforces .claude/rules/file-structure.md's size limit (aim ≤150 lines,
// split past 200) as a hard gate over the game layer and its shell files.
//
// Scope (deliberate):
// - src/game/** and the shell-facing files listed below are checked.
// - The modernized rot.js fork layer (src/map/, src/fov/, src/color.ts, ...)
//   is NOT checked: it is ported algorithm code with its own history
//   (docs/tasks/modernization.md), and splitting it would be churn for its
//   own sake.
// - *.test.ts files are NOT checked: the one-test-file-per-source rule pins
//   their granularity to the source's, so test size shrinks by splitting the
//   source, never the test alone.
//
// A file may exceed the limit only by being listed in EXCEPTIONS with a
// reason — silence is never an option.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const LINE_LIMIT = 200;

const SHELL_FILES = [
	"src/main.tsx",
	"src/messages.ts",
	"src/gameNames.ts",
	"src/systemMessages.ts",
	"src/saveFile.ts",
	"src/replayFile.ts",
	"src/cliArgs.ts",
];

/** Known offenders allowed over the limit, each with the reason on record. */
const EXCEPTIONS = new Map([
	[
		"src/game/balance.ts",
		"single-responsibility tuning-knob catalog; one entry per kind, splitting would scatter the knobs",
	],
	[
		"src/game/events.ts",
		"one discriminated union (GameEvent) plus the kind catalogs; a union reads best in one place",
	],
	[
		"src/game/validateGameState.ts",
		"hand-rolled save validation (no-dependency rule); table-driven compression is tracked in the backlog",
	],
]);

const collectSourceFiles = (directory) => {
	const files = [];
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			files.push(...collectSourceFiles(path));
			continue;
		}
		if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
			continue;
		}
		if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) {
			continue;
		}
		files.push(path);
	}
	return files;
};

const targets = [...collectSourceFiles("src/game"), ...SHELL_FILES];
const failures = [];
for (const path of targets) {
	const normalized = path.replaceAll("\\", "/");
	const lineCount = readFileSync(path, "utf8").split("\n").length;
	if (lineCount <= LINE_LIMIT) {
		continue;
	}
	if (EXCEPTIONS.has(normalized)) {
		continue;
	}
	failures.push({ path: normalized, lineCount });
}

if (failures.length > 0) {
	console.error(
		`check-file-sizes: ${failures.length} file(s) exceed ${LINE_LIMIT} lines (see .claude/rules/file-structure.md):`,
	);
	for (const failure of failures) {
		console.error(`  ${failure.path}: ${failure.lineCount} lines`);
	}
	console.error(
		"Split the file, or add it to EXCEPTIONS in scripts/check-file-sizes.mjs with a reason.",
	);
	process.exit(1);
}
console.log(
	`check-file-sizes: ${targets.length} files within ${LINE_LIMIT} lines (exceptions: ${EXCEPTIONS.size})`,
);
