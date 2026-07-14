import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { seedToState } from "../rng.js";
import { buildArenaGameState } from "./initialState.js";
import type { GameState } from "./state.js";
import { computeVisiblePoints, deriveExploredState } from "./vision.js";

/**
 * A 7x3 corridor (column-major): one walkable row at y=1, cut in half by a
 * blocking wall at x=3.
 */
const CORRIDOR_TERRAIN: readonly (readonly number[])[] = [
	[1, 1, 1],
	[1, 0, 1],
	[1, 0, 1],
	[1, 1, 1],
	[1, 0, 1],
	[1, 0, 1],
	[1, 1, 1],
];

const buildUnexplored = (width: number, height: number): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push(new Array<boolean>(height).fill(false));
	}
	return columns;
};

describe("computeVisiblePoints", () => {
	it("sees a whole small arena, including its walls", () => {
		const state = buildArenaGameState(9, 7, 1);
		const visible = computeVisiblePoints(state.terrain, state.player);
		for (let x = 0; x < 9; x++) {
			for (let y = 0; y < 7; y++) {
				expect(visible.has(encodePointKey(x, y))).toBe(true);
			}
		}
	});

	it("walls block sight", () => {
		const visible = computeVisiblePoints(CORRIDOR_TERRAIN, { x: 1, y: 1 });
		expect(visible.has(encodePointKey(2, 1))).toBe(true);
		/* the blocking wall itself is visible... */
		expect(visible.has(encodePointKey(3, 1))).toBe(true);
		/* ...but nothing behind it is */
		expect(visible.has(encodePointKey(4, 1))).toBe(false);
		expect(visible.has(encodePointKey(5, 1))).toBe(false);
	});
});

describe("deriveExploredState", () => {
	it("adds visible cells, keeps old ones, and leaves hidden cells dark", () => {
		const explored = buildUnexplored(7, 3);
		const beyondWallColumn = explored[5];
		if (beyondWallColumn === undefined) {
			throw new Error("unreachable: column 5 exists in a 7-wide grid");
		}
		beyondWallColumn[1] = true; /* pretend this was seen earlier */

		const state: GameState = {
			width: 7,
			height: 3,
			terrain: CORRIDOR_TERRAIN,
			explored,
			player: { x: 1, y: 1 },
			playerHp: 10,
			enemies: [],
			items: [],
			floor: 1,
			stairs: { x: 2, y: 1 },
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = deriveExploredState(state);

		expect(next.explored[2]?.[1]).toBe(true); /* newly visible */
		expect(next.explored[5]?.[1]).toBe(true); /* remembered */
		expect(next.explored[4]?.[1]).toBe(false); /* never seen */
		expect(state.explored[2]?.[1]).toBe(false); /* input not mutated */
	});
});
