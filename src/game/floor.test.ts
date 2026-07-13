import { describe, expect, it } from "vitest";
import { encodePointKey } from "../pointkey.js";
import { descendStairs } from "./floor.js";
import { buildDungeonGameState } from "./initialState.js";

describe("descendStairs", () => {
	const start = buildDungeonGameState(40, 20, 12345);
	const below = descendStairs({ ...start, playerHp: 5 });

	it("is deterministic: the whole run replays from (dimensions, seed)", () => {
		expect(descendStairs({ ...start, playerHp: 5 })).toEqual(below);
	});

	it("generates a fresh floor: terrain, enemies, stairs, explored", () => {
		expect(below.terrain).not.toEqual(start.terrain);
		expect(below.rng).not.toEqual(start.rng);
		/* the explored grid restarts from the new starting view only */
		expect(below.explored[below.stairs.x]?.[below.stairs.y]).toBe(false);
	});

	it("carries over hp, log and the incremented floor counter", () => {
		expect(below.floor).toBe(start.floor + 1);
		expect(below.playerHp).toBe(5);
		expect(below.events).toEqual([
			{ type: "floor-descended", payload: { floor: 2 } },
		]);
		expect(below.status).toBe("playing");
	});

	it("places everything on floor tiles, stairs apart from actors", () => {
		for (const state of [start, below]) {
			expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
			expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
			expect(encodePointKey(state.stairs.x, state.stairs.y)).not.toBe(
				encodePointKey(state.player.x, state.player.y),
			);
			for (const enemy of state.enemies) {
				expect(state.terrain[enemy.x]?.[enemy.y]).toBe(0);
				expect(encodePointKey(enemy.x, enemy.y)).not.toBe(
					encodePointKey(state.stairs.x, state.stairs.y),
				);
			}
		}
	});

	it("keeps descending: 10 floors without breaking invariants", () => {
		let state = buildDungeonGameState(40, 20, 7);
		for (let i = 0; i < 10; i++) {
			state = descendStairs(state);
			expect(state.floor).toBe(i + 2);
			expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
			expect(state.terrain[state.stairs.x]?.[state.stairs.y]).toBe(0);
		}
	});
});
