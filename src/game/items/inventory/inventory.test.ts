import { describe, expect, it } from "vitest";
import type { HeldItem } from "../../state.js";
import {
	addToInventory,
	findStackTarget,
	removeHeldItem,
	removeHeldItemAtIndex,
	replaceHeldItem,
} from "./inventory.js";

const healPotion = (itemId: number) => ({
	itemId,
	kind: "heal-potion" as const,
});
const food = (itemId: number) => ({ itemId, kind: "food" as const });

describe("addToInventory", () => {
	it("appends a new slot when the kind is not yet held", () => {
		expect(addToInventory([], healPotion(1))).toEqual([healPotion(1)]);
	});

	it("appends its own slot even when the kind is already held — no stacking", () => {
		expect(addToInventory([healPotion(1)], healPotion(2))).toEqual([
			healPotion(1),
			healPotion(2),
		]);
	});

	it("leaves existing slots untouched, appending after them", () => {
		expect(addToInventory([food(1)], healPotion(2))).toEqual([
			food(1),
			healPotion(2),
		]);
	});
});

describe("removeHeldItem", () => {
	it("removes the held item matching itemId", () => {
		expect(removeHeldItem([healPotion(1)], 1)).toEqual([]);
	});

	it("removes only the matching itemId, leaving another slot of the same kind", () => {
		expect(removeHeldItem([healPotion(1), healPotion(2)], 1)).toEqual([
			healPotion(2),
		]);
	});

	it("leaves other slots untouched", () => {
		expect(removeHeldItem([food(1), healPotion(2)], 2)).toEqual([food(1)]);
	});

	it("is unchanged when the itemId is not held", () => {
		expect(removeHeldItem([food(1)], 99)).toEqual([food(1)]);
	});
});

describe("replaceHeldItem", () => {
	it("replaces the held item matching itemId with the given next item, in place", () => {
		const weapon = {
			itemId: 2,
			kind: "weapon" as const,
			equipped: false,
			cursed: false,
			weaponKind: "long-sword" as const,
			hitBonus: 1,
			damageBonus: 1,
			quantity: 1,
		};
		const equippedWeapon = { ...weapon, equipped: true };
		expect(replaceHeldItem([food(1), weapon], 2, equippedWeapon)).toEqual([
			food(1),
			equippedWeapon,
		]);
	});

	it("is unchanged when the itemId is not held", () => {
		expect(replaceHeldItem([food(1)], 99, food(2))).toEqual([food(1)]);
	});
});

describe("removeHeldItemAtIndex", () => {
	it("removes the slot at the given index", () => {
		expect(removeHeldItemAtIndex([food(1), healPotion(2)], 0)).toEqual([
			healPotion(2),
		]);
		expect(removeHeldItemAtIndex([food(1), healPotion(2)], 1)).toEqual([
			food(1),
		]);
	});
});

describe("findStackTarget", () => {
	const weaponOf = (
		itemId: number,
		overrides: Partial<Extract<HeldItem, { kind: "weapon" }>> = {},
	): HeldItem => ({
		itemId,
		kind: "weapon",
		weaponKind: "arrow",
		equipped: false,
		cursed: false,
		hitBonus: 0,
		damageBonus: 0,
		quantity: 10,
		...overrides,
	});

	it("finds the held stack of the same bundled kind with the same bonuses", () => {
		const held = weaponOf(1);
		expect(findStackTarget([held], weaponOf(2, { quantity: 1 }))).toBe(held);
	});

	it("does not stack across kinds, differing bonuses, or a curse on either side", () => {
		const held = weaponOf(1);
		expect(
			findStackTarget([held], weaponOf(2, { weaponKind: "dart" })),
		).toBeUndefined();
		expect(
			findStackTarget([held], weaponOf(2, { hitBonus: 1 })),
		).toBeUndefined();
		expect(
			findStackTarget([held], weaponOf(2, { cursed: true })),
		).toBeUndefined();
		expect(
			findStackTarget([weaponOf(1, { cursed: true })], weaponOf(2)),
		).toBeUndefined();
	});

	it("never stacks a kind that comes one at a time, or a non-weapon", () => {
		const mace = weaponOf(1, { weaponKind: "mace", quantity: 1 });
		expect(
			findStackTarget([mace], weaponOf(2, { weaponKind: "mace", quantity: 1 })),
		).toBeUndefined();
		expect(
			findStackTarget([mace], { itemId: 3, kind: "food" }),
		).toBeUndefined();
	});
});
