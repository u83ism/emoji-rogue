import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import { buildArenaGameState } from "./initialState.js";
import type { Action, Direction } from "./state.js";

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

	it("cannot walk onto an enemy's tile (bump, same reference)", () => {
		const state = buildArenaGameState(5, 5, 1);
		const blocked = { ...state, enemies: [{ x: 3, y: 2 }] };
		expect(advanceTurn(blocked, move("east"))).toBe(blocked);
	});

	it("ignores moves once the run is over", () => {
		const state = buildArenaGameState(5, 5, 1);
		const dead = { ...state, status: "dead" as const };
		expect(advanceTurn(dead, move("east"))).toBe(dead);
	});

	it("expands the explored grid as the player moves", () => {
		/* 30x5 arena: player starts at (15,2); view radius is 8 */
		const state = buildArenaGameState(30, 5, 1);
		expect(state.explored[24]?.[2]).toBe(false); /* distance 9: unseen */

		const moved = advanceTurn(state, move("east")); /* player (16,2) */
		expect(moved.explored[24]?.[2]).toBe(true); /* now in view */
		expect(moved.explored[15]?.[2]).toBe(true); /* old cells stay explored */
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
