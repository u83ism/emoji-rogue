import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { buildArenaGameState } from "../initialState.js";
import {
	calculatePlayerAttackDamage,
	calculatePlayerDefense,
} from "./equipment.js";

/*
 * Whether a freshly picked-up sword/armor turns out cursed is rolled once at
 * pickup (see items/pickups.ts) and stashed on the HeldItem — these tests
 * build already-picked-up HeldItem fixtures directly with an explicit
 * `cursed` value, so both the blessed and cursed cases are exercised
 * unconditionally instead of depending on any particular rng seed.
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

	it("a cursed sword still grants its full attack bonus when equipped, but cannot be unequipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: false,
					cursed: true,
					attackBonus: 1,
				},
			],
		};
		const equipped = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerAttackDamage(equipped)).toBe(state.playerPower + 1);
		expect(equipped.inventory).toEqual([
			{
				itemId: 1,
				kind: "sword",
				equipped: true,
				cursed: true,
				attackBonus: 1,
			},
		]);
		expect(equipped.events).toEqual([
			{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1 } },
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

	it("cursed armor still grants its full defense bonus when equipped, but cannot be unequipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: false,
					cursed: true,
					defenseBonus: 1,
					rustProtected: false,
				},
			],
		};
		const equipped = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(calculatePlayerDefense(equipped.inventory)).toBe(1);
		expect(equipped.events).toEqual([
			{ type: "armor-equipped", payload: { kind: "armor", bonus: 1 } },
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
});
