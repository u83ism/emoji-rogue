import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyHallucinationTick } from "./hallucination.js";

describe("applyHallucinationTick", () => {
	it("is a no-op (same reference) when not hallucinating", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyHallucinationTick(state)).toBe(state);
	});

	it("counts down by one without firing an event above 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hallucinatingTurnsRemaining: 3,
		};
		const next = applyHallucinationTick(state);
		expect(next.hallucinatingTurnsRemaining).toBe(2);
		expect(next.events).toEqual([]);
	});

	it("fires hallucination-faded the turn it reaches 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hallucinatingTurnsRemaining: 1,
		};
		const next = applyHallucinationTick(state);
		expect(next.hallucinatingTurnsRemaining).toBe(0);
		expect(next.events).toEqual([{ type: "hallucination-faded", payload: {} }]);
	});

	it("never touches rng — the countdown itself is deterministic", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hallucinatingTurnsRemaining: 5,
		};
		expect(applyHallucinationTick(state).rng).toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			hallucinatingTurnsRemaining: 3,
			status: "dead",
		};
		expect(applyHallucinationTick(state)).toBe(state);
	});
});
