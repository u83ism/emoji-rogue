import { describe, expect, it } from "vitest";
import { stepUniform } from "../rng.js";
import { buildArenaGameState } from "./initialState.js";
import { applySearch } from "./search.js";
import type { GameState } from "./state.js";

/* a 9x5 arena, the player at (4,2), a secret door in the top wall at (4,0) */
const withSecretDoor = (): GameState => {
	const arena = buildArenaGameState(9, 5, 1);
	return {
		...arena,
		hiddenTiles: [{ x: 4, y: 0, kind: "door" }],
	};
};

describe("applySearch and secret doors", () => {
	it("finds nothing out of reach", () => {
		const state = withSecretDoor();
		const far = { ...state, player: { x: 4, y: 3 } };
		expect(applySearch(far).hiddenTiles).toEqual(state.hiddenTiles);
	});

	it("finds a secret door next to the player one time in five, opening it", () => {
		const base = { ...withSecretDoor(), player: { x: 4, y: 1 } };
		let rng = base.rng;
		let found = 0;
		for (let i = 0; i < 300; i++) {
			const next = applySearch({ ...base, rng });
			if (next.hiddenTiles.length === 0) {
				found++;
				expect(next.terrain[4]?.[0]).toBe(0);
				expect(next.events.at(-1)).toEqual({
					type: "secret-door-found",
					payload: {},
				});
			} else {
				expect(next.terrain[4]?.[0]).toBe(1);
			}
			rng = stepUniform(rng).state;
		}
		expect(found).toBeGreaterThan(35);
		expect(found).toBeLessThan(90);
	});

	it("finds a secret passage silently", () => {
		const base = {
			...withSecretDoor(),
			player: { x: 4, y: 1 },
			hiddenTiles: [{ x: 4, y: 0, kind: "passage" as const }],
		};
		let rng = base.rng;
		for (let i = 0; i < 50; i++) {
			const next = applySearch({ ...base, rng });
			if (next.hiddenTiles.length === 0) {
				expect(next.events).toEqual(base.events);
				return;
			}
			rng = stepUniform(rng).state;
		}
		throw new Error("never found in 50 searches");
	});
});
