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

	it("fills the whole grid with floor/wall/door values only", () => {
		expect(state.terrain.length).toBe(40);
		for (const column of state.terrain) {
			expect(column.length).toBe(20);
			for (const value of column) {
				expect([0, 1, 2]).toContain(value);
			}
		}
	});

	it("places the player on a floor tile", () => {
		expect(state.terrain[state.player.x]?.[state.player.y]).toBe(0);
	});

	// Regression: the generator reports doors only on Room records, never as
	// map values, so the first cut of this builder produced door-less terrain.
	it("stamps room doors into the terrain", () => {
		const doorCount = state.terrain
			.flat()
			.filter((value) => value === 2).length;
		expect(doorCount).toBeGreaterThan(0);
	});

	it("stores the post-generation rng state, not the seed's initial state", () => {
		expect(state.rng).not.toEqual(seedToState(12345));
	});
});
