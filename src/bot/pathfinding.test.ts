import { describe, expect, it } from "vitest";
import { findNearestReachableTarget } from "./pathfinding.js";

/** Builds a column-major terrain grid from rows of '#' (wall) / '.' (floor), one string per row (y), left to right (x). */
const buildTerrain = (rows: readonly string[]): number[][] => {
	const height = rows.length;
	const width = rows[0]?.length ?? 0;
	const terrain: number[][] = [];
	for (let x = 0; x < width; x++) {
		const column: number[] = [];
		for (let y = 0; y < height; y++) {
			column.push(rows[y]?.[x] === "#" ? 1 : 0);
		}
		terrain.push(column);
	}
	return terrain;
};

describe("findNearestReachableTarget", () => {
	it("finds the nearest matching tile and the first step toward it", () => {
		const terrain = buildTerrain([".....", ".....", ".....", ".....", "....."]);
		const result = findNearestReachableTarget(
			terrain,
			{ x: 2, y: 2 },
			(x, y) => x === 2 && y === 0,
		);
		expect(result).toEqual({ x: 2, y: 0, nextStep: { x: 2, y: 1 } });
	});

	it("picks whichever matching tile is nearest, not just the first found", () => {
		const terrain = buildTerrain(["......."]);
		const result = findNearestReachableTarget(
			terrain,
			{ x: 3, y: 0 },
			(x) => x === 0 || x === 4,
		);
		expect(result).toEqual({ x: 4, y: 0, nextStep: { x: 4, y: 0 } });
	});

	it("returns undefined when no matching tile is reachable", () => {
		const terrain = buildTerrain([".....", ".....", "....."]);
		const result = findNearestReachableTarget(
			terrain,
			{ x: 0, y: 0 },
			() => false,
		);
		expect(result).toBeUndefined();
	});

	it("never routes through walls", () => {
		const terrain = buildTerrain(["...", "#.#", "..."]);
		/* the only floor tile at y=1 is x=1, so (0,2) is reachable from (0,0)
		 * only via x=1 — walking straight down (x=0) is blocked */
		const result = findNearestReachableTarget(
			terrain,
			{ x: 0, y: 0 },
			(x, y) => x === 0 && y === 2,
		);
		expect(result?.nextStep).toEqual({ x: 1, y: 0 });
	});

	it("treats a walled-off pocket as unreachable", () => {
		const terrain = buildTerrain(["###", "#.#", "###"]);
		const result = findNearestReachableTarget(
			terrain,
			{ x: 1, y: 1 },
			(x, y) => x === 0 && y === 0,
		);
		expect(result).toBeUndefined();
	});

	it("does not treat the start tile itself as a match", () => {
		const terrain = buildTerrain([".."]);
		const result = findNearestReachableTarget(
			terrain,
			{ x: 0, y: 0 },
			(x, y) => x === 0 && y === 0,
		);
		expect(result).toBeUndefined();
	});
});
