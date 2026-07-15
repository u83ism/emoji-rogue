import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "./initialState.js";
import { applyParalysisTick } from "./paralysis.js";
import type { GameState } from "./state.js";

describe("applyParalysisTick", () => {
	it("is a no-op (same reference) when not paralyzed", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyParalysisTick(state)).toBe(state);
	});

	it("counts down by one without firing an event above 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			paralyzedTurnsRemaining: 3,
		};
		const next = applyParalysisTick(state);
		expect(next.paralyzedTurnsRemaining).toBe(2);
		expect(next.events).toEqual([]);
	});

	it("fires paralysis-faded the turn it reaches 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			paralyzedTurnsRemaining: 1,
		};
		const next = applyParalysisTick(state);
		expect(next.paralyzedTurnsRemaining).toBe(0);
		expect(next.events).toEqual([{ type: "paralysis-faded", payload: {} }]);
	});

	it("never touches rng — the countdown itself is deterministic", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			paralyzedTurnsRemaining: 5,
		};
		expect(applyParalysisTick(state).rng).toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			paralyzedTurnsRemaining: 3,
			status: "dead",
		};
		expect(applyParalysisTick(state)).toBe(state);
	});
});
