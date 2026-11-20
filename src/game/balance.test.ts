import { describe, expect, it } from "vitest";
import {
	AMULET_FLOOR,
	calculateEnemyLevelBonus,
	calculateMagicSaveChancePercent,
	LEVEL_EXPERIENCE_THRESHOLDS,
} from "./balance.js";

describe("calculateEnemyLevelBonus", () => {
	it("is original Rogue's lev_add: nothing down to AMULET_FLOOR, then one per floor", () => {
		expect(calculateEnemyLevelBonus(1)).toBe(0);
		expect(calculateEnemyLevelBonus(AMULET_FLOOR)).toBe(0);
		expect(calculateEnemyLevelBonus(AMULET_FLOOR + 1)).toBe(1);
		expect(calculateEnemyLevelBonus(AMULET_FLOOR + 4)).toBe(4);
	});
});

describe("calculateMagicSaveChancePercent", () => {
	it("is original Rogue's save(VS_MAGIC): 20% at level 1, +5 points per two levels", () => {
		expect(calculateMagicSaveChancePercent(1)).toBe(20);
		expect(calculateMagicSaveChancePercent(2)).toBe(25);
		expect(calculateMagicSaveChancePercent(3)).toBe(25);
		expect(calculateMagicSaveChancePercent(4)).toBe(30);
		expect(calculateMagicSaveChancePercent(10)).toBe(45);
	});
});

describe("LEVEL_EXPERIENCE_THRESHOLDS", () => {
	it("rises strictly, so each level needs more experience than the one before", () => {
		for (let index = 1; index < LEVEL_EXPERIENCE_THRESHOLDS.length; index++) {
			expect(LEVEL_EXPERIENCE_THRESHOLDS[index]).toBeGreaterThan(
				LEVEL_EXPERIENCE_THRESHOLDS[index - 1] ?? 0,
			);
		}
	});
});
