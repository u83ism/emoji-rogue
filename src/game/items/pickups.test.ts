import { describe, expect, it } from "vitest";
import { at } from "../../indexing.js";
import { advanceTurn } from "../advanceTurn.js";
import { INVENTORY_CAPACITY } from "../balance.js";
import { ITEM_KIND_VALUES, type ItemKind } from "../events.js";
import { buildArenaGameState, buildDungeonGameState } from "../initialState.js";
import type { Action, Direction } from "../state.js";

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

describe("pickups", () => {
	it("stepping onto a potion picks it up into inventory (not used yet)", () => {
		const potion = { x: 5, y: 1, kind: "heal-potion" as const };
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 7,
			items: [potion],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.playerHp).toBe(7); /* unchanged — picking up does not heal */
		expect(next.items).toEqual([]);
		expect(next.inventory).toEqual(["heal-potion"]);
		expect(next.events).toEqual([
			{ type: "item-picked-up", payload: { kind: "heal-potion" } },
		]);
	});

	it("stepping onto a gold pile collects it immediately (no inventory slot)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			goldPiles: [{ x: 5, y: 1, amount: 7 }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.goldPiles).toEqual([]);
		expect(next.goldCollected).toBe(state.goldCollected + 7);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "gold-collected", payload: { amount: 7 } },
		]);
	});

	it("collecting gold and an item on the same tile does both", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			goldPiles: [{ x: 5, y: 1, amount: 3 }],
			items: [{ x: 5, y: 1, kind: "heal-potion" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.goldCollected).toBe(3);
		expect(next.inventory).toEqual(["heal-potion"]);
	});

	it("picking up a second potion of the same kind takes its own slot — no stacking", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 5, y: 1, kind: "heal-potion" as const }],
			inventory: ["heal-potion" as const],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual(["heal-potion", "heal-potion"]);
	});

	it("refuses to pick up any item once the inventory is at capacity — the item stays on the floor", () => {
		const fullInventory: readonly ItemKind[] = ITEM_KIND_VALUES.slice(
			0,
			INVENTORY_CAPACITY,
		);
		const newKindItem = {
			x: 5,
			y: 1,
			kind: at(ITEM_KIND_VALUES, INVENTORY_CAPACITY),
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [newKindItem],
			inventory: fullInventory,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual(fullInventory);
		expect(next.items).toEqual([newKindItem]);
		expect(next.events).toEqual([
			{ type: "inventory-full", payload: { kind: newKindItem.kind } },
		]);
	});

	it("refuses to pick up even an already-held kind once at capacity — every slot costs one", () => {
		const heldKind = at(ITEM_KIND_VALUES, 0);
		const fullInventory: readonly ItemKind[] = ITEM_KIND_VALUES.slice(
			0,
			INVENTORY_CAPACITY,
		);
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 5, y: 1, kind: heldKind }],
			inventory: fullInventory,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.items).toEqual([{ x: 5, y: 1, kind: heldKind }]);
		expect(next.inventory).toEqual(fullInventory);
		expect(next.events).toEqual([
			{ type: "inventory-full", payload: { kind: heldKind } },
		]);
	});

	it("stepping onto the amulet's tile picks it up automatically", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const amuletTile = { x: start.player.x + 1, y: start.player.y };
		const state = { ...start, amulet: amuletTile };
		const next = advanceTurn(state, move("east"));
		expect(next.hasAmulet).toBe(true);
		expect(next.amulet).toBeUndefined();
		expect(next.events).toEqual([{ type: "amulet-obtained", payload: {} }]);
	});
});
