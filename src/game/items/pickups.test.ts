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
		if (kind === "weapon") {
			return {
				itemId,
				kind,
				equipped: false,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 1,
				damageBonus: 1,
				quantity: 1,
			};
		}
		if (kind === "armor") {
			return {
				itemId,
				kind,
				equipped: false,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			};
		}
		if (
			kind === "regeneration-ring" ||
			kind === "sustenance-ring" ||
			kind === "stealth-ring" ||
			kind === "aggravate-monster-ring"
		) {
			return { itemId, kind, equipped: false, cursed: false };
		}
		if (
			kind === "slow-wand" ||
			kind === "teleport-wand" ||
			kind === "magic-missile-wand"
		) {
			return { itemId, kind, charges: 5 };
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

	it("re-picking up a previously-dropped weapon restores its exact identity — no reroll, no rng consumed, no new itemId", () => {
		const droppedWeapon = {
			x: 5,
			y: 1,
			kind: "weapon" as const,
			identity: {
				itemId: 42,
				cursed: true,
				weaponKind: "long-sword" as const,
				hitBonus: 3,
				damageBonus: 3,
				quantity: 1,
			},
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [droppedWeapon],
			nextItemId: 99,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([
			{
				itemId: 42,
				kind: "weapon",
				equipped: false,
				cursed: true,
				weaponKind: "long-sword" as const,
				hitBonus: 3,
				damageBonus: 3,
				quantity: 1,
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

describe("picking up a bundled weapon", () => {
	const arrowsHeld: HeldItem = {
		itemId: 1,
		kind: "weapon",
		weaponKind: "arrow",
		equipped: false,
		cursed: false,
		hitBonus: 0,
		damageBonus: 0,
		quantity: 10,
	};
	const arrowOnFloor = {
		x: 3,
		y: 2,
		kind: "weapon" as const,
		identity: {
			itemId: 40,
			weaponKind: "arrow" as const,
			cursed: false,
			hitBonus: 0,
			damageBonus: 0,
			quantity: 1,
		},
	};

	it("joins the stack already held instead of taking a new slot", () => {
		const state = {
			...buildArenaGameState(5, 5, 1),
			inventory: [arrowsHeld],
			items: [arrowOnFloor],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([{ ...arrowsHeld, quantity: 11 }]);
		expect(next.items).toEqual([]);
		expect(next.events).toEqual([
			{ type: "item-picked-up", payload: { kind: "weapon", variant: "arrow" } },
		]);
	});

	it("joins the stack even with the inventory full — no slot is needed", () => {
		const fillers: HeldItem[] = Array.from(
			{ length: INVENTORY_CAPACITY - 1 },
			(_, index) => ({ itemId: index + 2, kind: "food" as const }),
		);
		const state = {
			...buildArenaGameState(5, 5, 1),
			inventory: [arrowsHeld, ...fillers],
			items: [arrowOnFloor],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory.length).toBe(INVENTORY_CAPACITY);
		expect(next.inventory[0]).toEqual({ ...arrowsHeld, quantity: 11 });
		expect(next.items).toEqual([]);
	});

	it("takes its own slot when its bonuses differ from the held stack's", () => {
		const state = {
			...buildArenaGameState(5, 5, 1),
			inventory: [arrowsHeld],
			items: [
				{
					...arrowOnFloor,
					identity: { ...arrowOnFloor.identity, hitBonus: 2 },
				},
			],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory.length).toBe(2);
	});
});
