import { describe, expect, it } from "vitest";
import { seedToState } from "../../../rng.js";
import { buildArenaGameState } from "../../initialState.js";
import type { GameState, Position } from "../../state.js";
import { stepChase } from "./enemyMovement.js";

/**
 * Two rooms joined by a corridor: room A's floor x 1..5, room B's 14..18
 * (rows 1..3), doors at (6,2) and (13,2), the corridor 7..12 on row 2.
 */
const buildTwoRoomState = (player: Position): GameState => {
	const base = buildArenaGameState(20, 5, 1);
	const open = (x: number, y: number): boolean =>
		(y >= 1 && y <= 3 && ((x >= 1 && x <= 5) || (x >= 14 && x <= 18))) ||
		(y === 2 && x >= 6 && x <= 13);
	return {
		...base,
		player,
		terrain: base.terrain.map((column, x) =>
			column.map((_, y) => (open(x, y) ? 0 : 1)),
		),
		rooms: [
			{ x1: 1, y1: 1, x2: 5, y2: 3, dark: false },
			{ x1: 14, y1: 1, x2: 18, y2: 3, dark: false },
		],
	};
};

const step = (state: GameState, from: Position): Position =>
	stepChase(state, from, new Set(), seedToState(1)).position;

describe("stepChase", () => {
	it("heads for its room's doorway when the player is in another room", () => {
		const state = buildTwoRoomState({ x: 16, y: 2 });
		/* toward the door (6,2), not straight at the player */
		expect(step(state, { x: 2, y: 1 })).toEqual({ x: 3, y: 2 });
	});

	it("from the doorway, follows the corridor toward the player's room", () => {
		const state = buildTwoRoomState({ x: 16, y: 2 });
		expect(step(state, { x: 6, y: 2 })).toEqual({ x: 7, y: 2 });
		const inCorridor = buildTwoRoomState({ x: 10, y: 2 });
		expect(step(inCorridor, { x: 6, y: 2 })).toEqual({ x: 7, y: 2 });
	});

	it("goes straight for the player in the same room, never onto them or another monster", () => {
		const state = buildTwoRoomState({ x: 5, y: 2 });
		expect(step(state, { x: 2, y: 2 })).toEqual({ x: 3, y: 2 });
		const blocked = stepChase(
			state,
			{ x: 2, y: 2 },
			new Set(["3,2", "3,1", "3,3"]),
			seedToState(1),
		).position;
		expect(blocked).not.toEqual({ x: 3, y: 2 });
		/* next to the player: nowhere closer — it may sidestep to a tile just as near (a tie), never onto the player */
		const beside = step(state, { x: 4, y: 2 });
		expect(beside).not.toEqual({ x: 5, y: 2 });
		expect((beside.x - 5) ** 2 + (beside.y - 2) ** 2).toBeLessThanOrEqual(1);
	});
});
