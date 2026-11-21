import { describe, expect, it } from "vitest";
import { advanceTurn } from "../../advanceTurn.js";
import { PLAYER_MAX_HP } from "../../balance.js";
import { buildArenaGameState } from "../../initialState.js";
import { calculatePlayerArmorClass } from "../equipment/equipmentStats.js";
import { applyToggleRingEquip, hasEquippedRing } from "./rings.js";

describe("items/rings", () => {
	it("equipping a held regeneration ring flips its equipped flag and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "regeneration-ring")).toBe(true);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "regeneration-ring",
				equipped: true,
				cursed: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "regeneration-ring" } },
		]);
	});

	it("using an already-equipped ring unequips it", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "regeneration-ring")).toBe(false);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "regeneration-ring",
				equipped: false,
				cursed: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "item-unequipped", payload: { kind: "regeneration-ring" } },
		]);
	});

	it("equipping a held sustenance ring flips its equipped flag and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sustenance-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "sustenance-ring")).toBe(true);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "sustenance-ring",
				equipped: true,
				cursed: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "sustenance-ring" } },
		]);
	});

	it("a second ring goes on the other hand, keeping the first on", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: false,
				},
				{
					itemId: 2,
					kind: "sustenance-ring" as const,
					equipped: false,
					cursed: false,
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
				kind: "regeneration-ring",
				equipped: true,
				cursed: false,
			},
			{
				itemId: 2,
				kind: "sustenance-ring",
				equipped: true,
				cursed: false,
			},
		]);
	});

	it("a third ring is refused while both hands are taken", () => {
		const ringOf = (
			itemId: number,
			kind: "regeneration-ring" | "sustenance-ring" | "stealth-ring",
			equipped: boolean,
		) => ({ itemId, kind, equipped, cursed: false });
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				ringOf(1, "regeneration-ring", true),
				ringOf(2, "sustenance-ring", true),
				ringOf(3, "stealth-ring", false),
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 3 },
		});
		expect(next.inventory).toEqual(state.inventory);
		expect(next.events[0]).toEqual({ type: "ring-hands-full", payload: {} });
	});

	it("an add strength ring adds its value on and takes it back off, leaving the maximum on the base strength", () => {
		const ring = {
			itemId: 1,
			kind: "add-strength-ring" as const,
			equipped: false,
			cursed: false,
			bonus: 2,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerStrength: 14,
			playerMaxStrength: 16,
			inventory: [ring],
		};
		const on = advanceTurn(state, { type: "use-item", payload: { itemId: 1 } });
		expect(on.playerStrength).toBe(16);
		expect(on.playerMaxStrength).toBe(16);
		const off = advanceTurn(on, { type: "use-item", payload: { itemId: 1 } });
		expect(off.playerStrength).toBe(14);
	});

	it("a protection ring lowers the armor class, and two add up", () => {
		const protection = (itemId: number, bonus: number) => ({
			itemId,
			kind: "protection-ring" as const,
			equipped: true,
			cursed: false,
			bonus,
		});
		expect(calculatePlayerArmorClass([protection(1, 2)])).toBe(8);
		expect(
			calculatePlayerArmorClass([protection(1, 2), protection(2, 1)]),
		).toBe(7);
	});

	it("equipping a held stealth ring flips its equipped flag and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "stealth-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "stealth-ring")).toBe(true);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "stealth-ring" } },
		]);
	});

	it("equipping a ring of aggravate monster wakes every sleeping enemy on the floor at once", () => {
		const asleepA = {
			x: 6,
			y: 1,
			kind: "zombie" as const,
			hp: 2,
			maxHp: 2,
			awake: false,
			speed: "normal" as const,
			held: false,
			carried: [],
			mean: false,
			gazeUsed: false,
			confused: false,
			invisible: false,
		};
		const asleepB = {
			x: 7,
			y: 1,
			kind: "bat" as const,
			hp: 1,
			maxHp: 1,
			awake: false,
			speed: "normal" as const,
			held: false,
			carried: [],
			mean: false,
			gazeUsed: false,
			confused: false,
			invisible: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [asleepA, asleepB],
			inventory: [
				{
					itemId: 1,
					kind: "aggravate-monster-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.enemies.every((enemy) => enemy.awake)).toBe(true);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "aggravate-monster-ring" } },
		]);
	});

	it("unequipping a ring of aggravate monster does not re-wake anything (one-time effect on equip only)", () => {
		/* Calls applyToggleRingEquip directly — advanceTurn's use-item action
		 * also runs a full enemy turn (advanceEnemies), which independently
		 * rolls wake chances and would make this assertion flaky. */
		const asleep = {
			x: 6,
			y: 1,
			kind: "zombie" as const,
			hp: 2,
			maxHp: 2,
			awake: false,
			speed: "normal" as const,
			held: false,
			carried: [],
			mean: false,
			gazeUsed: false,
			confused: false,
			invisible: false,
		};
		const item = {
			itemId: 1,
			kind: "aggravate-monster-ring" as const,
			equipped: true,
			cursed: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [asleep],
			inventory: [item],
		};
		const next = applyToggleRingEquip(state, item);
		expect(next.enemies).toEqual([asleep]);
		expect(next.events).toEqual([
			{ type: "item-unequipped", payload: { kind: "aggravate-monster-ring" } },
		]);
	});

	it("a ring of regeneration heals HP over time via waiting turns while equipped (wired into every turn-consuming action)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: false,
				},
			],
			playerHp: PLAYER_MAX_HP - 3,
		};
		const next = advanceTurn(state, { type: "wait" });
		expect(next.playerHp).toBe(state.playerHp + 1);
		/* every turn, not a roll */
		expect(advanceTurn(next, { type: "wait" }).playerHp).toBe(
			state.playerHp + 2,
		);
	});
});
