import { describe, expect, it } from "vitest";
import {
	ENEMY_BASE_HIT_CHANCE_PERCENT,
	MAX_HIT_CHANCE_PERCENT,
	MIN_HIT_CHANCE_PERCENT,
	PLAYER_BASE_HIT_CHANCE_PERCENT,
	PLAYER_HIT_CHANCE_PER_ATTACK_BONUS,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import {
	calculateEnemyHitChancePercent,
	calculatePlayerHitChancePercent,
} from "./hitChance.js";

describe("calculatePlayerHitChancePercent", () => {
	const state = buildArenaGameState(9, 3, 1);

	it("is PLAYER_BASE_HIT_CHANCE_PERCENT unarmed", () => {
		expect(calculatePlayerHitChancePercent(state)).toBe(
			PLAYER_BASE_HIT_CHANCE_PERCENT,
		);
	});

	it("rises with the equipped sword's attackBonus", () => {
		const armed = {
			...state,
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: true,
					cursed: false,
					attackBonus: 2,
				},
			],
		};
		expect(calculatePlayerHitChancePercent(armed)).toBe(
			PLAYER_BASE_HIT_CHANCE_PERCENT + 2 * PLAYER_HIT_CHANCE_PER_ATTACK_BONUS,
		);
	});

	it("ignores an unequipped sword", () => {
		const unequipped = {
			...state,
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: false,
					cursed: false,
					attackBonus: 5,
				},
			],
		};
		expect(calculatePlayerHitChancePercent(unequipped)).toBe(
			PLAYER_BASE_HIT_CHANCE_PERCENT,
		);
	});

	it("never exceeds MAX_HIT_CHANCE_PERCENT, however high the sword's attackBonus climbs", () => {
		const godSword = {
			...state,
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: true,
					cursed: false,
					attackBonus: 100,
				},
			],
		};
		expect(calculatePlayerHitChancePercent(godSword)).toBe(
			MAX_HIT_CHANCE_PERCENT,
		);
	});
});

describe("calculateEnemyHitChancePercent", () => {
	it("is ENEMY_BASE_HIT_CHANCE_PERCENT with nothing equipped", () => {
		expect(calculateEnemyHitChancePercent([])).toBe(
			ENEMY_BASE_HIT_CHANCE_PERCENT,
		);
	});

	it("falls as the equipped armor's defenseBonus rises", () => {
		const lightlyArmored = calculateEnemyHitChancePercent([
			{
				itemId: 1,
				kind: "armor",
				equipped: true,
				cursed: false,
				defenseBonus: 1,
				rustProtected: false,
			},
		]);
		expect(lightlyArmored).toBeLessThan(ENEMY_BASE_HIT_CHANCE_PERCENT);
	});

	it("never drops below MIN_HIT_CHANCE_PERCENT, however high the armor's defenseBonus climbs", () => {
		const heavilyArmored = calculateEnemyHitChancePercent([
			{
				itemId: 1,
				kind: "armor",
				equipped: true,
				cursed: false,
				defenseBonus: 100,
				rustProtected: false,
			},
		]);
		expect(heavilyArmored).toBe(MIN_HIT_CHANCE_PERCENT);
	});

	it("ignores an unequipped armor", () => {
		const unequipped = calculateEnemyHitChancePercent([
			{
				itemId: 1,
				kind: "armor",
				equipped: false,
				cursed: false,
				defenseBonus: 5,
				rustProtected: false,
			},
		]);
		expect(unequipped).toBe(ENEMY_BASE_HIT_CHANCE_PERCENT);
	});
});
