import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";

describe("buildArenaGameState", () => {
	const state = buildArenaGameState(5, 4, 12345);

	it("builds a perimeter-walled arena", () => {
		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 4; y++) {
				const isBoundary = x === 0 || y === 0 || x === 4 || y === 3;
				expect(state.terrain[x]?.[y]).toBe(isBoundary ? 1 : 0);
			}
		}
	});

	it("places the player at the center, on a floor tile", () => {
		expect(state.player).toEqual({ x: 2, y: 2 });
		expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
	});

	it("starts in playing status with the seeded rng state", () => {
		expect(state.status).toBe("playing");
		expect(buildArenaGameState(5, 4, 12345)).toEqual(state);
		expect(buildArenaGameState(5, 4, 99).rng).not.toEqual(state.rng);
	});

	it("round-trips through JSON (serializable by construction)", () => {
		expect(JSON.parse(JSON.stringify(state))).toEqual(state);
	});
});

describe("buildDungeonGameState", () => {
	const state = buildDungeonGameState(40, 20, 12345);

	it("is deterministic for the same dimensions and seed", () => {
		expect(buildDungeonGameState(40, 20, 12345)).toEqual(state);
		expect(buildDungeonGameState(40, 20, 99)).not.toEqual(state);
	});

	it("fills the whole grid with floor/wall values only", () => {
		expect(state.terrain.length).toBe(40);
		for (const column of state.terrain) {
			expect(column.length).toBe(20);
			for (const value of column) {
				expect([0, 1]).toContain(value);
			}
		}
	});

	it("places the player on a floor tile", () => {
		expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
	});

	it("stores the post-generation rng state, not the seed's initial state", () => {
		expect(state.rng).not.toEqual(seedToState(12345));
	});

	it("seeds the explored grid from the starting field of view", () => {
		expect(state.explored[state.player.x]?.[state.player.y]).toBe(true);
		/* a 40x20 dungeon cannot be fully seen from one spot (radius 8) */
		expect(state.explored.flat()).toContain(false);
	});

	it("spawns three enemies on floor tiles outside the starting view", () => {
		expect(state.enemies.length).toBe(3);
		for (const enemy of state.enemies) {
			expect(state.terrain[enemy.x]?.[enemy.y]).toBe(0);
			expect(enemy).not.toEqual(state.player);
			/* out of sight at turn one = not in the seeded explored grid */
			expect(state.explored[enemy.x]?.[enemy.y]).toBe(false);
		}
	});
});
