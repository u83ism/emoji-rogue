import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { PLAYER_WEAK_THRESHOLD } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import { applyArmorRust, canRustEquippedArmor } from "./equipment.js";
import {
	calculatePlayerDamageBonus as calculatePlayerAttackDamage,
	calculatePlayerDefense,
} from "./equipmentStats.js";

/*
 * Whether a weapon/armor is cursed, and how far the curse drags its bonus
 * down, is rolled once at floor generation (see items/heldItemFactory.ts)
 * and carried on the HeldItem — these tests build already-picked-up
 * HeldItem fixtures directly with explicit `cursed`/bonus values, so both
 * the ordinary and cursed cases are exercised unconditionally instead of
 * depending on any particular rng seed.
 */
describe("items/equipment", () => {
	it("equipping a held weapon raises the player's effective attack damage", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "weapon" as const,
					equipped: false,
					cursed: false,
					weaponKind: "long-sword" as const,
					hitBonus: 1,
					damageBonus: 1,
					quantity: 1,
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
		expect(next.playerHp).toBe(state.playerHp); /* weapons don't heal */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "weapon",
				equipped: true,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 1,
				damageBonus: 1,
				quantity: 1,
			},
		]);
		expect(next.events).toEqual([
			{
				type: "weapon-equipped",
				payload: {
					weaponKind: "long-sword",
					hitBonus: 1,
					damageBonus: 1,
				},
			},
		]);
	});

	it("equipping a second weapon swaps out the first — only one weapon slot exists", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "weapon" as const,
					equipped: true,
					cursed: false,
					weaponKind: "long-sword" as const,
					hitBonus: 2,
					damageBonus: 2,
					quantity: 1,
				},
				{
					itemId: 2,
					kind: "weapon" as const,
					equipped: false,
					cursed: false,
					weaponKind: "long-sword" as const,
					hitBonus: 3,
					damageBonus: 3,
					quantity: 1,
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
				kind: "weapon",
				equipped: false,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 2,
				damageBonus: 2,
				quantity: 1,
			},
			{
				itemId: 2,
				kind: "weapon",
				equipped: true,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 3,
				damageBonus: 3,
				quantity: 1,
			},
		]);
		expect(calculatePlayerAttackDamage(next)).toBe(
			calculatePlayerAttackDamage({ ...state, inventory: [] }) + 3,
		);
	});

	it("a cursed weapon applies its (negative) attack bonus when equipped — worse than unarmed — and cannot be unequipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "weapon" as const,
					equipped: false,
					cursed: true,
					weaponKind: "long-sword" as const,
					hitBonus: -2,
					damageBonus: -2,
					quantity: 1,
				},
			],
		};
		const equipped = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerAttackDamage(equipped)).toBe(
			calculatePlayerAttackDamage({ ...state, inventory: [] }) - 2,
		);
		expect(equipped.inventory).toEqual([
			{
				itemId: 1,
				kind: "weapon",
				equipped: true,
				cursed: true,
				weaponKind: "long-sword" as const,
				hitBonus: -2,
				damageBonus: -2,
				quantity: 1,
			},
		]);
		expect(equipped.events).toEqual([
			{
				type: "weapon-equipped",
				payload: {
					weaponKind: "long-sword",
					hitBonus: -2,
					damageBonus: -2,
				},
			},
			{ type: "curse-revealed", payload: { kind: "weapon" } },
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
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* ring mail's own 3 points of defense (armor class 7) plus its +1 */
		expect(calculatePlayerDefense(next.inventory)).toBe(4);
		expect(next.playerHp).toBe(state.playerHp); /* armor doesn't heal */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: true,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			},
		]);
		expect(next.events).toEqual([
			{
				type: "armor-equipped",
				payload: { armorKind: "ring-mail", armorClass: 6 },
			},
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
					armorKind: "ring-mail" as const,
					defenseBonus: 1,
					rustProtected: false,
				},
				{
					itemId: 2,
					kind: "armor" as const,
					equipped: false,
					cursed: false,
					armorKind: "ring-mail" as const,
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
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			},
			{
				itemId: 2,
				kind: "armor",
				equipped: true,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 2,
				rustProtected: false,
			},
		]);
		expect(calculatePlayerDefense(next.inventory)).toBe(5);
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
					armorKind: "ring-mail" as const,
					defenseBonus: -2,
					rustProtected: false,
				},
			],
		};
		const equipped = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* ring mail's 3 points, dragged down by the curse's -2 */
		expect(calculatePlayerDefense(equipped.inventory)).toBe(1);
		expect(equipped.events).toEqual([
			{
				type: "armor-equipped",
				payload: { armorKind: "ring-mail", armorClass: 9 },
			},
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

	it("rust worsens the armor by 1 per hit, as in original Rogue: never past armor class 9, and never leather", () => {
		const armorWith = (defenseBonus: number) => [
			{
				itemId: 1,
				kind: "armor" as const,
				equipped: true,
				cursed: defenseBonus < 0,
				armorKind: "ring-mail" as const,
				defenseBonus,
				rustProtected: false,
			},
		];
		/* ring mail is armor class 7, i.e. 3 points of defense before its own bonus */
		expect(calculatePlayerDefense(applyArmorRust(armorWith(2)))).toBe(4);
		expect(calculatePlayerDefense(applyArmorRust(armorWith(0)))).toBe(2);
		/* a cursed one keeps rusting too, down to armor class 9 (1 point of defense)... */
		expect(calculatePlayerDefense(applyArmorRust(armorWith(-1)))).toBe(1);
		/* ...and no further */
		expect(calculatePlayerDefense(applyArmorRust(armorWith(-2)))).toBe(1);
		expect(canRustEquippedArmor(armorWith(-2))).toBe(false);

		const leather = armorWith(0).map((armor) => ({
			...armor,
			armorKind: "leather-armor" as const,
		}));
		expect(canRustEquippedArmor(leather)).toBe(false);
		expect(applyArmorRust(leather)).toBe(leather);
	});

	it("is unaffected by hunger — original Rogue's Weak stage changes nothing in combat", () => {
		const fed = buildArenaGameState(9, 3, 1);
		const weak = { ...fed, playerFood: PLAYER_WEAK_THRESHOLD };
		const fainting = { ...fed, playerFood: -10 };
		expect(calculatePlayerAttackDamage(weak)).toBe(
			calculatePlayerAttackDamage(fed),
		);
		expect(calculatePlayerAttackDamage(fainting)).toBe(
			calculatePlayerAttackDamage(fed),
		);
	});
});
