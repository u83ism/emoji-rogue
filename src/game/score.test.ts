import { describe, expect, it } from "vitest";
import {
	SCORE_AMULET_BONUS,
	SCORE_PER_FLOOR,
	SCORE_PER_LEVEL,
} from "./balance.js";
import { buildArenaGameState } from "./initialState.js";
import { calculateScore } from "./score.js";

describe("calculateScore", () => {
	it("sums gold, floor depth, and character level", () => {
		const state = {
			...buildArenaGameState(5, 5, 1),
			goldCollected: 42,
			floor: 3,
			playerLevel: 2,
		};
		expect(calculateScore(state)).toBe(
			42 + 3 * SCORE_PER_FLOOR + 2 * SCORE_PER_LEVEL,
		);
	});

	it("adds the amulet bonus only when hasAmulet is true", () => {
		const state = { ...buildArenaGameState(5, 5, 1), hasAmulet: true };
		const withoutAmulet = { ...state, hasAmulet: false };
		expect(calculateScore(state)).toBe(
			calculateScore(withoutAmulet) + SCORE_AMULET_BONUS,
		);
	});

	it("is deterministic for the same state", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(calculateScore(state)).toBe(calculateScore(state));
	});
});
