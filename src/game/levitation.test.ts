import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "./initialState.js";
import { applyLevitationTick } from "./levitation.js";
import type { GameState } from "./state.js";

describe("applyLevitationTick", () => {
	it("is a no-op (same reference) when not levitating", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyLevitationTick(state)).toBe(state);
	});

	it("counts down by one without firing an event above 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			levitationTurnsRemaining: 3,
		};
		const next = applyLevitationTick(state);
		expect(next.levitationTurnsRemaining).toBe(2);
		expect(next.events).toEqual([]);
	});

	it("fires levitation-faded the turn it reaches 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			levitationTurnsRemaining: 1,
		};
		const next = applyLevitationTick(state);
		expect(next.levitationTurnsRemaining).toBe(0);
		expect(next.events).toEqual([{ type: "levitation-faded", payload: {} }]);
	});

	it("never touches rng — the countdown itself is deterministic", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			levitationTurnsRemaining: 5,
		};
		expect(applyLevitationTick(state).rng).toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			levitationTurnsRemaining: 3,
			status: "dead",
		};
		expect(applyLevitationTick(state)).toBe(state);
	});
});
