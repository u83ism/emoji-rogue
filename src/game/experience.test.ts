import { describe, expect, it } from "vitest";
import {
	LEVEL_EXPERIENCE_THRESHOLDS,
	PLAYER_LEVEL_UP_HP_BONUS,
} from "./balance.js";
import { applyExperienceGain } from "./experience.js";
import { buildArenaGameState } from "./initialState.js";

describe("applyExperienceGain", () => {
	it("accumulates experience without leveling up below the first threshold", () => {
		const state = buildArenaGameState(5, 5, 1);
		const firstThreshold = LEVEL_EXPERIENCE_THRESHOLDS[0] ?? 0;
		const next = applyExperienceGain(state, firstThreshold - 1);
		expect(next.playerExperience).toBe(firstThreshold - 1);
		expect(next.playerLevel).toBe(1);
		expect(next.playerMaxHp).toBe(state.playerMaxHp);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events).toEqual([]);
	});

	it("levels up, raising playerMaxHp and playerHp, and logs player-leveled-up", () => {
		const state = buildArenaGameState(5, 5, 1);
		const firstThreshold = LEVEL_EXPERIENCE_THRESHOLDS[0] ?? 0;
		const next = applyExperienceGain(state, firstThreshold);
		expect(next.playerLevel).toBe(2);
		expect(next.playerMaxHp).toBe(state.playerMaxHp + PLAYER_LEVEL_UP_HP_BONUS);
		expect(next.playerHp).toBe(state.playerHp + PLAYER_LEVEL_UP_HP_BONUS);
		expect(next.events).toEqual([
			{ type: "player-leveled-up", payload: { level: 2 } },
		]);
	});

	it("crosses multiple thresholds at once from a single large gain", () => {
		const state = buildArenaGameState(5, 5, 1);
		const thirdThreshold = LEVEL_EXPERIENCE_THRESHOLDS[2] ?? 0;
		const next = applyExperienceGain(state, thirdThreshold);
		expect(next.playerLevel).toBe(4);
		expect(next.playerMaxHp).toBe(
			state.playerMaxHp + PLAYER_LEVEL_UP_HP_BONUS * 3,
		);
		expect(next.events).toEqual([
			{ type: "player-leveled-up", payload: { level: 2 } },
			{ type: "player-leveled-up", payload: { level: 3 } },
			{ type: "player-leveled-up", payload: { level: 4 } },
		]);
	});

	it("stops growing once the level cap (one past the threshold table) is reached", () => {
		const state = buildArenaGameState(5, 5, 1);
		const capped = applyExperienceGain(state, 1_000_000);
		expect(capped.playerLevel).toBe(LEVEL_EXPERIENCE_THRESHOLDS.length + 1);

		const next = applyExperienceGain(capped, 1_000_000);
		expect(next.playerLevel).toBe(capped.playerLevel);
		expect(next.playerMaxHp).toBe(capped.playerMaxHp);
		expect(next.events).toBe(capped.events); /* no new events appended */
	});

	it("never touches rng — leveling is deterministic", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyExperienceGain(state, 5).rng).toEqual(state.rng);
	});
});
