import type { Cell } from "./cell.js";

/**
 * Maps a raw map value (as produced by `map/`'s generators, e.g. 0 = empty,
 * 1 = wall, 2 = door) to the `Cell` that should be drawn for it.
 */
export type TileGlyphs = Readonly<Record<number, Cell>>;

/**
 * Turns a raw generated map (the column-major `map[x][y]` shape every
 * `map/` generator's `CreateCallback` fills in) into a row-major grid of
 * logical cells, ready for the renderer. Pure: the same map and glyph table
 * always produce the same grid.
 *
 * There is no broader "game state" type yet (no entities, no player, no
 * turns) — this repo is still just the modernized rot.js algorithmic core.
 * `gridFrom` is grounded in what actually exists today: a generated dungeon
 * map. Extend this once a real game state model exists.
 */
export function gridFrom(
	map: readonly (readonly number[])[],
	glyphs: TileGlyphs,
	fallback: Cell,
): Cell[][] {
	const width = map.length;
	const height = width > 0 ? (map[0]?.length ?? 0) : 0;

	const grid: Cell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			const value = map[x]?.[y];
			row.push(value !== undefined ? (glyphs[value] ?? fallback) : fallback);
		}
		grid.push(row);
	}
	return grid;
}
