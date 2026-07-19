import { describe, expect, it } from "vitest";
import { at } from "../../indexing.js";
import { createRng } from "../../rng.js";
import { advanceTurn } from "../advanceTurn.js";
import { INVENTORY_CAPACITY } from "../balance.js";
import { ITEM_KIND_VALUES } from "../events.js";
import { buildArenaGameState, buildDungeonGameState } from "../initialState.js";
import type { Action, Direction, HeldItem } from "../state.js";
import { buildFloorItem } from "./heldItemFactory.js";

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

/**
 * A held-item fixture for every ITEM_KIND_VALUES entry, itemId matching its
 * 1-based position — equipment kinds get plausible unequipped/uncursed
 * default fields since applyItemPickup rolls those, but these fixtures
 * bypass pickup entirely (they simulate already-held inventory).
 */
const buildFullInventory = (): readonly HeldItem[] =>
	ITEM_KIND_VALUES.slice(0, INVENTORY_CAPACITY).map((kind, index) => {
		const itemId = index + 1;
		if (kind === "sword") {
			return { itemId, kind, equipped: false, cursed: false, attackBonus: 1 };
		}
		if (kind === "armor") {
			return {
				itemId,
				kind,
				equipped: false,
				cursed: false,
				defenseBonus: 1,
				rustProtected: false,
			};
		}
		if (kind === "regeneration-ring" || kind === "sustenance-ring") {
			return { itemId, kind, equipped: false, cursed: false };
		}
		return { itemId, kind };
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
		expect(next.inventory).toEqual([{ itemId: 1, kind: "heal-potion" }]);
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
		expect(next.inventory).toEqual([{ itemId: 1, kind: "heal-potion" }]);
	});

	it("picking up a second potion of the same kind takes its own slot — no stacking", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 5, y: 1, kind: "heal-potion" as const }],
			inventory: [{ itemId: 1, kind: "heal-potion" as const }],
			nextItemId: 2,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([
			{ itemId: 1, kind: "heal-potion" },
			{ itemId: 2, kind: "heal-potion" },
		]);
	});

	it("re-picking up a previously-dropped sword restores its exact identity — no reroll, no rng consumed, no new itemId", () => {
		const droppedSword = {
			x: 5,
			y: 1,
			kind: "sword" as const,
			identity: { itemId: 42, cursed: true, attackBonus: 3 },
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [droppedSword],
			nextItemId: 99,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([
			{
				itemId: 42,
				kind: "sword",
				equipped: false,
				cursed: true,
				attackBonus: 3,
			},
		]);
		expect(next.nextItemId).toBe(99);
		expect(next.rng).toEqual(state.rng);
	});

	it("picking up a ring never touches rng or bumps nextItemId — identity was already rolled at floor generation", () => {
		const ring = {
			x: 5,
			y: 1,
			kind: "regeneration-ring" as const,
			identity: { itemId: 5, cursed: false },
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [ring],
			nextItemId: 12,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([
			{
				itemId: 5,
				kind: "regeneration-ring",
				equipped: false,
				cursed: false,
			},
		]);
		expect(next.nextItemId).toBe(12);
		expect(next.rng).toEqual(state.rng);
	});

	it("refuses to pick up any item once the inventory is at capacity — the item stays on the floor", () => {
		const fullInventory = buildFullInventory();
		const newKindItem = buildFloorItem(
			at(ITEM_KIND_VALUES, INVENTORY_CAPACITY),
			0,
			{ x: 5, y: 1 },
			createRng(1),
		);
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
		const fullInventory = buildFullInventory();
		const floorItem = buildFloorItem(heldKind, 0, { x: 5, y: 1 }, createRng(1));
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [floorItem],
			inventory: fullInventory,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.items).toEqual([floorItem]);
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
