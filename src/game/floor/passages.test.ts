import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import {
	buildPassageMap,
	findArea,
	findRoomExits,
	isSameArea,
} from "./passages.js";

/**
 * Two rooms joined by a corridor: room A's floor x 1..5, room B's 14..18
 * (rows 1..3), doors at (6,2) and (13,2), the corridor 7..12 on row 2.
 */
const buildTwoRoomState = (): GameState => {
	const base = buildArenaGameState(20, 5, 1);
	const open = (x: number, y: number): boolean =>
		(y >= 1 && y <= 3 && ((x >= 1 && x <= 5) || (x >= 14 && x <= 18))) ||
		(y === 2 && x >= 6 && x <= 13);
	return {
		...base,
		terrain: base.terrain.map((column, x) =>
			column.map((_, y) => (open(x, y) ? 0 : 1)),
		),
		rooms: [
			{ x1: 1, y1: 1, x2: 5, y2: 3, dark: false },
			{ x1: 14, y1: 1, x2: 18, y2: 3, dark: false },
		],
	};
};

describe("buildPassageMap", () => {
	it("numbers the corridor and finds the doors at its ends", () => {
		const state = buildTwoRoomState();
		const passages = buildPassageMap(state);
		const id = passages.passageAt.get("9,2");
		expect(id).toBeDefined();
		expect(
			passages.passageAt.get("6,2"),
		).toBeUndefined(); /* a door belongs to its room */
		expect(passages.exits.get(id ?? -1)).toEqual([
			{ x: 6, y: 2 },
			{ x: 13, y: 2 },
		]);
	});

	it("tells rooms and the corridor apart", () => {
		const state = buildTwoRoomState();
		const passages = buildPassageMap(state);
		const roomA = findArea(state, passages, { x: 2, y: 2 });
		expect(isSameArea(roomA, findArea(state, passages, { x: 6, y: 2 }))).toBe(
			true,
		);
		expect(isSameArea(roomA, findArea(state, passages, { x: 9, y: 2 }))).toBe(
			false,
		);
		expect(
			findRoomExits(
				state,
				state.rooms[0] ?? { x1: 0, y1: 0, x2: 0, y2: 0, dark: false },
			),
		).toEqual([{ x: 6, y: 2 }]);
	});
});
