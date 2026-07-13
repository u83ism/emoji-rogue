import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "./initialState.js";

describe("buildInitialGameState", () => {
	const state = buildInitialGameState(5, 4, 12345);

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
		expect(buildInitialGameState(5, 4, 12345)).toEqual(state);
		expect(buildInitialGameState(5, 4, 99).rng).not.toEqual(state.rng);
	});

	it("round-trips through JSON (serializable by construction)", () => {
		expect(JSON.parse(JSON.stringify(state))).toEqual(state);
	});
});
