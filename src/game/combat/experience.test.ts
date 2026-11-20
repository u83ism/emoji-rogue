import { describe, expect, it } from "vitest";
import {
	LEVEL_EXPERIENCE_THRESHOLDS,
	PLAYER_LEVEL_UP_HP_DICE_SIDES,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import { applyExperienceGain, applyLevelUp } from "./experience.js";

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
		const gainedHp = next.playerMaxHp - state.playerMaxHp;
		expect(gainedHp).toBeGreaterThanOrEqual(1);
		expect(gainedHp).toBeLessThanOrEqual(PLAYER_LEVEL_UP_HP_DICE_SIDES);
		expect(next.playerHp).toBe(state.playerHp + gainedHp);
		expect(next.rng).not.toEqual(state.rng); /* the HP die consumed it */
		expect(next.events).toEqual([
			{ type: "player-leveled-up", payload: { level: 2 } },
		]);
	});

	it("crosses multiple thresholds at once from a single large gain, rolling one HP die per level", () => {
		const state = buildArenaGameState(5, 5, 1);
		const thirdThreshold = LEVEL_EXPERIENCE_THRESHOLDS[2] ?? 0;
		const next = applyExperienceGain(state, thirdThreshold);
		expect(next.playerLevel).toBe(4);
		const gainedHp = next.playerMaxHp - state.playerMaxHp;
		expect(gainedHp).toBeGreaterThanOrEqual(3);
		expect(gainedHp).toBeLessThanOrEqual(PLAYER_LEVEL_UP_HP_DICE_SIDES * 3);
		expect(next.events).toEqual([
			{ type: "player-leveled-up", payload: { level: 2 } },
			{ type: "player-leveled-up", payload: { level: 3 } },
			{ type: "player-leveled-up", payload: { level: 4 } },
		]);
	});

	it("stops growing once the level cap (one past the threshold table) is reached", () => {
		const state = buildArenaGameState(5, 5, 1);
		const capped = applyExperienceGain(state, 100_000_000);
		expect(capped.playerLevel).toBe(LEVEL_EXPERIENCE_THRESHOLDS.length + 1);

		const next = applyExperienceGain(capped, 100_000_000);
		expect(next.playerLevel).toBe(capped.playerLevel);
		expect(next.playerMaxHp).toBe(capped.playerMaxHp);
		expect(next.events).toBe(capped.events); /* no new events appended */
	});

	it("consumes no rng when the gain crosses no threshold", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyExperienceGain(state, 5).rng).toEqual(state.rng);
	});

	it("is deterministic: the same state and gain roll the same HP", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyExperienceGain(state, 100)).toEqual(
			applyExperienceGain(state, 100),
		);
	});
});

describe("applyLevelUp", () => {
	it("raises playerLevel by 1 and grants one HP die, without touching playerExperience", () => {
		const state = buildArenaGameState(5, 5, 1);
		const next = applyLevelUp(state);
		expect(next.playerLevel).toBe(2);
		const gainedHp = next.playerMaxHp - state.playerMaxHp;
		expect(gainedHp).toBeGreaterThanOrEqual(1);
		expect(gainedHp).toBeLessThanOrEqual(PLAYER_LEVEL_UP_HP_DICE_SIDES);
		expect(next.playerHp).toBe(state.playerHp + gainedHp);
		expect(next.playerExperience).toBe(state.playerExperience);
		expect(next.events).toEqual([
			{ type: "player-leveled-up", payload: { level: 2 } },
		]);
	});

	it("has no cap — keeps raising the level past what LEVEL_EXPERIENCE_THRESHOLDS allows", () => {
		let state = buildArenaGameState(5, 5, 1);
		for (
			let index = 0;
			index < LEVEL_EXPERIENCE_THRESHOLDS.length + 5;
			index++
		) {
			state = applyLevelUp(state);
		}
		expect(state.playerLevel).toBe(LEVEL_EXPERIENCE_THRESHOLDS.length + 6);
	});

	it("consumes state.rng for the HP die", () => {
		const state = buildArenaGameState(5, 5, 1);
		expect(applyLevelUp(state).rng).not.toEqual(state.rng);
	});
});
