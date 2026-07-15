import { describe, expect, it } from "vitest";
import {
	SCORE_AMULET_BONUS,
	SCORE_FOODLESS_BONUS,
	SCORE_PACIFIST_BONUS,
	SCORE_PER_FLOOR,
	SCORE_PER_LEVEL,
} from "./balance.js";
import { buildArenaGameState } from "./initialState.js";
import { calculateScore } from "./score.js";

/** A state with both conducts already broken, isolating the base calculation from conduct bonuses. */
const buildBaseState = () => ({
	...buildArenaGameState(5, 5, 1),
	hasAttacked: true,
	hasEaten: true,
});

describe("calculateScore", () => {
	it("sums gold, floor depth, and character level", () => {
		const state = {
			...buildBaseState(),
			goldCollected: 42,
			floor: 3,
			playerLevel: 2,
		};
		expect(calculateScore(state)).toBe(
			42 + 3 * SCORE_PER_FLOOR + 2 * SCORE_PER_LEVEL,
		);
	});

	it("adds the amulet bonus only when hasAmulet is true", () => {
		const state = { ...buildBaseState(), hasAmulet: true };
		const withoutAmulet = { ...state, hasAmulet: false };
		expect(calculateScore(state)).toBe(
			calculateScore(withoutAmulet) + SCORE_AMULET_BONUS,
		);
	});

	it("adds the pacifist bonus only when hasAttacked is false", () => {
		const state = buildBaseState();
		const pacifist = { ...state, hasAttacked: false };
		expect(calculateScore(pacifist)).toBe(
			calculateScore(state) + SCORE_PACIFIST_BONUS,
		);
	});

	it("adds the foodless bonus only when hasEaten is false", () => {
		const state = buildBaseState();
		const foodless = { ...state, hasEaten: false };
		expect(calculateScore(foodless)).toBe(
			calculateScore(state) + SCORE_FOODLESS_BONUS,
		);
	});

	it("is deterministic for the same state", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(calculateScore(state)).toBe(calculateScore(state));
	});
});
