import type { Cell } from "./cell.js";

/**
 * A run of consecutive cells sharing the same colors, collapsed into a
 * single string. Keeps the number of Ink elements per row small — one per
 * color run, not one per cell — rather than a `<Box>` per cell.
 */
export interface CellRun {
	readonly text: string;
	readonly fg?: string | undefined;
	readonly bg?: string | undefined;
}

function sameStyle(run: CellRun, cell: Cell): boolean {
	return run.fg === cell.fg && run.bg === cell.bg;
}

/**
 * Run-length-encodes a row of cells by color. Pure: same input, same output.
 */
export function groupIntoRuns(cells: readonly Cell[]): CellRun[] {
	const runs: CellRun[] = [];

	for (const cell of cells) {
		const last = runs[runs.length - 1];
		if (last !== undefined && sameStyle(last, cell)) {
			runs[runs.length - 1] = { ...last, text: last.text + cell.glyph };
		} else {
			runs.push({ text: cell.glyph, fg: cell.fg, bg: cell.bg });
		}
	}

	return runs;
}
