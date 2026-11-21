import { describe, expect, it } from "vitest";
import { canStepBetween, isWithinReach } from "./directions.js";
import { buildArenaGameState } from "./initialState.js";

/* a 5x5 arena: floor at 1..3, walls around */
const { terrain } = buildArenaGameState(5, 5, 1);
const withRock = (x: number, y: number) =>
	terrain.map((column, columnX) =>
		column.map((tile, rowY) => (columnX === x && rowY === y ? 1 : tile)),
	);

describe("canStepBetween", () => {
	it("allows straight steps and open diagonals", () => {
		expect(canStepBetween(terrain, { x: 2, y: 2 }, { x: 2, y: 1 })).toBe(true);
		expect(canStepBetween(terrain, { x: 2, y: 2 }, { x: 3, y: 3 })).toBe(true);
	});

	it("forbids cutting a corner, as original Rogue's diag_ok()", () => {
		/* rock at (3,2), beside the step from (2,2) to (3,3) */
		expect(canStepBetween(withRock(3, 2), { x: 2, y: 2 }, { x: 3, y: 3 })).toBe(
			false,
		);
		/* out of a corner of the room: the walls beside block it */
		expect(canStepBetween(terrain, { x: 1, y: 1 }, { x: 0, y: 0 })).toBe(false);
	});
});

describe("isWithinReach", () => {
	it("is the eight neighbors, less those across a corner", () => {
		expect(isWithinReach(terrain, { x: 2, y: 2 }, { x: 3, y: 3 })).toBe(true);
		expect(isWithinReach(terrain, { x: 2, y: 2 }, { x: 2, y: 2 })).toBe(false);
		expect(isWithinReach(terrain, { x: 1, y: 1 }, { x: 3, y: 3 })).toBe(false);
		expect(isWithinReach(withRock(3, 2), { x: 2, y: 2 }, { x: 3, y: 3 })).toBe(
			false,
		);
	});
});
