import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import { advanceTurn } from "./advanceTurn.js";
import { buildArenaGameState } from "./initialState.js";
import type { Action, Direction, GameState } from "./state.js";

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

describe("advanceTurn", () => {
	it("moves the player onto an adjacent floor tile", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(advanceTurn(state, move("north")).player).toEqual({ x: 2, y: 1 });
		expect(advanceTurn(state, move("south")).player).toEqual({ x: 2, y: 3 });
		expect(advanceTurn(state, move("west")).player).toEqual({ x: 1, y: 2 });
		expect(advanceTurn(state, move("east")).player).toEqual({ x: 3, y: 2 });
	});

	it("returns the state unchanged (same reference) on a blocked move", () => {
		const cramped = buildArenaGameState(3, 3, 1);
		for (const direction of ["north", "south", "west", "east"] as const) {
			expect(advanceTurn(cramped, move(direction))).toBe(cramped);
		}
	});

	it("treats doors (terrain value 2) as passable", () => {
		// Column-major 3x3: player at center, a door to the east, walls elsewhere.
		const withDoor: GameState = {
			width: 3,
			height: 3,
			terrain: [
				[1, 1, 1],
				[1, 0, 1],
				[1, 2, 1],
			],
			player: { x: 1, y: 1 },
			rng: seedToState(1),
			status: "playing",
		};
		expect(advanceTurn(withDoor, move("east")).player).toEqual({ x: 2, y: 1 });
		expect(advanceTurn(withDoor, move("west"))).toBe(withDoor);
	});

	it("does not mutate the input state", () => {
		const state = buildArenaGameState(5, 5, 1);
		const snapshot = structuredClone(state);
		advanceTurn(state, move("east"));
		advanceTurn(state, { type: "quit" });
		expect(state).toEqual(snapshot);
	});

	it("quit marks the game as exited without touching the rest", () => {
		const state = buildArenaGameState(5, 5, 1);
		const exited = advanceTurn(state, { type: "quit" });
		expect(exited.status).toBe("exited");
		expect(exited.player).toEqual(state.player);
		expect(exited.terrain).toBe(state.terrain);
	});
});
