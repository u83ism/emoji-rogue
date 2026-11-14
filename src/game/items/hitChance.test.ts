import { describe, expect, it } from "vitest";
import {
	HIT_CHANCE_PERCENT_PER_POINT,
	UNARMORED_ARMOR_CLASS,
} from "../balance.js";
import { ENEMY_STATS } from "../enemies/enemyStats.js";
import { buildArenaGameState } from "../initialState.js";
import type { HeldItem } from "../state.js";
import {
	calculateEnemyHitChancePercent,
	calculatePlayerHitChancePercent,
} from "./hitChance.js";

const weaponWith = (attackBonus: number, equipped = true): HeldItem => ({
	itemId: 1,
	kind: "weapon",
	equipped,
	cursed: attackBonus < 0,
	attackBonus,
});

const armorWith = (defenseBonus: number, equipped = true): HeldItem => ({
	itemId: 1,
	kind: "armor",
	equipped,
	cursed: defenseBonus < 0,
	defenseBonus,
	rustProtected: false,
});

describe("calculatePlayerHitChancePercent", () => {
	const state = buildArenaGameState(9, 3, 1);

	it("is original Rogue's swing(): 5% per point of player level + target armor class", () => {
		/* level 1 against a zombie (armor class 8): 9 of the d20's faces hit */
		expect(calculatePlayerHitChancePercent(state, "zombie")).toBe(45);
		expect(calculatePlayerHitChancePercent(state, "zombie")).toBe(
			(state.playerLevel + ENEMY_STATS.zombie.armorClass) *
				HIT_CHANCE_PERCENT_PER_POINT,
		);
	});

	it("is lower against a harder (lower) armor class and higher at a higher level", () => {
		expect(calculatePlayerHitChancePercent(state, "bat")).toBe(20);
		expect(
			calculatePlayerHitChancePercent({ ...state, playerLevel: 5 }, "bat"),
		).toBe(40);
	});

	it("rises with the equipped weapon's attackBonus and drops with a cursed one's", () => {
		expect(
			calculatePlayerHitChancePercent(
				{ ...state, inventory: [weaponWith(2)] },
				"zombie",
			),
		).toBe(55);
		expect(
			calculatePlayerHitChancePercent(
				{ ...state, inventory: [weaponWith(-2)] },
				"zombie",
			),
		).toBe(35);
	});

	it("ignores an unequipped weapon", () => {
		expect(
			calculatePlayerHitChancePercent(
				{ ...state, inventory: [weaponWith(5, false)] },
				"zombie",
			),
		).toBe(45);
	});

	it("stays within 0-100 at the extremes", () => {
		expect(
			calculatePlayerHitChancePercent(
				{ ...state, inventory: [weaponWith(100)] },
				"zombie",
			),
		).toBe(100);
		/* level 1 against a black-unicorn-grade armor class of -2 */
		expect(calculatePlayerHitChancePercent(state, "ur-vile")).toBe(0);
	});
});

describe("calculateEnemyHitChancePercent", () => {
	it("is 5% per point of the enemy's level + the player's armor class", () => {
		/* a level 1 hobgoblin against an unarmored player (armor class 10) */
		expect(calculateEnemyHitChancePercent("hobgoblin", [])).toBe(55);
		expect(calculateEnemyHitChancePercent("hobgoblin", [])).toBe(
			(ENEMY_STATS.hobgoblin.level + UNARMORED_ARMOR_CLASS) *
				HIT_CHANCE_PERCENT_PER_POINT,
		);
	});

	it("falls 5 points per point of the equipped armor's defenseBonus", () => {
		expect(calculateEnemyHitChancePercent("hobgoblin", [armorWith(4)])).toBe(
			35,
		);
	});

	it("rises against a cursed armor's negative defenseBonus", () => {
		expect(calculateEnemyHitChancePercent("hobgoblin", [armorWith(-2)])).toBe(
			65,
		);
	});

	it("ignores an unequipped armor", () => {
		expect(
			calculateEnemyHitChancePercent("hobgoblin", [armorWith(5, false)]),
		).toBe(55);
	});

	it("stays within 0-100 at the extremes", () => {
		/* a level 15 jabberwock against an unarmored player */
		expect(calculateEnemyHitChancePercent("jabberwock", [])).toBe(100);
		expect(calculateEnemyHitChancePercent("hobgoblin", [armorWith(100)])).toBe(
			0,
		);
	});
});
