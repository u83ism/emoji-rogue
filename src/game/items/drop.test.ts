import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../initialState.js";
import { applyItemDrop } from "./drop.js";

describe("applyItemDrop", () => {
	it("moves one held slot from inventory onto the player's tile", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "heal-potion" as const },
				{ itemId: 2, kind: "heal-potion" as const },
			],
		};
		const next = applyItemDrop(state, 1);
		expect(next.inventory).toEqual([{ itemId: 2, kind: "heal-potion" }]);
		expect(next.items).toEqual([
			{ x: state.player.x, y: state.player.y, kind: "heal-potion" },
		]);
		expect(next.events).toEqual([
			{ type: "item-dropped", payload: { kind: "heal-potion" } },
		]);
	});

	it("drops the only held slot of that item, leaving inventory empty", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "food" as const }],
		};
		const next = applyItemDrop(state, 1);
		expect(next.inventory).toEqual([]);
	});

	it("is a no-op when the itemId is not held", () => {
		const state = { ...buildArenaGameState(9, 3, 1), inventory: [] };
		const next = applyItemDrop(state, 1);
		expect(next).toBe(state);
	});

	it("refuses to drop a currently-equipped cursed item, logging equip-blocked-cursed instead", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sword" as const,
					equipped: true,
					cursed: true,
					attackBonus: 1,
				},
			],
		};
		const next = applyItemDrop(state, 1);
		expect(next.inventory).toEqual(state.inventory);
		expect(next.items).toEqual(state.items);
		expect(next.events).toEqual([
			{ type: "equip-blocked-cursed", payload: { kind: "sword" } },
		]);
	});

	it("drops a currently-equipped item normally when it is not cursed", () => {
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
			],
		};
		const next = applyItemDrop(state, 1);
		expect(next.inventory).toEqual([]);
		expect(next.items).toEqual([
			{
				x: state.player.x,
				y: state.player.y,
				kind: "armor",
				identity: {
					itemId: 1,
					cursed: false,
					defenseBonus: 1,
					rustProtected: false,
				},
			},
		]);
	});

	it("drops an unequipped item even if it is secretly cursed (curse only locks while equipped)", () => {
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
		const next = applyItemDrop(state, 1);
		expect(next.inventory).toEqual([]);
	});

	it("carries the dropped item's exact identity (itemId, curse, bonus) onto the floor item", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 7,
					kind: "sword" as const,
					equipped: false,
					cursed: true,
					attackBonus: 3,
				},
			],
		};
		const next = applyItemDrop(state, 7);
		expect(next.items).toEqual([
			{
				x: state.player.x,
				y: state.player.y,
				kind: "sword",
				identity: { itemId: 7, cursed: true, attackBonus: 3 },
			},
		]);
	});
});
