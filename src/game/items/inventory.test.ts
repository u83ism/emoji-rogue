import { describe, expect, it } from "vitest";
import {
	addToInventory,
	removeFromInventory,
	removeOneFromInventory,
} from "./inventory.js";

describe("addToInventory", () => {
	it("appends a new slot when the kind is not yet held", () => {
		expect(addToInventory([], "heal-potion")).toEqual(["heal-potion"]);
	});

	it("appends its own slot even when the kind is already held — no stacking", () => {
		expect(addToInventory(["heal-potion"], "heal-potion")).toEqual([
			"heal-potion",
			"heal-potion",
		]);
	});

	it("leaves existing slots untouched, appending after them", () => {
		expect(addToInventory(["food"], "heal-potion")).toEqual([
			"food",
			"heal-potion",
		]);
	});
});

describe("removeFromInventory", () => {
	it("removes one slot holding the given kind", () => {
		expect(removeFromInventory(["heal-potion"], "heal-potion")).toEqual([]);
	});

	it("removes only the first matching slot, leaving a second of the same kind", () => {
		expect(
			removeFromInventory(["heal-potion", "heal-potion"], "heal-potion"),
		).toEqual(["heal-potion"]);
	});

	it("leaves other kinds' slots untouched", () => {
		expect(removeFromInventory(["food", "heal-potion"], "heal-potion")).toEqual(
			["food"],
		);
	});

	it("is unchanged when the kind is not held", () => {
		expect(removeFromInventory(["food"], "heal-potion")).toEqual(["food"]);
	});
});

describe("removeOneFromInventory", () => {
	it("removes the slot at the given index", () => {
		expect(removeOneFromInventory(["food", "heal-potion"], 0)).toEqual([
			"heal-potion",
		]);
		expect(removeOneFromInventory(["food", "heal-potion"], 1)).toEqual([
			"food",
		]);
	});
});
