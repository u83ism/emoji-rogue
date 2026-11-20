import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import { PLAYER_START_STRENGTH } from "./balance.js";
import { buildArenaGameState } from "./initialState.js";
import {
	applyStrengthChange,
	calculateStrengthDamageBonus,
	calculateStrengthHitBonus,
	resolvePoisonDrain,
	STRENGTH_MAX,
	STRENGTH_MIN,
} from "./strength.js";

describe("calculateStrengthHitBonus / calculateStrengthDamageBonus", () => {
	it("are original Rogue's str_plus[] and add_dam[]", () => {
		expect(calculateStrengthHitBonus(3)).toBe(-4);
		expect(calculateStrengthHitBonus(16)).toBe(0);
		expect(calculateStrengthHitBonus(17)).toBe(1);
		expect(calculateStrengthHitBonus(21)).toBe(2);
		expect(calculateStrengthHitBonus(31)).toBe(3);
		expect(calculateStrengthDamageBonus(3)).toBe(-4);
		expect(calculateStrengthDamageBonus(15)).toBe(0);
		expect(calculateStrengthDamageBonus(16)).toBe(1);
		expect(calculateStrengthDamageBonus(19)).toBe(3);
		expect(calculateStrengthDamageBonus(31)).toBe(6);
	});

	it("the starting strength hits normally and adds 1 damage", () => {
		expect(calculateStrengthHitBonus(PLAYER_START_STRENGTH)).toBe(0);
		expect(calculateStrengthDamageBonus(PLAYER_START_STRENGTH)).toBe(1);
	});
});

describe("applyStrengthChange", () => {
	const state = buildArenaGameState(9, 3, 1);

	it("a gain raises both the strength and, past it, the maximum", () => {
		const stronger = applyStrengthChange(state, 2);
		expect(stronger.playerStrength).toBe(PLAYER_START_STRENGTH + 2);
		expect(stronger.playerMaxStrength).toBe(PLAYER_START_STRENGTH + 2);
	});

	it("a drain lowers the strength but keeps the maximum", () => {
		const drained = applyStrengthChange(state, -3);
		expect(drained.playerStrength).toBe(PLAYER_START_STRENGTH - 3);
		expect(drained.playerMaxStrength).toBe(PLAYER_START_STRENGTH);
	});

	it("regaining after a drain does not raise the maximum until it is passed", () => {
		const regained = applyStrengthChange(applyStrengthChange(state, -3), 2);
		expect(regained.playerStrength).toBe(PLAYER_START_STRENGTH - 1);
		expect(regained.playerMaxStrength).toBe(PLAYER_START_STRENGTH);
	});

	it("stays within 3..31", () => {
		expect(applyStrengthChange(state, -100).playerStrength).toBe(STRENGTH_MIN);
		const maxed = applyStrengthChange(state, 100);
		expect(maxed.playerStrength).toBe(STRENGTH_MAX);
		expect(maxed.playerMaxStrength).toBe(STRENGTH_MAX);
	});
});

describe("resolvePoisonDrain", () => {
	const rng = seedToState(1);

	it("a passed save (level high enough to always pass) takes nothing", () => {
		const drain = resolvePoisonDrain(16, 30, rng);
		expect(drain.playerStrength).toBe(16);
		expect(drain.strengthLost).toBe(0);
		expect(drain.rng).not.toEqual(rng);
	});

	it("a failed save (level so low it never passes) takes one point, never below 3", () => {
		expect(resolvePoisonDrain(16, -30, rng)).toMatchObject({
			playerStrength: 15,
			strengthLost: 1,
		});
		expect(resolvePoisonDrain(3, -30, rng)).toMatchObject({
			playerStrength: 3,
			strengthLost: 0,
		});
	});
});
