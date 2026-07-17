import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import type { GameState } from "../state.js";
import { applyDetectMonstersTick } from "./detectMonsters.js";

describe("applyDetectMonstersTick", () => {
	it("is a no-op (same reference) when not detecting", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyDetectMonstersTick(state)).toBe(state);
	});

	it("counts down by one without firing an event above 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			detectMonstersTurnsRemaining: 3,
		};
		const next = applyDetectMonstersTick(state);
		expect(next.detectMonstersTurnsRemaining).toBe(2);
		expect(next.events).toEqual([]);
	});

	it("fires detect-monsters-faded the turn it reaches 0", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			detectMonstersTurnsRemaining: 1,
		};
		const next = applyDetectMonstersTick(state);
		expect(next.detectMonstersTurnsRemaining).toBe(0);
		expect(next.events).toEqual([
			{ type: "detect-monsters-faded", payload: {} },
		]);
	});

	it("never touches rng — the countdown itself is deterministic", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			detectMonstersTurnsRemaining: 5,
		};
		expect(applyDetectMonstersTick(state).rng).toEqual(state.rng);
	});

	it("is a no-op once the run is no longer playing", () => {
		const state: GameState = {
			...buildArenaGameState(5, 5, 1),
			detectMonstersTurnsRemaining: 3,
			status: "dead",
		};
		expect(applyDetectMonstersTick(state)).toBe(state);
	});
});
