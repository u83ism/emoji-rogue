import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { PLAYER_WEAK_THRESHOLD } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import {
	applyArmorRust,
	calculatePlayerAttackDamage,
	calculatePlayerDefense,
} from "./equipment.js";

/*
 * Whether a sword/armor is cursed, and how far the curse drags its bonus
 * down, is rolled once at floor generation (see items/heldItemFactory.ts)
 * and carried on the HeldItem — these tests build already-picked-up
 * HeldItem fixtures directly with explicit `cursed`/bonus values, so both
 * the ordinary and cursed cases are exercised unconditionally instead of
 * depending on any particular rng seed.
 */
describe("items/equipment", () => {
	it("equipping a held sword raises the player's effective attack damage", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: false,
					cursed: false,
					attackBonus: 1,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerAttackDamage(next)).toBe(
			calculatePlayerAttackDamage(state) + 1,
		);
		expect(next.playerHp).toBe(state.playerHp); /* swords don't heal */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "sword",
				equipped: true,
				cursed: false,
				attackBonus: 1,
			},
		]);
		expect(next.events).toEqual([
			{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1 } },
		]);
	});

	it("equipping a second sword swaps out the first — only one sword slot exists", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: true,
					cursed: false,
					attackBonus: 2,
				},
				{
					itemId: 2,
					kind: "sword" as const,
					equipped: false,
					cursed: false,
					attackBonus: 3,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2 },
		});
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "sword",
				equipped: false,
				cursed: false,
				attackBonus: 2,
			},
			{
				itemId: 2,
				kind: "sword",
				equipped: true,
				cursed: false,
				attackBonus: 3,
			},
		]);
		expect(calculatePlayerAttackDamage(next)).toBe(state.playerPower + 3);
	});

	it("a cursed sword applies its (negative) attack bonus when equipped — worse than unarmed — and cannot be unequipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerPower: 5,
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: false,
					cursed: true,
					attackBonus: -2,
				},
			],
		};
		const equipped = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerAttackDamage(equipped)).toBe(state.playerPower - 2);
		expect(equipped.inventory).toEqual([
			{
				itemId: 1,
				kind: "sword",
				equipped: true,
				cursed: true,
				attackBonus: -2,
			},
		]);
		expect(equipped.events).toEqual([
			{ type: "weapon-equipped", payload: { kind: "sword", bonus: -2 } },
			{ type: "curse-revealed", payload: { kind: "sword" } },
		]);

		const unequipAttempt = advanceTurn(equipped, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(unequipAttempt.inventory).toEqual(equipped.inventory);
		expect(
			unequipAttempt.events.some(
				(event) => event.type === "equip-blocked-cursed",
			),
		).toBe(true);
	});

	it("equipping held armor raises the player's effective defense", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: false,
					defenseBonus: 1,
					rustProtected: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerDefense(next.inventory)).toBe(1);
		expect(next.playerHp).toBe(state.playerHp); /* armor doesn't heal */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: true,
				cursed: false,
				defenseBonus: 1,
				rustProtected: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "armor-equipped", payload: { kind: "armor", bonus: 1 } },
		]);
	});

	it("equipping a second armor swaps out the first — only one armor slot exists", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: true,
					cursed: false,
					defenseBonus: 1,
					rustProtected: false,
				},
				{
					itemId: 2,
					kind: "armor" as const,
					equipped: false,
					cursed: false,
					defenseBonus: 2,
					rustProtected: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2 },
		});
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: false,
				cursed: false,
				defenseBonus: 1,
				rustProtected: false,
			},
			{
				itemId: 2,
				kind: "armor",
				equipped: true,
				cursed: false,
				defenseBonus: 2,
				rustProtected: false,
			},
		]);
		expect(calculatePlayerDefense(next.inventory)).toBe(2);
	});

	it("cursed armor applies its (negative) defense bonus when equipped — worse than unarmored — and cannot be unequipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: true,
					defenseBonus: -2,
					rustProtected: false,
				},
			],
		};
		const equipped = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerDefense(equipped.inventory)).toBe(-2);
		expect(equipped.events).toEqual([
			{ type: "armor-equipped", payload: { kind: "armor", bonus: -2 } },
			{ type: "curse-revealed", payload: { kind: "armor" } },
		]);

		const unequipAttempt = advanceTurn(equipped, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(unequipAttempt.inventory).toEqual(equipped.inventory);
		expect(
			unequipAttempt.events.some(
				(event) => event.type === "equip-blocked-cursed",
			),
		).toBe(true);
	});

	it("rust lowers a positive defense bonus by 1 but never touches one already at or below 0", () => {
		const armorWith = (defenseBonus: number) => [
			{
				itemId: 1,
				kind: "armor" as const,
				equipped: true,
				cursed: defenseBonus < 0,
				defenseBonus,
				rustProtected: false,
			},
		];
		expect(calculatePlayerDefense(applyArmorRust(armorWith(2)))).toBe(1);
		expect(calculatePlayerDefense(applyArmorRust(armorWith(0)))).toBe(0);
		/* a cursed -2 armor is not "rusted up" to 0 */
		expect(calculatePlayerDefense(applyArmorRust(armorWith(-2)))).toBe(-2);
	});

	it("is unaffected by playerFood while above PLAYER_WEAK_THRESHOLD", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerFood: PLAYER_WEAK_THRESHOLD + 1,
		};
		expect(calculatePlayerAttackDamage(state)).toBe(state.playerPower);
	});

	it("subtracts WEAK_ATTACK_PENALTY once playerFood drops to PLAYER_WEAK_THRESHOLD or below", () => {
		const weakened = {
			...buildArenaGameState(9, 3, 1),
			playerPower: 3,
			playerFood: PLAYER_WEAK_THRESHOLD,
		};
		expect(calculatePlayerAttackDamage(weakened)).toBe(2);

		const starving = { ...weakened, playerFood: 0 };
		expect(calculatePlayerAttackDamage(starving)).toBe(2);
	});

	it("floors the weakened attack at MIN_PLAYER_ATTACK_DAMAGE instead of going to 0 or below", () => {
		const unarmedAndWeak = {
			...buildArenaGameState(9, 3, 1),
			playerPower: 1,
			playerFood: 0,
		};
		expect(calculatePlayerAttackDamage(unarmedAndWeak)).toBe(1);
	});
});
