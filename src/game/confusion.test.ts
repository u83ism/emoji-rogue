import { describe, expect, it } from "vitest";
import { applyConfusionTick } from "./confusion.js";
import { buildArenaGameState } from "./initialState.js";
import type { GameState } from "./state.js";

describe("applyConfusionTick", () => {
	it("is a no-op (same reference) when not confused", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyConfusionTick(state)).toBe(state);
	});

	it("counts down by one without firing an event above 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			confusedTurnsRemaining: 3,
		};
		const next = applyConfusionTick(state);
		expect(next.confusedTurnsRemaining).toBe(2);
		expect(next.events).toEqual([]);
	});

	it("fires confusion-faded the turn it reaches 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			confusedTurnsRemaining: 1,
		};
		const next = applyConfusionTick(state);
		expect(next.confusedTurnsRemaining).toBe(0);
		expect(next.events).toEqual([{ type: "confusion-faded", payload: {} }]);
	});

	it("never touches rng — the countdown itself is deterministic", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			confusedTurnsRemaining: 5,
		};
		expect(applyConfusionTick(state).rng).toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			confusedTurnsRemaining: 3,
			status: "dead",
		};
		expect(applyConfusionTick(state)).toBe(state);
	});
});
