import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyBlindnessTick } from "./blindness.js";

describe("applyBlindnessTick", () => {
	it("is a no-op (same reference) when not blind", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyBlindnessTick(state)).toBe(state);
	});

	it("counts down by one without firing an event above 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			blindTurnsRemaining: 3,
		};
		const next = applyBlindnessTick(state);
		expect(next.blindTurnsRemaining).toBe(2);
		expect(next.events).toEqual([]);
	});

	it("fires blindness-faded the turn it reaches 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			blindTurnsRemaining: 1,
		};
		const next = applyBlindnessTick(state);
		expect(next.blindTurnsRemaining).toBe(0);
		expect(next.events).toEqual([{ type: "blindness-faded", payload: {} }]);
	});

	it("never touches rng — the countdown itself is deterministic", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			blindTurnsRemaining: 5,
		};
		expect(applyBlindnessTick(state).rng).toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			blindTurnsRemaining: 3,
			status: "dead",
		};
		expect(applyBlindnessTick(state)).toBe(state);
	});
});
