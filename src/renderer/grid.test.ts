import { describe, expect, it } from "vitest";
import type { Cell } from "./cell.js";
import type { TileGlyphs } from "./grid.js";
import { gridFrom } from "./grid.js";

const FLOOR: Cell = { glyph: "·" };
const WALL: Cell = { glyph: "🧱" };
const DOOR: Cell = { glyph: "🚪" };
const UNKNOWN: Cell = { glyph: "?" };

const glyphs: TileGlyphs = { 0: FLOOR, 1: WALL, 2: DOOR };

describe("gridFrom", () => {
	it("converts a column-major map into a row-major grid of cells", () => {
		// map[x][y]: a 2-wide, 3-tall map
		const map = [
			[1, 0, 1],
			[0, 2, 0],
		];

		const grid = gridFrom(map, glyphs, UNKNOWN);

		expect(grid).toEqual([
			[WALL, FLOOR],
			[FLOOR, DOOR],
			[WALL, FLOOR],
		]);
	});

	it("falls back for unrecognized tile values", () => {
		const map = [[99]];
		const grid = gridFrom(map, glyphs, UNKNOWN);
		expect(grid).toEqual([[UNKNOWN]]);
	});

	it("returns an empty grid for an empty map", () => {
		expect(gridFrom([], glyphs, UNKNOWN)).toEqual([]);
	});

	it("is pure: the same inputs produce equal (but independent) grids", () => {
		const map = [[0, 1]];
		const gridA = gridFrom(map, glyphs, UNKNOWN);
		const gridB = gridFrom(map, glyphs, UNKNOWN);
		expect(gridA).toEqual(gridB);
	});
});
