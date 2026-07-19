import { describe, expect, it } from "vitest";
import {
	addToInventory,
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
		const sword = {
			itemId: 2,
			kind: "sword" as const,
			equipped: false,
			cursed: false,
			attackBonus: 1,
		};
		const equippedSword = { ...sword, equipped: true };
		expect(replaceHeldItem([food(1), sword], 2, equippedSword)).toEqual([
			food(1),
			equippedSword,
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
